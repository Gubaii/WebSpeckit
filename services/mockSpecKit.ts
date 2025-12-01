
import { FileNode, ChatMessage, AppSettings, ProjectState, Attachment } from '../types';
import { generateDocument, constructSystemContext, generateClarificationJSON, generateMultiFile, detectIntent } from './ai';

// Helper to deep copy files
const cloneFiles = (files: FileNode[]) => JSON.parse(JSON.stringify(files));

// Helper: Sleep for mock delay with AbortSignal support
const sleep = (ms: number, signal?: AbortSignal) => new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException("Aborted", "AbortError"));
    const timer = setTimeout(() => resolve(), ms);
    signal?.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
    });
});

// Helper to find/create folder
const findOrAddFolder = (root: FileNode[], folderName: string): FileNode => {
  let folder = root.find(n => n.name === folderName && n.type === 'folder');
  if (!folder) {
    folder = { id: `folder-${folderName}-${Math.random().toString(36).substr(2, 9)}`, name: folderName, type: 'folder', children: [], isOpen: true };
    root.push(folder);
  }
  return folder;
};

// --- Helper: Recursively find node by ID prefix or match ---
const findNode = (nodes: FileNode[], predicate: (n: FileNode) => boolean): FileNode | null => {
    for (const node of nodes) {
        if (predicate(node)) return node;
        if (node.children) {
            const found = findNode(node.children, predicate);
            if (found) return found;
        }
    }
    return null;
};

// --- Helper: Find content in System Files ---
const findFileContent = (nodes: FileNode[], id: string): string | null => {
    const node = findNode(nodes, n => n.id === id);
    return node?.content || null;
};

// --- Helper: Recursively Collect File Nodes (Flat List) ---
const collectFileNodes = (node: FileNode): FileNode[] => {
    let nodes: FileNode[] = [];
    if (node.type === 'file') nodes.push(node);
    if (node.children) {
        node.children.forEach(child => {
            nodes.push(...collectFileNodes(child));
        });
    }
    return nodes;
};

// --- Helper: Detect Platforms from Spec ---
const detectPlatforms = (specContent: string): string[] => {
    const platforms: string[] = [];
    const lowerSpec = specContent.toLowerCase();
    
    if (lowerSpec.includes('backend') || lowerSpec.includes('api') || lowerSpec.includes('server') || lowerSpec.includes('java') || lowerSpec.includes('node') || lowerSpec.includes('nest')) platforms.push('backend');
    if (lowerSpec.includes('web') || lowerSpec.includes('frontend') || lowerSpec.includes('react') || lowerSpec.includes('vue') || lowerSpec.includes('browser')) platforms.push('web');
    if (lowerSpec.includes('app') || lowerSpec.includes('mobile') || lowerSpec.includes('ios') || lowerSpec.includes('android') || lowerSpec.includes('flutter')) platforms.push('app');
    if (lowerSpec.includes('pc') || lowerSpec.includes('desktop') || lowerSpec.includes('windows') || lowerSpec.includes('mac') || lowerSpec.includes('electron')) platforms.push('pc');
    if (lowerSpec.includes('firmware') || lowerSpec.includes('embedded') || lowerSpec.includes('hardware') || lowerSpec.includes('iot')) platforms.push('firmware');
    if (lowerSpec.includes('ui') || lowerSpec.includes('design') || lowerSpec.includes('ux') || lowerSpec.includes('figma')) platforms.push('ui');
    
    return platforms.length > 0 ? platforms : ['backend', 'web']; // Default fallback
};

// --- Helper: Collect Context (Charters, Templates, Commands) ---
const collectContext = (systemFiles: FileNode[], commandId: string, templateFolderId: string, platforms: string[]) => {
    const charters: string[] = [];
    const templates: string[] = [];
    
    // 1. Command Definition
    const cmdNode = findNode(systemFiles, n => n.id === commandId);
    if (cmdNode?.content) charters.push(`--- CURRENT COMMAND DEFINITION ---\n${cmdNode.content}`);

    // 2. Charters Collection (Strict Root + Product + Domain Structure)
    const chartersRoot = findNode(systemFiles, n => n.id === 'sys-charters');
    if (chartersRoot && chartersRoot.children) {
        
        // 2.1 Always include Root-level Charter Files (Department Core & Summary)
        // Root files are direct children of 'sys-charters' that are of type 'file'
        chartersRoot.children.forEach(node => {
            if (node.type === 'file' && node.content) {
                charters.push(`--- DEPARTMENT CORE CHARTER: ${node.name} ---\n${node.content}`);
            }
        });

        // 2.2 Always include 'Product' folder contents (Department Product Rules)
        const productFolder = chartersRoot.children.find(n => n.type === 'folder' && n.name.toLowerCase() === 'product');
        if (productFolder) {
             const productNodes = collectFileNodes(productFolder);
             productNodes.forEach(node => {
                 if (node.content) {
                     charters.push(`--- DEPARTMENT PRODUCT CHARTER: ${node.name} ---\n${node.content}`);
                 }
             });
        }

        // 2.3 Include Tech Domain/Platform Charters (Folders matching platform name)
        // EXHAUSTIVE SEARCH: Iterate all folders. If folder name matches a target platform, include ALL its files.
        platforms.forEach(p => {
             const platformFolder = chartersRoot.children!.find(n => 
                 n.type === 'folder' && n.name.toLowerCase() === p.toLowerCase()
             );
             
             if (platformFolder) {
                 // Flatten all files inside this domain folder (Main + Sub-charters)
                 const platformNodes = collectFileNodes(platformFolder);
                 platformNodes.forEach(node => {
                     if (node.content) {
                         // The header clearly states the domain and filename so AI knows specific context
                         charters.push(`--- ${p.toUpperCase()} DOMAIN CHARTER (${node.name}) ---\n${node.content}`);
                     }
                 });
             }
        });
    }

    // 4. Templates
    const tplFolder = findNode(systemFiles, n => n.id === templateFolderId);
    if (tplFolder && tplFolder.children) {
        const traverse = (n: FileNode) => {
            if (n.type === 'file') {
                 let isRelevant = platforms.some(p => n.name.toLowerCase().includes(p)) || n.name.includes('overview') || n.name.includes('integration') || n.name === 'spec.md';
                 if (isRelevant) {
                     templates.push(`--- TEMPLATE: ${n.name} ---\n${n.content}`);
                 }
            }
            if (n.children) n.children.forEach(traverse);
        };
        tplFolder.children.forEach(traverse);
    }
    
    return { charters, templates };
};


// --- MOCK Clarification Helper ---
const getMockClarification = (round: number, context: string) => {
    if (round === 0) return {
        question: "这个功能主要面向什么用户群体？",
        options: ["C端普通用户", "B端企业用户", "内部管理员"],
        recommendation: "C端普通用户",
        isEnough: false
    };
    if (round === 1) return {
        question: "主要涉及哪些平台？",
        options: ["仅移动端App", "Web + App", "全平台 (Web/App/PC)"],
        recommendation: "Web + App",
        isEnough: false
    };
    return {
        question: "是否需要生成需求文档？",
        options: ["生成文档", "继续补充"],
        recommendation: "生成文档",
        isEnough: true
    };
};

// --- CORE LOGIC: Process Clarification Step (Shared) ---
const processClarificationLogic = async (
    userAnswer: string,
    currentFiles: FileNode[],
    systemFiles: FileNode[],
    settings: AppSettings,
    projectState: ProjectState,
    onProgress?: (status: string) => void,
    attachments?: Attachment[],
    signal?: AbortSignal
): Promise<{
    messages: ChatMessage[];
    files: FileNode[];
    nextStep: string;
    activeFileId?: string;
    updatedContext?: string;
    updatedRound?: number;
    completedSteps?: string[];
}> => {
    let newFiles = cloneFiles(currentFiles);
    let responseMessages: ChatMessage[] = [];
    let nextStep = 'clarifying';
    let activeFileId = projectState.activeFileId || undefined;
    let completedSteps = projectState.completedSteps || [];

    // 1. Update Context
    let updatedContext = projectState.requirementContext || '';
    let updatedRound = projectState.clarificationRound || 0;

    // Detect if this is a "resume" signal without real content, or actual content
    if (userAnswer) {
        onProgress?.("正在记录反馈...");
        updatedContext += `\nUser Answer (Round ${updatedRound}): ${userAnswer}`;
        // If attachments exist, log them in context (textual representation for simple prompt injection)
        if (attachments && attachments.length > 0) {
            updatedContext += `\n[User uploaded ${attachments.length} images]`;
        }
    }

    // Check if spec already exists (Refinement Mode)
    const hasSpec = findFileContent(currentFiles, 'spec.md') !== null;
    
    // 2. Generate Clarification via AI
    if (settings.apiKey) {
        onProgress?.("正在思考...");
        // Collect ALL attachments (History + Current) for the AI to see
        const allHistoryAttachments: Attachment[] = projectState.chatHistory
            .flatMap(m => m.attachments || []);
        const currentAttachments = attachments || [];
        const uniqueAttachments = [...allHistoryAttachments, ...currentAttachments]; // Simple merge

        let promptToSend = updatedContext;
        if (hasSpec) {
            promptToSend += `\n[SYSTEM STATUS: Specification Document has been generated. User is providing feedback/refinement.]`;
        }

        const result = await generateClarificationJSON(
            settings.apiKey, 
            settings.model, 
            promptToSend, 
            updatedRound, 
            uniqueAttachments,
            signal // Pass signal
        );
        
        if (result.isEnough) {
            // Enough info -> Generate Spec
            updatedRound = 5; // Force end
        } else {
            // Ask Question
            const questionMsg: ChatMessage = {
                id: `bot-q-${Date.now()}`,
                type: 'bot',
                content: result.question,
                timestamp: Date.now(),
                actions: result.options.map((opt, idx) => ({
                    id: `opt-${idx}`,
                    label: opt,
                    type: opt === result.recommendation ? 'primary' : 'secondary',
                    handlerId: 'answer_clarification'
                }))
            };
            responseMessages.push(questionMsg);
            updatedRound++;
        }
    } else {
        // Mock Logic
        await sleep(1000, signal);
        const mock = getMockClarification(updatedRound, updatedContext);
        if (mock.isEnough) {
            updatedRound = 5;
        } else {
             const questionMsg: ChatMessage = {
                id: `bot-q-${Date.now()}`,
                type: 'bot',
                content: mock.question,
                timestamp: Date.now(),
                actions: mock.options.map((opt, idx) => ({
                    id: `opt-${idx}`,
                    label: opt,
                    type: opt === mock.recommendation ? 'primary' : 'secondary',
                    handlerId: 'answer_clarification'
                }))
            };
            responseMessages.push(questionMsg);
            updatedRound++;
        }
    }

    // 3. If Round > 3 or Enough Info, Generate Spec
    if (updatedRound >= 3) {
        onProgress?.("正在生成文档...");
        nextStep = 'spec_generated';
        
        // Prepare Context
        const platforms = detectPlatforms(updatedContext);
        // CRITICAL: Collect ALL relevant charters (Core + Product + Platform Specific Main/Sub)
        const { charters, templates } = collectContext(systemFiles, 'cmd-specify', 'sys-templates', platforms);
        
        // Inject Standards (including requirement writing standard)
        const standards: string[] = [];
        const stdSpecNode = findNode(systemFiles, n => n.id === 'std-spec'); // Requirement writing standard
        if (stdSpecNode?.content) standards.push(stdSpecNode.content);

        const systemContext = constructSystemContext(charters, templates, standards);

        // Aggregate images again for spec generation
        const allHistoryAttachments: Attachment[] = projectState.chatHistory.flatMap(m => m.attachments || []);
        const currentAttachments = attachments || [];
        const uniqueAttachments = [...allHistoryAttachments, ...currentAttachments];

        let specContent = "";
        if (settings.apiKey) {
            specContent = await generateDocument(settings.apiKey, settings.model, `
Target: Generate "Requirement Specification" (spec.md).
Input Requirement Context: ${updatedContext}

INSTRUCTION:
1. Find the "spec.md" template in the provided TEMPLATES section of the context.
2. Output the full document using that EXACT structure.
3. Fill in Section 1, 2, 3 based on the Input Context.
4. Leave Section 4, 5, 6 as "Pending Generation" as defined in the template.
            `, systemContext, uniqueAttachments, signal);
        } else {
            await sleep(1500, signal);
            specContent = `# 需求规格说明书 (Mock)\n\n## 1. 概述\n基于: ${updatedContext}\n\n## 2. 功能清单...`;
        }

        // Save File
        const specFolder = findOrAddFolder(newFiles[0].children!, 'specs');
        const specFile: FileNode = {
            id: 'spec.md',
            name: 'spec.md',
            type: 'file',
            content: specContent
        };
        // Replace or Add
        const existingIdx = specFolder.children!.findIndex(f => f.name === 'spec.md');
        if (existingIdx >= 0) specFolder.children![existingIdx] = specFile;
        else specFolder.children!.push(specFile);

        activeFileId = specFile.id;
        completedSteps = [...new Set([...completedSteps, 'specify'])];

        responseMessages.push({
            id: `bot-done-${Date.now()}`,
            type: 'bot',
            content: `✅ 规格文档 (spec.md) 已生成。已应用标准: 知识库、Markdown、埋点设计。\n\n下一步: 质量检查 (Checklist)`,
            timestamp: Date.now(),
            actions: [{ id: 'act-check', label: '运行质量检查 (Checklist)', type: 'primary', handlerId: 'run_checklist' }]
        });
        
        responseMessages[responseMessages.length-1].actions?.unshift({
             id: 'act-complete', label: '补全文档 (埋点/测试/知识库)', type: 'secondary', handlerId: 'complete_spec'
        });
    }

    return {
        messages: responseMessages,
        files: newFiles,
        nextStep,
        activeFileId,
        updatedContext,
        updatedRound,
        completedSteps
    };
};

export const handleUserMessage = async (
    userMessage: string,
    currentFiles: FileNode[],
    currentStep: string,
    systemFiles: FileNode[],
    settings: AppSettings,
    projectState: ProjectState,
    onProgress?: (status: string) => void,
    attachments?: Attachment[],
    signal?: AbortSignal
) => {
    // 0. Intent Detection (Command Dispatching)
    const intentMap: Record<string, RegExp> = {
        'regenerate_spec': /^(重新生成|完整生成|重写|regenerate|rewrite)/i,
        'complete_spec': /^(补全|埋点|测试标准|验收标准|知识库|enrich)/i,
        'run_checklist': /^(检查|质量|checklist|review)/i,
        'run_tech': /^(技术方案|架构|tech|design)/i,
        'run_autotest': /^(测试计划|test plan|cases)/i,
        'run_tasks': /^(任务|分解|tasks)/i,
        'run_implement': /^(实施|代码|code|implement)/i,
        'run_analyze': /^(分析|一致性|analyze)/i,
    };

    let detectedIntent = "chat";
    
    // Check Regex first (fast path) - skip if input is long to avoid false positives
    if (userMessage.length < 60) {
        for (const [cmd, regex] of Object.entries(intentMap)) {
            if (regex.test(userMessage)) {
                detectedIntent = cmd;
                break;
            }
        }
    }

    // Check AI Intent (if connected and regex didn't catch specific keywords strongly)
    if (detectedIntent === "chat" && settings.apiKey) {
        detectedIntent = await detectIntent(settings.apiKey, settings.model, userMessage);
    }
    
    // Dispatch to Action Handler if it's a command
    if (detectedIntent !== "chat" && (detectedIntent.startsWith("run_") || detectedIntent === "complete_spec" || detectedIntent === "regenerate_spec")) {
        return handleActionClick(detectedIntent, currentFiles, systemFiles, settings, `User Trigger: ${userMessage}`, projectState, onProgress, signal);
    }

    // 1. Init Step
    if (currentStep === 'init') {
        const nextStep = 'clarifying';
        // Kick off clarification immediately
        return processClarificationLogic(userMessage, currentFiles, systemFiles, settings, projectState, onProgress, attachments, signal);
    }

    // 2. Clarifying Step
    if (currentStep === 'clarifying') {
        // Check for exit keywords
        if (['退出', '暂停', 'exit', 'stop', 'pause'].some(k => userMessage.toLowerCase().includes(k))) {
            return {
                messages: [{
                    id: `bot-pause-${Date.now()}`,
                    type: 'bot',
                    content: "已暂停需求澄清。您可以随时发送内容继续。",
                    timestamp: Date.now()
                }] as ChatMessage[],
                files: currentFiles,
                nextStep: 'paused'
            };
        }
        return processClarificationLogic(userMessage, currentFiles, systemFiles, settings, projectState, onProgress, attachments, signal);
    }

    // 3. Paused or Other Step (Resume)
    if (currentStep === 'paused' || (projectState.requirementContext && currentStep !== 'init')) {
         // Resume clarification context
         return processClarificationLogic(userMessage, currentFiles, systemFiles, settings, projectState, onProgress, attachments, signal);
    }

    // Fallback (should not happen usually)
    return {
        messages: [{
            id: `bot-err-${Date.now()}`,
            type: 'bot',
            content: "未知的状态，已重置。",
            timestamp: Date.now()
        }] as ChatMessage[],
        files: currentFiles,
        nextStep: 'init'
    };
};

export const handleActionClick = async (
    handlerId: string, 
    currentFiles: FileNode[], 
    systemFiles: FileNode[], 
    settings: AppSettings, 
    label: string,
    projectState: ProjectState,
    onProgress?: (status: string) => void,
    signal?: AbortSignal
) => {
    let newFiles = cloneFiles(currentFiles);
    let messages: ChatMessage[] = [];
    let nextStep = projectState.currentStep;
    let activeFileId = projectState.activeFileId;
    let completedSteps = projectState.completedSteps || [];
    let updatedContext = projectState.requirementContext;
    let updatedRound = projectState.clarificationRound;

    const addBotMessage = (text: string, actions?: any[]) => {
        messages.push({ id: `bot-${Date.now()}`, type: 'bot', content: text, timestamp: Date.now(), actions });
    };

    switch (handlerId) {
        case 'answer_clarification':
            // This is usually clicked from an option. Treat label as user answer.
            return processClarificationLogic(label, currentFiles, systemFiles, settings, projectState, onProgress, undefined, signal);

        case 'regenerate_spec':
            onProgress?.("正在重新生成完整需求文档...");
            const platformsRegen = detectPlatforms(updatedContext || "");
            const contextRegen = collectContext(systemFiles, 'cmd-specify', 'sys-templates', platformsRegen);
            const standardsRegen = [];
            const stdSpecNode = findNode(systemFiles, n => n.id === 'std-spec'); 
            if (stdSpecNode?.content) standardsRegen.push(stdSpecNode.content);

            const systemContextRegen = constructSystemContext(contextRegen.charters, contextRegen.templates, standardsRegen);
            
            let fullSpecContent = "";
            let filenameSuffix = "v2";

            if (settings.apiKey) {
                // 1. Generate Content
                fullSpecContent = await generateDocument(settings.apiKey, settings.model, `
Target: REGENERATE the "Requirement Specification" (spec.md) completely from scratch.
Input Requirement Context: ${updatedContext}

INSTRUCTION:
1. Find the "spec.md" template in the context.
2. Output the FULL DOCUMENT filling ALL SECTIONS (1 through 6).
3. Do NOT leave anything as "Pending Generation". Fill Data Tracking, Acceptance Criteria, and KB based on the requirements.
            `, systemContextRegen, undefined, signal);

                // 2. Generate Suffix (Summary)
                onProgress?.("正在生成版本命名...");
                const suffixPrompt = `
                Analyze the following requirement context and extract the main feature or update topic.
                Context: ${updatedContext}
                
                Output strictly a short filename suffix in English (kebab-case, max 5 words).
                Example: "add-offline-mode", "payment-integration", "user-login-refactor".
                Do NOT output markdown or file extensions.
                `;
                const rawSuffix = await generateDocument(settings.apiKey, settings.model, suffixPrompt, "You are a naming assistant. Output only the kebab-case string.", undefined, signal);
                
                // Clean up the suffix
                filenameSuffix = rawSuffix.trim().replace(/[^a-zA-Z0-9-]/g, '').toLowerCase().slice(0, 40) || "update";
                // Remove leading/trailing hyphens
                filenameSuffix = filenameSuffix.replace(/^-+|-+$/g, '');

            } else {
                await sleep(1500, signal);
                fullSpecContent = `# 需求规格说明书 (Full Regen)\n\nBased on ${updatedContext}`;
                filenameSuffix = `mock-${Date.now()}`;
            }

            // 3. Save as NEW File (No Overwrite)
            const specFolderRegen = findOrAddFolder(newFiles[0].children!, 'specs');
            
            let baseName = `spec-${filenameSuffix}.md`;
            let finalName = baseName;
            let counter = 1;
            
            // Collision detection
            while (specFolderRegen.children!.some(f => f.name === finalName)) {
                finalName = `spec-${filenameSuffix}-${counter}.md`;
                counter++;
            }

            const specFileRegen: FileNode = {
                id: finalName, // Use name as ID for simplicity
                name: finalName,
                type: 'file',
                content: fullSpecContent
            };
            
            specFolderRegen.children!.push(specFileRegen);

            activeFileId = specFileRegen.id;
            
            addBotMessage(`✅ 需求文档已重新生成为新版本: ${finalName}`, [
                { id: 'act-check', label: '运行质量检查 (Checklist)', type: 'primary', handlerId: 'run_checklist' }
            ]);
            break;

        case 'complete_spec':
            onProgress?.("正在补全文档 (埋点/测试/知识库)...");
            const specFile = findFileContent(newFiles, 'spec.md');
            if (specFile) {
                const platforms = detectPlatforms(specFile);
                const { charters } = collectContext(systemFiles, 'cmd-specify', 'sys-templates', platforms);
                
                const stdTest = findFileContent(systemFiles, 'std-test') || "";
                const stdTestTable = findFileContent(systemFiles, 'std-test-table') || "";
                const stdKb = findFileContent(systemFiles, 'std-kb') || "";
                
                // Collect Product Charter (Global)
                const chProductNode = findNode(systemFiles.find(n => n.id === 'sys-charters')?.children || [], n => n.name === 'Product' || n.name === 'constitution-product.md');
                let chProductContent = "";
                if(chProductNode && chProductNode.type === 'file') chProductContent = chProductNode.content || "";
                // Handle new folder structure for Product
                else if (chProductNode && chProductNode.type === 'folder' && chProductNode.children) {
                     const productNodes = collectFileNodes(chProductNode);
                     productNodes.forEach(f => chProductContent += `\n${f.content}`);
                }

                let additionalContent = "";
                
                if (settings.apiKey) {
                    const prompt = `
                    Source Spec:
                    ${specFile}

                    Task:
                    Generate Section 4 (Data Tracking), Section 5 (Acceptance Criteria), and Section 6 (Glossary/KB) based on the source spec.
                    
                    Standards:
                    ${stdTest}
                    ${stdTestTable}
                    ${stdKb}
                    ${chProductContent}

                    Output strictly Markdown starting with "## 4. 数据埋点设计".
                    `;
                    additionalContent = await generateDocument(settings.apiKey, settings.model, prompt, "You are a QA and Data Specialist.", undefined, signal);
                } else {
                    await sleep(1000, signal);
                    additionalContent = `\n## 4. 数据埋点设计\n- Mock Data Event 1\n## 5. 测试验收标准\n- Mock Test Case 1\n## 6. 词条与知识库\n- Mock Term 1`;
                }

                // SMART REPLACE LOGIC
                const pendingRegex = /> \*\*Pending Generation/;
                const section4Regex = /(^|\n)##\s+4/;
                
                let cutIndex = -1;
                const matchPending = specFile.match(pendingRegex);
                const matchSec4 = specFile.match(section4Regex);

                if (matchSec4) {
                    cutIndex = matchSec4.index!;
                } else if (matchPending) {
                    const separatorRegex = /\n---\n> \*\*Pending/;
                    const matchSep = specFile.match(separatorRegex);
                    if (matchSep) cutIndex = matchSep.index!;
                    else cutIndex = matchPending.index!;
                }

                let newContent = specFile;
                if (cutIndex !== -1) {
                    newContent = specFile.substring(0, cutIndex).trim();
                }
                
                newContent += `\n\n---\n${additionalContent}`;

                newFiles = newFiles.map(f => {
                   if (f.children) {
                       const spec = f.children.find(c => c.name === 'specs');
                       if (spec && spec.children) {
                           const s = spec.children.find(x => x.name === 'spec.md');
                           if (s) s.content = newContent;
                       }
                   }
                   return f;
                });
                
                addBotMessage(`✅ 文档已补全。 已新增/更新：数据埋点、验收标准、知识库。\n\n下一步: 质量检查 (Checklist)`, [
                    { id: 'act-check', label: '运行质量检查 (Checklist)', type: 'primary', handlerId: 'run_checklist' }
                ]);
            }
            break;

        case 'run_checklist':
            onProgress?.("正在进行质量检查...");
            const specForCheck = findFileContent(newFiles, 'spec.md');
            if (specForCheck) {
                const platforms = detectPlatforms(specForCheck);
                const { charters } = collectContext(systemFiles, 'cmd-checklist', 'sys-templates', platforms);
                
                let checkReport = "";
                if (settings.apiKey) {
                    checkReport = await generateDocument(settings.apiKey, settings.model, `Check this spec against charters:\n${specForCheck}`, constructSystemContext(charters, [], []), undefined, signal);
                } else {
                    await sleep(1000, signal);
                    checkReport = `# Quality Checklist\n- [x] Principle 1 checked\n- [ ] Issue found in section 2`;
                }
                
                const reportFile = { id: 'checklist.md', name: 'checklist.md', type: 'file' as const, content: checkReport };
                const specFolder = findOrAddFolder(newFiles[0].children!, 'specs');
                specFolder.children!.push(reportFile);
                activeFileId = reportFile.id;
                completedSteps = [...new Set([...completedSteps, 'checklist'])];
                addBotMessage(`✅ 检查报告已生成。请修复发现的问题，然后继续技术设计。`, [
                    { id: 'act-tech', label: '生成技术方案 (Tech Design)', type: 'primary', handlerId: 'run_tech' }
                ]);
            }
            break;

        case 'run_tech':
            onProgress?.("正在生成技术方案...");
            const specForTech = findFileContent(newFiles, 'spec.md');
            if (specForTech) {
                const platforms = detectPlatforms(specForTech);
                // Include ALL domain charters (Main + Sub)
                const { charters, templates } = collectContext(systemFiles, 'cmd-tech', 'tpl-tech', platforms);

                let techDocs: Record<string, string> = {};
                
                if (settings.apiKey) {
                    const prompt = `
                    Requirement: ${specForTech}
                    Target Platforms: ${platforms.join(', ')}
                    
                    Task: Generate a technical design document for EACH platform.
                    
                    CRITICAL INSTRUCTIONS (CONSTRAINT ANALYSIS):
                    1. **SCAN CHARTERS FIRST**: Before writing a single line of code design, scan the provided "CONSTITUTION / CHARTERS" context for keywords found in the Requirement (e.g., "MQTT", "Bluetooth", "Payment", "Database").
                    2. **APPLY SUB-CHARTERS**: If a sub-charter exists (e.g., "sub-mqtt-rules.md"), you MUST follow its rules. For example, if the charter says "Use Protobuf for MQTT", do NOT propose JSON.
                    3. **TEMPLATE MATCHING**: For each platform, locate the specific template in the context (e.g. "web-template.md").
                    4. **STRICT OUTPUT**: Your output for that file MUST strictly follow the headers and structure of that specific template.
                    
                    If you find a technical constraint in the charters (e.g. "Use Hive for local storage"), explicitly mention "As per Charter X..." in your design decision.
                    `;
                    techDocs = await generateMultiFile(settings.apiKey, settings.model, prompt, constructSystemContext(charters, templates, []), signal);
                } else {
                    await sleep(1500, signal);
                    platforms.forEach(p => {
                        techDocs[`tech-${p}.md`] = `# ${p.toUpperCase()} Technical Design (Mock)\n\nBased on Spec...`;
                    });
                }

                const techFolder = findOrAddFolder(newFiles[0].children!, 'tech-design');
                
                Object.entries(techDocs).forEach(([name, content]) => {
                     const existing = techFolder.children!.findIndex(f => f.name === name);
                     if (existing >= 0) techFolder.children![existing].content = content;
                     else techFolder.children!.push({ id: `tech-${name}-${Date.now()}`, name, type: 'file', content });
                });

                activeFileId = techFolder.children![0].id;
                completedSteps = [...new Set([...completedSteps, 'techdetail'])];
                addBotMessage(`✅ 技术方案 (${Object.keys(techDocs).length} files) 已生成。`, [
                    { id: 'act-test', label: '生成测试计划 (AutoTest)', type: 'primary', handlerId: 'run_autotest' }
                ]);
            }
            break;

        case 'run_autotest':
             onProgress?.("正在生成自动化测试计划...");
             const specForTest = findFileContent(newFiles, 'spec.md');
             if (specForTest) {
                const platforms = detectPlatforms(specForTest);
                const { charters, templates } = collectContext(systemFiles, 'cmd-autotest', 'tpl-auto', platforms);

                let testDocs: Record<string, string> = {};
                if (settings.apiKey) {
                    const prompt = `
                    Requirement: ${specForTest}
                    Platforms: ${platforms.join(', ')}
                    Task: Generate Automation Test Plans.
                    
                    INSTRUCTIONS:
                    1. Use the provided "autotest" templates matching the platforms.
                    2. Strictly follow the template structure.
                    `;
                    testDocs = await generateMultiFile(settings.apiKey, settings.model, prompt, constructSystemContext(charters, templates, []), signal);
                } else {
                     await sleep(1500, signal);
                     testDocs['test-plan.md'] = "# Automation Test Plan (Mock)";
                }

                const testFolder = findOrAddFolder(newFiles[0].children!, 'test-plans');
                Object.entries(testDocs).forEach(([name, content]) => {
                    const existing = testFolder.children!.findIndex(f => f.name === name);
                    if (existing >= 0) testFolder.children![existing].content = content;
                    else testFolder.children!.push({ id: `test-${name}-${Date.now()}`, name, type: 'file', content });
                });
                
                activeFileId = testFolder.children![0].id;
                completedSteps = [...new Set([...completedSteps, 'autotest'])];
                addBotMessage(`✅ 测试计划已生成。`, [
                    { id: 'act-tasks', label: '生成任务分解 (Tasks)', type: 'primary', handlerId: 'run_tasks' }
                ]);
             }
             break;

        case 'run_tasks':
            onProgress?.("正在分解任务...");
            const specForTasks = findFileContent(newFiles, 'spec.md');
            if (specForTasks) {
                const platforms = detectPlatforms(specForTasks);
                const { charters } = collectContext(systemFiles, 'cmd-tasks', 'sys-templates', platforms);
                
                let tasksContent = "";
                if (settings.apiKey) {
                    tasksContent = await generateDocument(settings.apiKey, settings.model, `Generate Task List for:\n${specForTasks}`, constructSystemContext(charters, [], []), undefined, signal);
                } else {
                     await sleep(1000, signal);
                     tasksContent = "# Tasks (Mock)\n- [ ] Task 1";
                }
                
                const taskFile = { id: 'tasks.md', name: 'tasks.md', type: 'file' as const, content: tasksContent };
                const specFolder = findOrAddFolder(newFiles[0].children!, 'project-management');
                specFolder.children!.push(taskFile);
                activeFileId = taskFile.id;
                completedSteps = [...new Set([...completedSteps, 'tasks'])];
                addBotMessage(`✅ 任务分解已完成。`, [
                    { id: 'act-imp', label: '生成代码 (Implement)', type: 'primary', handlerId: 'run_implement' }
                ]);
            }
            break;

        case 'run_implement':
             addBotMessage(`💻 代码生成功能正在开发中 (Coming Soon)...`);
             break;

        default:
            addBotMessage(`Action ${handlerId} executed (Mock).`);
            break;
    }

    return { messages, files: newFiles, nextStep, activeFileId, updatedContext, updatedRound, completedSteps };
};
