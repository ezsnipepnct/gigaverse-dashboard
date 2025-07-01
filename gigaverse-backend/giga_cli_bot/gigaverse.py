import random
import time
import questionary
from termcolor import colored

# Import modules
from api_manager import ApiManager
from state_manager import StateManager
from loot_manager import LootManager
from ui_manager import UiManager
from game_manager import GameManager
import claim_manager

# API configuration
TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJhZGRyZXNzIjoiMHhiMGQ5MEQ1MkM3Mzg5ODI0RDRCMjJjMDZiY2RjQ0Q3MzRFMzE2MmI3IiwidXNlciI6eyJfaWQiOiI2N2I5MjE1YTEwOGFlZGRiNDA5YTdlNzMiLCJ3YWxsZXRBZGRyZXNzIjoiMHhiMGQ5MGQ1MmM3Mzg5ODI0ZDRiMjJjMDZiY2RjY2Q3MzRlMzE2MmI3IiwidXNlcm5hbWUiOiIweGIwZDkwRDUyQzczODk4MjRENEIyMmMwNmJjZGNDRDczNEUzMTYyYjciLCJjYXNlU2Vuc2l0aXZlQWRkcmVzcyI6IjB4YjBkOTBENTJDNzM4OTgyNEQ0QjIyYzA2YmNkY0NENzM0RTMxNjJiNyIsIl9fdiI6MH0sImdhbWVBY2NvdW50Ijp7Im5vb2IiOnsiX2lkIjoiNjdiOTIxNzRlM2MzOWRjYTZmZGFkZjA5IiwiZG9jSWQiOiIyMTQyNCIsInRhYmxlTmFtZSI6IkdpZ2FOb29iTkZUIiwiTEFTVF9UUkFOU0ZFUl9USU1FX0NJRCI6MTc0MDE4NTk2NCwiY3JlYXRlZEF0IjoiMjAyNS0wMi0yMlQwMDo1OTozMi45NDZaIiwidXBkYXRlZEF0IjoiMjAyNS0wMi0yMlQwMDo1OTozMy4xNjVaIiwiTEVWRUxfQ0lEIjoxLCJJU19OT09CX0NJRCI6dHJ1ZSwiSU5JVElBTElaRURfQ0lEIjp0cnVlLCJPV05FUl9DSUQiOiIweGIwZDkwZDUyYzczODk4MjRkNGIyMmMwNmJjZGNjZDczNGUzMTYyYjcifSwiYWxsb3dlZFRvQ3JlYXRlQWNjb3VudCI6dHJ1ZSwiY2FuRW50ZXJHYW1lIjp0cnVlLCJub29iUGFzc0JhbGFuY2UiOjAsImxhc3ROb29iSWQiOjczODg0LCJtYXhOb29iSWQiOjEwMDAwfSwiZXhwIjoxNzUwMTE2NDMxfQ.M26R6pDnFSSIbMXHa6kOhT_Hrjn3U7nkm_sGv0rY0uY"

def main():
    # Initialize managers
    api_manager = ApiManager(TOKEN)
    state_manager = StateManager()
    loot_manager = LootManager()
    ui_manager = UiManager()
    game_manager = GameManager(api_manager, state_manager, loot_manager, ui_manager)
    
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
