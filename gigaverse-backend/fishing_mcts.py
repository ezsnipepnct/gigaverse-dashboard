#!/usr/bin/env python3

import random
from typing import List, Dict, Tuple, Optional
from mcts import mcts
import copy
from fishing_common import FishCard, extract_damage_from_effects

# Fish movement patterns
X_PATTERN_POSITIONS = [1, 3, 5, 7, 9]  # Corners + center
PLUS_PATTERN_POSITIONS = [2, 4, 6, 8]  # Cross positions
ALL_POSITIONS = list(range(1, 10))  # All 9 positions

def convert_coord_to_position(coord: List[int]) -> int:
    """Convert [row, col] coordinate to position number (1-9)"""
    if len(coord) != 2:
        return 5  # Default to center
    row, col = coord
    # Convert from 0-based to 1-based if needed
    if row == 0:
        row = 1
    if col == 0:
        col = 1
    # Position mapping: [1,1]=1, [1,2]=2, [1,3]=3, [2,1]=4, [2,2]=5, [2,3]=6, [3,1]=7, [3,2]=8, [3,3]=9
    return (row - 1) * 3 + col

def convert_position_to_coord(position: int) -> List[int]:
    """Convert position number (1-9) to [row, col] coordinate"""
    if position < 1 or position > 9:
        return [2, 2]  # Default to center
    row = ((position - 1) // 3) + 1
    col = ((position - 1) % 3) + 1
    return [row, col]

def create_fish_card_from_data(card_data: Dict) -> FishCard:
    """Create FishCard from API card data"""
    return FishCard(
        id=card_data['id'],
        mana_cost=card_data.get('manaCost', 1),
        hit_zones=card_data.get('hitZones', []),
        crit_zones=card_data.get('critZones', []),
        hit_effects=card_data.get('hitEffects', []),
        miss_effects=card_data.get('missEffects', []),
        crit_effects=card_data.get('critEffects', []),
        rarity=card_data.get('rarity', 0),
        name=f"Card {card_data['id']}"
    )

def get_card_damage(card: FishCard, fish_position: int) -> int:
    """Get damage this card would deal to fish at given position"""
    if fish_position in card.crit_zones:
        return extract_damage_from_effects(card.crit_effects)
    elif fish_position in card.hit_zones:
        return extract_damage_from_effects(card.hit_effects)
    else:
        return extract_damage_from_effects(card.miss_effects)

def detect_fish_pattern(current_pos: int, previous_pos: int) -> str:
    """Detect fish movement pattern based on current and previous positions"""
    if current_pos == previous_pos:
        return 'UNKNOWN'  # Fish hasn't moved yet
    
    # Check if both positions are in X pattern
    if current_pos in X_PATTERN_POSITIONS and previous_pos in X_PATTERN_POSITIONS:
        return 'X'
    
    # Check if both positions are in + pattern
    if current_pos in PLUS_PATTERN_POSITIONS and previous_pos in PLUS_PATTERN_POSITIONS:
        return 'PLUS'
    
    # Check if positions are adjacent (adjacent pattern)
    curr_row, curr_col = (current_pos - 1) // 3, (current_pos - 1) % 3
    prev_row, prev_col = (previous_pos - 1) // 3, (previous_pos - 1) % 3
    
    if abs(curr_row - prev_row) <= 1 and abs(curr_col - prev_col) <= 1:
        return 'ADJACENT'
    
    return 'UNKNOWN'

def get_possible_positions(pattern: str, current_pos: int) -> List[int]:
    """Get possible next positions based on pattern"""
    if pattern == 'X':
        return [pos for pos in X_PATTERN_POSITIONS if pos != current_pos]
    elif pattern == 'PLUS':
        return [pos for pos in PLUS_PATTERN_POSITIONS if pos != current_pos]
    elif pattern == 'ADJACENT':
        # Adjacent squares to current position
        curr_row, curr_col = (current_pos - 1) // 3, (current_pos - 1) % 3
        adjacent = []
        for dr in [-1, 0, 1]:
            for dc in [-1, 0, 1]:
                if dr == 0 and dc == 0:  # Skip current position
                    continue
                new_row, new_col = curr_row + dr, curr_col + dc
                if 0 <= new_row < 3 and 0 <= new_col < 3:
                    adjacent.append(new_row * 3 + new_col + 1)
        return adjacent
    else:
        return ALL_POSITIONS  # Unknown pattern, fish can go anywhere

class FishingGameState:
    """Represents the current state of the fishing game"""
    def __init__(self, fish_pos: int, fish_prev_pos: int, fish_hp: int, fish_max_hp: int, 
                 player_hp: int, player_max_hp: int, cards: List[FishCard], turn: int = 0):
        self.fish_pos = fish_pos
        self.fish_prev_pos = fish_prev_pos
        self.fish_hp = fish_hp
        self.fish_max_hp = fish_max_hp
        self.player_hp = player_hp
        self.player_max_hp = player_max_hp
        self.cards = cards
        self.turn = turn
        self.pattern = detect_fish_pattern(fish_pos, fish_prev_pos)
        self.possible_fish_positions = get_possible_positions(self.pattern, fish_pos)

class FishingGameAction:
    """Represents a card play action"""
    def __init__(self, card_id: int):
        self.card_id = card_id

class FishingMCTSState:
    """MCTS state for fishing game"""
    def __init__(self, game_state: FishingGameState):
        self.game_state = copy.deepcopy(game_state)
        self.terminal = False
        self.winner = None
    
    def get_legal_actions(self) -> List[FishingGameAction]:
        """Get all legal actions (available cards)"""
        return [FishingGameAction(card.id) for card in self.game_state.cards]
    
    def is_terminal(self) -> bool:
        """Check if game is over"""
        return self.game_state.fish_hp <= 0 or self.game_state.player_hp <= 0
    
    def get_reward(self) -> float:
        """Get reward for current state"""
        if self.game_state.fish_hp <= 0:
            return 1.0  # Fish defeated
        elif self.game_state.player_hp <= 0:
            return -1.0  # Player defeated
        else:
            # Return progress toward winning (fish damage dealt)
            fish_damage_dealt = self.game_state.fish_max_hp - self.game_state.fish_hp
            return fish_damage_dealt / self.game_state.fish_max_hp
    
    def take_action(self, action: FishingGameAction):
        """Apply action and return new state"""
        new_state = copy.deepcopy(self)
        
        # Find the card being played
        card = None
        for c in new_state.game_state.cards:
            if c.id == action.card_id:
                card = c
                break
        
        if not card:
            return new_state
        
        # Calculate expected damage across all possible fish positions
        total_damage = 0
        
        for fish_pos in new_state.game_state.possible_fish_positions:
            damage = get_card_damage(card, fish_pos)
            total_damage += damage
        
        # Average damage across all possible positions
        if new_state.game_state.possible_fish_positions:
            avg_damage = total_damage / len(new_state.game_state.possible_fish_positions)
        else:
            avg_damage = extract_damage_from_effects(card.miss_effects)
        
        # Apply damage
        new_state.game_state.fish_hp -= int(avg_damage)
        
        # Simulate fish movement for next turn
        if new_state.game_state.fish_hp > 0:
            new_fish_pos = random.choice(new_state.game_state.possible_fish_positions)
            new_state.game_state.fish_prev_pos = new_state.game_state.fish_pos
            new_state.game_state.fish_pos = new_fish_pos
            new_state.game_state.pattern = detect_fish_pattern(new_fish_pos, new_state.game_state.fish_prev_pos)
            new_state.game_state.possible_fish_positions = get_possible_positions(new_state.game_state.pattern, new_fish_pos)
        
        new_state.game_state.turn += 1
        return new_state

def get_fishing_mcts_recommendation(cards: List[Dict], fish_position: List[int], 
                                  fish_previous_position: List[int], 
                                  fish_hp: int, fish_max_hp: int,
                                  player_hp: int, player_max_hp: int) -> int:
    """Get MCTS recommendation for fishing card selection"""
    try:
        # Convert position coordinates to grid positions
        current_fish_pos = convert_coord_to_position(fish_position)
        previous_fish_pos = convert_coord_to_position(fish_previous_position)
        
        # Convert card dictionaries to FishCard objects
        fish_cards = []
        for card_data in cards:
            fish_card = create_fish_card_from_data(card_data)
            fish_cards.append(fish_card)
        
        if not fish_cards:
            return cards[0]['id'] if cards else 1
        
        # Create initial game state
        game_state = FishingGameState(
            fish_pos=current_fish_pos,
            fish_prev_pos=previous_fish_pos,
            fish_hp=fish_hp,
            fish_max_hp=fish_max_hp,
            player_hp=player_hp,
            player_max_hp=player_max_hp,
            cards=fish_cards
        )
        
        # Create MCTS state
        mcts_state = FishingMCTSState(game_state)
        
        # Run MCTS
        mcts_instance = mcts(timeLimit=1000)  # 1 second time limit
        best_action = mcts_instance.search(initialState=mcts_state)
        
        if best_action:
            return best_action.card_id
        else:
            # Fallback to simple recommendation
            return get_simple_recommendation(cards, fish_position, fish_previous_position)
            
    except Exception as e:
        # Fallback to simple recommendation on error
        return get_simple_recommendation(cards, fish_position, fish_previous_position)

def get_simple_recommendation(cards: List[Dict], fish_position: List[int], 
                            fish_previous_position: List[int]) -> int:
    """Simple fallback recommendation based on hit probability"""
    if not cards:
        return 1
    
    current_pos = convert_coord_to_position(fish_position)
    pattern = detect_fish_pattern(current_pos, convert_coord_to_position(fish_previous_position))
    possible_positions = get_possible_positions(pattern, current_pos)
    
    best_card = None
    best_score = -1
    
    for card_data in cards:
        card = create_fish_card_from_data(card_data)
        
        # Calculate expected damage
        total_damage = 0
        hits = 0
        
        for pos in possible_positions:
            damage = get_card_damage(card, pos)
            total_damage += damage
            if pos in card.hit_zones or pos in card.crit_zones:
                hits += 1
        
        if possible_positions:
            avg_damage = total_damage / len(possible_positions)
            hit_rate = hits / len(possible_positions)
            score = avg_damage + (hit_rate * 2)  # Favor cards with good hit rates
        else:
            score = extract_damage_from_effects(card.hit_effects)
        
        if score > best_score:
            best_score = score
            best_card = card
    
    return best_card.id if best_card else cards[0]['id'] 