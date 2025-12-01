
export enum PhaseStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
}

export type MessageType = 'user' | 'bot' | 'system';

export interface ChatAction {
  id: string;
  label: string;
  type: 'primary' | 'secondary';
  handlerId: string; // ID to map to a specific function
}

export interface Attachment {
  id: string;
  type: 'image';
  mimeType: string;
  data: string; // Base64 string
  name: string;
}

export interface ChatMessage {
  id: string;
  type: MessageType;
  content: string;
  timestamp: number;
  actions?: ChatAction[];
  attachments?: Attachment[];
}

export interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  content?: string;
  children?: FileNode[];
  isOpen?: boolean;
}

// Context for the specific project workflow
export interface ProjectState {
  sessionId?: string; // Bind state to session ID to prevent race conditions during switching
  name: string;
  logs: string[];
  files: FileNode[];
  activeFileId: string | null;
  chatHistory: ChatMessage[];
  currentStep: string; 
  requirementContext?: string; // Accumulated context (Requirement + Q&A)
  clarificationRound?: number; // Track rounds (0-5)
  completedSteps: string[]; // Track completed workflow steps
}

// Wrapper for a full session
export interface ChatSession {
  id: string;
  title: string;
  lastModified: number;
  data: ProjectState;
}

export interface AppSettings {
  apiKey: string;
  model: string;
  useMock: boolean;
  supabaseUrl?: string;
  supabaseKey?: string;
  lastSynced?: string;
}

export interface ToastMessage {
    id: string;
    type: 'success' | 'error' | 'info';
    message: string;
}

export type AppView = 'workspace' | 'standards' | 'settings' | 'library';