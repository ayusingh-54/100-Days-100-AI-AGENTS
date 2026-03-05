# AI Co-Browser — Portfolio Assistant

A full-stack AI-powered portfolio website with a co-browsing chat assistant. The chatbot can navigate the page, highlight elements, and answer questions about your projects, skills, and experience using OpenAI's GPT model.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Prerequisites](#prerequisites)
3. [Project Structure](#project-structure)
4. [Environment Variables](#environment-variables)
5. [Step-by-Step Setup Guide](#step-by-step-setup-guide)
6. [Running the Application](#running-the-application)
7. [VS Code Launch & Debug](#vs-code-launch--debug)
8. [Available Scripts](#available-scripts)
9. [Database Schema](#database-schema)
10. [API Endpoints](#api-endpoints)
11. [Troubleshooting](#troubleshooting)

---

## Tech Stack

| Layer      | Technology                                           |
| ---------- | ---------------------------------------------------- |
| Frontend   | React 18, Vite 7, TailwindCSS, Framer Motion, Wouter |
| Backend    | Express 5 (Node.js), TypeScript, tsx                 |
| Database   | PostgreSQL + Drizzle ORM                             |
| AI         | OpenAI GPT (function calling for co-browsing tools)  |
| UI Library | Radix UI + shadcn/ui components                      |

---

## Prerequisites

Before you begin, make sure you have these installed:

| Requirement    | Version | Check Command    |
| -------------- | ------- | ---------------- |
| **Node.js**    | ≥ 18.x  | `node --version` |
| **npm**        | ≥ 9.x   | `npm --version`  |
| **PostgreSQL** | ≥ 14.x  | `psql --version` |

You'll also need:

- An **OpenAI API Key** — get one from [platform.openai.com](https://platform.openai.com/api-keys).

---

## Project Structure

```
AI-Co-Browser/
├── .vscode/              # VS Code settings (launch.json, tasks.json)
├── client/               # React frontend (Vite SPA)
│   ├── index.html        # HTML entry point
│   ├── public/           # Static assets
│   └── src/
│       ├── App.tsx        # Root React component (Router)
│       ├── main.tsx       # React DOM render entry
│       ├── index.css      # Global styles + Tailwind
│       ├── components/
│       │   ├── ChatWidget.tsx    # AI chat widget (co-browsing)
│       │   └── ui/              # shadcn/ui components
│       ├── hooks/
│       │   ├── use-chat.ts      # Chat state management
│       │   ├── use-portfolio.ts # Portfolio data fetching
│       │   └── use-toast.ts     # Toast notifications
│       ├── lib/
│       │   ├── queryClient.ts   # TanStack Query client
│       │   └── utils.ts         # Utility functions (cn, etc.)
│       └── pages/
│           ├── Home.tsx         # Main portfolio page
│           └── not-found.tsx    # 404 page
│
├── server/               # Express backend
│   ├── index.ts          # Server entry point (creates HTTP server)
│   ├── routes.ts         # API routes (portfolio, chat with OpenAI)
│   ├── storage.ts        # Database access layer (Drizzle ORM)
│   ├── db.ts             # PostgreSQL connection pool
│   ├── vite.ts           # Vite dev middleware setup
│   └── static.ts         # Production static file serving
│
├── shared/               # Shared types & schema (used by both client & server)
│   ├── schema.ts         # Drizzle table definitions + TypeScript types
│   └── routes.ts         # API route definitions (type-safe)
│
├── script/
│   └── build.ts          # Production build script (esbuild + Vite)
│
├── package.json          # Dependencies & scripts
├── tsconfig.json         # TypeScript configuration (path aliases)
├── vite.config.ts        # Vite config (React, aliases, Replit plugins)
├── tailwind.config.ts    # Tailwind CSS configuration
├── drizzle.config.ts     # Drizzle Kit config (migrations)
└── postcss.config.js     # PostCSS config
```

---

## Environment Variables

Create a `.env` file in the project root (or set them in your shell):

```env
# Required — PostgreSQL connection string
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ai_co_browser

# Required — OpenAI API key for the chat assistant
OPENAI_API_KEY=sk-your-openai-api-key-here

# Optional — Server port (default: 5000)
PORT=5000
```

> **Important:** The `DATABASE_URL` and `OPENAI_API_KEY` are mandatory. The app will crash on startup without them.

---

## Step-by-Step Setup Guide

### 1. Clone / Extract the Project

```bash
cd "c:\Users\ayusi\Downloads\AI-Co-Browser (1)\AI-Co-Browser"
```

### 2. Install Node.js Dependencies

```bash
npm install
```

This installs all frontend + backend dependencies listed in `package.json`.

### 3. Set Up PostgreSQL Database

**Option A: Local PostgreSQL**

```bash
# Connect to PostgreSQL
psql -U postgres

# Create the database
CREATE DATABASE ai_co_browser;

# Exit
\q
```

**Option B: Docker (quick setup)**

```bash
docker run --name ai-co-browser-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=ai_co_browser \
  -p 5432:5432 \
  -d postgres:16
```

### 4. Set Environment Variables

**PowerShell (Windows):**

```powershell
$env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/ai_co_browser"
$env:OPENAI_API_KEY = "sk-your-key-here"
$env:PORT = "5000"
```

**Command Prompt (Windows):**

```cmd
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ai_co_browser
set OPENAI_API_KEY=sk-your-key-here
set PORT=5000
```

**Bash / macOS / Linux:**

```bash
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ai_co_browser"
export OPENAI_API_KEY="sk-your-key-here"
export PORT=5000
```

### 5. Push Database Schema (Create Tables)

```bash
npm run db:push
```

This uses Drizzle Kit to create the required tables (`projects`, `skills`, `experience`, `messages`) in your PostgreSQL database.

### 6. Run the Application (Development Mode)

```bash
npm run dev
```

This starts:

- **Express server** on `http://localhost:5000`
- **Vite dev server** (HMR) proxied through Express
- The app auto-seeds sample portfolio data on first run

### 7. Open in Browser

Navigate to **http://localhost:5000**

You should see the portfolio website with a chat widget. The AI assistant can:

- Answer questions about displayed projects/skills/experience
- Navigate to sections (#home, #about, #skills, #experience, #projects, #contact)
- Scroll the page up/down
- Highlight specific elements

---

## Running the Application

### Development Mode (recommended for local work)

```bash
npm run dev
```

- Hot Module Replacement (HMR) enabled
- Auto-restarts on server file changes
- Runs on `http://localhost:5000`

### Production Build + Start

```bash
# Build frontend (Vite) + backend (esbuild)
npm run build

# Start production server
npm start
```

- Serves pre-built static files
- Optimized for deployment

---

## VS Code Launch & Debug

The project includes pre-configured `.vscode/launch.json` and `.vscode/tasks.json`:

### Launch Configurations

| Configuration             | Description                                        |
| ------------------------- | -------------------------------------------------- |
| **Dev Server (tsx)**      | Starts the dev server with debugger attached       |
| **Production Server**     | Builds the project, then runs the production build |
| **Debug Server (attach)** | Attach debugger to a running Node.js process       |

### How to Use

1. Open VS Code in the project folder
2. Go to **Run and Debug** panel (`Ctrl+Shift+D`)
3. Select **"Dev Server (tsx)"** from the dropdown
4. Update the `OPENAI_API_KEY` in `.vscode/launch.json` with your real key
5. Press **F5** to start

### Tasks (Ctrl+Shift+B)

| Task        | Description                  |
| ----------- | ---------------------------- |
| `dev`       | Start dev server             |
| `build`     | Build for production         |
| `db:push`   | Push schema to database      |
| `typecheck` | Run TypeScript type checking |

---

## Available Scripts

| Command           | Description                                   |
| ----------------- | --------------------------------------------- |
| `npm run dev`     | Start development server (Express + Vite HMR) |
| `npm run build`   | Build for production (client + server)        |
| `npm start`       | Start production server                       |
| `npm run check`   | TypeScript type checking                      |
| `npm run db:push` | Push Drizzle schema to PostgreSQL             |

---

## Database Schema

The app uses 4 tables (defined in `shared/schema.ts`):

### `projects`

| Column      | Type        | Description           |
| ----------- | ----------- | --------------------- |
| id          | serial (PK) | Auto-increment ID     |
| title       | text        | Project name          |
| description | text        | Project description   |
| tech_stack  | text[]      | Array of technologies |
| link        | text (null) | Project URL           |
| image_url   | text (null) | Screenshot URL        |

### `skills`

| Column   | Type        | Description                     |
| -------- | ----------- | ------------------------------- |
| id       | serial (PK) | Auto-increment ID               |
| category | text        | Category (Frontend, Backend...) |
| items    | text[]      | Array of skill names            |

### `experience`

| Column      | Type        | Description       |
| ----------- | ----------- | ----------------- |
| id          | serial (PK) | Auto-increment ID |
| role        | text        | Job title         |
| company     | text        | Company name      |
| period      | text        | Time period       |
| description | text        | Role description  |

### `messages`

| Column     | Type        | Description                |
| ---------- | ----------- | -------------------------- |
| id         | serial (PK) | Auto-increment ID          |
| role       | text        | "user" or "assistant"      |
| content    | text        | Message text               |
| session_id | text        | Groups messages by session |

---

## API Endpoints

| Method | Path                | Description                          |
| ------ | ------------------- | ------------------------------------ |
| GET    | `/api/portfolio`    | Get all projects, skills, experience |
| POST   | `/api/chat/message` | Send a message to the AI assistant   |

### POST `/api/chat/message` — Request Body

```json
{
  "message": "Show me the projects section",
  "context": "<visible DOM text content>",
  "sessionId": "unique-session-id"
}
```

### Response

```json
{
  "response": "Sure! Let me scroll to the projects section.",
  "toolCall": {
    "name": "navigateTo",
    "args": { "sectionId": "#projects" }
  }
}
```

---

## Troubleshooting

### "DATABASE_URL must be set"

- Ensure PostgreSQL is running and the `DATABASE_URL` environment variable is set.
- For Windows PowerShell: `$env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/ai_co_browser"`

### "Cannot find module" errors

- Run `npm install` to install dependencies.
- Ensure you're using Node.js ≥ 18.

### Port 5000 already in use

- Change the port: `$env:PORT = "3000"` or update the `.vscode/launch.json`.

### Vite HMR not working

- Make sure you're running in development mode (`npm run dev`).
- Check that port 5000 is accessible in your firewall.

### OpenAI API errors

- Verify your `OPENAI_API_KEY` is valid and has credits.
- Check the server console for error details.

### Database table errors

- Run `npm run db:push` to create/sync tables.
- Ensure the database specified in `DATABASE_URL` exists.

---

## License

MIT
