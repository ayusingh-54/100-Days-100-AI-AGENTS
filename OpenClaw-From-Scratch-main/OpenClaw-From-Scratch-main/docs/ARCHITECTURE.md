# Slack AI Assistant - Advanced Architecture

## Overview

This document explains the advanced AI features implemented in this Slack assistant:

1. **RAG (Retrieval Augmented Generation)** - Semantic search over Slack message history
2. **Memory System (mem0)** - Long-term and short-term user memory
3. **MCP (Model Context Protocol)** - Standardized tool servers

Each feature is implemented with a clear purpose and real-world application in mind.

---

## 1. RAG System for Slack Messages

### Why Do We Need RAG?

**The Problem:**
Imagine your Slack workspace has 2 years of conversations across 50 channels. A team member asks:

> "What was the decision about switching to the new payment provider?"

With **keyword search**, you'd need to know the exact words used. Did they say "payment provider", "Stripe", "payment gateway", or "billing system"? You might miss the relevant discussion entirely.

With **RAG**, the system understands the *meaning* of your question and finds semantically similar content, even if different words were used.

### Real-World Applications

| Scenario | Without RAG | With RAG |
|----------|-------------|----------|
| "What did we decide about pricing?" | Searches for "decide" + "pricing" literally | Finds discussions about "cost structure", "rate changes", "fee adjustments" |
| "Find customer complaints" | Only finds messages with word "complaints" | Also finds "issues", "problems", "unhappy customers", "bugs reported" |
| "What's our API rate limit policy?" | Exact match only | Finds related discussions about "throttling", "request limits", "quota" |

### How RAG Works

```
┌─────────────────────────────────────────────────────────────────────┐
│                         RAG PIPELINE                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. INDEXING (Background Process)                                   │
│     ┌──────────┐    ┌─────────────┐    ┌──────────────┐            │
│     │  Slack   │───▶│  Chunking   │───▶│  Embedding   │            │
│     │ Messages │    │  (Split)    │    │  (OpenAI)    │            │
│     └──────────┘    └─────────────┘    └──────┬───────┘            │
│                                                │                    │
│                                                ▼                    │
│                                        ┌──────────────┐            │
│                                        │   Vector DB  │            │
│                                        │  (ChromaDB)  │            │
│                                        └──────────────┘            │
│                                                                      │
│  2. RETRIEVAL (Query Time)                                          │
│     ┌──────────┐    ┌─────────────┐    ┌──────────────┐            │
│     │  User    │───▶│  Embed      │───▶│  Similarity  │            │
│     │  Query   │    │  Query      │    │   Search     │            │
│     └──────────┘    └─────────────┘    └──────┬───────┘            │
│                                                │                    │
│                                                ▼                    │
│                                        ┌──────────────┐            │
│                                        │  Top K       │            │
│                                        │  Results     │            │
│                                        └──────────────┘            │
│                                                                      │
│  3. GENERATION (Answer)                                             │
│     ┌──────────┐    ┌─────────────┐    ┌──────────────┐            │
│     │  Query + │───▶│    LLM      │───▶│   Answer     │            │
│     │  Context │    │  (GPT-4)    │    │  + Sources   │            │
│     └──────────┘    └─────────────┘    └──────────────┘            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Implementation Details

**Vector Database Choice: ChromaDB**
- Local, no external dependencies
- Persistent storage
- Good performance for small-medium datasets
- Easy to set up

**Embedding Model: OpenAI text-embedding-3-small**
- 1536 dimensions
- Good balance of quality and cost
- $0.00002 per 1K tokens

**Chunking Strategy:**
- Each Slack message is a chunk (natural boundaries)
- Metadata preserved: channel, user, timestamp, thread
- Context window: Include 2 messages before/after for context

**When to Index:**
- Background job runs every hour
- Indexes new messages since last run
- Re-indexes edited messages
- Removes deleted messages

---

## 2. Memory System (mem0)

### Why Do We Need Memory?

**The Problem:**
Current chatbots are "goldfish" - they forget everything between sessions. Every conversation starts fresh. This leads to:

- Repeating preferences every time
- No personalization
- Lost context from previous conversations
- No learning about the user over time

### Memory Types

```
┌─────────────────────────────────────────────────────────────────────┐
│                       MEMORY ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────────────┐                            │
│  │         SHORT-TERM MEMORY           │                            │
│  │  (Current Conversation Context)     │                            │
│  ├─────────────────────────────────────┤                            │
│  │  • Last 10-20 messages              │                            │
│  │  • Current task/goal                │                            │
│  │  • Active entities (people, topics) │                            │
│  │  • Cleared after session ends       │                            │
│  └─────────────────────────────────────┘                            │
│                     │                                                │
│                     │ Summarization                                  │
│                     ▼                                                │
│  ┌─────────────────────────────────────┐                            │
│  │          LONG-TERM MEMORY           │                            │
│  │     (Persistent User Knowledge)     │                            │
│  ├─────────────────────────────────────┤                            │
│  │  • User preferences                 │                            │
│  │  • Past projects & decisions        │                            │
│  │  • Relationships (who works with)   │                            │
│  │  • Communication style preferences  │                            │
│  │  • Technical expertise level        │                            │
│  │  • Persists across sessions         │                            │
│  └─────────────────────────────────────┘                            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Real-World Applications

| Memory Type | Example | Benefit |
|-------------|---------|---------|
| **Preferences** | "User prefers concise answers" | Adapts communication style |
| **Context** | "User is working on Q4 launch" | Understands project references |
| **Relationships** | "User collaborates with Sarah on design" | Better suggestions |
| **Expertise** | "User is senior backend engineer" | Adjusts technical depth |
| **History** | "Last week discussed API auth issues" | Continuity in conversations |

### How mem0 Works

mem0.ai provides:
1. **Automatic Memory Extraction** - LLM extracts facts from conversations
2. **Memory Consolidation** - Merges/updates existing memories
3. **Semantic Retrieval** - Finds relevant memories for context
4. **Memory Decay** - Old/unused memories naturally fade

```python
# Example memories extracted from conversation:
{
  "user_id": "U050Y4SNQF3",
  "memories": [
    {"fact": "Prefers Python over JavaScript", "confidence": 0.9},
    {"fact": "Works on Vizuara AI Labs projects", "confidence": 1.0},
    {"fact": "Interested in diffusion models", "confidence": 0.95},
    {"fact": "Has access to A100 GPUs", "confidence": 0.8}
  ]
}
```

---

## 3. MCP (Model Context Protocol)

### Why MCP?

**The Problem:**
Every AI application implements tools differently:
- OpenAI uses Function Calling
- Anthropic uses Tool Use
- LangChain has its own format
- Each integration is custom code

**MCP Solution:**
A standardized protocol for connecting LLMs to tools, data sources, and capabilities.

### Benefits of MCP

| Benefit | Description |
|---------|-------------|
| **Reusability** | Write once, use with any MCP-compatible LLM |
| **Standardization** | Common interface for all tools |
| **Separation of Concerns** | Tools are independent servers |
| **Community Tools** | Use pre-built MCP servers |
| **Security** | Controlled access to capabilities |

### Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        MCP ARCHITECTURE                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────┐         ┌─────────────────────────────────┐        │
│  │   Claude    │         │        MCP Host (Client)        │        │
│  │   or GPT    │◀───────▶│   (Slack AI Assistant)          │        │
│  └─────────────┘         └─────────────┬───────────────────┘        │
│                                        │                            │
│                          ┌─────────────┼─────────────┐              │
│                          │             │             │              │
│                          ▼             ▼             ▼              │
│                   ┌───────────┐ ┌───────────┐ ┌───────────┐        │
│                   │   Slack   │ │  Memory   │ │   RAG     │        │
│                   │   MCP     │ │   MCP     │ │   MCP     │        │
│                   │  Server   │ │  Server   │ │  Server   │        │
│                   └─────┬─────┘ └─────┬─────┘ └─────┬─────┘        │
│                         │             │             │              │
│                         ▼             ▼             ▼              │
│                   ┌───────────┐ ┌───────────┐ ┌───────────┐        │
│                   │   Slack   │ │   mem0    │ │  ChromaDB │        │
│                   │   API     │ │   Store   │ │  Vectors  │        │
│                   └───────────┘ └───────────┘ └───────────┘        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### MCP Server Example

Each MCP server exposes:
- **Tools**: Actions the LLM can take
- **Resources**: Data the LLM can read
- **Prompts**: Pre-defined prompt templates

```typescript
// Slack MCP Server exposes:
{
  "tools": [
    { "name": "send_message", "description": "Send a Slack message" },
    { "name": "get_channel_history", "description": "Get channel messages" },
    { "name": "search_messages", "description": "Search for messages" }
  ],
  "resources": [
    { "uri": "slack://channels", "description": "List of channels" },
    { "uri": "slack://users", "description": "List of users" }
  ]
}
```

---

## Implementation Roadmap

### Phase 1: RAG System ✅
1. Set up ChromaDB for vector storage
2. Create embedding pipeline for Slack messages
3. Implement semantic search tool
4. Add "knowledge base query" capability
5. Background indexing job

### Phase 2: Memory System 
1. Integrate mem0.ai library
2. Implement short-term conversation memory
3. Implement long-term user memory
4. Add memory-aware context injection
5. Memory management tools (view, delete)

### Phase 3: MCP Servers
1. Create Slack MCP server
2. Create Memory MCP server
3. Create RAG MCP server
4. Update main agent to use MCP
5. Documentation for extending

---

## File Structure

```
slack-ai-assistant-v2/
├── src/
│   ├── agents/
│   │   └── agent.ts              # Main AI agent
│   ├── rag/
│   │   ├── embeddings.ts         # OpenAI embeddings
│   │   ├── vectorstore.ts        # ChromaDB operations
│   │   ├── indexer.ts            # Background indexing
│   │   └── retriever.ts          # Semantic search
│   ├── memory/
│   │   ├── mem0-client.ts        # mem0.ai integration
│   │   ├── short-term.ts         # Conversation memory
│   │   └── long-term.ts          # Persistent memory
│   ├── mcp/
│   │   ├── slack-server.ts       # Slack MCP server
│   │   ├── memory-server.ts      # Memory MCP server
│   │   └── rag-server.ts         # RAG MCP server
│   ├── tools/
│   │   └── slack-actions.ts      # Slack API operations
│   └── index.ts                  # Entry point
├── docs/
│   ├── ARCHITECTURE.md           # This document
│   ├── RAG.md                    # RAG implementation details
│   ├── MEMORY.md                 # Memory system details
│   └── MCP.md                    # MCP implementation details
└── ...
```

---

## Next Steps

Continue reading:
- [RAG.md](./RAG.md) - Detailed RAG implementation
- [MEMORY.md](./MEMORY.md) - Memory system details
- [MCP.md](./MCP.md) - MCP server implementation
