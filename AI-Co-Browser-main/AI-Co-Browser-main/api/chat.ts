// Vercel Serverless Function: POST /api/chat
// Fully self-contained — no cross-file imports (Vercel bundles each function independently)
import type { VercelRequest, VercelResponse } from "@vercel/node";
import OpenAI from "openai";

// In-memory message store (resets per cold start — fine for demo)
interface Message { id: number; role: string; content: string; sessionId: string; }
const messagesStore: Message[] = [];
let nextId = 1;

function getMessages(sessionId: string) {
  return messagesStore.filter(m => m.sessionId === sessionId).slice(-20);
}
function createMessage(role: string, content: string, sessionId: string): Message {
  const msg: Message = { id: nextId++, role, content, sessionId };
  messagesStore.push(msg);
  return msg;
}

const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ message: "OPENAI_API_KEY environment variable is not set" });
  }

  try {
    const { message, context, sessionId } = req.body;

    if (!message || !context || !sessionId) {
      return res.status(400).json({ message: "Missing required fields: message, context, sessionId" });
    }

    // Save user message
    createMessage("user", message, sessionId);

    // Get history
    const history = getMessages(sessionId);

    const systemPrompt = `You are a helpful portfolio assistant. You are currently co-browsing the portfolio website with the user.
      
      Here is the current visible content on the page (DOM text):
      ---
      ${context.slice(0, 5000)}
      ---

      Your goal is to help the user navigate the portfolio, answer questions about the projects/skills/experience shown, and perform actions like scrolling or highlighting.
      
      If the user asks to see a specific section, use the 'navigateTo' tool.
      If the user asks about a specific project, use 'highlightElement' to point it out if it's visible, or 'navigateTo' to the projects section first.
      
      Available sections IDs: #home, #about, #skills, #experience, #projects, #contact.
      
      IMPORTANT: You MUST ALWAYS include a short, friendly text response along with any tool call. For example, if the user says "show me projects", call navigateTo AND reply with something like "Sure! Taking you to the projects section." Never just call a tool silently — the user should always see a conversational message in the chat. Keep responses brief (1-2 sentences max).
      
      Be concise and friendly.`;

    const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
      {
        type: "function",
        function: {
          name: "scroll",
          description: "Scroll the page up or down",
          parameters: {
            type: "object",
            properties: {
              direction: { type: "string", enum: ["up", "down"] },
            },
            required: ["direction"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "navigateTo",
          description: "Scroll to a specific section",
          parameters: {
            type: "object",
            properties: {
              sectionId: { type: "string", description: "The ID of the section (e.g., #projects)" },
            },
            required: ["sectionId"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "highlightElement",
          description: "Highlight a specific element on the page",
          parameters: {
            type: "object",
            properties: {
              selector: { type: "string", description: "CSS selector of the element to highlight" },
            },
            required: ["selector"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "clickElement",
          description: "Click a specific element on the page",
          parameters: {
            type: "object",
            properties: {
              selector: { type: "string", description: "CSS selector of the element to click" },
            },
            required: ["selector"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "inputText",
          description: "Input text into a form field",
          parameters: {
            type: "object",
            properties: {
              selector: { type: "string", description: "CSS selector of the input element" },
              text: { type: "string", description: "The text to input" },
            },
            required: ["selector", "text"],
          },
        },
      },
    ];

    const completion = await openaiClient.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        ...history.map((msg) => ({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        })),
      ],
      tools,
      tool_choice: "auto",
    });

    const choice = completion.choices[0];
    const toolCalls = choice.message.tool_calls;
    const toolCall = toolCalls?.[0] as any;
    const content = choice.message.content;

    // Generate a fallback response if the model returned a tool call without text
    let responseText = content || "";
    if (toolCall && !content) {
      const fallbackMessages: Record<string, string> = {
        scroll: `Scrolling ${JSON.parse(toolCall.function.arguments).direction || 'down'} for you!`,
        navigateTo: `Sure! Taking you to the ${JSON.parse(toolCall.function.arguments).sectionId?.replace('#', '') || 'that'} section.`,
        highlightElement: `Let me highlight that for you!`,
        clickElement: `Clicking that element for you!`,
        inputText: `Filling in the text for you!`,
      };
      responseText = fallbackMessages[toolCall.function.name] || "On it! Performing the action now.";
    }

    // Save assistant response
    createMessage("assistant", responseText, sessionId);

    if (toolCall) {
      return res.status(200).json({
        response: responseText,
        toolCall: {
          name: toolCall.function.name,
          args: JSON.parse(toolCall.function.arguments),
        },
      });
    } else {
      return res.status(200).json({ response: responseText });
    }
  } catch (err: any) {
    console.error("Chat API error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}
