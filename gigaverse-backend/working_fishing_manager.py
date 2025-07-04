import json
import requests
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from termcolor import colored
from fishing_mcts import get_fishing_mcts_recommendation, FishCard
from fishing_logger import fishing_logger

@dataclass
class FishCard:
    """Represents a fishing card with its properties"""
    id: int
    mana_cost: int
    hit_zones: List[int]
    crit_zones: List[int]
    hit_effects: List[Dict]
    miss_effects: List[Dict]
    crit_effects: List[Dict]
    rarity: int
    name: str = ""

@dataclass
class FishingState:
    """Current state of the fishing game"""
    player_hp: int
    player_max_hp: int
    fish_hp: int
    fish_max_hp: int
    fish_position: Tuple[int, int]  # [x, y] coordinates
    previous_fish_position: Tuple[int, int]
    hand: List[int]  # Card IDs in hand
    discard: List[int]  # Card IDs in discard pile
    card_in_draw_pile: int
    mana_remaining: int
    day: int
    week: int

class FishingManager:
    """Manages fishing game mechanics and strategy"""
    
    def __init__(self, logger=None):
        self.logger = logger
        self.current_state: Optional[FishingState] = None
        self.available_cards: Dict[int, FishCard] = {}
        self.fish_movement_history: List[Tuple[int, int]] = []
        self.predicted_patterns: List[str] = []
        
    def load_card_data(self, card_data: List[Dict]) -> None:
        """Load card data from API response"""
        self.available_cards.clear()
        
        card_names = {
            1: "Top Row", 2: "Middle Row", 3: "Bottom Row",
            4: "Left Column", 5: "Center Column", 6: "Right Column", 
            7: "Corners", 8: "Plus Pattern", 9: "Almost All", 10: "Center Crit"
        }
        
        for card_info in card_data:
            card = FishCard(
                id=card_info['id'],
                mana_cost=card_info['manaCost'],
                hit_zones=card_info['hitZones'],
                crit_zones=card_info['critZones'],
                hit_effects=card_info['hitEffects'],
                miss_effects=card_info['missEffects'],
                crit_effects=card_info['critEffects'],
                rarity=card_info['rarity'],
                name=card_names.get(card_info['id'], f"Card {card_info['id']}")
            )
            self.available_cards[card.id] = card

    def update_game_state(self, api_data: Dict) -> None:
        """Update current game state from API response"""
        data = api_data['data']
        
        # Convert fish position from [x,y] to single position (1-9)
        fish_pos = data['fishPosition']
        prev_fish_pos = data['previousFishPosition']
        
        self.current_state = FishingState(
            player_hp=data['playerHp'],
            player_max_hp=data['playerMaxHp'],
            fish_hp=data['fishHp'],
            fish_max_hp=data['fishMaxHp'],
            fish_position=tuple(fish_pos),
            previous_fish_position=tuple(prev_fish_pos),
            hand=data['hand'],
            discard=data['discard'],
            card_in_draw_pile=data['cardInDrawPile'],
            mana_remaining=self._calculate_mana(data),
            day=data['day'],
            week=data['week']
        )
        
        # Track fish movement for pattern analysis
        self.fish_movement_history.append(tuple(fish_pos))
        if len(self.fish_movement_history) > 10:  # Keep last 10 positions
            self.fish_movement_history.pop(0)

    def _calculate_mana(self, data: Dict) -> int:
        """Calculate remaining mana based on player stats and cards played this turn"""
        # Max mana per turn equals player max HP
        max_mana_per_turn = data.get('playerMaxHp', 8)
        
        # Calculate mana used this turn based on cards no longer in deck
        starting_hand_size = 3  # Typical starting hand size in fishing
        cards_in_hand = len(data.get('hand', []))
        cards_in_discard = len(data.get('discard', []))
        
        # Cards played this turn = starting hand size - current hand size
        # (assuming we draw 1 card per turn to replace played cards)
        cards_played_this_turn = max(0, starting_hand_size - cards_in_hand)
        
        # Each card typically costs 1 mana
        mana_used = cards_played_this_turn
        
        # Remaining mana = max mana - mana used
        mana_remaining = max(0, max_mana_per_turn - mana_used)
        
        return mana_remaining

    def convert_position_to_grid(self, pos: Tuple[int, int]) -> int:
        """Convert [x,y] coordinate to grid position (1-9)"""
        x, y = pos
        # Assuming 1-based coordinates, convert to grid position
        return (y - 1) * 3 + x

    def convert_grid_to_position(self, grid_pos: int) -> Tuple[int, int]:
        """Convert grid position (1-9) to [x,y] coordinates"""
        # Convert 1-9 grid to x,y coordinates
        x = ((grid_pos - 1) % 3) + 1
        y = ((grid_pos - 1) // 3) + 1
        return (x, y)

    def analyze_fish_movement_pattern(self) -> List[int]:
        """Analyze fish movement history to predict possible next positions"""
        if len(self.fish_movement_history) < 2:
            return list(range(1, 10))  # All positions possible
        
        current_pos = self.convert_position_to_grid(self.fish_movement_history[-1])
        previous_pos = self.convert_position_to_grid(self.fish_movement_history[-2])
        
        # Calculate movement vector
        movement_pattern = self._detect_movement_pattern(previous_pos, current_pos)
        
        # Predict next possible positions based on pattern
        possible_positions = self._predict_next_positions(current_pos, movement_pattern)
        
        if self.logger:
            self.logger.log_general_info(f"Fish pattern analysis: Current={current_pos}, Previous={previous_pos}, Pattern={movement_pattern}")
            self.logger.log_general_info(f"Predicted positions: {possible_positions}")
        
        return possible_positions

    def _detect_movement_pattern(self, prev_pos: int, curr_pos: int) -> str:
        """Detect the type of movement pattern - simplified to 3 patterns: adjacent, +, x"""
        # Define corner positions and center
        corners = {1, 3, 7, 9}
        center = 5
        
        # x pattern: corner to corner movements OR corner to/from center
        if (prev_pos in corners and curr_pos in corners) or \
           (prev_pos in corners and curr_pos == center) or \
           (prev_pos == center and curr_pos in corners):
            return "x"
        
        # adjacent pattern: neighboring positions (horizontal or vertical by 1 step)
        diff = curr_pos - prev_pos
        if abs(diff) == 1 and self._is_same_row(prev_pos, curr_pos):  # horizontal adjacent
            return "adjacent"
        elif abs(diff) == 3:  # vertical adjacent
            return "adjacent"
        
        # + pattern: everything else that doesn't involve center
        elif prev_pos != center and curr_pos != center:
            return "+"
        
        # Any other pattern is unknown
        else:
            return "unknown"

    def _is_same_row_jump(self, pos1: int, pos2: int) -> bool:
        """Check if two positions are in the same row (for 2-step jumps)"""
        return (pos1 - 1) // 3 == (pos2 - 1) // 3

    def _predict_next_positions(self, current_pos: int, pattern: str) -> List[int]:
        """Predict possible next positions based on detected pattern"""
        possible = []
        
        if pattern == "adjacent":
            # Fish moves horizontally (left/right by 1) or vertically (up/down by 1 row)
            for delta in [-1, 1]:  # horizontal
                next_pos = current_pos + delta
                if self._is_valid_position(next_pos) and self._is_same_row(current_pos, next_pos):
                    possible.append(next_pos)
            for delta in [-3, 3]:  # vertical
                next_pos = current_pos + delta
                if self._is_valid_position(next_pos):
                    possible.append(next_pos)
                    
        elif pattern == "+":
            # Fish moves 2 steps horizontally (jump pattern)
            for delta in [-2, 2]:
                next_pos = current_pos + delta
                if self._is_valid_position(next_pos) and self._is_same_row_jump(current_pos, next_pos):
                    possible.append(next_pos)
         
        elif pattern == "x":
            # Fish moves diagonally
            for delta in [-4, -2, 2, 4]:
                next_pos = current_pos + delta
                if self._is_valid_position(next_pos):
                    possible.append(next_pos)
                    
        else:
            # Unknown pattern - all adjacent positions possible
            for delta in [-3, -1, 1, 3, -4, -2, 2, 4]:
                next_pos = current_pos + delta
                if self._is_valid_position(next_pos):
                    possible.append(next_pos)
        
        return possible if possible else [current_pos]  # Stay in place if no valid moves

    def _is_valid_position(self, pos: int) -> bool:
        """Check if position is within the 3x3 grid"""
        return 1 <= pos <= 9

    def _is_same_row(self, pos1: int, pos2: int) -> bool:
        """Check if two positions are in the same row"""
        return (pos1 - 1) // 3 == (pos2 - 1) // 3

    def calculate_card_effectiveness(self, card_id: int, predicted_positions: List[int]) -> float:
        """Calculate how effective a card would be against predicted fish positions"""
        if card_id not in self.available_cards:
            return 0.0
            
        card = self.available_cards[card_id]
        
        # Calculate hit probability
        hit_positions = set(card.hit_zones + card.crit_zones)
        hits = len(hit_positions.intersection(set(predicted_positions)))
        hit_probability = hits / len(predicted_positions) if predicted_positions else 0
        
        # Calculate expected damage
        hit_damage = sum(effect['amount'] for effect in card.hit_effects if effect['type'] == 'FISH_HP')
        crit_damage = sum(effect['amount'] for effect in card.crit_effects if effect['type'] == 'FISH_HP')
        miss_penalty = sum(effect['amount'] for effect in card.miss_effects if effect['type'] == 'FISH_HP')
        
        # Weight by probability and damage potential
        expected_value = (hit_probability * hit_damage) + ((1 - hit_probability) * miss_penalty)
        
        # Factor in mana efficiency
        mana_efficiency = expected_value / card.mana_cost if card.mana_cost > 0 else 0
        
        return mana_efficiency

    def get_best_card_recommendation(self, use_mcts: bool = True, mcts_iterations: int = 5000) -> Optional[int]:
        """Recommend the best card to play based on current situation"""
        if not self.current_state or not self.current_state.hand:
            return None
            
        if use_mcts:
            return self._get_mcts_recommendation(mcts_iterations)
        else:
            return self._get_simple_recommendation()
    
    def _get_mcts_recommendation(self, iterations: int = 5000) -> Optional[int]:
        """Get MCTS-based card recommendation"""
        try:
            from fishing_mcts import FishCard as MCTSFishCard
            
            # Convert cards to MCTS format
            mcts_cards = {}
            for card_id, card_data in self.available_cards.items():
                mcts_cards[card_id] = MCTSFishCard(
                    id=card_id,
                    mana_cost=card_data.mana_cost,
                    hit_zones=card_data.hit_zones,
                    crit_zones=card_data.crit_zones,
                    hit_damage=sum(effect['amount'] for effect in card_data.hit_effects if effect['type'] == 'FISH_HP'),
                    miss_penalty=sum(effect['amount'] for effect in card_data.miss_effects if effect['type'] == 'FISH_HP'),
                    crit_damage=sum(effect['amount'] for effect in card_data.crit_effects if effect['type'] == 'FISH_HP'),
                    name=card_data.name
                )
            
            # Convert movement history to grid positions
            movement_history_grid = []
            for pos_tuple in self.fish_movement_history:
                grid_pos = self.convert_position_to_grid(pos_tuple)
                movement_history_grid.append(grid_pos)
            
            # Add current position to movement history for MCTS
            current_grid_pos = self.convert_position_to_grid(self.current_state.fish_position)
            if current_grid_pos not in movement_history_grid:
                movement_history_grid.append(current_grid_pos)
            
            # Debug: Show pattern analysis
            self._debug_show_detected_patterns(movement_history_grid)
            
            # Create a modified state with grid movement history
            mcts_state = type('MCTSState', (), {
                'fish_position': self.current_state.fish_position,
                'fish_hp': self.current_state.fish_hp,
                'fish_max_hp': self.current_state.fish_max_hp,
                'player_hp': self.current_state.player_hp,
                'player_max_hp': self.current_state.player_max_hp,
                'hand': self.current_state.hand,
                'mana_remaining': self.current_state.mana_remaining,
                'movement_history': movement_history_grid
            })()
            
            return get_fishing_mcts_recommendation(mcts_state, mcts_cards, iterations, self.logger)
            
        except Exception as e:
            if self.logger:
                self.logger.log_error(f"MCTS recommendation failed: {e}, falling back to simple method")
            return self._get_simple_recommendation()
    
    def _debug_show_detected_patterns(self, movement_history_grid: list):
        """Debug function to show what patterns MCTS detects"""
        if len(movement_history_grid) < 2:
            print(colored("🔍 Pattern Analysis: Insufficient data (need 2+ positions)", 'yellow'))
            return
        
        from fishing_mcts import FishingGameState, FishCard as MCTSFishCard
        
        # Create dummy state for pattern analysis
        dummy_cards = {1: MCTSFishCard(1, 1, [1], [1], 1, 1, 1, "Test")}
        temp_state = FishingGameState(
            fish_position=movement_history_grid[-1],
            fish_hp=self.current_state.fish_hp,
            fish_max_hp=self.current_state.fish_max_hp,
            player_hp=self.current_state.player_hp,
            player_max_hp=self.current_state.player_max_hp,
            hand_cards=[1],
            available_cards=dummy_cards,
            mana_remaining=self.current_state.mana_remaining,
            movement_history=movement_history_grid
        )
        
        print(colored("🔍 MCTS Pattern Analysis:", 'cyan', attrs=['bold']))
        print(colored(f"   Movement history: {movement_history_grid}", 'white'))
        
        for i, pattern in enumerate(temp_state.detected_patterns):
            print(colored(f"   Pattern {i+1}: {pattern.pattern_type} ({pattern.probability:.1%})", 'yellow'))
            print(colored(f"   Predicted positions: {pattern.possible_moves}", 'white'))
    
    def log_fishing_move(self, turn_number: int, card_played: dict, fish_pos_before: int, 
                        fish_pos_after: int, result_type: str, damage_dealt: int):
        """Log a fishing move with detailed analysis"""
        if not self.current_state:
            return
            
        # Get movement history in grid format
        movement_history_grid = []
        for pos_tuple in self.fish_movement_history:
            grid_pos = self.convert_position_to_grid(pos_tuple)
            movement_history_grid.append(grid_pos)
        
        # Get pattern analysis
        from fishing_mcts import FishingGameState, FishCard as MCTSFishCard
        dummy_cards = {1: MCTSFishCard(1, 1, [1], [1], 1, 1, 1, "Test")}
        temp_state = FishingGameState(
            fish_position=fish_pos_before,
            fish_hp=self.current_state.fish_hp,
            fish_max_hp=self.current_state.fish_max_hp,
            player_hp=self.current_state.player_hp,
            player_max_hp=self.current_state.player_max_hp,
            hand_cards=[1],
            available_cards=dummy_cards,
            mana_remaining=self.current_state.mana_remaining,
            movement_history=movement_history_grid
        )
        
        # Get predicted positions from patterns
        all_predicted_positions = []
        highest_confidence = 0.0
        for pattern in temp_state.detected_patterns:
            all_predicted_positions.extend(pattern.possible_moves)
            if pattern.probability > highest_confidence:
                highest_confidence = pattern.probability
        
        # Remove duplicates while preserving order
        predicted_positions = list(dict.fromkeys(all_predicted_positions))
        
        # Determine reason for card choice
        chosen_reason = f"MCTS recommendation with {highest_confidence:.1%} pattern confidence"
        
        # Log the move
        fishing_logger.log_fishing_turn(
            turn_number=turn_number,
            fish_pos_before=fish_pos_before,
            fish_hp_before=self.current_state.fish_hp + damage_dealt,  # HP before damage
            player_hp_before=self.current_state.player_hp,
            mana_before=self.current_state.mana_remaining + card_played.get('mana_cost', 0),
            movement_history=movement_history_grid,
            detected_patterns=temp_state.detected_patterns,
            card_played=card_played,
            predicted_positions=predicted_positions,
            prediction_confidence=highest_confidence,
            chosen_reason=chosen_reason,
            fish_pos_after=fish_pos_after,
            result_type=result_type,
            damage_dealt=abs(damage_dealt),
            fish_hp_after=self.current_state.fish_hp
        )
    
    def save_fishing_logs(self):
        """Save fishing logs to file"""
        fishing_logger.save_session_logs()
        
    def analyze_fishing_performance(self):
        """Analyze fishing performance"""
        fishing_logger.analyze_session_performance()
    
    def _get_simple_recommendation(self) -> Optional[int]:
        """Get simple effectiveness-based recommendation (fallback)"""
        predicted_positions = self.analyze_fish_movement_pattern()
        
        best_card = None
        best_effectiveness = -float('inf')
        
        for card_id in self.current_state.hand:
            effectiveness = self.calculate_card_effectiveness(card_id, predicted_positions)
            
            if effectiveness > best_effectiveness:
                best_effectiveness = effectiveness
                best_card = card_id
                
        return best_card

    def should_continue_fishing(self) -> bool:
        """Determine if we should continue fishing or stop"""
        if not self.current_state:
            return False
            
        # Stop if fish is dead
        if self.current_state.fish_hp <= 0:
            return False
            
        # Stop if player is dead
        if self.current_state.player_hp <= 0:
            return False
            
        # Stop if no mana and no cards
        if self.current_state.mana_remaining <= 0 and not self.current_state.hand:
            return False
            
        return True

    def get_fishing_stats(self) -> Dict:
        """Get current fishing session statistics"""
        if not self.current_state:
            return {}
            
        return {
            'player_hp': self.current_state.player_hp,
            'player_max_hp': self.current_state.player_max_hp,
            'fish_hp': self.current_state.fish_hp,
            'fish_max_hp': self.current_state.fish_max_hp,
            'fish_position': self.current_state.fish_position,
            'cards_in_hand': len(self.current_state.hand),
            'cards_in_draw_pile': self.current_state.card_in_draw_pile,
            'mana_remaining': self.current_state.mana_remaining,
            'turns_played': len(self.fish_movement_history)
        } 