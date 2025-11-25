
export enum MeetingStatus {
  RECORDING = 'RECORDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export type ModelProvider = 'google' | 'openai' | 'anthropic';

export interface WebTool {
  id: string;
  name: string;
  url: string;
  icon: string;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  icon: string;
  systemInstruction: string;
  provider: ModelProvider;
  modelId: string; // e.g., 'gemini-2.5-flash', 'gpt-4'
  isDefault?: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  agentId: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
}

export interface MeetingData {
  id: string;
  title: string;
  date: number; // timestamp
  duration: number; // seconds
  status: MeetingStatus;
  tags: string[];         
  suggestedTags: string[]; 
  transcription?: string;
  report?: string;        
  language?: string;      
  audioBlob?: Blob;
  audioUrl?: string;
}

export interface ProcessingResult {
  title: string;
  transcription: string;
  report: string;
  suggestedTags: string[];
  language: string;
}

export interface ApiKeys {
  google: string;
  openai: string;
  anthropic: string;
}

export interface UserSettings {
  googleDriveConnected: boolean;
  apiKeys: ApiKeys;
  agents: Agent[];
  webTools: WebTool[];
  activeAgentId: string;
}

export const DEFAULT_WEB_TOOLS: WebTool[] = [
  {
    id: 'notebookllm',
    name: 'NotebookLLM',
    url: 'https://notebooklm.google.com/',
    icon: '📓'
  },
  {
    id: 'calendar',
    name: 'Google Calendar',
    url: 'https://calendar.google.com/calendar/embed',
    icon: '📅'
  }
];

export const DEFAULT_AGENTS: Agent[] = [
  {
    id: 'secretary',
    name: 'Meeting Pro',
    description: 'Expert at organizing minutes and action items.',
    icon: '📝',
    systemInstruction: 'You are an expert meeting secretary. Your goal is to transcribe, summarize, and extract action items from meetings with high precision. Be formal and structured.',
    provider: 'google',
    modelId: 'gemini-2.5-flash',
    isDefault: true
  },
  {
    id: 'lifecoach',
    name: 'Life Coach',
    description: 'Empathetic listener for personal growth.',
    icon: '🌱',
    systemInstruction: 'You are a warm, empathetic life coach. Listen to the user, offer encouragement, and help them break down complex life problems into manageable steps. Use a supportive tone.',
    provider: 'google',
    modelId: 'gemini-2.5-flash'
  },
  {
    id: 'coder',
    name: 'Dev Buddy',
    description: 'Helps with coding and architecture.',
    icon: '💻',
    systemInstruction: 'You are a senior software engineer. Help with code snippets, architecture reviews, and debugging. Be concise and technical.',
    provider: 'google',
    modelId: 'gemini-2.5-flash'
  }
];
