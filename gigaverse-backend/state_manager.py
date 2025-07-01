class StateManager:
    @staticmethod
    def extract_game_state(run_data):
        """Extracts player and enemy state from run data"""
        player = run_data["players"][0]
        enemy = run_data["players"][1]
        
        # Get correct max shield and health values
        player_max_shield = player["shield"].get("currentMax", player["shield"]["startingMax"])
        player_max_health = player["health"].get("currentMax", player["health"]["startingMax"])
        
        state = {
            "player_health": player["health"]["current"],
            "player_shield": player["shield"]["current"],
            "enemy_health": enemy["health"]["current"],
            "enemy_shield": enemy["shield"]["current"],
            "player_max_health": player_max_health,
            "player_max_shield": player_max_shield,
            "enemy_max_health": enemy["health"]["starting"],
            "enemy_max_shield": enemy["shield"]["starting"],
            "round_number": 1
        }
        
        player_charges = {
            "rock": player["rock"]["currentCharges"],
            "paper": player["paper"]["currentCharges"],
            "scissor": player["scissor"]["currentCharges"]
        }
        enemy_charges = {
            "rock": enemy["rock"]["currentCharges"],
            "paper": enemy["paper"]["currentCharges"],
            "scissor": enemy["scissor"]["currentCharges"]
        }
        return state, player_charges, enemy_charges
    
    @staticmethod
    def apply_loot_to_state(loot_option, state_data, player_move_stats):
        """Applies a loot option's effects to the game state"""
        new_state = state_data.copy()
        new_stats = {move: stats.copy() for move, stats in player_move_stats.items()}
        boon = loot_option.get("boonTypeString")
        
        if boon == "UpgradeScissor":
            new_stats["scissor"]["damage"] += loot_option.get("selectedVal1", 0)
            new_stats["scissor"]["shield"] += loot_option.get("selectedVal2", 0)
        elif boon == "UpgradeRock":
            new_stats["rock"]["damage"] += loot_option.get("selectedVal1", 0)
            new_stats["rock"]["shield"] += loot_option.get("selectedVal2", 0)
        elif boon == "UpgradePaper":
            new_stats["paper"]["damage"] += loot_option.get("selectedVal1", 0)
            new_stats["paper"]["shield"] += loot_option.get("selectedVal2", 0)
        elif boon == "AddMaxHealth":
            new_state["player_max_health"] += loot_option.get("selectedVal1", 0) 
        elif boon == "AddMaxArmor":
            new_state["player_max_shield"] += loot_option.get("selectedVal1", 0)
        elif boon == "Heal":
            new_state["player_health"] += loot_option.get("selectedVal1", 0)
            new_state["player_health"] = min(new_state["player_health"], new_state["player_max_health"])

        return new_state, new_stats
    
    @staticmethod
    def get_player_stats(run_data):
        """Extract player move stats from run data"""
        player = run_data["players"][0]
        return {
            "rock": {
                "damage": player["rock"]["currentATK"],
                "shield": player["rock"]["currentDEF"]
            },
            "paper": {
                "damage": player["paper"]["currentATK"],
                "shield": player["paper"]["currentDEF"]
            },
            "scissor": {
                "damage": player["scissor"]["currentATK"],
                "shield": player["scissor"]["currentDEF"]
            }
        }
    
    @staticmethod
    def get_enemy_stats(run_data):
        """Extract enemy move stats from run data"""
        enemy = run_data["players"][1]
        return {
            "rock": {
                "damage": enemy["rock"]["currentATK"],
                "shield": enemy["rock"]["currentDEF"]
            },
            "paper": {
                "damage": enemy["paper"]["currentATK"],
                "shield": enemy["paper"]["currentDEF"]
            },
            "scissor": {
                "damage": enemy["scissor"]["currentATK"],
                "shield": enemy["scissor"]["currentDEF"]
            }
        }
    
    @staticmethod
    def apply_equipment_bonuses(player_stats, state_data, equipment):
        """
        This function is kept for compatibility but now does nothing since we're using currentATK/DEF
        which already includes equipment bonuses from the game
        """
        # Simply return the stats unchanged
        return player_stats, state_data