import questionary
from termcolor import colored
from questionary import prompt, Choice
from prompt_toolkit.styles import Style

class UiManager:
    def __init__(self):
        # Custom style for questionary
        self.custom_style = Style.from_dict({
            'questionmark': '#E91E63 bold',
            'selected': '#673AB7 bold',
            'pointer': '#673AB7 bold',
            'answer': '#2196F3 bold',
            'question': 'cyan bold',
        })
    
    def display_main_menu(self):
        """Display the main menu with options for different game functionalities"""
        print(colored("\n" + "="*60, 'cyan'))
        print(colored("🎮 GIGAVERSE DUNGEON CRAWLER BOT 🎮".center(60), 'cyan', attrs=['bold']))
        print(colored("="*60 + "\n", 'cyan'))
        
        questions = [
            {
                'type': 'select',
                'name': 'action',
                'message': 'What would you like to do?',
                'choices': [
                    Choice(title="Play Normal Mode (Floor 1-4)", value="normal"),
                    Choice(title="Play Gigus Mode (More Difficult)", value="gigus"),
                    Choice(title="Play Underhaul Mode", value="underhaul"),
                    Choice(title="Claim Resources", value="claim"),
                    Choice(title="Settings", value="settings"),
                    Choice(title="Quit", value="quit")
                ]
            }
        ]
        answers = prompt(questions, style=self.custom_style)
        return answers.get('action', 'quit')
    
    def display_run_options(self):
        """Display options for how many runs to perform"""
        print(colored("\n" + "="*60, 'cyan'))
        print(colored("🔄 RUN OPTIONS 🔄".center(60), 'cyan', attrs=['bold']))
        print(colored("="*60 + "\n", 'cyan'))
        
        questions = [
            {
                'type': 'select',
                'name': 'run_option',
                'message': 'How many runs would you like to perform?',
                'choices': [
                    Choice(title="Single Run", value="single"),
                    Choice(title="Run 5 Times", value="5"),
                    Choice(title="Run 10 Times", value="10"),
                    Choice(title="Custom Number of Runs", value="custom"),
                    Choice(title="Run Until Energy Depletes", value="until_depleted")
                ]
            }
        ]
        
        run_option = prompt(questions, style=self.custom_style).get('run_option', 'single')
        
        # If custom option selected, ask for number
        if run_option == "custom":
            run_count = questionary.text(
                "How many runs?",
                default="3",
                validate=lambda text: text.isdigit() and int(text) > 0,
                style=self.custom_style
            ).ask()
            return int(run_count)
        
        # Convert string options to integers
        if run_option.isdigit():
            return int(run_option)
        
        # Special cases
        if run_option == "single":
            return 1
        elif run_option == "until_depleted":
            return -1  # Special value for "until energy depletes"
        
        return 1  # Default to single run
    
    def display_claim_menu(self):
        """Display menu for claiming resources"""
        print(colored("\n" + "="*60, 'cyan'))
        print(colored("📦 RESOURCE CLAIMING MENU 📦".center(60), 'cyan', attrs=['bold']))
        print(colored("="*60 + "\n", 'cyan'))
        
        questions = [
            {
                'type': 'select',
                'name': 'resource_type',
                'message': 'What resources would you like to claim?',
                'choices': [
                    Choice(title="All Resources (Energy, Shards, Dust)", value="all"),
                    Choice(title="Energy Only", value="energy"),
                    Choice(title="Shards Only", value="shards"),
                    Choice(title="Dust Only", value="dust"),
                    Choice(title="Back to Main Menu", value="back")
                ]
            }
        ]
        resource_type = prompt(questions, style=self.custom_style).get('resource_type', 'back')
        
        if resource_type != "back" and resource_type in ["all", "energy"]:
            energy_threshold = questionary.text(
                "Energy threshold (stop after claiming this much):",
                default="200",
                validate=lambda text: text.isdigit() and int(text) > 0,
                style=self.custom_style
            ).ask()
            return resource_type, int(energy_threshold)
        
        return resource_type, 200  # Default threshold
    
    def display_settings_menu(self):
        """Display settings menu with customization options"""
        iterations = questionary.text(
            "MCTS Iterations (default: 50000):",
            default="50000",
            validate=lambda text: text.isdigit() and int(text) > 0,
            style=self.custom_style
        ).ask()
        
        sim_iterations = questionary.text(
            "Loot Simulation Iterations (default: 100):",
            default="100",
            validate=lambda text: text.isdigit() and int(text) > 0,
            style=self.custom_style
        ).ask()
        
        settings = {
            'mcts_iterations': int(iterations),
            'sim_iterations': int(sim_iterations)
        }
        
        print(colored(f"\nSettings updated:", 'green'))
        print(colored(f"  MCTS Iterations: {settings['mcts_iterations']}", 'cyan'))
        print(colored(f"  Loot Simulation Iterations: {settings['sim_iterations']}", 'cyan'))
        
        return settings
    
    def display_player_status(self, state_data):
        """Display player health and shield status"""
        print(colored(f"\nPlayer Status:", 'magenta'))
        print(colored(f"  ❤️ Health: {state_data['player_health']}/{state_data['player_max_health']}", 'red'))
        print(colored(f"  🛡️ Shield: {state_data['player_shield']}/{state_data['player_max_shield']}", 'blue'))
        
        health_ratio = state_data['player_health'] / state_data['player_max_health']
        if health_ratio < 0.3:
            print(colored(f"  ⚠️ WARNING: Health critically low ({health_ratio*100:.1f}%)", 'red', attrs=['bold']))
        elif health_ratio < 0.5:
            print(colored(f"  ⚠️ Health low ({health_ratio*100:.1f}%)", 'yellow'))
    
    def display_move_charges(self, charges):
        """Display move charges"""
        print(colored("\nMove Charges:", 'yellow'))
        print(colored(f"  🪨 Rock: {charges['rock']}/3", 'yellow'))
        print(colored(f"  📄 Paper: {charges['paper']}/3", 'yellow'))
        print(colored(f"  ✂️ Scissor: {charges['scissor']}/3", 'yellow'))
    
    def display_move_stats(self, move_stats):
        """Display move damage and shield stats"""
        print(colored("\nMove Stats:", 'cyan'))
        for move, stats in move_stats.items():
            symbol = "🪨" if move == "rock" else "📄" if move == "paper" else "✂️"
            print(colored(f"  {symbol} {move.capitalize()}: {stats['damage']} DMG, {stats['shield']} Shield", 'cyan'))