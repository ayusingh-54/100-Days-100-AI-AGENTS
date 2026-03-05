# AI Co-Browser Chatbot — Complete In-Depth Technical Documentation

## Table of Contents

1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Architecture — How It All Connects](#architecture--how-it-all-connects)
4. [Complete Data Flow — Step by Step](#complete-data-flow--step-by-step)
5. [Frontend — ChatWidget Component](#frontend--chatwidget-component)
6. [Frontend — useChat Hook (Brain of the Client)](#frontend--usechat-hook-brain-of-the-client)
7. [How DOM Context Extraction Works](#how-dom-context-extraction-works)
8. [Backend — Express Server API Route](#backend--express-server-api-route)
9. [OpenAI Function Calling — The Core Magic](#openai-function-calling--the-core-magic)
10. [How Scrolling Works](#how-scrolling-works)
11. [How Highlighting Works](#how-highlighting-works)
12. [How Navigation Works](#how-navigation-works)
13. [How Click & Input Tools Work](#how-click--input-tools-work)
14. [CSS Highlight Animation](#css-highlight-animation)
15. [Shared Type Safety (Zod + TypeScript)](#shared-type-safety-zod--typescript)
16. [Session Management](#session-management)
17. [Error Handling & Fallback Messages](#error-handling--fallback-messages)
18. [Deployment — Vercel Serverless vs Express](#deployment--vercel-serverless-vs-express)
19. [Complete Request-Response Lifecycle Diagram](#complete-request-response-lifecycle-diagram)
20. [Summary](#summary)

---

## Overview

The **AI Co-Browser** is an AI-powered chatbot embedded into a portfolio website. What makes it special is that it doesn't just _answer questions_ — it can **physically control the web page** the user is viewing. It can:

- **Scroll** the page up or down
- **Navigate** to specific sections (like Projects, Skills, Contact)
- **Highlight** any element on the page with a glowing animation
- **Click** buttons or links
- **Type** text into form fields

This is called **"co-browsing"** — the AI and user browse the same page together, with the AI acting as a guide.

---

## Technology Stack

### Frontend

| Technology               | Purpose                 | Why It's Used                                                |
| ------------------------ | ----------------------- | ------------------------------------------------------------ |
| **React 18**             | UI framework            | Component-based architecture, state management with hooks    |
| **TypeScript**           | Type safety             | Catches bugs at compile time, better developer experience    |
| **Vite 7**               | Build tool & dev server | Extremely fast HMR (Hot Module Replacement), ES module based |
| **TailwindCSS**          | Styling                 | Utility-first CSS, rapid UI development                      |
| **Framer Motion**        | Animations              | Smooth open/close animations for the chat widget             |
| **TanStack React Query** | Server state management | Handles API mutations, loading states, caching               |
| **Wouter**               | Client-side routing     | Lightweight alternative to React Router                      |
| **Lucide React**         | Icons                   | Clean, consistent icon set (MessageCircle, Send, etc.)       |
| **Radix UI + shadcn/ui** | UI components           | Accessible, unstyled primitives with beautiful defaults      |

### Backend

| Technology      | Purpose           | Why It's Used                                             |
| --------------- | ----------------- | --------------------------------------------------------- |
| **Express 5**   | HTTP server       | Handles API routes, serves static files                   |
| **Node.js**     | Runtime           | JavaScript on the server                                  |
| **TypeScript**  | Type safety       | Shared types between frontend and backend                 |
| **tsx**         | TypeScript runner | Runs `.ts` files directly without a separate compile step |
| **OpenAI SDK**  | AI integration    | Communicates with GPT-4o model                            |
| **Drizzle ORM** | Database access   | Type-safe SQL queries, schema migrations                  |
| **PostgreSQL**  | Database          | Stores messages, projects, skills, experience             |
| **Zod**         | Schema validation | Validates API request/response shapes                     |

### AI

| Technology           | Purpose        | Why It's Used                                                        |
| -------------------- | -------------- | -------------------------------------------------------------------- |
| **OpenAI GPT-4o**    | Language model | Understands user intent, decides which actions to take               |
| **Function Calling** | Tool execution | Allows GPT to return structured JSON tool calls instead of just text |

---

## Architecture — How It All Connects

```
┌─────────────────────────────────────────────────────────┐
│                     BROWSER (Client)                     │
│                                                          │
│  ┌──────────────┐    ┌─────────────────────────────┐    │
│  │  ChatWidget   │───▶│  useChat Hook                │    │
│  │  (React UI)   │    │  - Extracts DOM text          │    │
│  │              │◀───│  - Sends to server             │    │
│  │  Shows       │    │  - Executes tool calls         │    │
│  │  messages    │    │    (scroll, highlight, etc.)   │    │
│  └──────────────┘    └──────────┬──────────────────┘    │
│                                  │                        │
│         DOM MANIPULATION         │  HTTP POST /api/chat   │
│    (scrollIntoView, classList)   │                        │
└──────────────────────────────────┼────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────┐
│                     SERVER (Backend)                      │
│                                                           │
│  ┌─────────────────┐    ┌──────────────────────────┐    │
│  │  Express Route   │───▶│  OpenAI API               │    │
│  │  POST /api/chat  │    │  GPT-4o + Function Calling│    │
│  │                  │◀───│                            │    │
│  │  - Validates     │    │  Returns:                  │    │
│  │  - Stores msgs   │    │  - Text response           │    │
│  │  - Returns JSON  │    │  - Tool call (optional)    │    │
│  └────────┬─────────┘    └──────────────────────────┘    │
│           │                                               │
│           ▼                                               │
│  ┌─────────────────┐                                     │
│  │  PostgreSQL DB   │                                     │
│  │  (Drizzle ORM)   │                                     │
│  │  - messages      │                                     │
│  │  - projects      │                                     │
│  │  - skills        │                                     │
│  └─────────────────┘                                     │
└──────────────────────────────────────────────────────────┘
```

---

## Complete Data Flow — Step by Step

Here's exactly what happens when a user types **"Show me the projects section"**:

### Step 1: User Types Message

The user types in the `ChatWidget` input field and presses Enter.

### Step 2: Message Added to UI

The `handleSubmit` function in `ChatWidget.tsx` immediately adds the user message to the local `messages` state, so it appears in the chat instantly (optimistic UI).

### Step 3: DOM Context Extracted

The `useChat` hook calls `extractVisibleText()` which:

- Clones the entire `document.body`
- Strips out `<script>`, `<style>`, `<noscript>`, and `aria-hidden` elements
- Extracts all visible text content
- Trims and limits to 5,000 characters
- This text is sent to the server so the AI knows what's currently on screen

### Step 4: HTTP POST to Server

A `fetch()` call sends a JSON payload to `POST /api/chat`:

```json
{
  "message": "Show me the projects section",
  "context": "Ayush Kumar Full Stack Developer React Node.js ... Projects ...",
  "sessionId": "session-abc123"
}
```

### Step 5: Server Processes Request

The Express server:

1. Validates the request body with Zod
2. Saves the user message to PostgreSQL
3. Retrieves the last 20 messages for conversation history
4. Constructs a system prompt with the DOM context
5. Calls OpenAI's Chat Completions API with **function calling tools**

### Step 6: OpenAI Decides

GPT-4o analyzes the message, the DOM context, and conversation history. It decides:

- **Text response**: `"Sure! Taking you to the projects section."`
- **Tool call**: `navigateTo({ sectionId: "#projects" })`

It returns BOTH — a friendly message AND a structured tool call.

### Step 7: Server Returns Response

The server sends back JSON:

```json
{
  "response": "Sure! Taking you to the projects section.",
  "toolCall": {
    "name": "navigateTo",
    "args": { "sectionId": "#projects" }
  }
}
```

### Step 8: Client Executes Tool

The `useChat` hook receives this response and:

1. Calls `executeTool("navigateTo", { sectionId: "#projects" })`
2. This finds the DOM element with `id="projects"`
3. Calls `element.scrollIntoView({ behavior: 'smooth', block: 'start' })`
4. The page smoothly scrolls to the projects section

### Step 9: Message Displayed

The `ChatWidget` adds `"Sure! Taking you to the projects section."` as an assistant bubble in the chat.

**The user sees BOTH**: the chat message AND the page scrolling simultaneously.

---

## Frontend — ChatWidget Component

**File**: `client/src/components/ChatWidget.tsx`

This is the visual chat interface — a floating widget in the bottom-right corner.

### Key Technologies Used:

- **React `useState`** — Manages open/closed state, messages list, input value
- **React `useRef`** — References the bottom of the message list for auto-scrolling
- **React `useEffect`** — Auto-scrolls to the latest message whenever messages change
- **Framer Motion `AnimatePresence` + `motion.div`** — Smooth open/close animation
- **Lucide Icons** — `MessageCircle`, `Send`, `Sparkles`, `Loader2`, `X`, `ChevronDown`

### Component Structure:

```tsx
<div className="fixed bottom-6 right-6 z-50">
  {" "}
  // Fixed position, always visible
  {/* Chat Panel (conditionally rendered with animation) */}
  <AnimatePresence>
    {isOpen && (
      <motion.div>
        {" "}
        // Animated container
        {/* Header */}
        <div>Portfolio Assistant | Co-browsing active</div>
        {/* Message List */}
        <div className="flex-1 overflow-y-auto">
          {messages.map((msg) => (
            <div
              className={
                msg.role === "user"
                  ? "ml-auto bg-primary"
                  : "mr-auto bg-secondary"
              }
            >
              {msg.content}
            </div>
          ))}
          {isPending && <TypingIndicator />} // Three bouncing dots
        </div>
        {/* Input Form */}
        <form onSubmit={handleSubmit}>
          <input placeholder="Ask me to navigate or highlight..." />
          <button type="submit">
            <Send />
          </button>

          {/* Quick suggestion chips */}
          {["Go to projects", "My skills", "Contact info"].map((s) => (
            <button onClick={() => setInputValue(s)}>{s}</button>
          ))}
        </form>
      </motion.div>
    )}
  </AnimatePresence>
  {/* Toggle Button (always visible) */}
  <motion.button onClick={() => setIsOpen(!isOpen)}>
    {isOpen ? <X /> : <MessageCircle />}
  </motion.button>
</div>
```

### How `handleSubmit` Works (Code Explained):

```tsx
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault(); // Prevent page reload
  if (!inputValue.trim() || isPending) return; // Don't send empty or while loading

  // 1. Create user message object
  const userMsg: ChatMessage = {
    id: Date.now().toString(), // Unique ID using timestamp
    role: "user",
    content: inputValue,
  };

  // 2. Add to UI immediately (optimistic update)
  setMessages((prev) => [...prev, userMsg]);
  setInputValue(""); // Clear input field

  // 3. Send to server via useChat hook
  sendMessage(userMsg.content, {
    onSuccess: (data) => {
      if (data.response) {
        // If server returned text
        const aiMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.response,
        };
        setMessages((prev) => [...prev, aiMsg]); // Add AI response to chat
      }
      // Note: Tool execution already happened inside useChat hook
    },
    onError: () => {
      // Show error message in chat
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Sorry, I had trouble processing that request.",
        },
      ]);
    },
  });
};
```

---

## Frontend — useChat Hook (Brain of the Client)

**File**: `client/src/hooks/use-chat.ts`

This is the most important frontend file. It handles:

1. Extracting the current page content (DOM text)
2. Sending messages to the backend API
3. **Executing tool calls** (scroll, highlight, navigate, click, input)

### Key Technologies:

- **TanStack React Query `useMutation`** — Handles the async POST request with loading/error states
- **DOM APIs** — `document.getElementById()`, `element.scrollIntoView()`, `element.classList`, `window.scrollBy()`
- **Fetch API** — Sends HTTP requests to the server
- **Zod `.parse()`** — Validates the server response matches the expected shape

### The `useMutation` Pattern:

```tsx
export function useChat() {
  // Generate a unique session ID that persists across re-renders
  const sessionId = useRef(
    `session-${Math.random().toString(36).substring(7)}`,
  ).current;

  return useMutation({
    mutationFn: async (message: string) => {
      // 1. Extract what's visible on page
      const context = extractVisibleText();

      // 2. Build request payload
      const payload: ChatRequest = { message, context, sessionId };

      // 3. Send to server
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // 4. Parse & validate response
      const data = api.chat.sendMessage.responses[200].parse(await res.json());

      // 5. Execute tool call if present (THIS is where scrolling/highlighting happens)
      if (data.toolCall) {
        await executeTool(data.toolCall.name, data.toolCall.args);
      }

      return data; // ChatWidget uses this in onSuccess callback
    },
  });
}
```

---

## How DOM Context Extraction Works

**The AI needs to know what's on the page to give intelligent answers.** Here's how the app captures that:

```tsx
function extractVisibleText(): string {
  const body = document.body;

  // 1. Clone the entire page DOM (don't modify the real page!)
  const clone = body.cloneNode(true) as HTMLElement;

  // 2. Remove noise — scripts, styles, hidden elements
  const scripts = clone.querySelectorAll(
    'script, style, noscript, [aria-hidden="true"]',
  );
  scripts.forEach((el) => el.remove());

  // 3. Extract all remaining text
  return (clone.textContent || "")
    .replace(/\s+/g, " ") // Collapse multiple whitespace into single space
    .trim() // Remove leading/trailing whitespace
    .slice(0, 5000); // Limit to 5000 chars (OpenAI token budget)
}
```

**Why clone first?** If we modify `document.body` directly, we'd delete scripts and styles from the live page. Cloning lets us strip noise from the copy without affecting the user's view.

**What the server receives** (example context):

```
"Ayush Kumar Full Stack Developer I build modern web applications with React,
Node.js and cloud technologies. About Me I'm a passionate developer...
Skills Frontend React TypeScript JavaScript... Projects AI Co-Browser
An AI-powered portfolio... Contact Get in touch email@example.com..."
```

This text is injected into the system prompt so GPT-4o knows exactly what sections, projects, skills, etc. are visible on the page.

---

## Backend — Express Server API Route

**File**: `server/routes.ts`

### Route Registration:

```tsx
app.post("/api/chat", async (req, res) => {
  // 1. VALIDATE — Zod ensures correct shape
  const { message, context, sessionId } = api.chat.sendMessage.input.parse(
    req.body,
  );
  //    If invalid, Zod throws and Express returns 400

  // 2. STORE — Save user message to PostgreSQL
  await storage.createMessage("user", message, sessionId);

  // 3. RETRIEVE — Get conversation history (last 20 messages)
  const history = await storage.getMessages(sessionId);

  // 4. PROMPT — Build the system prompt with DOM context
  const systemPrompt = `You are a helpful portfolio assistant...
    Here is the current visible content on the page (DOM text):
    ---
    ${context.slice(0, 5000)}
    ---
    Available sections IDs: #home, #about, #skills, #experience, #projects, #contact.
    IMPORTANT: Always include a short, friendly text response along with any tool call.`;

  // 5. CALL OPENAI — With tools and history
  const completion = await openaiClient.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      ...history.map((msg) => ({ role: msg.role, content: msg.content })),
    ],
    tools, // Array of 5 function definitions (see below)
    tool_choice: "auto", // Let GPT decide when to use tools
  });

  // 6. EXTRACT — Get text + optional tool call from response
  const choice = completion.choices[0];
  const toolCall = choice.message.tool_calls?.[0];
  const content = choice.message.content;

  // 7. FALLBACK — Generate message if model only returned a tool call
  let responseText = content || "";
  if (toolCall && !content) {
    responseText = fallbackMessages[toolCall.function.name] || "On it!";
  }

  // 8. STORE — Save assistant response
  await storage.createMessage("assistant", responseText, sessionId);

  // 9. RESPOND — Send JSON back to the client
  if (toolCall) {
    res.json({
      response: responseText,
      toolCall: {
        name: toolCall.function.name,
        args: JSON.parse(toolCall.function.arguments),
      },
    });
  } else {
    res.json({ response: responseText });
  }
});
```

---

## OpenAI Function Calling — The Core Magic

This is the **key technology** that makes co-browsing possible. Without this, the AI could only return text. With function calling, it can return **structured actions**.

### What is Function Calling?

OpenAI's `tools` parameter lets you define **functions the model can invoke**. The model doesn't execute them — it returns a JSON object describing _which function to call_ and _with what arguments_. Your code then executes it.

### The 5 Tools Defined:

```typescript
const tools = [
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
          sectionId: {
            type: "string",
            description: "The ID of the section (e.g., #projects)",
          },
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
          selector: {
            type: "string",
            description: "CSS selector of the element to highlight",
          },
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
          selector: {
            type: "string",
            description: "CSS selector of the element to click",
          },
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
          selector: {
            type: "string",
            description: "CSS selector of the input element",
          },
          text: { type: "string", description: "The text to input" },
        },
        required: ["selector", "text"],
      },
    },
  },
];
```

### How GPT Decides:

When `tool_choice: "auto"` is set, GPT-4o reads the user message and decides:

| User says...                  | GPT returns...                                 |
| ----------------------------- | ---------------------------------------------- |
| "Show me projects"            | `navigateTo({ sectionId: "#projects" })`       |
| "Scroll down"                 | `scroll({ direction: "down" })`                |
| "Highlight the first project" | `highlightElement({ selector: "#project-1" })` |
| "What skills do you have?"    | Just text (no tool call)                       |
| "Click the contact button"    | `clickElement({ selector: "#contact-btn" })`   |

### What the OpenAI Response Looks Like:

```json
{
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "Sure! Taking you to the projects section.",
        "tool_calls": [
          {
            "id": "call_abc123",
            "type": "function",
            "function": {
              "name": "navigateTo",
              "arguments": "{\"sectionId\":\"#projects\"}"
            }
          }
        ]
      }
    }
  ]
}
```

The server extracts `content` (text response) and `tool_calls[0]` (action), then sends both to the client.

---

## How Scrolling Works

### Tool: `scroll`

When the AI decides to scroll, here's the complete path:

**1. GPT returns:**

```json
{ "toolCall": { "name": "scroll", "args": { "direction": "down" } } }
```

**2. Client calls `executeTool("scroll", { direction: "down" })`:**

```typescript
case 'scroll': {
  const direction = args.direction === 'up' ? -1 : 1;  // up = -1, down = +1
  const amount = args.amount || 600;                      // Default 600px
  window.scrollBy({
    top: direction * amount,    // +600 for down, -600 for up
    behavior: 'smooth'          // Smooth animation (not instant jump)
  });
  break;
}
```

**3. Browser API used: `window.scrollBy()`**

- This is a native Web API
- `behavior: 'smooth'` triggers CSS smooth scrolling
- Scrolls relative to current position (not absolute)

---

## How Highlighting Works

### Tool: `highlightElement`

This is the most visually impressive feature. Here's exactly how it works:

**1. GPT returns:**

```json
{
  "toolCall": {
    "name": "highlightElement",
    "args": { "selector": "project-1" }
  }
}
```

**2. Client calls `executeTool("highlightElement", { selector: "project-1" })`:**

```typescript
case 'highlightElement': {
  const selector = args.selector;
  try {
    // Try to find by ID first, then by CSS selector
    const element = document.getElementById(selector)
                 || document.querySelector(selector);

    if (element) {
      // Step 1: Scroll the element into view (centered on screen)
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Step 2: Add the highlight CSS class
      element.classList.add('ai-highlight');

      // Step 3: Remove the highlight after 4 seconds
      setTimeout(() => {
        element.classList.remove('ai-highlight');
      }, 4000);
    }
  } catch (e) {
    console.warn("Invalid selector for highlight", selector);
  }
  break;
}
```

**3. The CSS class `ai-highlight` is defined in `client/src/index.css`:**

```css
.ai-highlight {
  position: relative;
  z-index: 50; /* Bring to front */
  animation: highlight-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  outline: 2px solid hsl(var(--primary)); /* Colored border */
  box-shadow: 0 0 20px -5px hsl(var(--primary) / 0.5); /* Glowing shadow */
  background-color: hsl(var(--primary) / 0.1); /* Subtle tint */
  border-radius: 4px; /* Rounded corners */
  transition: all 0.3s ease; /* Smooth transition */
}

@keyframes highlight-pulse {
  0%,
  100% {
    opacity: 1;
  } /* Fully visible */
  50% {
    opacity: 0.7;
  } /* Slightly faded */
}
```

**4. Visual Result:**

- The element **scrolls into the center** of the viewport
- A **glowing primary-colored outline** appears around it
- The outline **pulses** (fades in and out) for 4 seconds
- After 4 seconds, the class is removed and the element returns to normal

### Key Browser APIs Used:

| API                                                               | Purpose                                                  |
| ----------------------------------------------------------------- | -------------------------------------------------------- |
| `document.getElementById(selector)`                               | Find element by its HTML id attribute                    |
| `document.querySelector(selector)`                                | Find element by any CSS selector (class, tag, attribute) |
| `element.scrollIntoView({ behavior: 'smooth', block: 'center' })` | Smoothly scroll until the element is centered on screen  |
| `element.classList.add('ai-highlight')`                           | Add a CSS class to the element (triggers the glow)       |
| `element.classList.remove('ai-highlight')`                        | Remove the CSS class (removes the glow)                  |
| `setTimeout(fn, 4000)`                                            | Schedule the class removal after 4000ms                  |

---

## How Navigation Works

### Tool: `navigateTo`

Navigation scrolls to a page section by its HTML `id` attribute.

**1. GPT returns:**

```json
{ "toolCall": { "name": "navigateTo", "args": { "sectionId": "#projects" } } }
```

**2. Client executes:**

```typescript
case 'navigateTo': {
  const sectionId = args.sectionId.replace('#', '');   // "#projects" → "projects"
  const element = document.getElementById(sectionId);   // Find <section id="projects">
  if (element) {
    element.scrollIntoView({
      behavior: 'smooth',   // Animated scroll
      block: 'start'        // Align to top of viewport
    });
  }
  break;
}
```

**3. Available Sections:**
The portfolio has these section IDs in the HTML:

- `#home` — Hero/landing section
- `#about` — About me section
- `#skills` — Skills & technologies
- `#experience` — Work experience
- `#projects` — Portfolio projects
- `#contact` — Contact form/info

The AI knows these IDs because they're listed in the system prompt:

```
Available sections IDs: #home, #about, #skills, #experience, #projects, #contact.
```

---

## How Click & Input Tools Work

### Tool: `clickElement`

```typescript
case 'clickElement': {
  const selector = args.selector;
  const element = document.querySelector(selector) as HTMLElement;
  if (element) {
    element.click();                              // Programmatically click
    element.classList.add('ai-highlight');         // Brief highlight
    setTimeout(() => element.classList.remove('ai-highlight'), 1000); // Remove after 1s
  }
  break;
}
```

- Uses `element.click()` — the standard DOM API to simulate a mouse click
- Also briefly highlights the clicked element for visual feedback

### Tool: `inputText`

Defined in the OpenAI tools but executed on the client side to type text into form fields:

- Finds the input element via `document.querySelector(selector)`
- Sets its `.value` property
- Dispatches an `input` event so React's state management picks up the change

---

## CSS Highlight Animation

**File**: `client/src/index.css`

The entire highlight visual effect is CSS-only (no JavaScript animation libraries):

```css
/* Co-browsing highlighter animation */
.ai-highlight {
  @apply relative z-50;
  animation: highlight-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  outline: 2px solid hsl(var(--primary));
  box-shadow: 0 0 20px -5px hsl(var(--primary) / 0.5);
  background-color: hsl(var(--primary) / 0.1);
  border-radius: 4px;
  transition: all 0.3s ease;
}

@keyframes highlight-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}
```

### Breakdown:

| Property                                      | What It Does                                                                     |
| --------------------------------------------- | -------------------------------------------------------------------------------- |
| `z-50`                                        | TailwindCSS utility — sets `z-index: 50` so the element appears above everything |
| `animation: highlight-pulse 2s`               | Plays the `highlight-pulse` keyframe animation every 2 seconds, infinitely       |
| `cubic-bezier(0.4, 0, 0.6, 1)`                | Easing function — smooth acceleration and deceleration                           |
| `outline: 2px solid hsl(var(--primary))`      | A 2px colored border around the element                                          |
| `box-shadow: 0 0 20px -5px`                   | A glowing shadow effect around the element                                       |
| `background-color: hsl(var(--primary) / 0.1)` | A very subtle semi-transparent background tint                                   |
| `border-radius: 4px`                          | Rounded corners on the outline                                                   |
| `transition: all 0.3s ease`                   | Smooth transition when the class is added/removed                                |
| `highlight-pulse`                             | Alternates opacity between 1.0 and 0.7 — creates a "breathing" effect            |

---

## Shared Type Safety (Zod + TypeScript)

**File**: `shared/schema.ts` + `shared/routes.ts`

The project uses a shared type system between frontend and backend.

### Types (shared/schema.ts):

```typescript
export type ChatRequest = {
  message: string; // User's message text
  context: string; // DOM text content (what's on screen)
  sessionId: string; // Unique session identifier
};

export type ChatResponse = {
  response?: string; // AI's text reply (may be absent)
  toolCall?: {
    // Optional tool call
    name: string; // "scroll" | "navigateTo" | "highlightElement" | etc.
    args: Record<string, any>; // Tool-specific arguments
  };
};
```

### API Route Definition (shared/routes.ts):

```typescript
export const api = {
  chat: {
    sendMessage: {
      method: "POST" as const,
      path: "/api/chat" as const,
      input: z.object({
        // Zod schema for request validation
        message: z.string(),
        context: z.string(),
        sessionId: z.string(),
      }),
      responses: {
        200: z.object({
          // Zod schema for response validation
          response: z.string().optional(),
          toolCall: z
            .object({
              name: z.string(),
              args: z.record(z.any()),
            })
            .optional(),
        }),
      },
    },
  },
};
```

**Why Zod?**

- On the **server**: `api.chat.sendMessage.input.parse(req.body)` — validates the request body. If `message` is missing or not a string, Zod throws an error → 400 response.
- On the **client**: `api.chat.sendMessage.responses[200].parse(data)` — validates the response. If the server returns an unexpected shape, the client catches it early.

This provides **runtime type safety** — TypeScript catches type errors at compile time, Zod catches them at runtime.

---

## Session Management

Each chat session is identified by a unique `sessionId`:

```typescript
const sessionId = useRef(
  `session-${Math.random().toString(36).substring(7)}`,
).current;
```

- `Math.random().toString(36)` — Generates a random number and converts to base-36 (0-9 + a-z)
- `.substring(7)` — Takes a short substring like `"k5f2m"`
- Result: `"session-k5f2m"`
- `useRef(...)` — Ensures the ID persists across React re-renders (doesn't change)

### How Sessions Work:

1. Each browser tab gets a unique `sessionId`
2. Every message sent includes the `sessionId`
3. The server stores messages tagged with `sessionId`
4. When building conversation history, only messages from the same session are retrieved
5. This gives GPT-4o conversational context without mixing different users' chats

---

## Error Handling & Fallback Messages

### Problem:

When OpenAI returns a tool call, it sometimes omits the text `content` field. This means the user would see **no chat message** — only the action happening silently.

### Solution (3-layer fallback):

**Layer 1 — System Prompt** (server-side):

```
IMPORTANT: You MUST ALWAYS include a short, friendly text response along with
any tool call. Never just call a tool silently.
```

**Layer 2 — Server Fallback** (server-side):

```typescript
if (toolCall && !content) {
  const fallbackMessages: Record<string, string> = {
    scroll: `Scrolling ${args.direction || "down"} for you!`,
    navigateTo: `Sure! Taking you to the ${args.sectionId?.replace("#", "")} section.`,
    highlightElement: `Let me highlight that for you!`,
    clickElement: `Clicking that element for you!`,
    inputText: `Filling in the text for you!`,
  };
  responseText = fallbackMessages[toolCall.function.name] || "On it!";
}
```

**Layer 3 — Client Fallback** (client-side):

```typescript
if (data.toolCall && !data.response) {
  const fallbackMessages: Record<string, string> = {
    scroll: `Scrolling ${data.toolCall.args.direction || 'down'} for you!`,
    navigateTo: `Sure! Taking you to the ${(data.toolCall.args.sectionId || '').replace('#', '')} section.`,
    highlightElement: `Let me highlight that for you!`,
    ...
  };
  data.response = fallbackMessages[data.toolCall.name] || "Done! Action performed.";
}
```

This ensures the user **always** sees a chat message, no matter what.

---

## Deployment — Vercel Serverless vs Express

The project supports **two deployment modes**:

### 1. Local Development / Self-Hosted (Express)

**File**: `server/routes.ts`

- Full Express server running on `http://localhost:5000`
- PostgreSQL database for persistent storage
- Vite dev server proxied through Express for HMR

### 2. Vercel Deployment (Serverless)

**File**: `api/chat.ts`

- Each API route is a standalone serverless function
- No database — uses in-memory store (resets on cold start)
- Fully self-contained (no cross-file imports)
- The file exports a `handler(req, res)` function that Vercel calls

```typescript
// api/chat.ts — Vercel serverless function
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Same logic as Express route, but self-contained
  // In-memory message store instead of PostgreSQL
}
```

Both files contain the **same AI logic** — system prompt, tools definition, OpenAI call, fallback handling.

---

## Complete Request-Response Lifecycle Diagram

```
User types: "Highlight the AI Co-Browser project"
│
├─ 1. ChatWidget.handleSubmit()
│     ├─ Add user message to UI (optimistic)
│     └─ Call sendMessage("Highlight the AI Co-Browser project")
│
├─ 2. useChat.mutationFn()
│     ├─ extractVisibleText() → "Ayush Kumar ... Projects: AI Co-Browser ..."
│     ├─ Build payload: { message, context, sessionId }
│     └─ fetch('POST /api/chat', payload)
│
├─ 3. Express Route (server/routes.ts)
│     ├─ Zod validation ✓
│     ├─ Save user message to PostgreSQL
│     ├─ Get last 20 messages for history
│     ├─ Build system prompt with DOM context
│     └─ Call OpenAI API
│
├─ 4. OpenAI GPT-4o
│     ├─ Reads system prompt (knows page content + available tools)
│     ├─ Reads user message: "Highlight the AI Co-Browser project"
│     ├─ Decides: This requires the highlightElement tool
│     └─ Returns:
│          content: "Let me highlight the AI Co-Browser project for you!"
│          tool_calls: [{ name: "highlightElement", args: { selector: "#project-ai-co-browser" } }]
│
├─ 5. Express Route (continued)
│     ├─ Extract content + toolCall from response
│     ├─ Save assistant message to PostgreSQL
│     └─ Return JSON: { response: "Let me highlight...", toolCall: { name: "highlightElement", args: {...} } }
│
├─ 6. useChat.mutationFn() (continued)
│     ├─ Parse response with Zod
│     ├─ executeTool("highlightElement", { selector: "#project-ai-co-browser" })
│     │     ├─ document.getElementById("project-ai-co-browser")
│     │     ├─ element.scrollIntoView({ behavior: 'smooth', block: 'center' })
│     │     ├─ element.classList.add('ai-highlight')  ← GLOW STARTS
│     │     └─ setTimeout(() => classList.remove('ai-highlight'), 4000)  ← GLOW ENDS AFTER 4s
│     └─ Return data
│
├─ 7. ChatWidget.onSuccess()
│     └─ Add "Let me highlight the AI Co-Browser project for you!" to messages
│
└─ 8. USER SEES:
       ├─ Chat bubble: "Let me highlight the AI Co-Browser project for you!"
       ├─ Page scrolls to the project card
       └─ Project card glows with pulsing outline for 4 seconds
```

---

## Summary

| Component             | Technology                                              | What It Does                                                            |
| --------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------- |
| **Chat UI**           | React + Framer Motion + TailwindCSS                     | Floating chat widget with animations, message bubbles, typing indicator |
| **State Management**  | TanStack React Query `useMutation`                      | Handles async API calls, loading states, error handling                 |
| **DOM Context**       | Native DOM APIs (`cloneNode`, `textContent`)            | Scrapes visible page text to give AI context                            |
| **API Communication** | Fetch API + Zod validation                              | Type-safe HTTP requests between client and server                       |
| **Server**            | Express 5 + TypeScript                                  | Handles API routes, validates input, stores messages                    |
| **Database**          | PostgreSQL + Drizzle ORM                                | Persistent storage for messages and conversation history                |
| **AI Brain**          | OpenAI GPT-4o + Function Calling                        | Understands user intent, returns text + structured tool calls           |
| **Scrolling**         | `window.scrollBy()` + `element.scrollIntoView()`        | Native browser smooth scrolling                                         |
| **Highlighting**      | `element.classList.add('ai-highlight')` + CSS animation | Adds a glowing outline with pulsing animation                           |
| **Navigation**        | `document.getElementById()` + `scrollIntoView()`        | Finds sections by ID and scrolls to them                                |
| **Clicking**          | `element.click()`                                       | Programmatically triggers click events                                  |
| **Type Safety**       | TypeScript + Zod                                        | Compile-time and runtime type checking across entire stack              |
| **Session Tracking**  | `useRef` + random ID                                    | Links messages to sessions for conversation history                     |
| **Fallback System**   | System prompt + server fallback + client fallback       | Ensures the user always sees a chat response with tool actions          |

The core innovation is using **OpenAI Function Calling** to bridge the gap between natural language ("show me your projects") and **DOM manipulation** (`element.scrollIntoView()`). The AI doesn't directly interact with the page — it returns structured JSON instructions that the client-side JavaScript executes using standard browser APIs.
