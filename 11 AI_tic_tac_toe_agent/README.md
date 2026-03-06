# 🎮 AI Tic Tac Toe Agent Battle

Watch AI agents powered by GPT-4o and Claude battle it out in real-time Tic Tac Toe games!

![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)
![Streamlit](https://img.shields.io/badge/Streamlit-1.0+-red.svg)
![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o-green.svg)
![Anthropic](https://img.shields.io/badge/Anthropic-Claude--3.7-purple.svg)

## 🌟 Features

- **Real-time AI vs AI battles** - Watch two AI models compete against each other
- **Multiple AI Models** - Choose from GPT-4o, o3-mini, Claude-3.5, Claude-3.7, and Claude-3.7-thinking
- **Strategic Personalities** - Each game randomly assigns different strategies to players:
  - 🔥 **Aggressive** - Attack-focused gameplay
  - 🛡️ **Defensive** - Blocking-focused strategy
  - 🎯 **Center Control** - Dominates the center position
  - 📐 **Corner Master** - Prioritizes corner positions
  - 🎲 **Unpredictable** - Mixed strategy gameplay
  - 🔀 **Fork Creator** - Sets up double winning paths
- **Robust Error Handling** - 30-second timeout with automatic retry and random move fallback
- **Beautiful Dark Mode UI** - Modern Streamlit interface with real-time updates
- **Game History** - Track all moves made during the game

## 📋 Prerequisites

- Python 3.8 or higher
- OpenAI API key (for GPT-4o, o3-mini)
- Anthropic API key (for Claude models)

## 🚀 Installation

1. **Clone or navigate to the project directory:**

   ```bash
   cd "11 AI_tic_tac_toe_agent"
   ```

2. **Create a virtual environment:**

   ```bash
   python -m venv venv
   ```

3. **Activate the virtual environment:**

   Windows:

   ```bash
   .\venv\Scripts\activate
   ```

   macOS/Linux:

   ```bash
   source venv/bin/activate
   ```

4. **Install dependencies:**

   ```bash
   pip install streamlit agno openai anthropic python-dotenv nest-asyncio
   ```

5. **Create a `.env` file** in the project root with your API keys:
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   ```

## 🎯 Usage

1. **Run the Streamlit app:**

   ```bash
   streamlit run app.py
   ```

2. **Open your browser** to `http://localhost:8501`

3. **Select AI models** for Player X and Player O from the sidebar

4. **Click "Start Game"** and watch the AI battle!

## 🏗️ Project Structure

```
11 AI_tic_tac_toe_agent/
├── app.py              # Main Streamlit application
├── agents.py           # AI agent configurations and strategies
├── utils.py            # Game board logic and UI utilities
├── requirements.txt    # Python dependencies
├── .env                # API keys (create this file)
└── README.md           # This file
```

## 📁 File Descriptions

### `app.py`

The main Streamlit application that handles:

- Game UI and controls
- Model selection interface
- Move execution with timeout protection
- Game state management
- Retry logic with random move fallback

### `agents.py`

Defines AI player agents with:

- Model provider integration (OpenAI, Anthropic)
- Strategic personalities for varied gameplay
- Temperature randomization for move variety
- Detailed game prompts for strategic thinking

### `utils.py`

Contains game utilities:

- `TicTacToeBoard` class for game state
- Move validation and winner detection
- Board display functions
- Custom CSS styling

## ⚙️ Configuration

### Available Models

| Model                 | Provider  | Description                       |
| --------------------- | --------- | --------------------------------- |
| `gpt-4o`              | OpenAI    | GPT-4o - Fast and capable         |
| `o3-mini`             | OpenAI    | o3-mini - Reasoning model         |
| `claude-3.5`          | Anthropic | Claude 3.5 Sonnet                 |
| `claude-3.7`          | Anthropic | Claude 3.7 Sonnet                 |
| `claude-3.7-thinking` | Anthropic | Claude 3.7 with extended thinking |

### Timeout Settings

Edit `app.py` to adjust:

```python
AI_TIMEOUT_SECONDS = 30  # Maximum wait time for AI response
MAX_RETRIES = 2          # Retry attempts before fallback
```

## 🔧 Troubleshooting

### "Missing API Keys" Error

- Ensure `.env` file exists with correct API keys
- Restart the Streamlit app after adding keys

### AI Takes Too Long

- The app has a 30-second timeout with automatic fallback
- If timeout occurs, a random valid move is made
- Check your internet connection

### Game Gets Stuck

- Click "New Game" to reset
- Check terminal for error logs

## 🛠️ Built With

- [Streamlit](https://streamlit.io/) - Web application framework
- [Agno](https://github.com/agno-ai/agno) - AI agent framework
- [OpenAI API](https://openai.com/) - GPT models
- [Anthropic API](https://anthropic.com/) - Claude models

## 📝 License

This project is part of the 100-Days-100-AI-AGENTS challenge.

## 🤝 Contributing

Feel free to submit issues and enhancement requests!

---

**Happy Gaming! 🎮**
