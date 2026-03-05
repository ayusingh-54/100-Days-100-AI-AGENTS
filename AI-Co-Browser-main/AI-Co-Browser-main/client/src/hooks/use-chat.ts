import { useMutation } from "@tanstack/react-query";
import { api, type ChatRequest, type ChatResponse } from "@shared/routes";
import { useRef } from "react";

// Helper to extract visible text from the page for context
function extractVisibleText(): string {
  const body = document.body;
  const clone = body.cloneNode(true) as HTMLElement;
  
  // Remove scripts, styles, and hidden elements to reduce noise
  const scripts = clone.querySelectorAll('script, style, noscript, [aria-hidden="true"]');
  scripts.forEach(el => el.remove());
  
  // Get text content and clean up whitespace
  return (clone.textContent || "")
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 5000); // Limit context size
}

// Tool Execution Logic
async function executeTool(toolName: string, args: Record<string, any>) {
  console.log(`Executing tool: ${toolName}`, args);
  
  switch (toolName) {
    case 'scroll': {
      const direction = args.direction === 'up' ? -1 : 1;
      const amount = args.amount || 600;
      window.scrollBy({ top: direction * amount, behavior: 'smooth' });
      break;
    }
    
    case 'navigateTo': {
      const sectionId = args.sectionId.replace('#', '');
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      break;
    }
    
    case 'highlightElement': {
      const selector = args.selector;
      try {
        // Try to find by ID first, then generic selector
        const element = document.getElementById(selector) || document.querySelector(selector);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ai-highlight');
          setTimeout(() => {
            element.classList.remove('ai-highlight');
          }, 4000);
        }
      } catch (e) {
        console.warn("Invalid selector for highlight", selector);
      }
      break;
    }

    case 'clickElement': {
      const selector = args.selector;
      const element = document.querySelector(selector) as HTMLElement;
      if (element) {
        element.click();
        element.classList.add('ai-highlight');
        setTimeout(() => element.classList.remove('ai-highlight'), 1000);
      }
      break;
    }
    
    default:
      console.warn(`Unknown tool: ${toolName}`);
  }
}

export function useChat() {
  const sessionId = useRef(`session-${Math.random().toString(36).substring(7)}`).current;

  return useMutation({
    mutationFn: async (message: string) => {
      const context = extractVisibleText();
      
      const payload: ChatRequest = {
        message,
        context,
        sessionId
      };

      const res = await fetch(api.chat.sendMessage.path, {
        method: api.chat.sendMessage.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Failed to send message");
      
      const data = api.chat.sendMessage.responses[200].parse(await res.json());
      
      // If there's a tool call, execute it immediately
      if (data.toolCall) {
        await executeTool(data.toolCall.name, data.toolCall.args);

        // If the server didn't provide a text response, generate a fallback
        if (!data.response) {
          const fallbackMessages: Record<string, string> = {
            scroll: `Scrolling ${data.toolCall.args.direction || 'down'} for you!`,
            navigateTo: `Sure! Taking you to the ${(data.toolCall.args.sectionId || '').replace('#', '')} section.`,
            highlightElement: `Let me highlight that for you!`,
            clickElement: `Clicking that element for you!`,
            inputText: `Filling in the text for you!`,
          };
          data.response = fallbackMessages[data.toolCall.name] || "Done! Action performed.";
        }
      }

      return data;
    }
  });
}
