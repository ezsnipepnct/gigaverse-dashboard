from termcolor import colored
import json
import os

class LootManager:
    def __init__(self):
        # Load enemy stats from the JSON file
        try:
            with open('underhaul_enemy_stats.json', 'r') as f:
                self.enemy_data = json.load(f)['enemies']
            print(colored("✅ Enemy stats loaded successfully from enemy_stats.json", 'green'))
        except Exception as e:
            print(colored(f"❌ Error loading enemy stats: {e}", 'red'))
            # Fallback to empty dict if file can't be loaded
            self.enemy_data = {}
    
    def get_future_enemies(self, current_floor, current_room):
        """
        Get a list of all enemies that are in future rooms/floors
        """
        future_enemies = []
        
        # Convert to int for easier comparison
        floor_num = int(current_floor)
        room_num = int(current_room)
        
        # Iterate through all floors and rooms to find future enemies
        for f in range(1, 5):  # Floors 1-3
            # Skip if we've already covered this floor
            if f < floor_num:
                continue
                
            floor_key = f"floor_{f}"
            if floor_key in self.enemy_data:
                for r in range(1, 5):  # Rooms 1-4
                    # Skip if we're on the current floor and haven't reached this room yet
                    if f == floor_num and r <= room_num:
                        continue
                        
                    room_key = f"room_{r}"
                    if room_key in self.enemy_data[floor_key]:
                        enemy = self.enemy_data[floor_key][room_key]
                        future_enemies.append({
                            'floor': f,
                            'room': r,
                            'stats': enemy
                        })
        
        return future_enemies
    
    @staticmethod
    def evaluate_loot_option(loot_option, state_data, player_move_stats, enemy_move_stats, player_charges, enemy_charges, num_simulations=100):
        """Evaluates a loot option by running simulations"""
        from state_manager import StateManager
        from mcts_api_v2 import GameState, simulate
        
        # Apply the loot upgrade to state and move stats
        new_state_data, new_player_move_stats = LootManager.apply_loot_to_state(loot_option, state_data, player_move_stats)
        
        # Reset enemy's state for simulation
        new_state_data["enemy_health"] = new_state_data["enemy_max_health"]
        new_state_data["enemy_shield"] = new_state_data["enemy_max_shield"]

        # Create a GameState with the upgraded stats
        state = GameState(
            player_health=new_state_data["player_health"],
            player_shield=new_state_data["player_shield"],
            enemy_health=new_state_data["enemy_health"],
            enemy_shield=new_state_data["enemy_shield"],
            player_max_health=new_state_data["player_max_health"],
            player_max_shield=new_state_data["player_max_shield"],
            enemy_max_health=new_state_data["enemy_max_health"],
            enemy_max_shield=new_state_data["enemy_max_shield"],
            round_number=new_state_data.get("round_number", 1),
            player_move_stats=new_player_move_stats,
            enemy_move_stats=enemy_move_stats
        )
        state.player_charges = player_charges
        state.enemy_charges = enemy_charges

        # Run simulations
        wins = 0
        for _ in range(num_simulations):
            wins += simulate(state)
        win_rate = wins / num_simulations
        return win_rate
    
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
            # FIXED: Max health increases also heal by that amount
            health_increase = loot_option.get("selectedVal1", 0)
            new_state["player_max_health"] += health_increase 
            new_state["player_health"] += health_increase
        elif boon == "AddMaxArmor":
            # Shield works the same way - increases current shield too
            shield_increase = loot_option.get("selectedVal1", 0)
            new_state["player_max_shield"] += shield_increase
            new_state["player_shield"] += shield_increase
        elif boon == "Heal":
            new_state["player_health"] += loot_option.get("selectedVal1", 0)
            new_state["player_health"] = min(new_state["player_health"], new_state["player_max_health"])

        return new_state, new_stats
    
    def evaluate_loot_against_future_enemies(self, loot_option, state_data, player_move_stats, current_floor, current_room, player_charges, sim_iterations=25):
        """
        Evaluates a loot option by simulating against all future enemies
        Returns a weighted average win rate
        """
        future_enemies = self.get_future_enemies(current_floor, current_room)
        
        if not future_enemies:
            # No future enemies found, just return a default high score
            print(colored("⚠️ No future enemies found for simulation", 'yellow'))
            return 0.5
        
        # Check for wasted healing
        boon_type = loot_option.get("boonTypeString", "")
        if boon_type == "Heal":
            health_ratio = state_data["player_health"] / state_data["player_max_health"]
            heal_amount = loot_option.get("selectedVal1", 0)
            max_usable_heal = state_data["player_max_health"] - state_data["player_health"]
            
            # If healing would be mostly wasted, apply a penalty
            if max_usable_heal < (heal_amount * 0.5):  # If more than 50% would be wasted
                waste_penalty = 1.0 - (max_usable_heal / heal_amount)
                print(colored(f"⚠️ Heal would be {waste_penalty*100:.0f}% wasted (Health: {state_data['player_health']}/{state_data['player_max_health']})", 'yellow'))
        
        # Track the total win rate and weights
        total_weighted_rate = 0
        total_weight = 0
        
        # For logging
        enemy_results = []
        
        # Evaluate against each future enemy with distance-based weighting
        for enemy_data in future_enemies:
            floor = enemy_data['floor']
            room = enemy_data['room']
            enemy = enemy_data['stats']
            
            # Closer enemies are more important than distant ones
            # Base weight starts at 4.0 and decreases by 0.5 for each room away
            distance = ((floor - current_floor) * 4) + (room - current_room)
            weight = max(0.5, 4.0 - (distance * 0.5))
            
            # Create enemy move stats in the expected format
            enemy_move_stats = {
                "rock": {"damage": enemy['moves']['rock']['damage'], "shield": enemy['moves']['rock']['shield']},
                "paper": {"damage": enemy['moves']['paper']['damage'], "shield": enemy['moves']['paper']['shield']},
                "scissor": {"damage": enemy['moves']['scissor']['damage'], "shield": enemy['moves']['scissor']['shield']}
            }
            
            # Create enemy charges (assuming all enemies start with full charges)
            enemy_charges = {'rock': 3, 'paper': 3, 'scissor': 3}
            
            # Prepare a new state_data with this enemy's stats
            enemy_state_data = state_data.copy()
            enemy_state_data["enemy_health"] = enemy['health']
            enemy_state_data["enemy_shield"] = enemy['shield']
            enemy_state_data["enemy_max_health"] = enemy['health']
            enemy_state_data["enemy_max_shield"] = enemy['shield']
            
            # Run the evaluation
            win_rate = self.evaluate_loot_option(
                loot_option, enemy_state_data, player_move_stats, enemy_move_stats, 
                player_charges, enemy_charges, num_simulations=sim_iterations
            )
            
            # Track for weighted average
            total_weighted_rate += (win_rate * weight)
            total_weight += weight
            
            # Store for logging
            enemy_results.append({
                'location': f"Floor {floor} Room {room}",
                'win_rate': win_rate,
                'weight': weight
            })
        
        # Calculate final weighted average
        if total_weight > 0:
            final_rate = total_weighted_rate / total_weight
        else:
            final_rate = 0
        
        # Apply penalty for wasted healing
        if boon_type == "Heal" and max_usable_heal < (heal_amount * 0.5):
            final_rate *= (1.0 - waste_penalty * 0.5)  # Apply partial penalty
            
        # Print detailed results for debugging
        if len(enemy_results) > 0:
            print(colored(f"\n  Future enemy simulation results for {self.get_loot_description(loot_option.get('boonTypeString', 'Unknown'), loot_option.get('selectedVal1', 0), loot_option.get('selectedVal2', 0))}:", 'cyan'))
            for result in enemy_results:
                print(colored(f"    {result['location']}: Win rate: {result['win_rate']:.3f}, Weight: {result['weight']:.1f}", 'cyan'))
            print(colored(f"    Final weighted win rate: {final_rate:.3f}", 'cyan'))
        
        return final_rate
    
    def select_best_loot_option(self, loot_options, state_data, player_move_stats, enemy_move_stats, player_charges, enemy_charges, sim_iterations=100, current_floor=1, current_room=1):
        """Selects the best loot option based on health status and simulations"""
        # First assign the correct action to each loot option based on index
        for i, option in enumerate(loot_options):
            if i == 0:
                option["action"] = "loot_one"
            elif i == 1:
                option["action"] = "loot_two"
            else:
                option["action"] = "loot_three"
        
        # Calculate health ratio to determine if healing is needed
        health_ratio = state_data["player_health"] / state_data["player_max_health"]
        
        # Strategy based on health status
        if health_ratio < 0.4:  # If health is below 40%
            # Prioritize health options
            health_options = [loot for loot in loot_options if loot.get("boonTypeString") in {"Heal", "AddMaxHealth"}]
            if health_options:
                print(colored("⚠️ Health is low! Prioritizing healing options.", 'yellow'))
                filtered_options = health_options
            else:
                print(colored("⚠️ Health is low but no healing options available.", 'yellow'))
                filtered_options = loot_options
        else:
            # Normal selection, but exclude certain health options when health is good
            filtered_options = [loot for loot in loot_options if loot.get("boonTypeString") not in {"Heal1", "AddMaxHealth1"}]
        
        print(colored(f"\nEvaluating {len(filtered_options)} loot options...", 'cyan'))
        
        best_option = None
        best_rate = -1000000000
        
        for i, loot in enumerate(filtered_options):
            boon_type = loot.get("boonTypeString", "Unknown")
            val1 = loot.get("selectedVal1", 0)
            val2 = loot.get("selectedVal2", 0)
            
            # Format description for logging
            description = self.get_loot_description(boon_type, val1, val2)
            
            # Check for wasted healing
            if boon_type == "Heal" and health_ratio > 0.9:
                max_usable_heal = state_data["player_max_health"] - state_data["player_health"]
                waste_percentage = max(0, 1 - (max_usable_heal / val1))
                
                if waste_percentage > 0.7:  # More than 70% wasted
                    print(colored(f"  [{i+1}] {description} - Win rate: 0.000 (Healing would be {waste_percentage*100:.0f}% wasted!)", 'yellow'))
                    rate = 0.0  # Severely penalize
                    continue
            
            # Evaluate option against future enemies
            rate = self.evaluate_loot_against_future_enemies(
                loot, state_data, player_move_stats, current_floor, current_room, 
                player_charges, sim_iterations
            )
            
            # Boost rating for health options when health is low
            if health_ratio < 0.6 and boon_type == "Heal":
                # The lower the health, the higher the boost
                health_boost = (1.0 - health_ratio) * 0.3
                rate += health_boost
                print(colored(f"  [{i+1}] {description} - Win rate: {rate:.3f} (boosted due to low health)", 'green'))
            else:
                print(colored(f"  [{i+1}] {description} - Win rate: {rate:.3f}", 'cyan'))
            
            if rate > best_rate:
                best_rate = rate
                best_option = loot
        
        # If somehow all options have negative rates
        if best_option is None and filtered_options:
            best_option = filtered_options[0]
        
        # Display the selected action for verification
        action = best_option.get("action", "Unknown")
        print(colored(f"  Action to execute: {action}", 'cyan'))
        
        return best_option
    
    @staticmethod
    def get_loot_description(boon_type, val1, val2):
        """Format a human-readable description of a loot option"""
        if boon_type == "Heal":
            return f"Heal +{val1} HP"
        elif boon_type == "AddMaxHealth":
            return f"Max Health +{val1}"
        elif boon_type == "AddMaxArmor":
            return f"Max Shield +{val1}"
        elif boon_type.startswith("Upgrade"):
            move = boon_type.replace("Upgrade", "")
            return f"{move}: +{val1} DMG, +{val2} Shield"
        else:
            return f"{boon_type}: {val1}, {val2}"