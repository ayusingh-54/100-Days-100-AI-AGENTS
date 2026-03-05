import { z } from 'zod';
import type { Project, Skill, Experience, ChatRequest, ChatResponse } from './schema';

export type { ChatRequest, ChatResponse };

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  portfolio: {
    get: {
      method: 'GET' as const,
      path: '/api/portfolio' as const,
      responses: {
        200: z.object({
          projects: z.array(z.any()),
          skills: z.array(z.any()),
          experience: z.array(z.any()),
        }),
      },
    },
  },
  chat: {
    sendMessage: {
      method: 'POST' as const,
      path: '/api/chat' as const,
      input: z.object({
        message: z.string(),
        context: z.string(),
        sessionId: z.string(),
      }),
      responses: {
        200: z.object({
          response: z.string().optional(),
          toolCall: z.object({
            name: z.string(),
            args: z.record(z.any()),
          }).optional(),
        }),
        500: errorSchemas.internal,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
