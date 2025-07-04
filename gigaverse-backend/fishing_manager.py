import json
import requests
from typing import Dict, List, Tuple, Optional
from termcolor import colored
from fishing_common import FishCard, FishingState, extract_damage_from_effects
import logging
# fishing_logger was removed - using standard logger instead

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
            logging.info(f"Fish pattern analysis: Current={current_pos}, Previous={previous_pos}, Pattern={movement_pattern}")
            logging.info(f"Predicted positions: {possible_positions}")
        
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
            # Fish moves diagonally OR to/from center
            corners = {1, 3, 7, 9}
            center = 5
            
            if current_pos == center:
                # From center, can go to any corner
                possible.extend(corners)
            elif current_pos in corners:
                # From corner, can go to center or other corners
                possible.append(center)
                possible.extend([corner for corner in corners if corner != current_pos])
            else:
                # From edge, use default behavior
                possible.extend(range(1, 10))
                
        if not possible:
            # Default: all adjacent positions
            possible = self._get_adjacent_positions(current_pos)
            
        return possible

    def _get_adjacent_positions(self, pos: int) -> List[int]:
        """Get all adjacent positions (including diagonals)"""
        adjacent = []
        row, col = (pos - 1) // 3, (pos - 1) % 3
        
        for dr in [-1, 0, 1]:
            for dc in [-1, 0, 1]:
                if dr == 0 and dc == 0:
                    continue
                new_row, new_col = row + dr, col + dc
                if 0 <= new_row < 3 and 0 <= new_col < 3:
                    adjacent.append(new_row * 3 + new_col + 1)
        
        return adjacent

    def _is_valid_position(self, pos: int) -> bool:
        """Check if position is valid (1-9)"""
        return 1 <= pos <= 9

    def _is_same_row(self, pos1: int, pos2: int) -> bool:
        """Check if two positions are in the same row"""
        return (pos1 - 1) // 3 == (pos2 - 1) // 3

    def calculate_card_effectiveness(self, card_id: int, predicted_positions: List[int]) -> float:
        """Calculate the effectiveness of a card against predicted fish positions"""
        if card_id not in self.available_cards:
            return 0.0
        
        card = self.available_cards[card_id]
        total_damage = 0
        hit_count = 0
        
        for pos in predicted_positions:
            if pos in card.crit_zones:
                total_damage += extract_damage_from_effects(card.crit_effects)
                hit_count += 1
            elif pos in card.hit_zones:
                total_damage += extract_damage_from_effects(card.hit_effects)
                hit_count += 1
            else:
                total_damage += extract_damage_from_effects(card.miss_effects)
        
        # Calculate weighted effectiveness
        if predicted_positions:
            avg_damage = total_damage / len(predicted_positions)
            hit_rate = hit_count / len(predicted_positions)
            effectiveness = (avg_damage * 0.7) + (hit_rate * 0.3 * 10)  # Weight damage more than hit rate
            return effectiveness
        
        return 0.0

    def get_card_recommendation(self, use_mcts: bool = True, mcts_iterations: int = 5000) -> Optional[int]:
        """Get recommended card to play based on current state"""
        if not self.current_state or not self.available_cards:
            return None
            
        # Try MCTS first if enabled
        if use_mcts:
            mcts_recommendation = self._get_mcts_recommendation(mcts_iterations)
            if mcts_recommendation:
                return mcts_recommendation
                
        # Fall back to simple heuristic
        return self._get_simple_recommendation()

    def load_game_state(self, game_data: Dict) -> None:
        """Load game state from API response and prepare for analysis"""
        try:
            # Load card data
            card_data = game_data.get('deckCardData', [])
            self.load_card_data(card_data)
            
            # Update game state
            self.update_game_state(game_data)
            
            if self.logger:
                logging.info(f"Game state loaded: Fish HP {self.current_state.fish_hp}/{self.current_state.fish_max_hp}")
                logging.info(f"Player HP {self.current_state.player_hp}/{self.current_state.player_max_hp}")
                logging.info(f"Fish position: {self.current_state.fish_position}")
                logging.info(f"Cards in hand: {self.current_state.hand}")
                
        except Exception as e:
            if self.logger:
                logging.error(f"Error loading game state: {e}")
            raise

    def _get_mcts_recommendation(self, iterations: int = 5000) -> Optional[int]:
        """Get MCTS recommendation for card selection"""
        try:
            # Import here to avoid circular imports
            from fishing_mcts import get_fishing_mcts_recommendation
            
            # Convert current state to format expected by MCTS
            fish_pos = list(self.current_state.fish_position)
            prev_fish_pos = list(self.current_state.previous_fish_position)
            
            # Get available cards for this turn
            available_cards = []
            for card_id in self.current_state.hand:
                if card_id in self.available_cards:
                    card = self.available_cards[card_id]
                    card_dict = {
                        'id': card.id,
                        'manaCost': card.mana_cost,
                        'hitZones': card.hit_zones,
                        'critZones': card.crit_zones,
                        'hitEffects': card.hit_effects,
                        'missEffects': card.miss_effects,
                        'critEffects': card.crit_effects,
                        'rarity': card.rarity
                    }
                    available_cards.append(card_dict)
            
            if not available_cards:
                return None
                
            # Get MCTS recommendation
            recommendation = get_fishing_mcts_recommendation(
                cards=available_cards,
                fish_position=fish_pos,
                fish_previous_position=prev_fish_pos,
                fish_hp=self.current_state.fish_hp,
                fish_max_hp=self.current_state.fish_max_hp,
                player_hp=self.current_state.player_hp,
                player_max_hp=self.current_state.player_max_hp
            )
            
            return recommendation
            
        except Exception as e:
            if self.logger:
                logging.error(f"MCTS recommendation failed: {e}")
            return None

    def _debug_show_detected_patterns(self, movement_history_grid: list):
        """Debug method to show detected movement patterns"""
        if len(movement_history_grid) < 2:
            return
            
        patterns = []
        for i in range(1, len(movement_history_grid)):
            prev_pos = movement_history_grid[i-1]
            curr_pos = movement_history_grid[i]
            pattern = self._detect_movement_pattern(prev_pos, curr_pos)
            patterns.append(f"{prev_pos}→{curr_pos}:{pattern}")
            
        if self.logger:
            logging.debug(f"Movement patterns detected: {', '.join(patterns)}")

    def log_fishing_move(self, turn_number: int, card_played: dict, fish_pos_before: int, 
                        fish_pos_after: int, result_type: str, damage_dealt: int):
        """Log details of a fishing move for analysis"""
        move_data = {
            'turn': turn_number,
            'card_id': card_played.get('id', 'unknown'),
            'card_name': card_played.get('name', 'unknown'),
            'fish_pos_before': fish_pos_before,
            'fish_pos_after': fish_pos_after,
            'result_type': result_type,  # 'hit', 'crit', 'miss'
            'damage_dealt': damage_dealt,
            'timestamp': 'current_time'
        }
        
        if self.logger:
            logging.info(f"Move logged: {move_data}")

    def save_fishing_logs(self):
        """Save fishing logs to file for analysis"""
        # Implementation depends on logger
        pass

    def analyze_fishing_performance(self):
        """Analyze fishing performance from logs"""
        # Implementation depends on logger
        pass

    def _get_simple_recommendation(self) -> Optional[int]:
        """Get simple heuristic recommendation when MCTS fails"""
        if not self.current_state or not self.current_state.hand:
            return None
            
        # Predict fish movement
        predicted_positions = self.analyze_fish_movement_pattern()
        
        # Calculate effectiveness for each card in hand
        best_card = None
        best_effectiveness = -1
        
        for card_id in self.current_state.hand:
            if card_id in self.available_cards:
                effectiveness = self.calculate_card_effectiveness(card_id, predicted_positions)
                if effectiveness > best_effectiveness:
                    best_effectiveness = effectiveness
                    best_card = card_id
        
        return best_card

    def should_continue_fishing(self) -> bool:
        """Determine if fishing should continue based on current state"""
        if not self.current_state:
            return False
            
        # Continue if fish is still alive and player is alive
        return self.current_state.fish_hp > 0 and self.current_state.player_hp > 0

    def get_fishing_stats(self) -> Dict:
        """Get current fishing statistics"""
        if not self.current_state:
            return {}
            
        return {
            'fish_hp': self.current_state.fish_hp,
            'fish_max_hp': self.current_state.fish_max_hp,
            'player_hp': self.current_state.player_hp,
            'player_max_hp': self.current_state.player_max_hp,
            'fish_position': self.current_state.fish_position,
            'cards_in_hand': len(self.current_state.hand),
            'cards_in_discard': len(self.current_state.discard)
        } 