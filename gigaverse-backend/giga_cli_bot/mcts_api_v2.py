import math
import random
import copy
import time

# --- Global Game Parameter ---
MAX_ROUNDS = 20  # Maximum rounds to simulate

def determine_outcome(player_move, enemy_move):
    """
    Returns:
      "player" if player's move wins,
      "enemy" if enemy's move wins,
      "tie" if both moves are the same.
    """
    if player_move == enemy_move:
        return "tie"
    if (player_move == "rock" and enemy_move == "scissor") or \
       (player_move == "scissor" and enemy_move == "paper") or \
       (player_move == "paper" and enemy_move == "rock"):
        return "player"
    return "enemy"

def update_charges(charges, cooldowns, chosen_move):
    """
    Updates the charges after a move is played.
    - For the chosen move: decrement its charge
    - For other moves: increment charge (max 3)
    """
    # Update chosen move - decrement its charge
    charges[chosen_move] -= 1
    
    # Update other moves - increment charge (max 3)
    for move in charges:
        if move != chosen_move:
            charges[move] = min(charges[move] + 1, 3)
    
    # No longer using cooldowns, but return them unchanged for compatibility
    return charges, cooldowns

def get_available_moves(charges, cooldowns):
    """
    Returns a list of available moves (charge > 0).
    In the game, you can only use a move if its charge is > 0.
    """
    # Only moves with positive charges are available
    return [move for move in charges if charges[move] > 0]

def get_enemy_strongest_attack(enemy_move_stats):
    """
    Identifies the enemy's move with the highest damage.
    Returns the move and its damage.
    """
    strongest_move = max(enemy_move_stats.items(), key=lambda x: x[1]["damage"])
    return strongest_move[0], strongest_move[1]["damage"]

def get_counter_move(move):
    """Returns the move that counters the given move"""
    if move == "rock":
        return "paper"
    elif move == "paper":
        return "scissor"
    elif move == "scissor":
        return "rock"
    return None

# --- Game State Definition ---
class GameState:
    def __init__(self, player_health, player_shield, enemy_health, enemy_shield,
                 player_max_health, player_max_shield, enemy_max_health, enemy_max_shield,
                 round_number=1, player_move_stats=None, enemy_move_stats=None):
        self.player_health = player_health
        self.player_shield = player_shield
        self.enemy_health = enemy_health
        self.enemy_shield = enemy_shield
        self.player_max_health = player_max_health
        self.player_max_shield = player_max_shield
        self.enemy_max_health = enemy_max_health
        self.enemy_max_shield = enemy_max_shield
        self.round_number = round_number

        # Initialize charges (cooldowns no longer used but kept for compatibility)
        self.player_charges = {'rock': 3, 'paper': 3, 'scissor': 3}
        self.enemy_charges = {'rock': 3, 'paper': 3, 'scissor': 3}
        self.player_cooldowns = {'rock': 0, 'paper': 0, 'scissor': 0}
        self.enemy_cooldowns = {'rock': 0, 'paper': 0, 'scissor': 0}

        # Use provided move stats or default values.
        self.player_move_stats = player_move_stats if player_move_stats is not None else {
            "rock": {"damage": 15, "shield": 6},
            "paper": {"damage": 0, "shield": 4},
            "scissor": {"damage": 2, "shield": 2}
        }
        self.enemy_move_stats = enemy_move_stats if enemy_move_stats is not None else {
            "rock": {"damage": 4, "shield": 0},
            "paper": {"damage": 0, "shield": 4},
            "scissor": {"damage": 2, "shield": 2}
        }

    def is_terminal(self):
        """
        Terminal if player's health is ≤0, enemy's health is ≤0, or maximum rounds reached.
        """
        return (self.player_health <= 0 or 
                self.enemy_health <= 0 or 
                self.round_number >= MAX_ROUNDS)

    def clone(self):
        return copy.deepcopy(self)

def apply_round(state, player_move, enemy_move):
    """
    Applies a round of moves:
      1. Updates charges using the new charge mechanics
      2. Determines outcome via rock-paper-scissors
      3. Applies shield bonus and damage (damage subtracts from shield first)
      4. Increments round number if the state is non-terminal
    """
    # Update move charges - new charge mechanics
    state.player_charges, _ = update_charges(state.player_charges,
                                            state.player_cooldowns,
                                            player_move)
    state.enemy_charges, _ = update_charges(state.enemy_charges,
                                          state.enemy_cooldowns,
                                          enemy_move)
                                          
    outcome = determine_outcome(player_move, enemy_move)
    
    p_damage = state.player_move_stats[player_move]["damage"]
    p_shield_bonus = state.player_move_stats[player_move]["shield"]
    e_damage = state.enemy_move_stats[enemy_move]["damage"]
    e_shield_bonus = state.enemy_move_stats[enemy_move]["shield"]
    
    if outcome == "player":
        state.player_shield = min(state.player_shield + p_shield_bonus, state.player_max_shield)
        if state.enemy_shield >= p_damage:
            state.enemy_shield -= p_damage
        else:
            remaining = p_damage - state.enemy_shield
            state.enemy_shield = 0
            state.enemy_health = max(state.enemy_health - remaining, 0)
            
    elif outcome == "enemy":
        state.enemy_shield = min(state.enemy_shield + e_shield_bonus, state.enemy_max_shield)
        if state.player_shield >= e_damage:
            state.player_shield -= e_damage
        else:
            remaining = e_damage - state.player_shield
            state.player_shield = 0
            state.player_health = max(state.player_health - remaining, 0)
            
    elif outcome == "tie":
        state.player_shield = min(state.player_shield + p_shield_bonus, state.player_max_shield)
        state.enemy_shield = min(state.enemy_shield + e_shield_bonus, state.enemy_max_shield)
        if state.enemy_shield >= p_damage:
            state.enemy_shield -= p_damage
        else:
            remaining = p_damage - state.enemy_shield
            state.enemy_shield = 0
            state.enemy_health = max(state.enemy_health - remaining, 0)
        if state.player_shield >= e_damage:
            state.player_shield -= e_damage
        else:
            remaining = e_damage - state.player_shield
            state.player_shield = 0
            state.player_health = max(state.player_health - remaining, 0)
        if state.player_health <= 0:
            state.player_health = 0
    
    if not state.is_terminal():
        state.round_number += 1
        
    return state

# --- MCTS Implementation ---
class Node:
    def __init__(self, state, parent=None, move=None):
        self.state = state      # The game state at this node.
        self.parent = parent    # Parent node.
        self.move = move        # The player's move taken to reach this node.
        self.children = []      # Child nodes.
        self.wins = 0           # Number of wins recorded.
        self.visits = 0         # Number of simulations passing through this node.

    def is_fully_expanded(self):
        possible_moves = get_player_possible_moves(self.state)
        return len(self.children) == len(possible_moves)

def get_player_possible_moves(state):
    return get_available_moves(state.player_charges, state.player_cooldowns)

def get_enemy_possible_moves(state):
    return get_available_moves(state.enemy_charges, state.enemy_cooldowns)

def select_best_child(node, exploration_weight=1.4):
    best_score = -float('inf')
    best_child = None
    
    # Get strongest enemy attack for counter strategy
    strongest_enemy_move, strongest_damage = get_enemy_strongest_attack(node.state.enemy_move_stats)
    counter_to_strongest = get_counter_move(strongest_enemy_move)
    
    # Calculate player's highest damage move
    highest_player_damage = max(stats["damage"] for move, stats in node.state.player_move_stats.items())
    
    # Calculate potential killing blow - could the player kill in one hit?
    killing_blow_possible = False
    potential_killing_moves = []
    for move, stats in node.state.player_move_stats.items():
        damage = stats["damage"]
        # Check if this move could kill given current enemy health/shield
        if damage > 0 and (damage > node.state.enemy_shield + node.state.enemy_health):
            killing_blow_possible = True
            potential_killing_moves.append(move)
    
    # Assess threat level from enemy's strongest attack
    player_effective_health = node.state.player_health + node.state.player_shield
    threat_level = strongest_damage / player_effective_health if player_effective_health > 0 else 1.0
    # Adjust based on absolute damage value - very low damage attacks aren't threatening
    if strongest_damage < 5:
        threat_level *= 0.5  # Reduce threat level for weak attacks
    
    for child in node.children:
        # Basic UCT formula
        exploitation = child.wins / child.visits if child.visits > 0 else 0
        exploration = math.sqrt(math.log(node.visits) / child.visits) if child.visits > 0 else float('inf')
        
        # MUCH STRONGER charge management penalty
        charge_penalty = 0
        if child.move in node.state.player_charges:
            # Critical penalty if move would deplete charge to -1 (charge is 1)
            if node.state.player_charges[child.move] == 1:
                charge_penalty = 0.8  # Very severe penalty - almost always avoid
            # Significant penalty if charge would go to 0 (charge is 2)
            elif node.state.player_charges[child.move] == 2:
                charge_penalty = 0.3  # Still a significant penalty
        
        # Offensive bonus - prioritize moves with high damage
        offensive_bonus = 0
        move_damage = node.state.player_move_stats[child.move]["damage"]
        if move_damage > 0:
            # Scale based on relative damage potential
            damage_ratio = move_damage / highest_player_damage if highest_player_damage > 0 else 0
            offensive_bonus = 0.1 * damage_ratio  # Reduced from 0.15
            
            # Bonus for potential killing blow - but ONLY if charge is not 1
            if killing_blow_possible and child.move in potential_killing_moves and node.state.player_charges[child.move] > 1:
                offensive_bonus += 0.2  # Reduced from 0.3 and only applies with sufficient charge
        
        # Counter-strategy bonus - scaled by threat level
        counter_bonus = 0
        if child.move == counter_to_strongest:
            counter_bonus = 0.1 * threat_level  # Reduced from 0.15
        
        # Balance offensive and defensive strategies
        enemy_health_ratio = node.state.enemy_health / node.state.enemy_max_health
        player_health_ratio = node.state.player_health / node.state.player_max_health
        
        if enemy_health_ratio < 0.3:  # Enemy close to death
            offensive_bonus *= 1.2   # Reduced boost (was 1.5)
            counter_bonus *= 0.7     # Less reduction (was 0.5)
        
        if player_health_ratio < 0.3:  # Player in danger
            counter_bonus *= 1.3      # Reduced boost (was 1.5)
        
        # Combine all factors
        score = exploitation + (exploration_weight * exploration) + offensive_bonus + counter_bonus - charge_penalty
        
        if score > best_score:
            best_score = score
            best_child = child
            
    return best_child

def expand(node):
    tried_moves = [child.move for child in node.children]
    possible_moves = get_player_possible_moves(node.state)
    untried_moves = [m for m in possible_moves if m not in tried_moves]
    
    if not untried_moves:
        untried_moves = possible_moves
    
    # Find moves that could potentially kill the enemy WITHOUT depleting charges
    killing_moves = []
    for move in untried_moves:
        damage = node.state.player_move_stats[move]["damage"]
        # Only consider killing moves if they don't deplete charges to -1
        if damage > node.state.enemy_shield + node.state.enemy_health and node.state.player_charges[move] > 1:
            killing_moves.append(move)
    
    # Determine strongest enemy attack
    strongest_enemy_move, strongest_damage = get_enemy_strongest_attack(node.state.enemy_move_stats)
    counter_to_strongest = get_counter_move(strongest_enemy_move)
    
    # Assess state of the game
    enemy_health_ratio = node.state.enemy_health / node.state.enemy_max_health
    player_health_ratio = node.state.player_health / node.state.player_max_health
    
    # Strongly prioritize moves with good charge status
    high_charge_moves = [m for m in untried_moves if node.state.player_charges[m] > 1]
    
    # NEVER choose moves that would deplete charge to -1 unless absolutely necessary
    safe_moves = [m for m in untried_moves if node.state.player_charges[m] > 1]
    if not safe_moves and untried_moves:  # Only if we have no other choice
        safe_moves = untried_moves
    
    # Decision logic with stronger charge management
    if killing_moves:
        # If we can kill the enemy WITHOUT depleting charge, do it
        move = random.choice(killing_moves)
    elif not high_charge_moves:
        # If we have no high charge moves, just pick randomly from what's available
        # (this should be rare but prevents problems)
        move = random.choice(safe_moves)
    elif enemy_health_ratio < 0.3 and high_charge_moves:
        # Enemy close to death - prioritize high damage moves with good charge
        high_damage_moves = sorted(
            high_charge_moves, 
            key=lambda m: node.state.player_move_stats[m]["damage"], 
            reverse=True
        )
        if high_damage_moves:
            move = high_damage_moves[0]
        else:
            move = random.choice(high_charge_moves)
    elif player_health_ratio < 0.3 and counter_to_strongest in high_charge_moves:
        # Player in danger - prioritize countering if possible with good charge
        move = counter_to_strongest
    elif strongest_damage < 5 and high_charge_moves:
        # Enemy damage is weak - focus on offensive moves with good charge
        high_damage_moves = sorted(
            high_charge_moves, 
            key=lambda m: node.state.player_move_stats[m]["damage"], 
            reverse=True
        )
        if high_damage_moves:
            move = high_damage_moves[0]
        else:
            move = random.choice(high_charge_moves)
    elif counter_to_strongest in high_charge_moves:
        # Default case - counter with good charge
        move = counter_to_strongest
    else:
        # Any move with good charge
        move = random.choice(high_charge_moves)
    
    new_state = node.state.clone()
    enemy_moves = get_enemy_possible_moves(new_state)
    enemy_move = random.choice(enemy_moves) if enemy_moves else "rock"
    new_state = apply_round(new_state, move, enemy_move)
    child_node = Node(new_state, parent=node, move=move)
    node.children.append(child_node)
    return child_node

def simulate(state):
    current_state = state.clone()
    
    while not current_state.is_terminal():
        player_moves = get_player_possible_moves(current_state)
        enemy_moves = get_enemy_possible_moves(current_state)
        
        if not player_moves or not enemy_moves:
            break
        
        # Smart player move selection (80% of the time)
        if random.random() < 0.8:
            # Get moves with good charge status - NEVER go to -1 in simulation unless no choice
            high_charge_moves = [m for m in player_moves if current_state.player_charges[m] > 1]
            
            # If we have no high charge moves, we must use what's available
            if not high_charge_moves:
                safe_moves = player_moves
            else:
                safe_moves = high_charge_moves
            
            # Check for killing moves that don't deplete charges
            killing_moves = []
            for move in safe_moves:
                damage = current_state.player_move_stats[move]["damage"]
                if damage > current_state.enemy_shield + current_state.enemy_health:
                    # Only add killing moves if they don't deplete charges to -1
                    if current_state.player_charges[move] > 1:
                        killing_moves.append(move)
            
            # Identify enemy's strongest attack
            strongest_enemy_move, strongest_damage = get_enemy_strongest_attack(current_state.enemy_move_stats)
            counter_to_strongest = get_counter_move(strongest_enemy_move)
            
            # Find highest damage moves (within safe moves)
            moves_by_damage = sorted(
                safe_moves, 
                key=lambda m: current_state.player_move_stats[m]["damage"],
                reverse=True
            )
            high_damage_moves = moves_by_damage[:2] if len(moves_by_damage) >= 2 else moves_by_damage
            
            # Evaluate game state
            enemy_health_ratio = current_state.enemy_health / current_state.enemy_max_health
            player_health_ratio = current_state.player_health / current_state.player_max_health
            
            # Prioritize based on situation
            if killing_moves:
                # First priority: kill the enemy if possible WITHOUT depleting charge
                player_move = random.choice(killing_moves)
                
            elif not safe_moves:
                # This should never happen, but just in case
                player_move = random.choice(player_moves)
                
            elif enemy_health_ratio < 0.3:
                # Enemy nearly dead - prioritize damage
                good_damage_moves = [m for m in high_damage_moves if m in safe_moves]
                if good_damage_moves:
                    player_move = good_damage_moves[0]  # Highest damage move with good charge
                else:
                    player_move = random.choice(safe_moves)  # Any safe move
                    
            elif player_health_ratio < 0.3:
                # Player in danger - prioritize countering and defense
                if counter_to_strongest in safe_moves and strongest_damage > 3:
                    player_move = counter_to_strongest
                elif safe_moves:
                    # Find move with best shield generation
                    best_shield_move = max(
                        safe_moves,
                        key=lambda m: current_state.player_move_stats[m]["shield"]
                    )
                    player_move = best_shield_move
                else:
                    player_move = random.choice(player_moves)
                    
            elif strongest_damage < 5:
                # Enemy not threatening - focus on offense
                good_damage_moves = [m for m in high_damage_moves if m in safe_moves]
                if good_damage_moves:
                    player_move = good_damage_moves[0]
                else:
                    # Prefer damage among safe moves
                    safe_by_damage = sorted(
                        safe_moves,
                        key=lambda m: current_state.player_move_stats[m]["damage"],
                        reverse=True
                    )
                    player_move = safe_by_damage[0] if safe_by_damage else random.choice(player_moves)
                    
            else:
                # Balanced approach
                counter_with_good_charge = counter_to_strongest in safe_moves
                
                if counter_with_good_charge:
                    player_move = counter_to_strongest
                elif safe_moves:
                    player_move = random.choice(safe_moves)
                else:
                    player_move = random.choice(player_moves)
        else:
            # Sometimes play randomly, but still prioritize charge management
            high_charge_moves = [m for m in player_moves if current_state.player_charges[m] > 1]
            if high_charge_moves:
                player_move = random.choice(high_charge_moves)
            else:
                player_move = random.choice(player_moves)
        
        # Enemy move selection - random for now
        enemy_move = random.choice(enemy_moves)
        current_state = apply_round(current_state, player_move, enemy_move)
    
    # Win if enemy is defeated while player remains alive
    if current_state.enemy_health <= 0 and current_state.player_health > 0:
        return 1
    return 0

def backpropagate(node, result):
    while node is not None:
        node.visits += 1
        node.wins += result
        node = node.parent

def mcts(root_state, iterations=100000):
    root_node = Node(root_state)
    for i in range(iterations):
        node = root_node
        state = root_state.clone()
        
        # Selection: traverse down while node is fully expanded and non-terminal
        while node.is_fully_expanded() and not state.is_terminal():
            node = select_best_child(node)
            enemy_moves = get_enemy_possible_moves(state)
            enemy_move = random.choice(enemy_moves) if enemy_moves else "rock"
            state = apply_round(state, node.move, enemy_move)
        
        # Expansion: if not terminal, expand the node
        if not state.is_terminal():
            node = expand(node)
            state = node.state
        
        # Simulation
        result = simulate(state)
        
        # Backpropagation
        backpropagate(node, result)
        
        # Print progress occasionally
        if iterations > 10000 and i % 10000 == 0:
            print(f"MCTS Progress: {i}/{iterations} iterations ({i/iterations*100:.1f}%)")
    
    # Debug: print win rates for each child of the root
    print("\nMove Analysis:")
    
    # First identify strongest enemy attack for reference
    strongest_enemy_move, strongest_damage = get_enemy_strongest_attack(root_state.enemy_move_stats)
    counter_to_strongest = get_counter_move(strongest_enemy_move)
    print(f"Enemy's strongest attack: {strongest_enemy_move} (DMG: {strongest_damage})")
    print(f"Counter to strongest: {counter_to_strongest}")
    
    for child in root_node.children:
        if child.visits > 0:
            win_rate = child.wins / child.visits
            charge_status = root_state.player_charges[child.move]
            is_counter = child.move == counter_to_strongest
            
            print(f"Move: {child.move}  Win rate: {win_rate:.3f}  Visits: {child.visits}  "
                  f"Charge: {charge_status}  " + ("(COUNTER)" if is_counter else ""))
    
    if not root_node.children:
        # This shouldn't happen in a real game, but just in case
        return "rock"
    
    # Consider both win rate and other strategic factors for final selection
    best_child = None
    best_score = -float('inf')
    
    # Check for potential killing moves
    killing_moves = []
    for child in root_node.children:
        if child.visits == 0:
            continue
            
        damage = root_state.player_move_stats[child.move]["damage"]
        # Only consider killing moves that don't deplete charges to -1
        if damage > root_state.enemy_shield + root_state.enemy_health and root_state.player_charges[child.move] > 1:
            killing_moves.append(child)
    
    # If we have killing moves with decent win rates, prioritize them
    if killing_moves:
        viable_killing_moves = [child for child in killing_moves if child.visits > 0 and (child.wins/child.visits) > 0.5]
        if viable_killing_moves:
            best_child = max(viable_killing_moves, key=lambda c: c.wins/c.visits if c.visits > 0 else 0)
            print(f"Selecting killing move: {best_child.move} with win rate: {best_child.wins/best_child.visits:.3f}")
            return best_child.move
    
    # Assess game state
    enemy_health_ratio = root_state.enemy_health / root_state.enemy_max_health
    player_health_ratio = root_state.player_health / root_state.player_max_health
    
    # Get strongest enemy attack
    strongest_enemy_move, strongest_damage = get_enemy_strongest_attack(root_state.enemy_move_stats)
    counter_to_strongest = get_counter_move(strongest_enemy_move)
    
    # Evaluate the threat level
    threat_level = strongest_damage / (root_state.player_health + root_state.player_shield) if (root_state.player_health + root_state.player_shield) > 0 else 1.0
    if strongest_damage < 5:
        threat_level *= 0.5  # Reduce threat for weak attacks
    
    for child in root_node.children:
        if child.visits == 0:
            continue
            
        win_rate = child.wins / child.visits
        
        # Apply MUCH STRONGER charge penalty
        charge_penalty = 0
        if child.move in root_state.player_charges:
            if root_state.player_charges[child.move] == 1:
                charge_penalty = 0.5  # Very high penalty for final decision
            elif root_state.player_charges[child.move] == 2:
                charge_penalty = 0.15  # Moderate penalty
        
        # Apply strategy bonuses based on game state
        strategy_bonus = 0
        
        # Offensive bonus for high damage moves
        move_damage = root_state.player_move_stats[child.move]["damage"]
        highest_damage = max(stats["damage"] for move, stats in root_state.player_move_stats.items())
        if move_damage > 0 and highest_damage > 0:
            damage_ratio = move_damage / highest_damage
            
            # Scale offensive bonus based on enemy health
            if enemy_health_ratio < 0.3:
                strategy_bonus += 0.1 * damage_ratio  # Reduced from 0.15
            else:
                strategy_bonus += 0.05 * damage_ratio  # Reduced from 0.08
        
        # Counter bonus scaled by threat level
        if child.move == counter_to_strongest:
            if player_health_ratio < 0.3:
                strategy_bonus += 0.08 * threat_level  # Reduced from 0.1
            else:
                strategy_bonus += 0.04 * threat_level  # Reduced from 0.05
        
        # Shield bonus when player is weak
        if player_health_ratio < 0.3:
            shield_value = root_state.player_move_stats[child.move]["shield"]
            max_shield = max(stats["shield"] for _, stats in root_state.player_move_stats.items())
            if max_shield > 0:
                shield_ratio = shield_value / max_shield
                strategy_bonus += 0.06 * shield_ratio  # Reduced from 0.08
        
        # Final score combines win rate with our priorities
        score = win_rate + strategy_bonus - charge_penalty
        
        # Log detailed scoring for transparency
        print(f"Move: {child.move}, Win Rate: {win_rate:.3f}, Charge: {root_state.player_charges[child.move]}, " 
              f"Strategy Bonus: {strategy_bonus:.3f}, Charge Penalty: {charge_penalty:.3f}, " 
              f"Final Score: {score:.3f}")
        
        if score > best_score:
            best_score = score
            best_child = child
    
    if best_child:
        return best_child.move
    else:
        # Fallback if no child has visits
        return max(root_node.children, key=lambda n: n.wins / n.visits if n.visits > 0 else 0).move

def get_best_action(api_data, iterations=100000):
    """
    Expects api_data to contain:
      - "player_move_stats"
      - "enemy_move_stats"
      - "initial_state": dict with player_health, player_shield, enemy_health, enemy_shield, 
                           player_max_health, player_max_shield, enemy_max_health, enemy_max_shield, and optionally round_number.
      - "player_charges"
      - "enemy_charges"
    Returns the best move determined by MCTS.
    """
    state_data = api_data["initial_state"]
    state = GameState(
        player_health=state_data["player_health"],
        player_shield=state_data["player_shield"],
        enemy_health=state_data["enemy_health"],
        enemy_shield=state_data["enemy_shield"],
        player_max_health=state_data["player_max_health"],
        player_max_shield=state_data["player_max_shield"],
        enemy_max_health=state_data["enemy_max_health"],
        enemy_max_shield=state_data["enemy_max_shield"],
        round_number=state_data.get("round_number", 1),
        player_move_stats=api_data.get("player_move_stats"),
        enemy_move_stats=api_data.get("enemy_move_stats")
    )
    
    if "player_charges" in api_data:
        state.player_charges = api_data["player_charges"]
    if "enemy_charges" in api_data:
        state.enemy_charges = api_data["enemy_charges"]

    # Display initial state information
    print("\nInitial State Analysis:")
    print(f"Player Health: {state.player_health}/{state.player_max_health}, Shield: {state.player_shield}/{state.player_max_shield}")
    print(f"Enemy Health: {state.enemy_health}/{state.enemy_max_health}, Shield: {state.enemy_shield}/{state.enemy_max_shield}")
    
    print("\nPlayer Charges:")
    for move, charge in state.player_charges.items():
        status = "CRITICAL" if charge == 1 else "LOW" if charge == 2 else "GOOD"
        print(f"  {move}: {charge}/3 ({status})")
    
    print("\nEnemy Move Analysis:")
    for move, stats in state.enemy_move_stats.items():
        print(f"  {move}: DMG={stats['damage']}, SHIELD={stats['shield']}")
    
    strongest_move, strongest_dmg = get_enemy_strongest_attack(state.enemy_move_stats)
    print(f"  Strongest enemy attack: {strongest_move} (DMG: {strongest_dmg})")
    print(f"  Counter strategy: Use {get_counter_move(strongest_move)}")

    best_move = mcts(state, iterations)
    return best_move

# --- Example Usage ---
if __name__ == "__main__":
    # Sample API data for testing/integration.
    api_data = {
        "player_move_stats": {
            "rock": {"damage": 15, "shield": 6},
            "paper": {"damage": 0, "shield": 4},
            "scissor": {"damage": 2, "shield": 2}
        },
        "enemy_move_stats": {
            "rock": {"damage": 4, "shield": 0},
            "paper": {"damage": 0, "shield": 4},
            "scissor": {"damage": 2, "shield": 2}
        },
        "initial_state": {
            "player_health": 12,
            "player_shield": 6,
            "enemy_health": 4,
            "enemy_shield": 2,
            "player_max_health": 12,
            "player_max_shield": 6,
            "enemy_max_health": 4,
            "enemy_max_shield": 2,
            "round_number": 1
        },
        "player_charges": {"rock": 3, "paper": 3, "scissor": 3},
        "enemy_charges": {"rock": 3, "paper": 3, "scissor": 3}
    }
    best_action = get_best_action(api_data)
    print("Best action to take:", best_action)