"""
Tic Tac Toe Battle
---------------------------------
This example shows how to build a Tic Tac Toe game where two AI agents play against each other.
The game features a referee agent coordinating between two player agents using different
language models.

Usage Examples:
---------------
1. Quick game with default settings:
   referee_agent = get_tic_tac_toe_referee()
   play_tic_tac_toe()

2. Game with debug mode off:
   referee_agent = get_tic_tac_toe_referee(debug_mode=False)
   play_tic_tac_toe(debug_mode=False)

The game integrates:
  - Multiple AI models (Claude, GPT-4, etc.)
  - Turn-based gameplay coordination
  - Move validation and game state management
"""

import sys
import random
from pathlib import Path
from textwrap import dedent
from typing import Tuple

from agno.agent import Agent
from agno.models.anthropic import Claude
from agno.models.openai import OpenAIChat

project_root = str(Path(__file__).parent.parent.parent.parent)
if project_root not in sys.path:
    sys.path.append(project_root)

# Strategic personalities for variety
STRATEGIES = [
    {
        "name": "Aggressive",
        "style": "Play aggressively! Focus on ATTACKING and creating winning opportunities. Don't just defend - take risks and go for the win!",
        "opening": "corners",
    },
    {
        "name": "Defensive", 
        "style": "Play defensively! Always BLOCK your opponent's threats first. Never let them get two in a row without blocking.",
        "opening": "center",
    },
    {
        "name": "Center Control",
        "style": "Control the CENTER! The center square (1,1) is the most powerful position. Build your strategy around it.",
        "opening": "center",
    },
    {
        "name": "Corner Master",
        "style": "Dominate the CORNERS! Corners give you the most winning paths. Always prefer corner moves when available.",
        "opening": "corners",
    },
    {
        "name": "Unpredictable",
        "style": "Be UNPREDICTABLE! Mix up your strategy. Sometimes attack, sometimes defend. Keep your opponent guessing.",
        "opening": "random",
    },
    {
        "name": "Fork Creator",
        "style": "Create FORKS! Try to set up positions where you have TWO ways to win at once. This forces your opponent into an impossible situation.",
        "opening": "corners",
    },
]


def get_model_for_provider(provider: str, model_name: str, temperature: float = 0.8):
    """
    Creates and returns the appropriate model instance based on the provider.

    Args:
        provider: The model provider ('openai' or 'anthropic')
        model_name: The specific model name/ID
        temperature: Randomness level (0.0-1.0, higher = more creative/random)

    Returns:
        An instance of the appropriate model class

    Raises:
        ValueError: If the provider is not supported
    """
    if provider == "openai":
        # o3-mini doesn't support temperature, use default for it
        if "o3" in model_name or "o1" in model_name:
            return OpenAIChat(id=model_name)
        return OpenAIChat(id=model_name, temperature=temperature)
    elif provider == "anthropic":
        if model_name == "claude-3-5-sonnet":
            return Claude(id="claude-3-5-sonnet-20241022", max_tokens=8192, temperature=temperature)
        elif model_name == "claude-3-7-sonnet":
            return Claude(
                id="claude-3-7-sonnet-20250219",
                max_tokens=8192,
                temperature=temperature,
            )
        elif model_name == "claude-3-7-sonnet-thinking":
            return Claude(
                id="claude-3-7-sonnet-20250219",
                max_tokens=8192,
                thinking={"type": "enabled", "budget_tokens": 4096},
            )
        else:
            return Claude(id=model_name, temperature=temperature)
    else:
        raise ValueError(f"Unsupported model provider: {provider}. Use 'openai' or 'anthropic'.")


def get_tic_tac_toe_players(
    model_x: str = "openai:gpt-4o",
    model_o: str = "openai:o3-mini",
    debug_mode: bool = True,
) -> Tuple[Agent, Agent]:
    """
    Returns Tic Tac Toe player agents with randomized strategies.

    Args:
        model_x: ModelConfig for player X
        model_o: ModelConfig for player O
        debug_mode: Enable logging and debug features

    Returns:
        Tuple of (player_x, player_o) agents with varied strategies
    """
    # Parse model provider and name
    provider_x, model_name_x = model_x.split(":")
    provider_o, model_name_o = model_o.split(":")

    # Randomize temperature for variety (0.6 to 1.0)
    temp_x = random.uniform(0.6, 1.0)
    temp_o = random.uniform(0.6, 1.0)

    # Create model instances with temperature
    model_x = get_model_for_provider(provider_x, model_name_x, temperature=temp_x)
    model_o = get_model_for_provider(provider_o, model_name_o, temperature=temp_o)

    # Pick random strategies for each player (ensure they're different)
    strategy_x = random.choice(STRATEGIES)
    strategy_o = random.choice([s for s in STRATEGIES if s["name"] != strategy_x["name"]])

    player_x = Agent(
        name="Player X",
        description=dedent(f"""\
        You are Player X in a Tic Tac Toe game. Your goal is to WIN!

        YOUR STRATEGY: {strategy_x['name'].upper()}
        {strategy_x['style']}

        BOARD LAYOUT:
        - 3x3 grid with coordinates (row, col) from (0,0) to (2,2)
        - (0,0)=top-left, (0,2)=top-right, (2,0)=bottom-left, (2,2)=bottom-right
        - (1,1) is the CENTER

        RULES:
        - Place X only in empty spaces
        - First to get 3 in a row wins
        - You are playing against a smart opponent - think carefully!

        CRITICAL - YOUR RESPONSE FORMAT:
        - Output ONLY two numbers: row column
        - Example: "1 1" for center, "0 0" for top-left corner
        - NO other text, explanation, or formatting!

        THINK STRATEGICALLY:
        1. Can you WIN this turn? Take it!
        2. Is opponent about to win? BLOCK them!
        3. Can you create a FORK (two ways to win)? Do it!
        4. Follow your {strategy_x['name']} strategy!
        """),
        model=model_x,
        debug_mode=debug_mode,
    )

    player_o = Agent(
        name="Player O",
        description=dedent(f"""\
        You are Player O in a Tic Tac Toe game. Your goal is to WIN!

        YOUR STRATEGY: {strategy_o['name'].upper()}
        {strategy_o['style']}

        BOARD LAYOUT:
        - 3x3 grid with coordinates (row, col) from (0,0) to (2,2)
        - (0,0)=top-left, (0,2)=top-right, (2,0)=bottom-left, (2,2)=bottom-right
        - (1,1) is the CENTER

        RULES:
        - Place O only in empty spaces
        - First to get 3 in a row wins
        - You are playing against a smart opponent - think carefully!

        CRITICAL - YOUR RESPONSE FORMAT:
        - Output ONLY two numbers: row column
        - Example: "1 1" for center, "0 0" for top-left corner
        - NO other text, explanation, or formatting!

        THINK STRATEGICALLY:
        1. Can you WIN this turn? Take it!
        2. Is opponent about to win? BLOCK them!
        3. Can you create a FORK (two ways to win)? Do it!
        4. Follow your {strategy_o['name']} strategy!
        """),
        model=model_o,
        debug_mode=debug_mode,
    )

    return player_x, player_o