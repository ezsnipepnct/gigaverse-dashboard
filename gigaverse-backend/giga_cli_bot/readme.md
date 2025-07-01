# Gigaverse Dungeon Crawler Bot

An automated bot for playing and optimizing gameplay in the Gigaverse dungeon crawler mini-game. This bot uses Monte Carlo Tree Search (MCTS) to make optimal decisions in combat and includes resource management functionality.

## Features

- **Automated Dungeon Running**: Play through Normal Mode (Floor 1-4) or Gigus Mode (more difficult)
- **Intelligent Combat**: Uses Monte Carlo Tree Search (MCTS) to select optimal moves in rock-paper-scissors combat
- **Resource Claiming**: Automatically claim energy, shards, and dust from your ROMs
- **Multi-Run Support**: Run the dungeon multiple times in succession
- **Loot Optimization**: Analyzes and selects the best loot options after combat
- **Configurable Settings**: Customize simulation parameters

## Requirements

- Python 3.7+
- Internet connection
- Gigaverse account with API access token

## Installation

1. Clone or download this repository to your local machine
2. Install the required packages:

```
pip install requests termcolor questionary prompt_toolkit
```

## Configuration

Before using the bot, you'll need to:

1. Edit `claim_manager.py` and set your wallet address:
   ```python
   WALLET_ADDRESS = "YOUR_AGW_WALLET_ADDRESS"  # Change this to your wallet address
   ```

2. If needed, update the token in `gigaverse.py`:
   ```python
   TOKEN = "your_token_here"
   ```

## Usage

Run the main script to start the bot:

```bash
python gigaverse.py
```

### Main Menu Options

- **Play Normal Mode**: Run the dungeon on normal difficulty (Floor 1-4)
- **Play Gigus Mode**: Run the more difficult version of the dungeon
- **Claim Resources**: Claim energy, shards and dust from your ROMs
- **Settings**: Configure MCTS iterations and loot simulation parameters
- **Quit**: Exit the application

### Resource Claiming

You can also use the resource claimer independently:

```bash
python claim_manager.py
```

This will prompt you to:
1. Select which resources to claim (All, Energy, Shards, or Dust)
2. Set an energy threshold (stop claiming after reaching this amount)

## Project Structure

- `gigaverse.py`: Main application entry point
- `api_manager.py`: Handles API communication with Gigaverse
- `claim_manager.py`: Manages resource claiming from ROMs
- `game_manager.py`: Core gameplay logic
- `loot_manager.py`: Evaluates and selects optimal loot
- `mcts_api_v2.py`: Monte Carlo Tree Search implementation
- `state_manager.py`: Game state tracking and manipulation
- `ui_manager.py`: User interface and menu system
- `enemy_stats.json`: Contains statistics for all dungeon enemies

## How It Works

### Combat System

The game uses a rock-paper-scissors system where:
- Rock beats Scissors
- Scissors beats Paper
- Paper beats Rock

Each move has:
- **Damage**: Amount of damage dealt when winning
- **Shield**: Amount of shield gained when playing the move
- **Charges**: Limited uses that regenerate over time

The MCTS algorithm:
1. Simulates possible future states
2. Evaluates winning chances 
3. Selects the optimal move based on win probability and strategic factors
4. Considers charge management, enemy patterns, and game state

### Loot Selection

After defeating enemies, you get loot options that can:
- Upgrade your Rock/Paper/Scissors moves
- Increase max health/shield
- Heal your character

The bot evaluates each option by:
1. Simulating future encounters with the upgrade applied
2. Calculating win probability against upcoming enemies
3. Considering your current health status
4. Balancing offensive vs. defensive upgrades

## Advanced Configuration

### Settings Menu

- **MCTS Iterations**: Higher values (e.g., 100000) give better moves but take longer
- **Loot Simulation Iterations**: Higher values give more accurate loot decisions

## Troubleshooting

- **API Connection Issues**: Check your internet connection and token validity
- **Resource Claiming Fails**: Verify your wallet address is correct
- **Performance Issues**: Lower the MCTS iterations in settings

## Notes

- The bot uses colored terminal output for better readability
- Game statistics and progress are displayed in real-time
- Multiple unsuccessful runs may indicate energy depletion