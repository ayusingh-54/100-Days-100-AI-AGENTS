# Deploying AI Co-Browser to Vercel — Complete Guide

This document covers **everything** you need to deploy this full-stack AI portfolio chatbot on Vercel, including which plan to use, how the architecture works, and step-by-step instructions.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Which Vercel Plan to Use](#2-which-vercel-plan-to-use)
3. [Can I Deploy Frontend & Backend Separately?](#3-can-i-deploy-frontend--backend-separately)
4. [Project Structure for Vercel](#4-project-structure-for-vercel)
5. [Prerequisites](#5-prerequisites)
6. [Step-by-Step Deployment (CLI)](#6-step-by-step-deployment-cli)
7. [Step-by-Step Deployment (GitHub Integration)](#7-step-by-step-deployment-github-integration)
8. [Environment Variables Setup](#8-environment-variables-setup)
9. [vercel.json Explained](#9-verceljson-explained)
10. [Testing After Deployment](#10-testing-after-deployment)
11. [Custom Domain Setup](#11-custom-domain-setup)
12. [Troubleshooting](#12-troubleshooting)
13. [Important Vercel Limits](#13-important-vercel-limits)

---

## 1. Architecture Overview

Vercel uses a **hybrid deployment model**:

```
┌─────────────────────────────────────────────────────┐
│                     VERCEL                          │
│                                                     │
│   ┌───────────────────┐   ┌──────────────────────┐  │
│   │  Static Frontend  │   │  Serverless Functions │  │
│   │  (Vite + React)   │   │  (Node.js API)       │  │
│   │                   │   │                       │  │
│   │  dist/public/     │   │  api/portfolio.ts     │  │
│   │  ├── index.html   │   │  api/chat.ts          │  │
│   │  ├── assets/      │   │  api/_storage.ts      │  │
│   │  └── ...          │   │                       │  │
│   └───────────────────┘   └──────────────────────┘  │
│          ▲                         ▲                │
│          │                         │                │
│     Static CDN              AWS Lambda              │
│     (Edge Network)          (Serverless)            │
└─────────────────────────────────────────────────────┘
              ▲                     ▲
              │                     │
              └──── Browser ────────┘
                GET /  → static
                GET /api/portfolio → serverless
                POST /api/chat → serverless
```

- **Frontend**: Built by Vite → static HTML/CSS/JS served from Vercel's CDN (fast, global)
- **Backend**: Each file in `api/` becomes a serverless function (Node.js runtime)
- **No Express server**: Vercel replaces Express with serverless. Each API file exports a handler

---

## 2. Which Vercel Plan to Use

### Hobby Plan (FREE) — Recommended for Portfolio & Demo

| Feature               | Hobby (Free)   | Pro ($20/month) |
| --------------------- | -------------- | --------------- |
| **Price**             | $0             | $20/month       |
| **Deployments**       | Unlimited      | Unlimited       |
| **Serverless Fn**     | 12 per project | 60 per project  |
| **Fn Execution Time** | 10 seconds max | 60 seconds max  |
| **Bandwidth**         | 100 GB/month   | 1 TB/month      |
| **Custom Domain**     | Yes            | Yes             |
| **HTTPS**             | Auto (free)    | Auto (free)     |
| **Env Variables**     | Yes            | Yes             |
| **Git Integration**   | Yes            | Yes             |
| **Team Members**      | 1 (personal)   | Unlimited       |

### Recommendation:

> **Use the Hobby (Free) plan.** It's perfect for this portfolio project.
> The only concern is the **10-second function timeout** — OpenAI API calls typically take 2-5 seconds, so it should work fine.
> If you're doing very long AI conversations, upgrade to Pro for the 60-second timeout.

---

## 3. Can I Deploy Frontend & Backend Separately?

### Short Answer: **Yes, but you don't need to.**

### Option A: Single Deployment (RECOMMENDED ✅)

Deploy everything in one Vercel project. This is what our `vercel.json` does:

- Frontend files → served as static from CDN
- `api/` folder → deployed as serverless functions
- Same domain for both (no CORS issues)

### Option B: Separate Deployments

You could split them into two repos/projects:

| Part     | Deploy To        | Notes                               |
| -------- | ---------------- | ----------------------------------- |
| Frontend | Vercel (static)  | Just the `client/` folder with Vite |
| Backend  | Vercel Functions | Only the `api/` folder              |
| Backend  | Railway / Render | Full Express server                 |

**Problems with separate deployment:**

- CORS configuration needed
- Two URLs to manage
- Environment variables in two places
- More complex for a portfolio demo

**Verdict**: Use Option A (single deployment). It's simpler, faster, and free.

---

## 4. Project Structure for Vercel

```
AI-Co-Browser/
├── api/                    ← Vercel Serverless Functions
│   ├── _storage.ts         ← Shared data (prefixed with _ = not a route)
│   ├── portfolio.ts        ← GET /api/portfolio
│   └── chat.ts             ← POST /api/chat
│
├── client/                 ← React frontend (Vite)
│   ├── index.html
│   └── src/
│       └── ...
│
├── shared/                 ← Shared TypeScript types
│   ├── schema.ts
│   └── routes.ts
│
├── vercel.json             ← Vercel deployment config
├── vite.config.ts          ← Vite build config
├── package.json            ← Dependencies
├── tsconfig.json           ← TypeScript config
├── .env                    ← Local env vars (GITIGNORED!)
├── .env.example            ← Template for env vars (safe to commit)
└── .gitignore              ← Ignores .env, node_modules, dist, .vercel
```

**Key rules:**

- Files in `api/` → become serverless endpoints automatically
- Files starting with `_` (like `_storage.ts`) → shared helpers, NOT routes
- `vercel.json` → controls build, routing, headers
- `.env` → never committed — set env vars in Vercel dashboard

---

## 5. Prerequisites

Before deploying, make sure you have:

1. **Node.js** ≥ 18.x installed → `node --version`
2. **npm** ≥ 9.x installed → `npm --version`
3. **Git** installed → `git --version`
4. **Vercel account** → Sign up free at [vercel.com](https://vercel.com)
5. **Vercel CLI** installed:
   ```bash
   npm install -g vercel
   ```
6. **OpenAI API Key** — from [platform.openai.com](https://platform.openai.com/api-keys)
7. **GitHub account** (for Git integration method)

---

## 6. Step-by-Step Deployment (CLI Method)

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Login to Vercel

```bash
vercel login
```

This opens a browser window. Sign in with GitHub, GitLab, or email.

### Step 3: Navigate to Your Project

```bash
cd "c:\Users\ayusi\Downloads\AI-Co-Browser (1)\AI-Co-Browser"
```

### Step 4: Build Locally First (Test)

```bash
npm run build
```

This should create `dist/public/` with your frontend files. Verify:

```bash
ls dist/public/
```

You should see `index.html`, `assets/`, etc.

### Step 5: Deploy to Vercel

```bash
vercel
```

Vercel will ask:

```
? Set up and deploy? → Yes
? Which scope? → Select your account
? Link to existing project? → No (first time)
? What's your project name? → ai-co-browser (or any name)
? In which directory is your code located? → ./ (press Enter)
? Want to modify settings? → No
```

### Step 6: Set Environment Variables

```bash
vercel env add OPENAI_API_KEY
```

When prompted:

- **Value**: paste your OpenAI API key
- **Environments**: select `Production`, `Preview`, and `Development`

### Step 7: Deploy to Production

```bash
vercel --prod
```

### Step 8: Open Your Site

Vercel will print a URL like: `https://ai-co-browser-xxxxx.vercel.app`

Open it in your browser! 🎉

---

## 7. Step-by-Step Deployment (GitHub Integration — Recommended)

This method gives you **automatic deployments** on every `git push`.

### Step 1: Initialize Git (if not already)

```bash
cd "c:\Users\ayusi\Downloads\AI-Co-Browser (1)\AI-Co-Browser"
git init
git add .
git commit -m "Initial commit - AI Co-Browser Portfolio"
```

### Step 2: Create a GitHub Repository

1. Go to [github.com/new](https://github.com/new)
2. Name: `ai-co-browser`
3. Set to **Public** or **Private**
4. Do NOT initialize with README (we already have files)
5. Click **Create repository**

### Step 3: Push Code to GitHub

```bash
git remote add origin https://github.com/YOUR_USERNAME/ai-co-browser.git
git branch -M main
git push -u origin main
```

### Step 4: Connect to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **"Import Git Repository"**
3. Select your `ai-co-browser` repo
4. Vercel auto-detects the Vite framework

### Step 5: Configure Build Settings

Vercel should auto-detect from `vercel.json`, but verify:

| Setting              | Value         |
| -------------------- | ------------- |
| **Framework**        | Vite          |
| **Build Command**    | `vite build`  |
| **Output Directory** | `dist/public` |
| **Install Command**  | `npm install` |

### Step 6: Add Environment Variables

In the Vercel project settings, click **"Environment Variables"** and add:

| Key              | Value                   | Environments        |
| ---------------- | ----------------------- | ------------------- |
| `OPENAI_API_KEY` | `sk-proj-your-key-here` | Production, Preview |

> **IMPORTANT**: NEVER commit your API key. It's set in Vercel's dashboard securely.

### Step 7: Click Deploy

Click "Deploy" and wait 1-2 minutes. Vercel will:

1. Install dependencies (`npm install`)
2. Build the frontend (`vite build`)
3. Deploy static files to CDN
4. Deploy `api/` files as serverless functions

### Step 8: Automatic Deployments

After this, every time you push to `main`:

```bash
git add .
git commit -m "Update portfolio"
git push
```

Vercel automatically rebuilds and deploys! 🚀

---

## 8. Environment Variables Setup

### In Vercel Dashboard:

1. Go to your project → **Settings** → **Environment Variables**
2. Add:

| Variable Name    | Value               | Environments             |
| ---------------- | ------------------- | ------------------------ |
| `OPENAI_API_KEY` | Your OpenAI API key | Production, Preview, Dev |

### Security:

- Environment variables in Vercel are **encrypted**
- They are **NOT** visible in your source code
- They are **NOT** in your Git repository
- They are injected at **runtime** into serverless functions via `process.env`

### How It Works:

```
Your Code:
  process.env.OPENAI_API_KEY  →  reads from Vercel's secure store

Vercel Dashboard:
  OPENAI_API_KEY = sk-proj-xxx  →  encrypted, injected at runtime
```

---

## 9. vercel.json Explained

```jsonc
{
  // Schema for IDE autocomplete
  "$schema": "https://openapi.vercel.sh/vercel.json",

  // Vercel platform version (always 2)
  "version": 2,

  // Auto-detect Vite framework settings
  "framework": "vite",

  // Build the React frontend
  "buildCommand": "vite build",

  // Where Vite outputs built files
  "outputDirectory": "dist/public",

  // How to install dependencies
  "installCommand": "npm install",

  // Configure serverless functions runtime
  "functions": {
    "api/**/*.ts": {
      "runtime": "@vercel/node@3", // Node.js runtime for TypeScript
    },
  },

  // URL rewrites (routing rules)
  "rewrites": [
    // API routes → serverless functions
    { "source": "/api/portfolio", "destination": "/api/portfolio" },
    { "source": "/api/chat", "destination": "/api/chat" },

    // Everything else → React SPA (client-side routing)
    { "source": "/(.*)", "destination": "/index.html" },
  ],

  // CORS headers for API routes
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "*" },
        { "key": "Access-Control-Allow-Methods", "value": "GET,POST,OPTIONS" },
        { "key": "Access-Control-Allow-Headers", "value": "Content-Type" },
      ],
    },
  ],
}
```

---

## 10. Testing After Deployment

Once deployed, test these URLs:

### Frontend

```
https://your-project.vercel.app/
```

Should show the portfolio website with the chat widget.

### API - Portfolio Data

```
GET https://your-project.vercel.app/api/portfolio
```

Should return JSON:

```json
{
  "projects": [...],
  "skills": [...],
  "experience": [...]
}
```

### API - Chat

```bash
curl -X POST https://your-project.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Show me projects","context":"Portfolio page text...","sessionId":"test-123"}'
```

Should return JSON with `response` and optionally `toolCall`.

### Chat Widget

1. Click the chat bubble in the bottom-right corner
2. Type "Show me the projects section"
3. The AI should respond and navigate to the projects section

---

## 11. Custom Domain Setup

### Step 1: Go to Vercel Project → Settings → Domains

### Step 2: Add Your Domain

```
yourdomain.com
```

### Step 3: Configure DNS

Add these DNS records at your domain registrar:

| Type  | Name | Value                |
| ----- | ---- | -------------------- |
| CNAME | @    | cname.vercel-dns.com |
| CNAME | www  | cname.vercel-dns.com |

### Step 4: Wait for DNS Propagation (5-30 minutes)

Vercel automatically provisions a free SSL certificate!

---

## 12. Troubleshooting

### "Function execution timed out"

- **Cause**: OpenAI API call took > 10 seconds
- **Fix**: Upgrade to Pro plan (60s timeout) OR reduce `context` size sent to OpenAI

### "OPENAI_API_KEY is not set"

- **Cause**: Environment variable not configured in Vercel
- **Fix**: Go to Project → Settings → Environment Variables → Add `OPENAI_API_KEY`
- **Redeploy** after adding the variable

### "Cannot find module '../shared/schema'"

- **Cause**: Path resolution issue in serverless functions
- **Fix**: Make sure `api/_storage.ts` imports from `../shared/schema` (relative path)

### "404 on /api/chat"

- **Cause**: `vercel.json` rewrites not configured correctly
- **Fix**: Ensure `vercel.json` has the rewrite for `/api/chat`

### "Build failed - vite not found"

- **Cause**: `vite` is in `devDependencies` and Vercel doesn't install them
- **Fix**: Vercel installs devDependencies by default for builds. If not, move `vite` to `dependencies`

### "Module not found: @shared/..."

- **Cause**: The `api/` functions don't use TypeScript path aliases
- **Fix**: Our `api/` files use relative imports (`../shared/schema`) which works with Vercel

### CORS Errors

- **Cause**: Frontend and API on different domains
- **Fix**: Our `vercel.json` already includes CORS headers. If using separate deployments, add your frontend URL to `Access-Control-Allow-Origin`

### Local Testing with Vercel CLI

```bash
vercel dev
```

This simulates the Vercel environment locally, including serverless functions.

---

## 13. Important Vercel Limits

### Hobby (Free) Plan Limits

| Resource               | Limit                 |
| ---------------------- | --------------------- |
| Function Timeout       | 10 seconds            |
| Function Size          | 50 MB (compressed)    |
| Bandwidth              | 100 GB/month          |
| Deployments            | Unlimited             |
| Projects               | Unlimited             |
| Serverless Invocations | 100K/month (included) |
| Build Time             | 45 minutes max        |
| API Key Storage        | Secure Env Vars       |

### Tips for Staying Within Free Limits

1. Keep OpenAI context size small (we already limit to 5000 chars)
2. Don't store large files in the repo
3. The portfolio is a static site — most requests hit CDN, not serverless
4. Only `/api/chat` calls consume function invocations significantly

---

## Quick Reference: Deploy Commands

```bash
# One-time setup
npm install -g vercel
vercel login

# Deploy
cd "c:\Users\ayusi\Downloads\AI-Co-Browser (1)\AI-Co-Browser"
vercel                        # Preview deployment
vercel --prod                 # Production deployment

# Environment variables
vercel env add OPENAI_API_KEY  # Add secret

# Local testing with Vercel
vercel dev                     # Simulates Vercel locally

# Check deployment logs
vercel logs https://your-project.vercel.app
```

---

## Summary

| What              | How                                            |
| ----------------- | ---------------------------------------------- |
| **Plan**          | Hobby (Free) — perfect for portfolio           |
| **Deployment**    | Single project (frontend + API together)       |
| **Frontend**      | Vite builds → static CDN (global edge)         |
| **Backend**       | `api/` folder → Vercel Serverless Functions    |
| **API Key**       | Stored in Vercel Dashboard (encrypted, secure) |
| **Auto Deploy**   | Connect GitHub → push to deploy automatically  |
| **Custom Domain** | Free SSL, just add CNAME records               |
| **Cost**          | $0 for the Hobby plan                          |
