# 👨‍⚖️ AI Legal Agent Team

### 🎓 FREE Step-by-Step Tutorial 
**👉 [Click here to follow our complete step-by-step tutorial](https://www.theunwindai.com/p/build-an-ai-legal-team-run-by-ai-agents) and learn how to build this from scratch with detailed code walkthroughs, explanations, and best practices.**

A Streamlit application that simulates a full-service legal team using multiple AI agents to analyze legal documents and provide comprehensive legal insights. Each agent represents a different legal specialist role, from research and contract analysis to strategic planning, working together to provide thorough legal analysis and recommendations.

## Features

- **Specialized Legal AI Agent Team**
  - **Legal Researcher**: DuckDuckGo-powered research to find and cite relevant cases, statutes, and precedents with full citations and jurisdiction context.
  - **Contract Analyst**: Thorough contract review — identifies key terms, obligations, flags ambiguous clauses, and rates each risk as LOW / MEDIUM / HIGH / CRITICAL.
  - **Legal Strategist**: Prioritized, actionable recommendations including suggested amendments and protective clauses.
  - **Team Lead**: Coordinates all three agents, synthesises findings into a cohesive report with document citations.

- **Six Analysis Types**
  - 📑 Contract Review — key terms, obligations, and risk flags
  - 🔍 Legal Research — relevant cases, precedents, and applicable statutes
  - ⚠️ Risk Assessment — severity-rated risks and liabilities
  - ✅ Compliance Check — regulatory and statutory compliance review
  - 🔬 Due Diligence — warranties, indemnities, IP, confidentiality, exit provisions
  - 💭 Custom Query — any bespoke question using the full agent team

- **Quality-of-life enhancements**
  - Jurisdiction selector (US, UK, EU, Canada, Australia, India, Singapore, International)
  - Analysis history — previous runs saved in-session with expandable view
  - Download report — export any analysis as a Markdown file
  - `.env` auto-loading — no need to paste keys into the UI on every run
  - File size guard — rejects files over 10 MB with a clear error
  - Step-by-step progress bar during analysis

## How to Run

1. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure API Keys**

   Option A — add to `.env` (recommended, auto-loaded on startup):
   ```
   OPENAI_API_KEY=sk-...
   QDRANT_API_KEY=...
   QDRANT_URL=https://....qdrant.io
   ```

   Option B — enter them directly in the sidebar.

   - OpenAI API key: [platform.openai.com](https://platform.openai.com/account/api-keys)
   - Qdrant cloud: [cloud.qdrant.io](https://cloud.qdrant.io) (free tier available)

3. **Run**
   ```bash
   streamlit run legal_agent_team.py
   ```

4. **Use the app**
   - Click **Connect to Qdrant** in the sidebar
   - Upload a legal document (PDF or TXT, max 10 MB)
   - Choose an analysis type and jurisdiction
   - Click **Analyze Document**
   - Download the report with the **⬇ Download Report** button

## Notes

- Supported formats: PDF, TXT (max 10 MB)
- LLM: GPT-4o
- Embeddings: text-embedding-3-small
- Requires a stable internet connection
- OpenAI and Qdrant API usage costs apply