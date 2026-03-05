# Memory System (mem0 Integration)

## What is mem0?

mem0 is an intelligent memory layer for AI applications. It automatically extracts, stores, and retrieves relevant facts from conversations, enabling personalized AI experiences.

---

## Why Memory for a Slack Bot?

### The Problem: Goldfish Memory

Without memory, every conversation starts fresh:

```
Day 1:
User: I'm working on the Q4 launch project
Bot: Great! How can I help with that?

Day 2:
User: Any updates on the project?
Bot: Which project are you referring to?  ← Forgot everything!
```

### With Memory:

```
Day 1:
User: I'm working on the Q4 launch project
Bot: Great! How can I help with that?
[Memory stored: "User is working on Q4 launch project"]

Day 2:
User: Any updates on the project?
Bot: I remember you're working on the Q4 launch. Let me check...
```

---

## Memory Types

```
┌─────────────────────────────────────────────────────────────────┐
│                     MEMORY ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              SHORT-TERM MEMORY (Session)                  │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │  • Recent conversation history                            │   │
│  │  • Current task context                                   │   │
│  │  • Cleared when session ends                              │   │
│  │  • Stored in SQLite (existing)                            │   │
│  └──────────────────────────────────────────────────────────┘   │
│                           │                                      │
│                           │ Summarization                        │
│                           ▼                                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              LONG-TERM MEMORY (mem0)                      │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │  • User preferences (timezone, communication style)       │   │
│  │  • Projects they're working on                            │   │
│  │  • Technical expertise level                              │   │
│  │  • Relationships (who they work with)                     │   │
│  │  • Past decisions and context                             │   │
│  │  • Persists across sessions (via mem0)                    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## How mem0 Works

### 1. Automatic Fact Extraction

mem0 uses an LLM to extract facts from conversations:

```
Conversation:
User: "I'm Alex, a senior engineer working on the payment system"
Bot: "Nice to meet you Alex! How can I help?"

mem0 extracts:
- Name is Alex
- Role is senior engineer
- Working on payment system
```

### 2. Memory Consolidation

mem0 intelligently merges and updates memories:

```
Old memory: "User is working on payment system"
New info: "User finished payment system, now on notifications"

Result: "User completed payment system, currently working on notifications"
```

### 3. Semantic Retrieval

When you ask a question, mem0 finds relevant memories:

```
Query: "What should I focus on today?"

Relevant memories retrieved:
- "User is working on notifications feature"
- "Deadline is Friday"
- "User prefers morning deep work"

Bot can now give personalized advice!
```

---

## Implementation

### Memory Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        MESSAGE FLOW                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User Message                                                    │
│       │                                                          │
│       ▼                                                          │
│  ┌─────────────┐                                                 │
│  │ Retrieve    │ ← Get relevant memories for this user          │
│  │ Memories    │                                                 │
│  └─────┬───────┘                                                 │
│        │                                                          │
│        ▼                                                          │
│  ┌─────────────┐                                                 │
│  │ Build       │ ← Add memories to system prompt                │
│  │ Context     │                                                 │
│  └─────┬───────┘                                                 │
│        │                                                          │
│        ▼                                                          │
│  ┌─────────────┐                                                 │
│  │ LLM         │ ← Generate response with context               │
│  │ Response    │                                                 │
│  └─────┬───────┘                                                 │
│        │                                                          │
│        ▼                                                          │
│  ┌─────────────┐                                                 │
│  │ Store       │ ← Extract and save new memories                │
│  │ Memories    │                                                 │
│  └─────────────┘                                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### API Usage

```typescript
import { Memory } from 'mem0ai/oss';

// Initialize
const memory = new Memory();

// Add memories from conversation
await memory.add([
  { role: 'user', content: "I prefer concise responses" },
  { role: 'assistant', content: "Got it, I'll keep things brief!" }
], { userId: 'U12345' });

// Search memories
const results = await memory.search(
  "What are the user's preferences?",
  { userId: 'U12345' }
);

// Get all memories for a user
const allMemories = await memory.getAll({ userId: 'U12345' });

// Delete a memory
await memory.delete(memoryId);
```

---

## Real-World Use Cases

| Use Case | Memory Stored | Benefit |
|----------|---------------|---------|
| Communication style | "User prefers detailed explanations" | Adapts response depth |
| Projects | "Working on Q4 launch until Dec 15" | Relevant context |
| Expertise | "Senior backend engineer, Python expert" | Appropriate technical level |
| Preferences | "Uses VS Code, prefers TypeScript" | Better recommendations |
| Relationships | "Reports to Sarah, works with Mike" | Understands team dynamics |

---

## Example Conversations

### Without Memory:
```
User: Hey, any tips for my presentation?
Bot: What presentation? Could you give me more context?
```

### With Memory:
```
User: Hey, any tips for my presentation?
Bot: For your board presentation on Q4 metrics next week? 
     Based on your preference for data-driven slides, 
     I'd suggest leading with the revenue charts...

[Memories used:
 - "Has board presentation next week"
 - "Presenting Q4 metrics"
 - "Prefers data-driven presentations"]
```

---

## Configuration

```env
# Memory Configuration
MEMORY_ENABLED=true

# mem0 can run locally (default) or use their cloud API
# For cloud: MEM0_API_KEY=your-api-key

# OpenAI is used for memory extraction
OPENAI_API_KEY=sk-...
```

---

## Privacy Considerations

1. **User Control**: Users can ask to see/delete their memories
2. **Scope**: Memories are per-user, not shared across users
3. **Retention**: Can set memory expiration policies
4. **Transparency**: Bot can explain what it remembers

---

## Tools Added

| Tool | Description |
|------|-------------|
| `get_my_memories` | Show user what the bot remembers about them |
| `forget_about` | Delete specific memories |
| `remember_this` | Explicitly store something |

---

## Limitations

1. **Extraction Quality**: Depends on LLM quality
2. **Storage**: Local storage limited by disk space
3. **Latency**: Memory retrieval adds ~100-200ms
4. **Cost**: Uses OpenAI API for extraction

---

## Next Steps

- See [ARCHITECTURE.md](./ARCHITECTURE.md) for overall system design
- See [MCP.md](./MCP.md) for Model Context Protocol integration
