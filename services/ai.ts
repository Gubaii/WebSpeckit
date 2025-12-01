
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Attachment } from '../types';

// Helper to clean markdown (specifically removing bold in tables)
const cleanMarkdown = (text: string): string => {
  if (!text) return "";
  return text.split('\n').map(line => {
    // If line looks like a table row
    if (line.trim().startsWith('|')) {
      // Remove ** and __
      return line.replace(/\*\*/g, '').replace(/__/g, '');
    }
    return line;
  }).join('\n');
};

// Helper to convert Attachment to GenAI Part
const attachmentsToParts = (attachments?: Attachment[]) => {
    if (!attachments || attachments.length === 0) return [];
    return attachments.map(att => {
         // Data is "data:image/png;base64,..." or just base64 depending on how it's stored. 
         // ChatInterface stores it as data URL. We need just the base64 part for inlineData.
         const base64Data = att.data.includes(',') ? att.data.split(',')[1] : att.data;
         return {
             inlineData: {
                 mimeType: att.mimeType,
                 data: base64Data
             }
         };
    });
};

// --- Signal Wrapper ---
const callWithSignal = async <T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> => {
    if (signal?.aborted) {
        throw new DOMException("Aborted", "AbortError");
    }
    return new Promise<T>((resolve, reject) => {
        const abortHandler = () => {
            reject(new DOMException("Aborted", "AbortError"));
        };
        signal?.addEventListener("abort", abortHandler);
        promise.then(
            (res) => {
                signal?.removeEventListener("abort", abortHandler);
                resolve(res);
            },
            (err) => {
                signal?.removeEventListener("abort", abortHandler);
                reject(err);
            }
        );
    });
};

export const generateDocument = async (
  apiKey: string,
  modelName: string,
  prompt: string,
  systemContext: string,
  images?: Attachment[],
  signal?: AbortSignal
): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const imageParts = attachmentsToParts(images);
    const textPart = { text: prompt };
    
    // Construct parts array. Text usually comes last or first. 
    // For "Describe this image", image first is logical.
    const parts = [...imageParts, textPart];

    const generatePromise = ai.models.generateContent({
      model: modelName,
      contents: { parts }, 
      config: {
        systemInstruction: systemContext,
        temperature: 0.7,
      }
    });

    const response = await callWithSignal<GenerateContentResponse>(generatePromise, signal);
    const rawText = response.text || "";
    return cleanMarkdown(rawText);
  } catch (error) {
    // If aborted, rethrow so call stack knows
    if ((error as any).name === 'AbortError') throw error;
    console.error("AI Generation Error:", error);
    return `生成内容时出错: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
};

interface ClarificationQuestion {
  question: string;
  options: string[];
  recommendation: string;
  isEnough: boolean; // True if AI thinks we have enough info
}

export const generateClarificationJSON = async (
    apiKey: string,
    modelName: string,
    currentContext: string,
    round: number,
    images?: Attachment[],
    signal?: AbortSignal
): Promise<ClarificationQuestion> => {
    try {
        const ai = new GoogleGenAI({ apiKey });
        
        const prompt = `
        Context so far: ${currentContext}
        Current Round: ${round}/5
        
        Task:
        1. If the requirement is vague, ask a clarifying question (single choice preferred).
        2. Provide 2-4 distinct options for the user to click.
        3. If the requirement is very clear, set "isEnough" to true.
        4. Output strictly valid JSON.
        `;

        const systemInstruction = `
        You are an expert Product Manager.
        Your goal is to clarify requirements before writing a spec.
        If images are provided, use them to understand the requirement context.
        
        SYSTEM STATUS: If the user is asking for changes to an existing spec (Refinement Mode), assume reasonable defaults and set isEnough: true unless a critical decision is missing. Do not ask trivial questions.

        Return ONLY valid JSON in the following format:
        {
            "question": "Question text in Chinese",
            "options": ["Option A", "Option B", "Option C"],
            "recommendation": "Option A",
            "isEnough": boolean
        }
        `;

        const imageParts = attachmentsToParts(images);
        const textPart = { text: prompt };
        const parts = [...imageParts, textPart];

        const generatePromise = ai.models.generateContent({
            model: modelName,
            contents: { parts },
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json"
            }
        });

        const response = await callWithSignal<GenerateContentResponse>(generatePromise, signal);
        const text = response.text || "{}";
        return JSON.parse(text) as ClarificationQuestion;

    } catch (error) {
        if ((error as any).name === 'AbortError') throw error;
        console.error("AI JSON Error", error);
        return {
            question: "请确认是否开始生成文档？",
            options: ["是，直接生成", "补充更多信息"],
            recommendation: "是，直接生成",
            isEnough: true
        };
    }
};

export const generateMultiFile = async (
    apiKey: string,
    modelName: string,
    prompt: string,
    systemContext: string,
    signal?: AbortSignal
): Promise<Record<string, string>> => {
    try {
        const ai = new GoogleGenAI({ apiKey });
        
        const systemInstruction = `
        ${systemContext}
        
        CRITICAL OUTPUT RULE:
        You must output a strictly valid JSON object where keys are filenames and values are the file content.
        Do NOT output Markdown. Do NOT output code blocks (like \`\`\`json). Just the raw JSON string.
        
        Example:
        {
           "backend.md": "# Backend Design\\n...",
           "web.md": "# Web Design\\n..."
        }
        `;

        const generatePromise = ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json"
            }
        });

        const response = await callWithSignal<GenerateContentResponse>(generatePromise, signal);
        const text = response.text || "{}";
        const json = JSON.parse(text);
        
        // Clean each file content
        const cleaned: Record<string, string> = {};
        Object.entries(json).forEach(([k, v]) => {
            cleaned[k] = cleanMarkdown(v as string);
        });
        
        return cleaned;
    } catch (error) {
        if ((error as any).name === 'AbortError') throw error;
        console.error("MultiFile Gen Error", error);
        return {
            "error_log.md": `Generation Failed: ${error}`
        };
    }
};

export const constructSystemContext = (charters: string[], templates: string[], standards: string[] = []): string => {
  return `
You are SpecKit AI, an expert software architect and product manager.
Your goal is to generate high-quality technical documentation based on the provided Charters (Rules), Standards (Format/Tracking), and Templates (Structure).

STRICT TEMPLATE ADHERENCE RULES:
1. **MANDATORY**: You MUST use the provided Template as the EXACT skeleton of your output.
   - **Do NOT** change section titles defined in the template.
   - **Do NOT** change the order of sections defined in the template.
   - **Do NOT** omit sections defined in the template.
   - You MAY add content *inside* the sections, but the structure must match the template.

CHARTER SUPREMACY & CONFLICT RESOLUTION:
1. **Charter Authority**: The rules in the "CONSTITUTION / CHARTERS" section are ABSOLUTE LAWS.
2. **Keyword Matching**: If the requirement mentions a specific technology (e.g., "MQTT", "BLE", "Payment"), you MUST search the charters for rules regarding that technology.
3. **Sub-Charter Priority**: A Sub-Charter (e.g., "sub-payment-rules.md", "sub-mqtt-rules.md") overrides the Main Charter if there is a conflict.
4. **No Hallucination**: Do NOT invent a technical solution if a Charter explicitly mandates a different one (e.g., if Charter says "Use MQTT Topic format X", do NOT use format Y).

Output ONLY the file content (Markdown), no conversational filler.
**All output must be in Simplified Chinese (简体中文).**
**MARKDOWN STANDARD**: Do NOT use bold text (e.g. **text**) inside Markdown Tables. Keep table cells simple.

--- STANDARDS (MUST FOLLOW) ---
${standards.join('\n\n')}

--- CONSTITUTION / CHARTERS ---
${charters.join('\n\n')}

--- TEMPLATES ---
${templates.join('\n\n')}
`;
};

// --- NEW: Detect Intent for Natural Language Commands ---
export const detectIntent = async (
    apiKey: string,
    modelName: string,
    userMessage: string
): Promise<string> => {
    try {
        const ai = new GoogleGenAI({ apiKey });
        
        const systemInstruction = `
        You are a command dispatcher for the SpecKit system.
        Map user input to one of the following COMMAND_IDs:

        - regenerate_spec: Full rewrite of the spec document (keywords: 重新生成, 完整生成, 重写, regenerate full, rewrite)
        - complete_spec: Enrich existing spec with tracking/testing (keywords: 补全, 埋点, 验收标准, enrich spec)
        - run_checklist: Run quality checklist (keywords: 检查, 质量, review, checklist)
        - run_tech: Generate technical design/architecture (keywords: 技术方案, 架构, tech spec, design docs)
        - run_autotest: Generate test plan/cases (keywords: 测试计划, test plan, cases)
        - run_autotest_scripts: Generate test scripts/CI config (keywords: 脚本, script, CI/CD, execution)
        - run_tasks: Generate task list (keywords: 任务, tasks, breakdown)
        - run_implement: Simulate implementation/coding (keywords: 实施, 代码, code, implement)
        - run_analyze: Run consistency analysis (keywords: 分析, 一致性, analyze, scan)

        If the input is a regular chat message, requirement description, or clarification answer, or is longer than 50 characters, return "chat".
        
        Return STRICTLY just the COMMAND_ID string or "chat". No Markdown, no quotes.
        `;

        const response = await ai.models.generateContent({
            model: modelName,
            contents: userMessage,
            config: {
                systemInstruction: systemInstruction,
                temperature: 0.1 // Low temperature for deterministic classification
            }
        });

        const intent = (response.text || "chat").trim();
        return intent;

    } catch (error) {
        console.error("Intent Detection Error", error);
        return "chat"; // Fallback to normal chat
    }
};
