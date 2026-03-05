// Pure TypeScript types — no database dependency

export interface Project {
  id: number;
  title: string;
  description: string;
  techStack: string[];
  link: string | null;
  imageUrl: string | null;
}

export interface Skill {
  id: number;
  category: string;
  items: string[];
}

export interface Experience {
  id: number;
  role: string;
  company: string;
  period: string;
  description: string;
}

export interface Message {
  id: number;
  role: string;
  content: string;
  sessionId: string;
}

// API Types
export type ChatRequest = {
  message: string;
  context: string; // DOM text content
  sessionId: string;
};

export type ChatResponse = {
  response?: string;
  toolCall?: {
    name: string;
    args: Record<string, any>;
  };
};
