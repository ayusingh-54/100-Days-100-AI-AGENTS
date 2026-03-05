# MCP Integration (GitHub & Notion)

## Overview

MCP (Model Context Protocol) is Anthropic's open standard for connecting AI to external tools. This integration lets your Slack bot interact with GitHub and Notion.

---

## What You Can Do

### GitHub
```
User: "Create an issue for the login bug we discussed"
Bot: ✅ Created issue #42: "Fix login timeout bug"

User: "What are the open issues in my-repo?"
Bot: Found 5 open issues:
     1. #42 - Fix login timeout bug
     2. #38 - Add dark mode support
     ...
```

### Notion
```
User: "What's in my Notion about Q4 planning?"
Bot: Found 3 pages about Q4 planning:
     - Q4 Goals (last edited Nov 15)
     - Q4 Budget (last edited Nov 10)
     - Q4 Roadmap (last edited Nov 5)

User: "Search Notion for meeting notes"
Bot: Found 12 pages matching "meeting notes"...
```

---

## Setup

### 1. GitHub Token

1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Select scopes:
   - `repo` (Full control of private repositories)
   - `issues` (Read/write access to issues)
4. Copy the token

Add to `.env`:
```env
GITHUB_PERSONAL_ACCESS_TOKEN=ghp_your_token_here
```

### 2. Notion Token

1. Go to https://www.notion.so/my-integrations
2. Click "New integration"
3. Name it "Slack AI Assistant"
4. Copy the "Internal Integration Token"
5. **Important**: Share pages/databases with your integration
   - Open the page in Notion
   - Click "..." → "Add connections" → Select your integration

Add to `.env`:
```env
NOTION_API_TOKEN=secret_your_token_here
```

### 3. Restart the Bot

```bash
npm run dev
```

You should see:
```
✅ MCP initialized: github, notion
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         SLACK BOT                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   User Message                                                   │
│        │                                                         │
│        ▼                                                         │
│   ┌─────────────────┐                                           │
│   │   AI Agent      │                                           │
│   │   (OpenAI)      │                                           │
│   └────────┬────────┘                                           │
│            │                                                     │
│            │ Tool Calls                                          │
│            │                                                     │
│   ┌────────┴────────────────────────────────┐                   │
│   │                                          │                   │
│   ▼                                          ▼                   │
│ ┌──────────────┐                    ┌──────────────┐            │
│ │ Slack Tools  │                    │  MCP Client  │            │
│ │ (built-in)   │                    │              │            │
│ └──────────────┘                    └──────┬───────┘            │
│                                            │                     │
│                              ┌─────────────┼─────────────┐      │
│                              │             │             │      │
│                              ▼             ▼             ▼      │
│                         ┌────────┐   ┌────────┐   ┌────────┐   │
│                         │ GitHub │   │ Notion │   │  ...   │   │
│                         │ Server │   │ Server │   │        │   │
│                         └────────┘   └────────┘   └────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Available Tools

### GitHub Tools (github_*)

| Tool | Description |
|------|-------------|
| `github_search_repositories` | Search for repositories |
| `github_get_repository` | Get repository details |
| `github_list_issues` | List issues in a repo |
| `github_create_issue` | Create a new issue |
| `github_get_issue` | Get issue details |
| `github_update_issue` | Update an issue |
| `github_list_pull_requests` | List PRs in a repo |
| `github_create_pull_request` | Create a new PR |
| `github_get_file_contents` | Read file from repo |
| `github_search_code` | Search code across repos |

### Notion Tools (notion_*)

| Tool | Description |
|------|-------------|
| `notion_search` | Search all pages |
| `notion_get_page` | Get page content |
| `notion_query_database` | Query a database |
| `notion_create_page` | Create a new page |
| `notion_update_page` | Update page properties |

---

## Configuration File (Optional)

Instead of environment variables, you can use `mcp-config.json`:

```json
{
  "servers": [
    {
      "name": "github",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_..."
      }
    },
    {
      "name": "notion",
      "command": "npx",
      "args": ["-y", "@notionhq/notion-mcp-server"],
      "env": {
        "OPENAPI_MCP_HEADERS": "{\"Authorization\": \"Bearer secret_...\", \"Notion-Version\": \"2022-06-28\"}"
      }
    }
  ]
}
```

---

## Troubleshooting

### "MCP server not connected"

1. Check your tokens are valid
2. Check the logs for errors:
   ```
   [error]: Failed to connect to MCP server github: ...
   ```

### "GitHub: Not Found"

- Make sure your token has the required scopes
- Check the repository name is correct (owner/repo)

### "Notion: Unauthorized"

- Make sure you've shared the page with your integration
- Check the token is correct

### MCP Servers Not Starting

```bash
# Test GitHub server manually
npx -y @modelcontextprotocol/server-github

# Test Notion server manually  
npx -y @notionhq/notion-mcp-server
```

---

## Example Conversations

### Creating a GitHub Issue from Discussion

```
User: We discussed a bug where users can't login after 30 minutes. 
      Can you create an issue for this?

Bot: I'll create a GitHub issue for this bug.

     ✅ Created issue #42 in myorg/myrepo:
     
     Title: Login session expires after 30 minutes
     Labels: bug
     
     The issue has been created. You can view it at:
     https://github.com/myorg/myrepo/issues/42
```

### Searching Notion

```
User: What do we have in Notion about the Q4 product launch?

Bot: I found 4 pages about Q4 product launch:

     1. **Q4 Launch Plan** (last edited 2 days ago)
        Summary of launch timeline and milestones
        
     2. **Marketing Strategy Q4** (last edited 1 week ago)
        Campaign details and budget allocation
        
     3. **Q4 Launch Checklist** (last edited 3 days ago)
        Task list for launch preparation
        
     4. **Q4 Goals** (last edited 2 weeks ago)
        OKRs and success metrics

     Would you like me to get more details on any of these?
```

---

## Security Notes

1. **Token Security**: Never commit tokens to git. Use environment variables.
2. **Scope Limitation**: Only grant necessary scopes to tokens.
3. **Notion Sharing**: Only share necessary pages with the integration.
4. **Audit**: MCP tool calls are logged for auditing.

---

## Adding More MCP Servers

The MCP ecosystem is growing. You can add any MCP-compatible server:

1. Find the server package (e.g., `@modelcontextprotocol/server-filesystem`)
2. Add to `mcp-config.json` or environment variables
3. Restart the bot

Popular MCP servers:
- Filesystem (read/write local files)
- PostgreSQL (query databases)
- Brave Search (web search)
- Slack (additional Slack features)
