import random
import time
import questionary
from termcolor import colored

# Import modules
from api_manager import ApiManager
from state_manager import StateManager
from ui_manager import UiManager
from game_manager import GameManager
from fishing_game_manager import FishingGameManager
import claim_manager

# API configuration
TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJhZGRyZXNzIjoiMHhiMGQ5MEQ1MkM3Mzg5ODI0RDRCMjJjMDZiY2RjQ0Q3MzRFMzE2MmI3IiwidXNlciI6eyJfaWQiOiI2N2I5MjE1YTEwOGFlZGRiNDA5YTdlNzMiLCJ3YWxsZXRBZGRyZXNzIjoiMHhiMGQ5MGQ1MmM3Mzg5ODI0ZDRiMjJjMDZiY2RjY2Q3MzRlMzE2MmI3IiwidXNlcm5hbWUiOiIweGIwZDkwRDUyQzczODk4MjRENEIyMmMwNmJjZGNDRDczNEUzMTYyYjciLCJjYXNlU2Vuc2l0aXZlQWRkcmVzcyI6IjB4YjBkOTBENTJDNzM4OTgyNEQ0QjIyYzA2YmNkY0NENzM0RTMxNjJiNyIsIl9fdiI6MH0sImdhbWVBY2NvdW50Ijp7Im5vb2IiOnsiX2lkIjoiNjdiOTIxNzRlM2MzOWRjYTZmZGFkZjA5IiwiZG9jSWQiOiIyMTQyNCIsInRhYmxlTmFtZSI6IkdpZ2FOb29iTkZUIiwiTEFTVF9UUkFOU0ZFUl9USU1FX0NJRCI6MTc0MDE4NTk2NCwiY3JlYXRlZEF0IjoiMjAyNS0wMi0yMlQwMDo1OTozMi45NDZaIiwidXBkYXRlZEF0IjoiMjAyNS0wMi0yMlQwMDo1OTozMy4xNjVaIiwiTEVWRUxfQ0lEIjoxLCJJU19OT09CX0NJRCI6dHJ1ZSwiSU5JVElBTElaRURfQ0lEIjp0cnVlLCJPV05FUl9DSUQiOiIweGIwZDkwZDUyYzczODk4MjRkNGIyMmMwNmJjZGNjZDczNGUzMTYyYjcifSwiYWxsb3dlZFRvQ3JlYXRlQWNjb3VudCI6dHJ1ZSwiY2FuRW50ZXJHYW1lIjp0cnVlLCJub29iUGFzc0JhbGFuY2UiOjAsImxhc3ROb29iSWQiOjc0MjE4LCJtYXhOb29iSWQiOjEwMDAwfSwiZXhwIjoxNzUxNTQyMDgyfQ.oHeMO1Q-nvg0Po5dVwyD_rwvSUnS6y_FR8svjiq6fWs"

def main():
    # Initialize logger first
    from logger_manager import DungeonLogger
    logger = DungeonLogger()
    
    # Initialize managers with shared logger
    api_manager = ApiManager(TOKEN, logger)
    state_manager = StateManager()
    ui_manager = UiManager()
    game_manager = GameManager(api_manager, state_manager, ui_manager)
    fishing_game_manager = FishingGameManager(ui_manager, TOKEN, logger)
    
    # Main application loop
    while True:
        action = ui_manager.display_main_menu()
        
        if action == "quit":
            print(colored("\nThank you for using the Gigaverse Dungeon Crawler Bot. Goodbye!", 'magenta'))
            break
            
        elif action == "settings":
            settings = ui_manager.display_settings_menu()
            game_manager.update_settings(settings)
            continue
        
        elif action == "claim":
            resource_type, energy_threshold = ui_manager.display_claim_menu()
            
            if resource_type != "back":
                try:
                    results = claim_manager.claim_resources(api_manager.headers, resource_type, energy_threshold)
                    
                    if "error" not in results:
                        print(colored("\n=== Claim Summary ===", 'green', attrs=['bold']))
                        
                        if "energy" in results:
                            energy_total = results["energy"]["total"]
                            print(colored(f"Energy Claimed: {energy_total}", 'cyan'))
                        
                        if "shards" in results:
                            shards_total = results["shards"]["total"]
                            print(colored(f"Shards Claimed: {shards_total}", 'cyan'))
                        
                        if "dust" in results:
                            dust_total = results["dust"]["total"]
                            print(colored(f"Dust Claimed: {dust_total}", 'cyan'))
                    
                    input(colored("\nPress Enter to return to the main menu...", 'yellow'))
                    
                except Exception as e:
                    print(colored(f"\n❌ Error during claiming process: {e}", 'red'))
                    input(colored("\nPress Enter to return to the main menu...", 'yellow'))
            
            continue
            
        elif action == "preview_potions":
            # Preview potion selection UI
            print(colored("\n🧪 POTION SELECTION PREVIEW MODE 🧪", 'magenta', attrs=['bold']))
            print(colored("This shows you what potions you have available and lets you test the selection UI.", 'cyan'))
            print(colored("No actual dungeon run will be started.\n", 'yellow'))
            
            try:
                selected_potions = ui_manager.display_potion_selection_menu(api_manager)
                
                print(colored("\n🎯 PREVIEW RESULTS:", 'green', attrs=['bold']))
                print(colored(f"Selected potion IDs: {selected_potions}", 'cyan'))
                print(colored("When you start a real dungeon run, you'll see this same UI.", 'yellow'))
                
            except Exception as e:
                print(colored(f"❌ Error during potion preview: {e}", 'red'))
            
            input(colored("\nPress Enter to return to the main menu...", 'yellow'))
            continue
            
        elif action == "fishing":
            # Fishing game mode - ask for how many sessions
            run_count = ui_manager.display_run_options()
            
            try:
                fishing_game_manager.play_fishing_session(run_count)
                
                # Display session stats
                stats = fishing_game_manager.get_session_stats()
                print(colored("\n🎣 FISHING SESSION COMPLETE", 'cyan', attrs=['bold']))
                print(colored(f"Games played: {stats['games_played']}", 'white'))
                print(colored(f"Fish caught: {stats['total_fish_caught']}", 'green'))
                
                # Display individual fish caught
                if stats.get('fish_caught'):
                    print(colored("🐟 Fish Details:", 'cyan', attrs=['bold']))
                    for i, fish in enumerate(stats['fish_caught'], 1):
                        rarity_color = 'white' if fish['rarity'] == 0 else 'green' if fish['rarity'] == 1 else 'yellow' if fish['rarity'] == 2 else 'magenta'
                        print(colored(f"  {i}. {fish['name']} (Rarity: {fish['rarity']}, Quality: {fish['quality']})", rarity_color))
                
                if stats['games_played'] > 0:
                    print(colored(f"Win rate: {stats['win_rate']:.1f}%", 'yellow'))
                
            except Exception as e:
                print(colored(f"❌ Error in fishing mode: {e}", 'red'))
                logger.error(f"Fishing mode error: {e}")
            
            # Ask to return to main menu
            print("\n")
            if questionary.confirm("Return to main menu?", default=True, style=ui_manager.custom_style).ask():
                continue
            else:
                print(colored("\nThank you for using the Gigaverse Dungeon Crawler Bot. Goodbye!", 'magenta'))
                break
            
        elif action in ["normal", "gigus", "underhaul"]:
            # Ask for how many runs
            run_count = ui_manager.display_run_options()
            
            if run_count == 1:
                # Single run - use existing play_game method
                game_manager.play_game(action)
            else:
                # Multiple runs or until energy depletes
                game_manager.play_multiple_games(action, run_count)
            
            # Ask to return to main menu
            print("\n")
            if questionary.confirm("Return to main menu?", default=True, style=ui_manager.custom_style).ask():
                continue
            else:
                print(colored("\nThank you for using the Gigaverse Dungeon Crawler Bot. Goodbye!", 'magenta'))
                break

if __name__ == "__main__":
    random.seed(time.time())
    main()
