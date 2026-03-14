import streamlit as st
from agno.agent import Agent
from agno.run.agent import RunOutput
from agno.team import Team
from agno.tools.duckduckgo import DuckDuckGoTools
from agno.models.openai import OpenAIChat
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

MAX_FILE_SIZE_MB = 10
COLLECTION_NAME = "legal_documents"

ANALYSIS_CONFIGS = {
    "Contract Review": {
        "query": (
            "Thoroughly review this contract. Identify all key terms, obligations, rights, "
            "penalties, termination clauses, and potential legal issues. Flag any ambiguous "
            "or missing clauses that could create disputes."
        ),
        "agents": ["Contract Analyst"],
        "description": "Detailed contract analysis — terms, obligations, and risk flags",
        "icon": "📑",
    },
    "Legal Research": {
        "query": (
            "Research and identify relevant legal cases, precedents, and statutes that apply "
            "to this document. Provide full citations and explain their relevance to the "
            "specific provisions of the document."
        ),
        "agents": ["Legal Researcher"],
        "description": "Applicable cases, precedents, and statutes",
        "icon": "🔍",
    },
    "Risk Assessment": {
        "query": (
            "Analyze all potential legal risks and liabilities present in this document. "
            "Rate each risk as LOW, MEDIUM, HIGH, or CRITICAL. Explain the potential "
            "consequences of each risk and how likely they are to materialize."
        ),
        "agents": ["Contract Analyst", "Legal Strategist"],
        "description": "Comprehensive risk analysis with severity ratings",
        "icon": "⚠️",
    },
    "Compliance Check": {
        "query": (
            "Check this document for regulatory compliance issues. Identify any violations "
            "or potential violations of applicable laws and regulations. Specify the exact "
            "regulation or statute at issue."
        ),
        "agents": ["Legal Researcher", "Contract Analyst", "Legal Strategist"],
        "description": "Full regulatory and statutory compliance review",
        "icon": "✅",
    },
    "Due Diligence": {
        "query": (
            "Perform a comprehensive due diligence review of this document. Examine all "
            "material terms, representations, warranties, indemnities, limitation of "
            "liability clauses, IP ownership, confidentiality obligations, and exit provisions."
        ),
        "agents": ["Legal Researcher", "Contract Analyst", "Legal Strategist"],
        "description": "Full due diligence across all material terms and provisions",
        "icon": "🔬",
    },
    "Custom Query": {
        "query": None,
        "agents": ["Legal Researcher", "Contract Analyst", "Legal Strategist"],
        "description": "Custom analysis using the full agent team",
        "icon": "💭",
    },
}

JURISDICTIONS = [
    "United States",
    "United Kingdom",
    "European Union",
    "Canada",
    "Australia",
    "India",
    "Singapore",
    "General / International",
]


# ── Session state ─────────────────────────────────────────────────────────────

def init_session_state():
    defaults = {
        "openai_api_key": os.getenv("OPENAI_API_KEY", ""),
        "legal_team": None,
        "processed_files": set(),
        "analysis_history": [],
        "current_doc_name": None,
        "current_doc_size_mb": None,
        "document_text": "",
    }
    for key, default in defaults.items():
        if key not in st.session_state:
            st.session_state[key] = default


# ── Document processing ───────────────────────────────────────────────────────

MAX_PROMPT_CHARS = 60_000   # ~15k tokens — well within GPT-4o's 128k context

def _extract_text(uploaded_file) -> str:
    """Return plain text from a PDF or TXT upload."""
    ext = uploaded_file.name.rsplit(".", 1)[-1].lower()
    if ext == "txt":
        return uploaded_file.getvalue().decode("utf-8", errors="ignore")
    # PDF
    from pypdf import PdfReader
    import io
    reader = PdfReader(io.BytesIO(uploaded_file.getvalue()))
    return "\n\n".join(page.extract_text() or "" for page in reader.pages)


def process_document(uploaded_file) -> bool:
    """Extract text from the uploaded file and store it in session state."""
    if not st.session_state.openai_api_key:
        raise ValueError("OpenAI API key not provided.")

    file_bytes = uploaded_file.getvalue()
    size_mb = len(file_bytes) / (1024 * 1024)
    if size_mb > MAX_FILE_SIZE_MB:
        raise ValueError(
            f"File is {size_mb:.1f} MB — exceeds the {MAX_FILE_SIZE_MB} MB limit."
        )

    os.environ["OPENAI_API_KEY"] = st.session_state.openai_api_key

    with st.spinner("Extracting document text…"):
        text = _extract_text(uploaded_file)

    if not text.strip():
        raise ValueError(
            "Could not extract any text from this file. "
            "The PDF may be scanned/image-based. Please use a text-based PDF or TXT."
        )

    st.session_state.document_text = text
    st.session_state.current_doc_name = uploaded_file.name
    st.session_state.current_doc_size_mb = size_mb
    return True


# ── Agent team ────────────────────────────────────────────────────────────────

def build_legal_team() -> Team:
    os.environ["OPENAI_API_KEY"] = st.session_state.openai_api_key

    legal_researcher = Agent(
        name="Legal Researcher",
        role="Legal research specialist",
        model=OpenAIChat(id="gpt-4o"),
        tools=[DuckDuckGoTools()],
        instructions=[
            "The full contract/document text is provided directly in the query.",
            "Find and cite relevant legal cases, statutes, and precedents.",
            "Provide full citations including court, year, and jurisdiction.",
            "Reference specific sections from the document text supplied.",
            "Indicate the jurisdiction for every case you cite.",
        ],
        markdown=True,
    )

    contract_analyst = Agent(
        name="Contract Analyst",
        role="Contract analysis specialist",
        model=OpenAIChat(id="gpt-4o"),
        instructions=[
            "The full contract/document text is provided directly in the query.",
            "Review the document thoroughly and systematically.",
            "Identify key terms, obligations, rights, penalties, and missing clauses.",
            "Rate the risk level of each issue as LOW, MEDIUM, HIGH, or CRITICAL.",
            "Reference specific clause numbers or section headings from the document.",
            "Flag ambiguous language that could lead to disputes.",
        ],
        markdown=True,
    )

    legal_strategist = Agent(
        name="Legal Strategist",
        role="Legal strategy specialist",
        model=OpenAIChat(id="gpt-4o"),
        instructions=[
            "The full contract/document text is provided directly in the query.",
            "Develop comprehensive legal strategies based on identified issues.",
            "Provide concrete, prioritized, and actionable recommendations.",
            "Suggest specific protective clauses or amendments where appropriate.",
            "Consider both risks and opportunities in your strategy.",
            "Order recommendations by urgency and potential impact.",
        ],
        markdown=True,
    )

    team = Team(
        name="Legal Team Lead",
        model=OpenAIChat(id="gpt-4o"),
        members=[legal_researcher, contract_analyst, legal_strategist],
        instructions=[
            "The full document text is embedded in the query — use it as the primary source.",
            "Coordinate all agents for a thorough, cohesive analysis.",
            "Synthesize findings into a well-structured, clearly headed report.",
            "Ensure all recommendations are sourced and referenced to the document.",
            "Produce markdown output with clear section headings.",
        ],
        markdown=True,
    )

    return team


# ── Export helper ─────────────────────────────────────────────────────────────

def build_export_text(record: dict) -> str:
    lines = [
        "# Legal Analysis Report",
        "",
        f"**Document:** {record.get('document', 'Unknown')}",
        f"**Analysis Type:** {record.get('type', 'Unknown')}",
        f"**Jurisdiction:** {record.get('jurisdiction', 'N/A')}",
        f"**Date:** {record.get('timestamp', 'Unknown')}",
        "",
        "---",
        "",
        "## Detailed Analysis",
        "",
        record.get("analysis", ""),
        "",
        "---",
        "",
        "## Key Points",
        "",
        record.get("key_points", ""),
        "",
        "---",
        "",
        "## Recommendations",
        "",
        record.get("recommendations", ""),
    ]
    return "\n".join(lines)


# ── Main app ──────────────────────────────────────────────────────────────────

def main():
    st.set_page_config(
        page_title="AI Legal Agent Team",
        page_icon="⚖️",
        layout="wide",
        initial_sidebar_state="expanded",
    )
    init_session_state()

    # ── Sidebar ───────────────────────────────────────────────────────────────
    with st.sidebar:
        st.title("⚖️ Legal Agent")

        # API key
        keys_ok = bool(st.session_state.openai_api_key)
        with st.expander("🔑 API Key", expanded=not keys_ok):
            openai_key = st.text_input(
                "OpenAI API Key",
                type="password",
                value=st.session_state.openai_api_key or "",
                help="Loaded automatically from OPENAI_API_KEY in .env",
            )
            if openai_key:
                st.session_state.openai_api_key = openai_key
            if st.session_state.openai_api_key:
                st.success("API key set")
            else:
                st.info("Enter your OpenAI API key to continue.")

        st.divider()

        # Document upload
        uploaded_file = None
        analysis_type = list(ANALYSIS_CONFIGS.keys())[0]
        jurisdiction = JURISDICTIONS[0]

        if st.session_state.openai_api_key:
            st.subheader("📄 Document")
            uploaded_file = st.file_uploader(
                "Upload Legal Document",
                type=["pdf", "txt"],
                help=f"PDF or TXT — max {MAX_FILE_SIZE_MB} MB",
            )

            if uploaded_file:
                size_mb = len(uploaded_file.getvalue()) / (1024 * 1024)
                st.caption(f"{uploaded_file.name} ({size_mb:.1f} MB)")

                if uploaded_file.name not in st.session_state.processed_files:
                    with st.spinner("Processing…"):
                        try:
                            if process_document(uploaded_file):
                                st.session_state.processed_files.add(uploaded_file.name)
                                st.session_state.legal_team = build_legal_team()
                                st.success("Ready for analysis!")
                        except Exception as e:
                            st.error(str(e))
                else:
                    st.success("Document ready")

            st.divider()
            st.subheader("🔍 Analysis Type")
            analysis_type = st.selectbox(
                "Type",
                list(ANALYSIS_CONFIGS.keys()),
                format_func=lambda x: f"{ANALYSIS_CONFIGS[x]['icon']} {x}",
                label_visibility="collapsed",
            )
            st.caption(ANALYSIS_CONFIGS[analysis_type]["description"])

            st.divider()
            st.subheader("🌍 Jurisdiction")
            jurisdiction = st.selectbox(
                "Jurisdiction",
                JURISDICTIONS,
                label_visibility="collapsed",
            )

        # History counter
        if st.session_state.analysis_history:
            st.divider()
            n = len(st.session_state.analysis_history)
            col_a, col_b = st.columns([2, 1])
            with col_a:
                st.caption(f"📜 {n} saved {'analysis' if n == 1 else 'analyses'}")
            with col_b:
                if st.button("Clear", use_container_width=True):
                    st.session_state.analysis_history = []
                    st.rerun()

    # ── Page header ───────────────────────────────────────────────────────────
    hcol1, hcol2 = st.columns([3, 1])
    with hcol1:
        st.title("AI Legal Agent Team")
        st.caption("Multi-agent legal analysis powered by GPT-4o")
    with hcol2:
        if st.session_state.legal_team:
            st.success("System ready")
        elif st.session_state.openai_api_key:
            st.info("Awaiting document")
        else:
            st.warning("Setup required")

    # ── Onboarding ────────────────────────────────────────────────────────────
    if not st.session_state.openai_api_key:
        st.info("Enter your OpenAI API key in the sidebar to begin.")
        with st.expander("How to get started"):
            st.markdown(
                """
**Step 1 — OpenAI API Key**
Get yours from [platform.openai.com](https://platform.openai.com/account/api-keys).
Add it to a `.env` file for automatic loading:
```
OPENAI_API_KEY=sk-...
```

**Step 2 — Upload a document**
PDF or plain-text, up to 10 MB.

**Step 3 — Analyze**
Choose an analysis type, jurisdiction, and click **Analyze Document**.
"""
            )
        return

    if not (uploaded_file and st.session_state.legal_team):
        _render_history()
        if not st.session_state.analysis_history:
            st.info("Upload a legal document in the sidebar to begin.")
        return

    # ── Analysis panel ────────────────────────────────────────────────────────
    cfg = ANALYSIS_CONFIGS[analysis_type]
    st.header(f"{cfg['icon']} {analysis_type}")
    st.caption(
        f"Agents: {', '.join(cfg['agents'])}  ·  Jurisdiction: {jurisdiction}"
    )

    user_query = None
    if analysis_type == "Custom Query":
        user_query = st.text_area(
            "Your legal question:",
            height=100,
            placeholder=(
                "e.g., What are each party's termination rights, "
                "and what notice periods apply?"
            ),
        )

    if st.button("Analyze Document", type="primary"):
        if analysis_type == "Custom Query" and not user_query:
            st.warning("Please enter a query.")
            return

        os.environ["OPENAI_API_KEY"] = st.session_state.openai_api_key

        # Build combined query
        jnote = (
            f"\n\nJurisdiction: {jurisdiction}"
            if jurisdiction != "General / International"
            else ""
        )
        base = cfg["query"] if analysis_type != "Custom Query" else user_query
        doc_text = st.session_state.document_text[:MAX_PROMPT_CHARS]
        full_query = (
            f"DOCUMENT TO ANALYZE:\n"
            f"{'─' * 60}\n"
            f"{doc_text}\n"
            f"{'─' * 60}\n\n"
            f"ANALYSIS TASK: {base}"
            f"{jnote}\n\n"
            f"Agents assigned: {', '.join(cfg['agents'])}\n"
            f"Base your entire response on the document text provided above. "
            f"Cite specific clauses, sections, or paragraph numbers where relevant."
        )

        record: dict = {
            "type": analysis_type,
            "icon": cfg["icon"],
            "document": st.session_state.current_doc_name or "Unknown",
            "jurisdiction": jurisdiction,
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M"),
            "analysis": "",
            "key_points": "",
            "recommendations": "",
        }

        progress = st.progress(0, text="Starting analysis…")

        try:
            progress.progress(15, text="Running primary analysis…")
            r1: RunOutput = st.session_state.legal_team.run(full_query)
            analysis_text = _extract_content(r1)
            record["analysis"] = analysis_text

            progress.progress(50, text="Extracting key points…")
            r2: RunOutput = st.session_state.legal_team.run(
                f"Based on this analysis:\n\n{analysis_text}\n\n"
                f"List the 5–8 most important key points as concise bullet points. "
                f"Focus on findings from: {', '.join(cfg['agents'])}."
            )
            kp_text = _extract_content(r2)
            record["key_points"] = kp_text

            progress.progress(80, text="Generating recommendations…")
            r3: RunOutput = st.session_state.legal_team.run(
                f"Based on this analysis:\n\n{analysis_text}\n\n"
                f"Provide 3–5 specific, actionable recommendations in priority order. "
                f"Be concrete about what to do and why."
            )
            rec_text = _extract_content(r3)
            record["recommendations"] = rec_text

            progress.progress(100, text="Done!")
            progress.empty()

            st.session_state.analysis_history.append(record)

            _render_result_tabs(record)

            # Download button
            export_md = build_export_text(record)
            fname = (
                f"legal_{analysis_type.lower().replace(' ', '_')}_"
                f"{datetime.now().strftime('%Y%m%d_%H%M')}.md"
            )
            st.download_button(
                "⬇ Download Report (.md)",
                data=export_md,
                file_name=fname,
                mime="text/markdown",
            )

        except Exception as e:
            progress.empty()
            st.error(f"Analysis failed: {e}")

    # Previous analyses in this session
    prior = st.session_state.analysis_history[:-1] if st.session_state.analysis_history else []
    if prior:
        st.divider()
        st.subheader("Previous analyses this session")
        _render_history(records=prior)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _extract_content(run_output: RunOutput) -> str:
    if run_output.content:
        return run_output.content
    return "\n".join(
        m.content
        for m in run_output.messages
        if m.role == "assistant" and m.content
    )


def _render_result_tabs(record: dict):
    tabs = st.tabs(["Analysis", "Key Points", "Recommendations"])
    meta = (
        f"**Document:** {record['document']}  ·  "
        f"**Type:** {record['type']}  ·  "
        f"**Jurisdiction:** {record['jurisdiction']}  ·  "
        f"**Date:** {record['timestamp']}"
    )
    with tabs[0]:
        st.caption(meta)
        st.markdown(record["analysis"])
    with tabs[1]:
        st.markdown(record["key_points"])
    with tabs[2]:
        st.markdown(record["recommendations"])


def _render_history(records: list | None = None):
    if records is None:
        records = list(reversed(st.session_state.analysis_history))
    for i, rec in enumerate(records):
        label = (
            f"{rec['icon']} {rec['type']} — "
            f"{rec['document']} ({rec['timestamp']})"
        )
        with st.expander(label):
            _render_result_tabs(rec)
            export_md = build_export_text(rec)
            st.download_button(
                "⬇ Download",
                data=export_md,
                file_name=f"legal_{i}.md",
                mime="text/markdown",
                key=f"hist_dl_{i}_{rec['timestamp']}",
            )


if __name__ == "__main__":
    main()

