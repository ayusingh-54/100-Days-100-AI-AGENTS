# 🤝 Contributing to 100 Days 100 AI Agents

First off, **thank you** for considering contributing to this project! 🎉

This document provides guidelines and best practices for contributing. Following these guidelines helps communicate that you respect the time of the developers managing and developing this open source project.

---

## 📋 Table of Contents

- [Code of Conduct](#-code-of-conduct)
- [How Can I Contribute?](#-how-can-i-contribute)
  - [Reporting Bugs](#-reporting-bugs)
  - [Suggesting Features](#-suggesting-features)
  - [Code Contributions](#-code-contributions)
  - [Documentation](#-documentation)
  - [Building New Agents](#-building-new-agents)
- [Development Setup](#-development-setup)
- [Style Guidelines](#-style-guidelines)
- [Commit Messages](#-commit-messages)
- [Pull Request Process](#-pull-request-process)
- [Community](#-community)

---

## 📜 Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to [ayusingh693@gmail.com](mailto:ayusingh693@gmail.com).

---

## 🎯 How Can I Contribute?

### 🐛 Reporting Bugs

Bug reports help us make the project better! Before submitting a bug report:

1. **Check existing issues** - Someone may have already reported it
2. **Try the latest version** - The bug might already be fixed
3. **Collect information** - The more details, the better

#### How to Submit a Bug Report

Create an issue using the **Bug Report** template and include:

```markdown
**Describe the bug**
A clear and concise description of what the bug is.

**Agent/Project**
Which agent is affected? (e.g., 01_customer_support_agent)

**To Reproduce**
Steps to reproduce the behavior:

1. Go to '...'
2. Run command '...'
3. See error

**Expected behavior**
What you expected to happen.

**Environment**

- OS: [e.g., Windows 11, macOS 14, Ubuntu 22.04]
- Python version: [e.g., 3.10.12]
- Node.js version: [e.g., 18.17.0]

**Screenshots/Logs**
If applicable, add screenshots or error logs.

**Additional context**
Any other context about the problem.
```

---

### ✨ Suggesting Features

We love new ideas! To suggest a feature:

1. **Check existing issues** - It might already be suggested
2. **Explain the use case** - Why is this feature needed?
3. **Describe the solution** - How do you envision it working?

Use the **Feature Request** template:

```markdown
**Is your feature request related to a problem?**
A description of what the problem is.

**Describe the solution you'd like**
A clear description of what you want to happen.

**Describe alternatives you've considered**
Any alternative solutions or features you've considered.

**Applicable agents**
Which agents would benefit from this feature?

**Additional context**
Any other context, mockups, or examples.
```

---

### 💻 Code Contributions

#### Good First Issues

New to the project? Look for issues labeled:

- `good first issue` - Good for newcomers
- `help wanted` - Extra attention needed
- `documentation` - Help improve docs

#### Areas for Contribution

| Area             | Description             |
| ---------------- | ----------------------- |
| 🐛 Bug fixes     | Fix existing bugs       |
| ✨ Features      | Add new functionality   |
| 🧪 Tests         | Add or improve tests    |
| 📝 Documentation | Improve READMEs, guides |
| 🎨 UI/UX         | Improve user interfaces |
| ⚡ Performance   | Optimize code           |
| 🔒 Security      | Security improvements   |

---

### 📝 Documentation

Great documentation is crucial! You can help by:

- **Fixing typos** and grammatical errors
- **Clarifying** confusing explanations
- **Adding examples** for complex features
- **Translating** documentation
- **Writing tutorials** and guides

---

### 🤖 Building New Agents

Want to contribute a new AI agent? Amazing! Here's how:

#### Agent Requirements

1. **Unique Functionality** - The agent should solve a distinct problem
2. **Production Quality** - Code should be clean and well-tested
3. **Documentation** - Comprehensive README with setup instructions
4. **Dependencies** - Clearly specified in requirements.txt/package.json

#### Agent Structure

```
XX_agent_name/
├── README.md              # Required: Setup, usage, architecture
├── requirements.txt       # Python dependencies (or package.json)
├── .env.example          # Required environment variables
├── app.py                # Main application (Streamlit, CLI, etc.)
├── backend.py            # Agent logic (or src/ folder)
├── notebooks/            # Optional: Jupyter notebooks
├── tests/                # Optional but encouraged: Tests
└── assets/               # Optional: Images, diagrams
```

#### README Template for Agents

````markdown
# 🤖 Agent Name

Short description of what the agent does.

## 🌟 Features

- Feature 1
- Feature 2
- Feature 3

## 🏗️ Architecture

[Include a diagram if possible]

## 🚀 Quick Start

### Prerequisites

- Python 3.10+
- OpenAI API key

### Installation

\```bash
cd XX_agent_name
pip install -r requirements.txt
cp .env.example .env

# Edit .env with your API keys

\```

### Usage

\```bash
streamlit run app.py
\```

## 📖 How It Works

Detailed explanation of the agent's functionality.

## 🛠️ Configuration

| Variable       | Description     | Required |
| -------------- | --------------- | -------- |
| OPENAI_API_KEY | Your OpenAI key | Yes      |

## 📝 Examples

[Show example inputs and outputs]

## 🔧 Troubleshooting

Common issues and solutions.

## 📄 License

Apache 2.0
````

---

## 🛠️ Development Setup

### Prerequisites

```bash
# Required
- Git
- Python 3.10+ (for Python agents)
- Node.js 18+ (for TypeScript agents)
- Virtual environment support

# Optional
- Docker
- PostgreSQL
- Redis
```

### Fork & Clone

```bash
# 1. Fork the repository on GitHub

# 2. Clone your fork
git clone https://github.com/YOUR-USERNAME/100-Days-100-AI-AGENTS-.git
cd 100-Days-100-AI-AGENTS-

# 3. Add upstream remote
git remote add upstream https://github.com/ayusingh-54/100-Days-100-AI-AGENTS-.git

# 4. Keep your fork synced
git fetch upstream
git checkout main
git merge upstream/main
```

### Python Development

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install development dependencies
pip install -r requirements-dev.txt  # If exists

# Install pre-commit hooks
pip install pre-commit
pre-commit install
```

### Node.js Development

```bash
# Install dependencies
npm install

# Run linting
npm run lint

# Run tests
npm run test
```

---

## 🎨 Style Guidelines

### Python Code Style

We follow **PEP 8** with some modifications:

```python
# Use type hints
def get_response(prompt: str, model: str = "gpt-4") -> str:
    """
    Generate a response using the specified model.

    Args:
        prompt: The input prompt
        model: The model to use

    Returns:
        The generated response
    """
    pass

# Use meaningful names
customer_name = "John"  # Good
cn = "John"  # Bad

# Document complex logic
# Calculate the weighted score based on recency and relevance
score = (recency_weight * recency) + (relevance_weight * relevance)

# Use constants for magic numbers
MAX_RETRIES = 3
TIMEOUT_SECONDS = 30
```

### TypeScript Code Style

```typescript
// Use explicit types
interface User {
  id: string;
  name: string;
  email: string;
}

// Use async/await over promises
async function fetchUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  return response.json();
}

// Prefer const over let
const users: User[] = [];

// Use descriptive names
const fetchUserById = async (userId: string) => {...};  // Good
const fn = async (x: string) => {...};  // Bad
```

### Code Organization

```
# Good structure
src/
├── components/      # UI components
├── hooks/           # React hooks
├── services/        # API services
├── utils/           # Utility functions
├── types/           # TypeScript types
└── constants/       # Constants

# Avoid
- Deep nesting (max 3 levels)
- God files (split logic)
- Circular dependencies
```

---

## 📝 Commit Messages

We follow the **Conventional Commits** specification:

### Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type       | Description                         |
| ---------- | ----------------------------------- |
| `feat`     | New feature                         |
| `fix`      | Bug fix                             |
| `docs`     | Documentation only                  |
| `style`    | Formatting, no code change          |
| `refactor` | Code restructure, no feature change |
| `perf`     | Performance improvement             |
| `test`     | Adding/modifying tests              |
| `chore`    | Build process, dependencies         |
| `ci`       | CI/CD changes                       |

### Examples

```bash
# Good commit messages
feat(agent-01): add sentiment analysis to customer support
fix(agent-05): resolve embedding cache issue
docs: update contributing guidelines
refactor(agent-08): improve error handling in web scraper
test(agent-03): add unit tests for evaluation metrics

# Bad commit messages
fixed stuff
WIP
asdfasdf
Update file.py
```

### Scope

Use the agent number or area:

```
agent-01, agent-02, ..., agent-10
core, docs, ci, deps, config
```

---

## 🔄 Pull Request Process

### Before Submitting

1. **Sync with upstream**

   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Run tests** (if applicable)

   ```bash
   pytest tests/
   npm run test
   ```

3. **Run linting**

   ```bash
   flake8 .
   npm run lint
   ```

4. **Update documentation** if needed

### PR Template

When you open a PR, fill out this template:

```markdown
## Description

Brief description of the changes.

## Type of Change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to change)
- [ ] Documentation update

## Related Issues

Closes #123
Fixes #456

## Changes Made

- Change 1
- Change 2
- Change 3

## Testing

Describe how you tested your changes:

- [ ] Local testing
- [ ] Added unit tests
- [ ] Tested on [OS/Browser/etc.]

## Screenshots (if applicable)

[Add screenshots here]

## Checklist

- [ ] My code follows the project's style guidelines
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] Any dependent changes have been merged and published
```

### Review Process

1. **Automated checks** run first (linting, tests)
2. **Maintainer review** within 1-3 days
3. **Address feedback** by pushing new commits
4. **Approval and merge** once all checks pass

### After Merge

- Delete your branch
- Update your fork
- Celebrate! 🎉

---

## 🏷️ Issue & PR Labels

| Label              | Description                |
| ------------------ | -------------------------- |
| `bug`              | Something isn't working    |
| `enhancement`      | New feature or request     |
| `documentation`    | Documentation improvements |
| `good first issue` | Good for newcomers         |
| `help wanted`      | Extra attention needed     |
| `priority: high`   | Urgent priority            |
| `priority: low`    | Low priority               |
| `wontfix`          | This won't be worked on    |
| `duplicate`        | Duplicate of another issue |
| `agent-XX`         | Related to specific agent  |

---

## 🌟 Recognition

Contributors are recognized in several ways:

- **README Contributors Section** - All contributors listed
- **Release Notes** - Mentioned in changelog
- **GitHub Contributions** - Shown in your profile
- **Social Media** - Featured on project social channels

---

## 💬 Community

Need help? Have questions?

- 📧 **Email**: [ayusingh693@gmail.com](mailto:ayusingh693@gmail.com)
- 🐛 **Issues**: [GitHub Issues](https://github.com/ayusingh-54/100-Days-100-AI-AGENTS-/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/ayusingh-54/100-Days-100-AI-AGENTS-/discussions)

---

## 📖 Additional Resources

- [Git Handbook](https://guides.github.com/introduction/git-handbook/)
- [How to Contribute to Open Source](https://opensource.guide/how-to-contribute/)
- [PEP 8 Style Guide](https://peps.python.org/pep-0008/)
- [TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)
- [Conventional Commits](https://www.conventionalcommits.org/)

---

<div align="center">

## Thank You! 🙏

Your contributions make this project better for everyone.

**Happy Coding!** 🚀

</div>
