# RAG (Retrieval Augmented Generation) Implementation

## What is RAG?

RAG is a technique that enhances LLM responses by retrieving relevant information from a knowledge base before generating an answer. Instead of relying solely on the model's training data, RAG grounds responses in your actual data.

```
Traditional LLM:
  Question → LLM → Answer (from training data only)

RAG-Enhanced LLM:
  Question → Retrieve Relevant Docs → LLM + Context → Answer (grounded in your data)
```

---

## Why RAG for Slack?

### The Knowledge Problem

Your Slack workspace is a goldmine of institutional knowledge:
- **Decisions**: "Why did we choose Postgres over MongoDB?"
- **Processes**: "How do we deploy to production?"
- **History**: "What happened with the outage last month?"
- **Expertise**: "Who knows about Kubernetes?"

But this knowledge is:
- Scattered across channels
- Buried in old messages
- Hard to search with keywords
- Lost when people leave

### RAG Solution

RAG transforms your Slack history into a searchable knowledge base:

| Before RAG | After RAG |
|------------|-----------|
| Keyword search only | Semantic understanding |
| Miss relevant results | Find conceptually similar content |
| No context in answers | Answers cite specific messages |
| Manual searching | AI finds relevant info automatically |

---

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────────────┐
│                      RAG SYSTEM                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    INDEXING PIPELINE                      │   │
│  │                                                           │   │
│  │  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐  │   │
│  │  │ Slack   │──▶│ Message │──▶│ Create  │──▶│ Store   │  │   │
│  │  │ API     │   │ Fetcher │   │ Embeddings│  │ Vectors │  │   │
│  │  └─────────┘   └─────────┘   └─────────┘   └─────────┘  │   │
│  │                                                           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    RETRIEVAL PIPELINE                     │   │
│  │                                                           │   │
│  │  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐  │   │
│  │  │ User    │──▶│ Embed   │──▶│ Vector  │──▶│ Re-rank │  │   │
│  │  │ Query   │   │ Query   │   │ Search  │   │ Results │  │   │
│  │  └─────────┘   └─────────┘   └─────────┘   └─────────┘  │   │
│  │                                                           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    GENERATION PIPELINE                    │   │
│  │                                                           │   │
│  │  ┌─────────┐   ┌─────────┐   ┌─────────┐                 │   │
│  │  │ Query + │──▶│  LLM    │──▶│ Answer  │                 │   │
│  │  │ Context │   │ (GPT-4) │   │ + Cites │                 │   │
│  │  └─────────┘   └─────────┘   └─────────┘                 │   │
│  │                                                           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Technology Choices

| Component | Technology | Why |
|-----------|------------|-----|
| Vector DB | ChromaDB | Local, easy setup, good for small-medium scale |
| Embeddings | OpenAI text-embedding-3-small | High quality, cost-effective |
| LLM | GPT-4o / Claude | Best reasoning for RAG |

---

## Implementation

### 1. Embeddings Module (`src/rag/embeddings.ts`)

Converts text into vector representations:

```typescript
// What embeddings look like:
"The deployment failed due to memory issues"
    ↓ OpenAI Embedding API
[0.023, -0.041, 0.087, ..., 0.012]  // 1536 dimensions

// Similar meanings = similar vectors
"The deploy crashed because of RAM" → [0.025, -0.039, 0.085, ...]
"Nice weather today" → [-0.091, 0.067, -0.023, ...]  // Very different!
```

### 2. Vector Store (`src/rag/vectorstore.ts`)

Stores and searches embeddings:

```typescript
// Store a message
await vectorStore.add({
  id: "msg_123",
  text: "We decided to use PostgreSQL for better JSON support",
  embedding: [0.023, -0.041, ...],
  metadata: {
    channel: "engineering",
    user: "john",
    timestamp: "2024-01-15T10:30:00Z"
  }
});

// Search for similar messages
const results = await vectorStore.search(
  "database choice discussion",
  { limit: 5 }
);
// Returns messages about databases, even if they don't say "database"
```

### 3. Indexer (`src/rag/indexer.ts`)

Background job that indexes Slack messages:

```typescript
// Runs every hour
async function indexNewMessages() {
  const lastIndexed = await getLastIndexedTimestamp();
  
  for (const channel of channels) {
    const messages = await slack.getHistory(channel, { after: lastIndexed });
    
    for (const msg of messages) {
      const embedding = await createEmbedding(msg.text);
      await vectorStore.add({
        id: msg.ts,
        text: msg.text,
        embedding,
        metadata: {
          channel: channel.name,
          user: msg.user,
          timestamp: msg.ts,
          threadTs: msg.thread_ts
        }
      });
    }
  }
}
```

### 4. Retriever (`src/rag/retriever.ts`)

Semantic search with re-ranking:

```typescript
async function retrieve(query: string, options: RetrieveOptions) {
  // 1. Embed the query
  const queryEmbedding = await createEmbedding(query);
  
  // 2. Find similar documents
  const candidates = await vectorStore.search(queryEmbedding, {
    limit: options.limit * 2  // Get more for re-ranking
  });
  
  // 3. Re-rank by relevance (optional, uses LLM)
  const reranked = await rerankResults(query, candidates);
  
  // 4. Return top results with context
  return reranked.slice(0, options.limit).map(doc => ({
    text: doc.text,
    score: doc.score,
    metadata: doc.metadata,
    context: doc.surrounding  // Messages before/after
  }));
}
```

---

## Usage Examples

### Example 1: Finding Past Decisions

**User asks:**
> "Why did we choose to use Redis for caching?"

**RAG Process:**
1. Embeds query about "Redis caching decision"
2. Finds similar messages in vector store
3. Retrieves: 
   - "After comparing Redis vs Memcached, we went with Redis for its persistence" 
   - "Redis gives us pub/sub which we need for real-time updates"
   - "The caching layer will use Redis cluster for high availability"
4. LLM synthesizes answer with citations

**Response:**
> Based on discussions in #engineering:
> 
> The team chose Redis over Memcached for several reasons:
> 1. **Persistence**: Redis can persist data to disk (mentioned by @john on Jan 15)
> 2. **Pub/Sub**: Real-time update requirements (mentioned by @sarah on Jan 16)
> 3. **Clustering**: High availability needs (mentioned by @mike on Jan 17)

### Example 2: Finding Expertise

**User asks:**
> "Who knows about Kubernetes deployments?"

**RAG Process:**
1. Searches for messages about Kubernetes
2. Analyzes who wrote them and how detailed
3. Returns expertise assessment

**Response:**
> Based on Slack history, these people have discussed Kubernetes:
> - **@mike**: 47 messages about K8s, including deployment strategies
> - **@sarah**: 23 messages, focus on monitoring and alerts
> - **@john**: 15 messages, mainly about local development

### Example 3: Process Discovery

**User asks:**
> "How do we handle production incidents?"

**RAG Process:**
1. Searches for "incident", "outage", "production issue"
2. Finds related discussions and runbooks shared
3. Synthesizes process from historical data

**Response:**
> Based on past incidents and discussions:
> 
> 1. **Alert**: PagerDuty notifies on-call (mentioned in #ops)
> 2. **Triage**: Check Grafana dashboards (linked by @sarah)
> 3. **Communication**: Post in #incidents channel
> 4. **Resolution**: Follow runbook in Notion (shared by @mike)
> 5. **Postmortem**: Document in #postmortems within 48hrs

---

## Configuration

```env
# RAG Configuration
RAG_ENABLED=true
RAG_EMBEDDING_MODEL=text-embedding-3-small
RAG_VECTOR_DB_PATH=./data/chroma
RAG_INDEX_INTERVAL_HOURS=1
RAG_MAX_RESULTS=10
RAG_MIN_SIMILARITY=0.7
```

---

## Performance Considerations

### Indexing
- **Batch embeddings**: Process 100 messages at a time
- **Incremental**: Only index new messages
- **Rate limiting**: Respect OpenAI API limits

### Search
- **Caching**: Cache frequent queries
- **Filtering**: Use metadata filters before vector search
- **Limit scope**: Allow channel-specific searches

### Storage
- **ChromaDB**: Good for < 1M documents
- **Pinecone/Weaviate**: For larger scale
- **Cleanup**: Remove deleted messages

---

## Limitations

1. **No real-time**: Messages indexed on schedule, not instantly
2. **Context window**: Can't include too many results
3. **Quality depends on data**: Bad messages = bad retrieval
4. **Cost**: Embedding API calls cost money
5. **Privacy**: All messages are embedded and stored

---

## Next Steps

After implementing RAG:
1. Add channel filtering for searches
2. Implement time-based filtering ("last month")
3. Add user filtering ("what did @john say about...")
4. Implement automatic re-indexing on message edit/delete
