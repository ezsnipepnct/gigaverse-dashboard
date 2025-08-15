from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass

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

def extract_damage_from_effects(effects: List[Dict]) -> int:
    """Extract damage amount from effect list"""
    if not effects:
        return 0
    for effect in effects:
        if effect.get('type') == 'FISH_HP':
            return effect.get('amount', 0)
    return 0 