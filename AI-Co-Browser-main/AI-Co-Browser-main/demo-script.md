# AI Co-Browser — Demo Video Script (3 Minutes)

> **Duration**: ~3 minutes | **Format**: Screen recording with voiceover
> **Tools needed**: Screen recorder (OBS / Loom / built-in), microphone, browser, VS Code

---

## PRE-RECORDING CHECKLIST

- [ ] App running locally (`npm run dev` → `http://localhost:5000`)
- [ ] Browser open at `http://localhost:5000` (full screen)
- [ ] Chat widget visible (bottom-right corner)
- [ ] VS Code open with project files side-by-side (optional for code walkthrough)
- [ ] Screen recorder ready
- [ ] Close unnecessary tabs/notifications

---

## DEMO SCRIPT

---

### SCENE 1 — Introduction (0:00 – 0:25)

**[SCREEN: Browser showing the portfolio landing page]**

> **SAY:**
> "Hi! In this demo, I'll walk you through the **AI Co-Browser** — a full-stack portfolio website with an AI-powered co-browsing chatbot."
>
> "This is not a regular chatbot. It can actually **control the page** — scroll to sections, highlight elements, click buttons, and answer questions about the portfolio — all through natural language."
>
> "The app is built with **React, Express, TypeScript, PostgreSQL**, and uses **OpenAI GPT-4o with Function Calling** for the co-browsing intelligence."

**[ACTION: Slowly scroll through the portfolio page to show the full site — hero, about, skills, projects, contact]**

---

### SCENE 2 — Opening the Chat Widget (0:25 – 0:45)

**[SCREEN: Bottom-right corner of the page]**

> **SAY:**
> "You can see this floating chat button in the bottom-right corner. Let me open it."

**[ACTION: Click the chat bubble icon to open the widget]**

> **SAY:**
> "The widget opens with a smooth animation — powered by **Framer Motion**. You can see a welcome message and some quick suggestion chips at the bottom."
>
> "The green dot indicates **co-browsing is active** — meaning the bot can see and interact with the page."

---

### SCENE 3 — Navigation Demo (0:45 – 1:15)

**[SCREEN: Chat widget open, scroll page to the top first]**

> **SAY:**
> "Let me show the first capability — **page navigation**. I'll ask the bot to go to the projects section."

**[ACTION: Type "Show me the projects section" and press Enter]**

**[WAIT: Page scrolls smoothly to the #projects section. Chat shows a response like "Sure! Taking you to the projects section."]**

> **SAY:**
> "Notice two things happened simultaneously — the bot replied with a friendly message AND the page **automatically scrolled** to the projects section. The AI used the `navigateTo` tool with the section ID `#projects`."

**[ACTION: Type "Go to skills" and press Enter]**

**[WAIT: Page scrolls to the skills section]**

> **SAY:**
> "It works for any section — skills, experience, contact, and more."

---

### SCENE 4 — Highlight Demo (1:15 – 1:50)

> **SAY:**
> "Now let me show the **highlight** feature — the AI can visually point out specific elements on the page."

**[ACTION: Type "Highlight the first project" and press Enter]**

**[WAIT: The page scrolls to the project card and a glowing pulsing outline appears around it for about 4 seconds]**

> **SAY:**
> "See that glowing outline? The AI identified the element using a CSS selector and added an `ai-highlight` class to it. That triggers a CSS animation — a pulsing outline with a subtle glow effect. After 4 seconds, it automatically removes itself."

**[ACTION: Optionally type "Scroll down" to show the scroll tool]**

**[WAIT: Page scrolls down 600px smoothly]**

> **SAY:**
> "It can also scroll the page up or down on command."

---

### SCENE 5 — Q&A / Conversational Demo (1:50 – 2:20)

> **SAY:**
> "The bot isn't just about actions — it can also **answer questions** about the portfolio content."

**[ACTION: Type "What technologies do I work with?" and press Enter]**

**[WAIT: Bot responds with a summary of skills from the page]**

> **SAY:**
> "It reads the visible page content — extracted from the DOM in real time — and uses that as context to answer accurately. It's not guessing; it's reading what's actually on screen right now."

**[ACTION: Type "Tell me about the AI Co-Browser project" and press Enter]**

**[WAIT: Bot responds with project details and optionally highlights it]**

> **SAY:**
> "It can combine knowledge and actions — answering the question while also highlighting or navigating to the relevant element."

---

### SCENE 6 — Quick Code Architecture (2:20 – 2:50)

**[SCREEN: Switch to VS Code or split screen — show project structure briefly]**

> **SAY:**
> "Let me quickly show how this works under the hood."

**[ACTION: Open `client/src/hooks/use-chat.ts` and scroll to the `executeTool` function]**

> **SAY:**
> "On the **frontend**, the `useChat` hook extracts visible DOM text, sends it with the user message to the backend. When the server responds with a tool call, this `executeTool` function runs it — using native browser APIs like `scrollIntoView()` and `classList.add()` for highlighting."

**[ACTION: Open `server/routes.ts` and scroll to the OpenAI call section]**

> **SAY:**
> "On the **backend**, Express receives the message, adds conversation history, and calls **OpenAI's GPT-4o** with 5 function-calling tools — `scroll`, `navigateTo`, `highlightElement`, `clickElement`, and `inputText`. The model decides which tool to use based on the user's intent."

**[ACTION: Briefly show the tools array definition]**

> **SAY:**
> "These tool definitions tell GPT what actions are available — the model returns structured JSON, and the frontend executes it. This is the bridge between natural language and DOM manipulation."

---

### SCENE 7 — Wrap Up (2:50 – 3:00)

**[SCREEN: Switch back to the browser showing the portfolio with the chat open]**

> **SAY:**
> "To summarize — this is a **full-stack AI co-browsing application** using React, Express, TypeScript, PostgreSQL, and OpenAI Function Calling. The AI can navigate, scroll, highlight elements, click buttons, and have intelligent conversations — all in real time."
>
> "Thank you for watching!"

---

## KEY DEMO COMMANDS TO USE

Use these exact messages during the demo for reliable results:

| #   | Type This in Chat                         | Expected Action                         |
| --- | ----------------------------------------- | --------------------------------------- |
| 1   | `Show me the projects section`            | Page scrolls to #projects               |
| 2   | `Go to skills`                            | Page scrolls to #skills                 |
| 3   | `Highlight the first project`             | Project card glows with pulsing outline |
| 4   | `Scroll down`                             | Page scrolls down 600px                 |
| 5   | `What technologies do I work with?`       | Text answer summarizing skills          |
| 6   | `Tell me about the AI Co-Browser project` | Text answer + possible highlight        |
| 7   | `Take me to contact`                      | Page scrolls to #contact                |

---

## BACKUP PLAN (If AI Response is Slow)

- If OpenAI is slow, pause and say: _"The bot is processing — it's calling GPT-4o in real time on the backend."_
- If a tool call doesn't work (element not found), say: _"The AI uses CSS selectors to find elements, and sometimes the selector doesn't match exactly — that's something we handle with error fallbacks."_
- Pre-record the demo if live API latency is a concern.

---

## TECHNICAL TALKING POINTS (If Asked Questions)

| Question                                     | Answer                                                                                                                                                                                                     |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **How does the AI know what's on the page?** | The frontend clones the DOM, strips scripts/styles, extracts visible text (max 5000 chars), and sends it with each message as context.                                                                     |
| **How does highlighting work?**              | The AI returns a CSS selector. The client finds the element, scrolls it into view, and adds an `ai-highlight` CSS class that triggers a pulsing glow animation. It auto-removes after 4 seconds.           |
| **What is Function Calling?**                | OpenAI's feature where you define functions (tools) and the model returns structured JSON saying which function to call and with what arguments. The actual execution happens in your code, not in OpenAI. |
| **What database is used?**                   | PostgreSQL with Drizzle ORM. Stores conversation messages, projects, skills, and experience data.                                                                                                          |
| **Can it work without a database?**          | Yes — the Vercel deployment uses in-memory storage. Local dev uses PostgreSQL.                                                                                                                             |
| **What model is used?**                      | GPT-4o via the OpenAI Chat Completions API with `tool_choice: "auto"`.                                                                                                                                     |
