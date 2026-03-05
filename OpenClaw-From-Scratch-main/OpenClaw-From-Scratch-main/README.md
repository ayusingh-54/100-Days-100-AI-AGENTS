<div align="center">

# 🦾 OpenClaw-From-Scratch

### *Build a production-grade AI assistant — from absolute zero.*

**OpenClaw** is an open-source, fully self-hosted Slack AI bot that combines
**RAG · Long-Term Memory · MCP Tool Integrations** into a single, hackable codebase.

---

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Claude AI](https://img.shields.io/badge/Claude-claude--sonnet--4--6-FF6B35?style=for-the-badge&logo=anthropic&logoColor=white)](https://www.anthropic.com/)
[![Slack](https://img.shields.io/badge/Slack-Bolt.js-4A154B?style=for-the-badge&logo=slack&logoColor=white)](https://slack.dev/bolt-js/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-MIT-F7DF1E?style=for-the-badge)](LICENSE)

---

> **"Most bots forget everything the moment a conversation ends.
> OpenClaw remembers — forever."**

[Quick Start](#-quick-start) · [Architecture](#-architecture) · [Features](#-features) · [Configuration](#-configuration) · [Contributing](#-contributing)

</div>

---

## 📋 Table of Contents

<details open>
<summary><strong>Click to expand / collapse</strong></summary>

- [What is OpenClaw?](#-what-is-openclaw)
- [Why Build From Scratch?](#-why-build-from-scratch)
- [Core Systems](#-core-systems)
- [Architecture](#-architecture)
  - [System Overview](#system-overview)
  - [Message Flow (Step by Step)](#message-flow-step-by-step)
  - [RAG Pipeline](#rag-pipeline-deep-dive)
  - [Memory System](#memory-system-deep-dive)
  - [MCP Tool Routing](#mcp-tool-routing)
- [Features](#-features)
- [Quick Start](#-quick-start)
- [Installation](#-installation)
- [Configuration](#-configuration)
  - [Environment Variables](#environment-variables)
  - [MCP Server Config](#mcp-server-configuration)
- [Usage Examples](#-usage-examples)
- [Available Tools (59 Total)](#-available-tools-59-total)
- [Project Structure](#-project-structure)
- [Docker Deployment](#-docker-deployment)
- [Troubleshooting](#-troubleshooting)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)

</details>

---

## 🧠 What is OpenClaw?

OpenClaw is a **production-ready AI assistant for Slack** that you build, own, and extend from scratch.

Unlike off-the-shelf bots, OpenClaw gives you full control over every layer:

```
┌──────────────────────────────────────────────────────────────────┐
│                    THE OPENCLAW DIFFERENCE                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ❌ Typical Chatbot:                                              │
│     User → LLM → Response                                        │
│     (stateless, forgets everything, no tools)                    │
│                                                                   │
│  ✅ OpenClaw:                                                     │
│     User                                                         │
│      │                                                            │
│      ├─► [Memory Recall]  "User is a backend dev at Acme Corp"   │
│      │                                                            │
│      ├─► [RAG Search]     "In #dev-team on Nov 3rd, you said..." │
│      │                                                            │
│      ├─► [LLM + 59 Tools] Reason, act, create, schedule...      │
│      │                                                            │
│      ├─► [Memory Storage] Store new facts for next session       │
│      │                                                            │
│      └─► [Response]       Context-aware, personalized, powerful  │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 💡 Why Build From Scratch?

| Approach | Control | Cost | Customizable | Privacy |
|----------|---------|------|--------------|---------|
| SaaS Bot | ❌ None | 💰💰💰 | ❌ Limited | ❌ Data leaves org |
| OpenClaw | ✅ Full | 💰 API only | ✅ Every line | ✅ Self-hosted |

**You own the code. You own the data. You own the experience.**

---

## 🏗 Core Systems

<details>
<summary><strong>🔍 RAG — Retrieval Augmented Generation</strong></summary>

RAG lets the bot search your **actual Slack history** to answer questions with real context.

- Indexes Slack channels every **60 minutes** in the background
- Uses **OpenAI `text-embedding-3-small`** to convert messages to vector embeddings
- Stores vectors in **ChromaDB** (local, no cloud needed)
- At query time, retrieves the **top-k most semantically similar** messages
- Injects retrieved context directly into the LLM prompt

**Example:**
> User: *"What did the team decide about the auth refactor?"*
> RAG finds: *[#dev-team, Oct 12] "We agreed to move to JWT with 24h expiry..."*
> Bot answers with that actual decision, not a hallucination.

</details>

<details>
<summary><strong>🧠 Long-Term Memory — mem0.ai</strong></summary>

Memory makes the bot feel like it **actually knows you** across every session.

- After each conversation, extracts key facts using `gpt-4o-mini`
- Stores them in **mem0.ai cloud** (or self-hosted mem0)
- On next message, semantically searches for relevant memories
- Memories persist **indefinitely** unless explicitly deleted

**Example memories stored:**
```
• "User is co-founder of Acme Corp"
• "User prefers Python over JavaScript"
• "User's team uses Monday.com for project tracking"
• "User asked about deployment pipeline on Nov 5"
```

**User commands:**
```
"show my memories"       → Lists everything the bot remembers
"remember that I..."     → Manually store a fact
"forget about X"         → Delete a specific memory
"forget everything"      → Wipe all memories
```

</details>

<details>
<summary><strong>🔌 MCP — Model Context Protocol</strong></summary>

MCP connects the bot to **external services** through a standardized tool protocol.

- **GitHub** (26 tools): create issues, search repos, read files, list PRs
- **Notion** (21 tools): search pages, query databases, create/update content
- Each MCP server runs as a **separate subprocess** (stdio transport)
- Tool calls are **JSON-RPC** under the hood — fully transparent

**Example:**
> User: *"Create a GitHub issue for the login bug we discussed"*
> Bot: Uses `github_create_issue` → Issue #47 created with full context

</details>

---

## 🏛 Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                              SLACK WORKSPACE                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌────────────────┐  ┌──────────────────┐     │
│  │  #general   │  │  #dev-team  │  │   Direct DMs   │  │  @bot mentions   │     │
│  └──────┬──────┘  └──────┬──────┘  └───────┬────────┘  └────────┬─────────┘     │
└─────────┼────────────────┼─────────────────┼────────────────────┼───────────────┘
          └────────────────┴─────────────────┴────────────────────┘
                                        │
                              Socket Mode Events
                                        │
                                        ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                        BOLT.JS EVENT HANDLER LAYER                                │
│                                                                                   │
│   message.dm ──► Approval Check ──► Route               /summarize ──► Thread    │
│   app_mention ──────────────────────► Route             /reset ──────► Clear     │
│   reaction_added ───────────────────────────────────────────────────► Log        │
└──────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                              OPENCLAW AI AGENT                                    │
│                                                                                   │
│  ┌────────────────────────────────────────────────────────────────────────────┐  │
│  │                          CONTEXT ASSEMBLY                                   │  │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────┐  │  │
│  │  │   MEMORY CTX     │  │    RAG CONTEXT   │  │     SESSION HISTORY      │  │  │
│  │  │                  │  │                  │  │                          │  │  │
│  │  │ "User is CTO     │  │ "#dev on Nov 3:  │  │ Last 10 messages         │  │  │
│  │  │  at Acme Corp"   │  │  auth refactor   │  │ in this thread           │  │  │
│  │  │ "Prefers Python" │  │  was approved"   │  │                          │  │  │
│  │  └──────────────────┘  └──────────────────┘  └──────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
│                                        │                                          │
│                              Claude claude-sonnet-4-6                                    │
│                                        │                                          │
│  ┌────────────────────────────────────────────────────────────────────────────┐  │
│  │                          59 AVAILABLE TOOLS                                 │  │
│  │  ┌────────────────┐   ┌──────────────────┐   ┌──────────────────────────┐  │  │
│  │  │  SLACK TOOLS   │   │   GITHUB TOOLS   │   │      NOTION TOOLS        │  │  │
│  │  │   (12 tools)   │   │   (26 tools)     │   │      (21 tools)          │  │  │
│  │  │                │   │                  │   │                          │  │  │
│  │  │ search_kb      │   │ create_issue     │   │ search_pages             │  │  │
│  │  │ send_message   │   │ list_repos       │   │ get_page                 │  │  │
│  │  │ get_history    │   │ get_file         │   │ query_database           │  │  │
│  │  │ schedule_msg   │   │ list_prs         │   │ create_page              │  │  │
│  │  │ set_reminder   │   │ search_code      │   │ update_page              │  │  │
│  │  │ list_channels  │   │ create_pr        │   │ list_databases           │  │  │
│  │  │ get_memories   │   │ get_commit       │   │ get_block_children       │  │  │
│  │  │ remember_this  │   │ ...              │   │ ...                      │  │  │
│  │  └────────────────┘   └──────────────────┘   └──────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────┘
          │                         │                           │
          ▼                         ▼                           ▼
┌──────────────────┐   ┌─────────────────────┐   ┌────────────────────────────┐
│  CHROMADB        │   │   MEM0.AI CLOUD      │   │      MCP SERVERS           │
│  (Vector Store)  │   │   (Memory Store)     │   │                            │
│                  │   │                      │   │  ┌──────────────────────┐  │
│  Slack message   │   │  User facts &        │   │  │  github-mcp-server   │  │
│  embeddings      │   │  preferences         │   │  │  (Node subprocess)   │  │
│  (local disk)    │   │  (persistent cloud)  │   │  └──────────────────────┘  │
│                  │   │                      │   │  ┌──────────────────────┐  │
│  OpenAI embed    │   │  gpt-4o-mini         │   │  │  notion-mcp-server   │  │
│  text-embed-3    │   │  extraction          │   │  │  (Node subprocess)   │  │
└──────────────────┘   └─────────────────────┘   │  └──────────────────────┘  │
                                                   └────────────────────────────┘
```

---

### Message Flow (Step by Step)

```
USER: "Find the Slack discussion about auth bugs and file GitHub issues"
  │
  ▼
[1] SLACK EVENT RECEIVED
    • Bolt.js receives message via Socket Mode WebSocket
    • Checks: DM? → approved user? / Channel? → @mentioned?
    • Adds 👀 reaction ("I see this, processing...")
    • Gets or creates session (preserves conversation thread)
  │
  ▼
[2] MEMORY RETRIEVAL (parallel)
    • Queries mem0: "What's relevant to auth + GitHub for this user?"
    • Returns: "User maintains auth service", "prefers concise issue titles"
  │
  ▼
[3] RAG PRE-CHECK
    • Detects: "search Slack" → triggers RAG
    • Embeds query → searches ChromaDB → returns top 5 messages
    • Found: [#dev-team Nov 3] "Auth token expiry causing logout loops"
             [#dev-team Nov 5] "Race condition in refresh token handler"
  │
  ▼
[4] CONTEXT ASSEMBLY
    ┌─ System Prompt (role + tool instructions)
    ├─ Memory Context: "User maintains auth service..."
    ├─ RAG Context: "Relevant Slack messages: [Nov 3, Nov 5]..."
    ├─ Session History: [last 10 messages]
    └─ User Message: "Find Slack auth bugs and file GitHub issues"
  │
  ▼
[5] LLM CALL (Claude claude-sonnet-4-6)
    • Decides: call search_knowledge_base → got RAG results
    • Decides: call github_create_issue × 2 (one per bug)
    • Tool loop runs until no more tool_calls
  │
  ▼
[6] TOOL EXECUTION
    Tool 1: search_knowledge_base("auth bugs")
            └─ Returns 5 Slack messages with timestamps
    Tool 2: github_create_issue("Auth token expiry causes logout loops")
            └─ Returns: Issue #48 created ✓
    Tool 3: github_create_issue("Race condition in refresh token handler")
            └─ Returns: Issue #49 created ✓
  │
  ▼
[7] MEMORY STORAGE (async, background)
    • Extracts: "User filed auth bugs as GitHub issues #48, #49 on Nov 12"
    • Stores in mem0 for future sessions
  │
  ▼
[8] RESPONSE SENT TO SLACK
    "Found 2 auth-related bugs in Slack. Created:
     • Issue #48: Auth token expiry causes logout loops
     • Issue #49: Race condition in refresh token handler"
    • Removes 👀, adds ✅ reaction
```

---

### RAG Pipeline Deep Dive

```
INDEXING (runs every 60 min via background job)
─────────────────────────────────────────────────────────────────
  Slack API → fetch channel messages
       │
       ▼
  Chunking → split long messages into ~512-token chunks
       │
       ▼
  Embedding → OpenAI text-embedding-3-small (1536 dimensions)
       │
       ▼
  ChromaDB → upsert with metadata {channel, user, timestamp, url}
       │
       ▼
  Local disk → ./data/chroma/ (persistent, survives restarts)


RETRIEVAL (on each relevant query)
─────────────────────────────────────────────────────────────────
  User query
       │
       ▼
  Embed query → same OpenAI model
       │
       ▼
  ChromaDB cosine similarity search → top-k results (default: 5)
       │
       ▼
  Re-rank by relevance score → filter below threshold (0.7)
       │
       ▼
  Format as context → inject into LLM prompt
```

---

### Memory System Deep Dive

```
STORAGE (after each conversation)
─────────────────────────────────────────────────────────────────
  Conversation transcript
       │
       ▼
  gpt-4o-mini extraction prompt:
  "Extract lasting facts about the user from this conversation..."
       │
       ▼
  Facts extracted:
  • "User is building a SaaS product"
  • "User's timezone is PST"
       │
       ▼
  mem0 API → stores with user_id, deduplication built-in


RECALL (at message start)
─────────────────────────────────────────────────────────────────
  Incoming message
       │
       ▼
  mem0 semantic search → top-k relevant memories
       │
       ▼
  Formatted as:
  "[MEMORY] User is building a SaaS product
   [MEMORY] User's timezone is PST"
       │
       ▼
  Injected into system prompt before LLM call
```

---

### MCP Tool Routing

```
LLM decides to call: "github_create_issue"
                              │
                              ▼
         parseToolName("github_create_issue")
                              │
                 ┌────────────┴───────────┐
                 │                        │
          serverName: "github"    toolName: "create_issue"
                 │                        │
                 └────────────┬───────────┘
                              │
                              ▼
             Find MCP client for "github"
                              │
                              ▼
           Send JSON-RPC to github subprocess:
           {
             "method": "tools/call",
             "params": {
               "name": "create_issue",
               "arguments": { "title": "...", "body": "..." }
             }
           }
                              │
                              ▼
              Receive result → return to LLM
```

---

## ✨ Features

### 🔍 RAG — Know Your Slack History
| Feature | Detail |
|---------|--------|
| Auto-indexing | Runs every 60 min in background |
| Semantic search | Vector cosine similarity, not keyword matching |
| Relevance scoring | Filters low-quality results automatically |
| Multi-channel | Index any channel the bot has access to |
| Persistent storage | Survives restarts via local ChromaDB |

### 🧠 Long-Term Memory
| Feature | Detail |
|---------|--------|
| Auto-extraction | Facts extracted after every conversation |
| User-controlled | View, add, delete memories via chat |
| Cross-session | Persists forever across all conversations |
| Semantic recall | Retrieves only relevant memories per message |
| Deduplication | mem0 handles duplicate fact merging |

### 🔌 MCP Tool Integrations
| Service | Tools | Capabilities |
|---------|-------|-------------|
| **GitHub** | 26 | Issues, PRs, repos, files, search, commits |
| **Notion** | 21 | Pages, databases, blocks, create, update, search |
| **Custom** | ∞ | Add any MCP-compatible server |

### 💬 Slack Native Features
| Feature | Command / Trigger |
|---------|------------------|
| DM conversations | Direct message the bot |
| Channel mentions | `@OpenClaw <message>` |
| Thread summarize | Type `summarize` or `tldr` in any thread |
| Message scheduling | *"send this to #general tomorrow at 9am"* |
| Reminders | *"remind me about X in 2 hours"* |
| Task management | `my tasks` / `cancel task 3` |
| Reset conversation | `/reset` |
| Help menu | `help` |

### 🛡 Security & Access Control
- **User approval system** — bot only responds to approved users in DMs
- **Pairing codes** — users pair with `/approve <code>`
- **Admin commands** — `/status` to see connected users
- All tokens stored in **environment variables** (never hardcoded)

---

## ⚡ Quick Start

> Get OpenClaw running in under 10 minutes.

```bash
# 1. Clone the repo
git clone https://github.com/your-org/OpenClaw-From-Scratch.git
cd OpenClaw-From-Scratch

# 2. Install dependencies
npm install

# 3. Copy and fill in your environment variables
cp .env.example .env
# Edit .env with your tokens (see Configuration section)

# 4. Set up the database
npx ts-node scripts/setup-db.ts

# 5. Start the bot
npm run dev
```

Your bot is live. Go to Slack and DM it `help` to see what it can do.

---

## 🔧 Installation

### Prerequisites

| Requirement | Version | Purpose |
|-------------|---------|---------|
| Node.js | 18+ | Runtime |
| npm | 9+ | Package manager |
| Slack App | — | Bot token + socket mode |
| Anthropic API | — | Claude claude-sonnet-4-6 LLM |
| OpenAI API | — | Embeddings (text-embedding-3-small) |
| mem0.ai account | — | Long-term memory (free tier available) |
| GitHub Token | — | Optional: GitHub MCP tools |
| Notion Token | — | Optional: Notion MCP tools |

### Step 1 — Create Your Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps) → **Create New App**
2. Choose **"From scratch"** → name it `OpenClaw`
3. Under **Socket Mode** → Enable Socket Mode → generate App-Level Token
4. Under **OAuth & Permissions** → add Bot Token Scopes:
   ```
   app_mentions:read    channels:history     channels:read
   chat:write           commands             groups:history
   groups:read          im:history           im:read
   im:write             mpim:history         reactions:read
   reactions:write      users:read
   ```
5. Under **Event Subscriptions** → Enable → Subscribe to:
   ```
   message.channels    message.groups    message.im    app_mention
   ```
6. Install app to workspace → copy **Bot Token** (`xoxb-...`)

### Step 2 — Clone & Install

```bash
git clone https://github.com/your-org/OpenClaw-From-Scratch.git
cd OpenClaw-From-Scratch
npm install
```

### Step 3 — Configure Environment

```bash
cp .env.example .env
```

Fill in `.env` (see [Configuration](#-configuration) below).

### Step 4 — Initialize Database

```bash
npx ts-node scripts/setup-db.ts
```

### Step 5 — Run

```bash
# Development (auto-restart on changes)
npm run dev

# Production
npm run build
npm start

# Docker
docker-compose up -d
```

---

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# ─────────────────────────────────────────────────────────────
# SLACK — Required
# ─────────────────────────────────────────────────────────────
SLACK_BOT_TOKEN=xoxb-your-bot-token-here
SLACK_SIGNING_SECRET=your-signing-secret-here
SLACK_APP_TOKEN=xapp-your-app-level-token-here

# ─────────────────────────────────────────────────────────────
# AI — Required
# ─────────────────────────────────────────────────────────────
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key-here
OPENAI_API_KEY=sk-your-openai-key-here        # Used for embeddings

# ─────────────────────────────────────────────────────────────
# MEMORY — Required for long-term memory
# ─────────────────────────────────────────────────────────────
MEM0_API_KEY=m0-your-mem0-api-key-here

# ─────────────────────────────────────────────────────────────
# MCP SERVERS — Optional (enables GitHub/Notion tools)
# ─────────────────────────────────────────────────────────────
MCP_CONFIG_PATH=./mcp-config.json

# ─────────────────────────────────────────────────────────────
# RAG — Optional (customize indexing behavior)
# ─────────────────────────────────────────────────────────────
CHROMA_DB_PATH=./data/chroma
RAG_CHANNELS=general,dev-team,engineering     # Channels to index
RAG_INDEX_INTERVAL_MINUTES=60

# ─────────────────────────────────────────────────────────────
# APP — Optional
# ─────────────────────────────────────────────────────────────
LOG_LEVEL=info                                # debug | info | warn | error
PORT=3000
NODE_ENV=production
```

### MCP Server Configuration

Copy the example config and fill in your tokens:

```bash
cp mcp-config.example.json mcp-config.json
```

```json
{
  "servers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_your_token_here"
      }
    },
    "notion": {
      "command": "npx",
      "args": ["-y", "@notionhq/notion-mcp-server"],
      "env": {
        "OPENAPI_MCP_HEADERS": "{\"Authorization\": \"Bearer ntn_your_token_here\", \"Notion-Version\": \"2022-06-28\"}"
      }
    }
  }
}
```

<details>
<summary><strong>Adding a custom MCP server</strong></summary>

Any MCP-compatible server can be added. Just add an entry to `mcp-config.json`:

```json
{
  "servers": {
    "my-custom-server": {
      "command": "node",
      "args": ["path/to/my-mcp-server.js"],
      "env": {
        "MY_API_KEY": "..."
      }
    }
  }
}
```

The bot will automatically discover all tools provided by the server and make them available to the LLM.

</details>

---

## 💬 Usage Examples

<details open>
<summary><strong>Basic Conversation</strong></summary>

```
You:     Hey, what's your name?
OpenClaw: Hi! I'm OpenClaw — your AI assistant for this Slack workspace.
          I can search your Slack history, remember things about you,
          create GitHub issues, update Notion pages, and much more.
          Type "help" to see everything I can do.
```

</details>

<details>
<summary><strong>RAG — Search Slack History</strong></summary>

```
You:     What did the team say about the deployment process last month?
OpenClaw: I found relevant discussions in your Slack history:

         📌 #dev-team (Oct 15): "We agreed to use GitHub Actions for CI/CD.
            @sarah will set up the staging environment by Friday."

         📌 #general (Oct 22): "Deployment checklist updated — remember to
            run migrations before deploying to prod."

         Based on these, the team's deployment process involves GitHub Actions,
         and there's a checklist to follow. Want me to pull the full thread
         from either of these?
```

</details>

<details>
<summary><strong>Memory — Personalized Responses</strong></summary>

```
You:     I just switched from React to Vue for my side project.
OpenClaw: Got it! I'll remember that. [Memory stored: "User switched side
          project from React to Vue"]

--- Next session, days later ---

You:     Any tips for state management?
OpenClaw: Since you're using Vue for your side project, Pinia is the
          recommended state management solution — it replaced Vuex as
          the official option. For your work projects (which I recall
          use React), you might prefer Zustand for its simplicity...
```

</details>

<details>
<summary><strong>GitHub Integration</strong></summary>

```
You:     Create an issue in my-org/backend for the auth bug we discussed
OpenClaw: Creating the issue now...

          ✅ Issue created!
          📎 #52: "JWT refresh token race condition in auth middleware"
          🔗 https://github.com/my-org/backend/issues/52

          I added the description based on what you told me earlier about
          the race condition in the refresh token handler. Should I also
          assign it to someone?
```

</details>

<details>
<summary><strong>Scheduling & Reminders</strong></summary>

```
You:     Remind me to review the PR in 2 hours
OpenClaw: ✅ Reminder set! I'll ping you at 3:45 PM to review the PR.

You:     Send a message to #standup tomorrow at 9am saying "Deploying v2.1"
OpenClaw: ✅ Scheduled! I'll send "Deploying v2.1" to #standup tomorrow
          at 9:00 AM your time.

You:     my tasks
OpenClaw: 📋 Your scheduled tasks:
          1. Reminder: "Review the PR" — today at 3:45 PM
          2. Message to #standup — tomorrow at 9:00 AM
```

</details>

<details>
<summary><strong>Thread Summarization</strong></summary>

```
[In a 50-message thread about a production incident]

You:     summarize
OpenClaw: 📝 Thread Summary:

          **What happened:** Database connection pool exhaustion caused
          ~15 min downtime on Nov 8 at 2:30 PM UTC.

          **Root cause:** A missing `await` in the auth service caused
          connections to not be released properly.

          **Fix applied:** @john patched line 247 in auth/db.ts and
          deployed at 3:12 PM. Connections normalized immediately.

          **Action items:**
          • Add connection pool monitoring (assigned to @sarah)
          • Review all async DB calls for missing awaits (@dev-team)
          • Post-mortem scheduled for Nov 12
```

</details>

---

## 🛠 Available Tools (59 Total)

<details>
<summary><strong>Slack Tools (12)</strong></summary>

| Tool | Description |
|------|-------------|
| `search_knowledge_base` | Semantic search across indexed Slack messages (RAG) |
| `send_message` | Send a message to any channel or user |
| `get_channel_history` | Fetch recent messages from a channel |
| `schedule_message` | Schedule a message for a future time |
| `set_reminder` | Set a personal reminder |
| `list_channels` | List all available channels |
| `list_users` | List workspace members |
| `get_my_memories` | Retrieve all stored memories for the user |
| `remember_this` | Manually store a memory fact |
| `forget_about` | Delete a specific memory |
| `forget_everything` | Wipe all memories for the user |
| `get_thread_messages` | Fetch all messages in a thread |

</details>

<details>
<summary><strong>GitHub Tools (26, via MCP)</strong></summary>

| Tool | Description |
|------|-------------|
| `github_create_issue` | Create a new issue |
| `github_list_issues` | List issues with filters |
| `github_get_issue` | Get issue details |
| `github_update_issue` | Update issue title/body/state |
| `github_create_pull_request` | Open a new PR |
| `github_list_pull_requests` | List PRs with filters |
| `github_get_pull_request` | Get PR details and diff |
| `github_search_repositories` | Search GitHub repos |
| `github_get_repository` | Get repo details |
| `github_list_repositories` | List org/user repos |
| `github_get_file_contents` | Read a file from a repo |
| `github_search_code` | Search code across GitHub |
| `github_list_commits` | List commits on a branch |
| `github_get_commit` | Get commit details |
| `github_create_branch` | Create a new branch |
| `github_list_branches` | List repo branches |
| `github_fork_repository` | Fork a repository |
| `github_search_users` | Search GitHub users |
| `github_get_user` | Get user profile |
| `github_list_notifications` | List GitHub notifications |
| `github_add_issue_comment` | Comment on an issue |
| `github_create_review` | Submit a PR review |
| `github_merge_pull_request` | Merge a PR |
| `github_list_assignees` | List available assignees |
| `github_add_labels` | Add labels to issue/PR |
| `github_remove_label` | Remove a label |

</details>

<details>
<summary><strong>Notion Tools (21, via MCP)</strong></summary>

| Tool | Description |
|------|-------------|
| `notion_search` | Search all pages and databases |
| `notion_get_page` | Get full page content |
| `notion_create_page` | Create a new page |
| `notion_update_page` | Update page properties |
| `notion_get_block_children` | Get child blocks of a page |
| `notion_append_block_children` | Append content to a page |
| `notion_delete_block` | Delete a block |
| `notion_get_database` | Get database schema |
| `notion_query_database` | Query a database with filters |
| `notion_create_database` | Create a new database |
| `notion_update_database` | Update database properties |
| `notion_list_databases` | List all databases |
| `notion_get_user` | Get Notion user info |
| `notion_list_users` | List workspace members |
| `notion_retrieve_comments` | Get comments on a page |
| `notion_add_comment` | Add a comment to a page |
| `notion_get_page_property` | Get a specific page property |
| `notion_update_block` | Update a specific block |
| `notion_get_self` | Get bot user info |
| `notion_create_comment` | Create a threaded comment |
| `notion_retrieve_page` | Alternative page retrieval |

</details>

---

## 📁 Project Structure

```
OpenClaw-From-Scratch/
│
├── src/
│   ├── index.ts                 # App entry point — starts Bolt.js + MCP + RAG
│   ├── config/
│   │   └── index.ts             # All env vars, validated at startup
│   ├── channels/
│   │   └── slack.ts             # Bolt.js event handlers (DMs, mentions, slash cmds)
│   ├── agents/
│   │   └── agent.ts             # Core AI agent — memory+RAG+LLM+tools loop
│   ├── mcp/
│   │   ├── client.ts            # MCP client — spawns servers, handles JSON-RPC
│   │   ├── config.ts            # Loads mcp-config.json, validates servers
│   │   ├── tool-converter.ts    # Converts MCP tool schemas → Claude tool format
│   │   └── index.ts             # MCP module exports
│   ├── memory/
│   │   └── database.ts          # SQLite session + approval storage
│   ├── memory-ai/
│   │   ├── mem0-client.ts       # mem0.ai API wrapper (search, add, delete)
│   │   └── index.ts             # Memory module exports
│   ├── rag/
│   │   ├── embeddings.ts        # OpenAI embedding generation
│   │   ├── vectorstore.ts       # ChromaDB operations (upsert, query)
│   │   ├── indexer.ts           # Background Slack channel indexer
│   │   ├── retriever.ts         # Query + re-rank + format retrieved docs
│   │   └── index.ts             # RAG module exports
│   ├── tools/
│   │   ├── slack-actions.ts     # Slack tool implementations (send, schedule, etc.)
│   │   └── scheduler.ts         # Task scheduling + reminder engine
│   └── utils/
│       └── logger.ts            # Structured logger (Winston)
│
├── scripts/
│   ├── setup-db.ts              # Initialize SQLite database + tables
│   ├── run-indexer.ts           # Manually trigger RAG channel indexing
│   └── test-rag.ts              # Test RAG retrieval quality
│
├── docs/
│   ├── ARCHITECTURE.md          # Deep technical architecture docs
│   ├── MCP.md                   # MCP integration guide
│   ├── MEMORY.md                # Memory system internals
│   └── RAG.md                   # RAG system internals
│
├── Dockerfile                   # Production container image
├── docker-compose.yml           # Full stack with ChromaDB service
├── mcp-config.example.json      # MCP server config template
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🐳 Docker Deployment

### Quick Deploy

```bash
# Build and start everything (bot + ChromaDB)
docker-compose up -d

# View logs
docker-compose logs -f openclaw

# Stop
docker-compose down
```

### What `docker-compose.yml` Starts

```
┌─────────────────────────┐     ┌─────────────────────────┐
│     openclaw (bot)       │────►│  chromadb (vector store) │
│     Node.js 18           │     │  Port 8000               │
│     Port 3000            │     │  Persistent volume       │
└─────────────────────────┘     └─────────────────────────┘
```

### Environment in Docker

Pass your `.env` file or set variables in `docker-compose.yml`:

```yaml
services:
  openclaw:
    environment:
      - SLACK_BOT_TOKEN=${SLACK_BOT_TOKEN}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      # ... etc
```

---

## 🔴 Troubleshooting

<details>
<summary><strong>Bot not responding to messages</strong></summary>

1. Check Socket Mode is enabled in your Slack app settings
2. Verify `SLACK_APP_TOKEN` starts with `xapp-`
3. Check bot has been invited to the channel: `/invite @OpenClaw`
4. Verify user is approved (for DMs): the bot only responds to approved users
5. Check logs: `docker-compose logs -f openclaw` or `npm run dev`

</details>

<details>
<summary><strong>RAG returning no results</strong></summary>

1. Channels must be indexed first — run `npx ts-node scripts/run-indexer.ts`
2. Check `RAG_CHANNELS` env var includes the channels you want
3. Bot must be a member of those channels
4. ChromaDB path must be writable: check `CHROMA_DB_PATH`
5. Verify OpenAI API key is valid (embeddings use OpenAI)

</details>

<details>
<summary><strong>Memory not working</strong></summary>

1. Verify `MEM0_API_KEY` is set and valid
2. Test the key at [app.mem0.ai](https://app.mem0.ai)
3. Memory extraction runs async — wait a few seconds after conversation ends
4. Check logs for `[memory]` tagged lines

</details>

<details>
<summary><strong>MCP tools not available</strong></summary>

1. Verify `mcp-config.json` exists and is valid JSON
2. Check `MCP_CONFIG_PATH` env var points to it
3. For GitHub: verify token has correct scopes (`repo`, `read:org`)
4. For Notion: verify integration is connected to your workspace
5. Run with `LOG_LEVEL=debug` to see MCP server startup logs

</details>

<details>
<summary><strong>TypeScript compilation errors</strong></summary>

```bash
# Clean build artifacts
rm -rf dist/
npm run build

# Check TypeScript version
npx tsc --version  # Should be 5.x
```

</details>

---

## 🗺 Roadmap

| Status | Feature |
|--------|---------|
| ✅ Done | RAG with ChromaDB + OpenAI embeddings |
| ✅ Done | Long-term memory with mem0.ai |
| ✅ Done | GitHub + Notion via MCP |
| ✅ Done | Message scheduling & reminders |
| ✅ Done | Thread summarization |
| ✅ Done | Docker deployment |
| 🔄 In Progress | Web dashboard for memory management |
| 🔄 In Progress | Self-hosted mem0 option |
| 📋 Planned | More MCP servers (Linear, Jira, Confluence) |
| 📋 Planned | Voice message transcription + indexing |
| 📋 Planned | Multi-workspace support |
| 📋 Planned | Custom persona / system prompt editor |
| 💡 Ideas | Image understanding in messages |
| 💡 Ideas | Proactive notifications & alerts |

---

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

### Development Setup

```bash
git clone https://github.com/your-org/OpenClaw-From-Scratch.git
cd OpenClaw-From-Scratch
npm install
cp .env.example .env
# Fill in your tokens
npm run dev
```

### Project Conventions

- **TypeScript strict mode** — no `any` without a good reason
- **Named exports** — prefer `export { foo }` over `export default`
- **Logging** — use `logger.info/debug/warn/error` (never `console.log`)
- **Error handling** — always wrap external API calls in try/catch
- **Commit style** — conventional commits: `feat:`, `fix:`, `docs:`, `chore:`

### Adding a New MCP Server

1. Find or build an MCP-compatible server
2. Add it to `mcp-config.json`
3. Test tool discovery: `LOG_LEVEL=debug npm run dev`
4. Document tools in `docs/MCP.md`

### Adding a New Slack Tool

1. Add tool schema to `src/agents/agent.ts` in `SLACK_TOOLS`
2. Add handler in `src/tools/slack-actions.ts`
3. Wire up in `executeTool()` in `src/agents/agent.ts`

### Pull Request Checklist

- [ ] Code compiles with `npm run build`
- [ ] No new `console.log` statements (use logger)
- [ ] Environment variables documented in `.env.example`
- [ ] New features documented in relevant `docs/` file

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

You are free to use, modify, and distribute OpenClaw-From-Scratch for any purpose,
including commercial use.

---

<div align="center">

**Built with ❤️ — from scratch, by people who wanted full control.**

[⬆ Back to top](#openclaw-from-scratch)

</div>
