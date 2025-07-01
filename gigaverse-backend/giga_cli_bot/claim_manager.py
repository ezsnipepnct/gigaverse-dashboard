import requests
import time
from termcolor import colored

# Set your wallet address here - this is the only change
WALLET_ADDRESS = "0xb0d90D52C7389824D4B22c06bcdcCD734E3162b7"  # Change this to your wallet address

def get_sorted_roms(headers):
    """Fetch and sort ROMs by energy (highest first)"""
    # Override the wallet address extraction to use the variable
    wallet_address = WALLET_ADDRESS
    
    url = f"https://gigaverse.io/api/roms/player/{wallet_address.lower()}"
    print(colored(f"Fetching ROMs for wallet: {wallet_address}", "cyan"))
    
    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        print(colored(f"Failed to fetch ROM data: {response.status_code}", "red"))
        return []
    
    data = response.json()
    roms = []
    for entity in data.get("entities", []):
        stats = entity.get("factoryStats", {})
        rom = {
            "RomID": entity.get("docId"),
            "Energy": stats.get("energyCollectable", 0),
            "Dust": stats.get("dustCollectable", 0),
            "Shards": stats.get("shardCollectable", 0)
        }
        roms.append(rom)
    
    # Changed from ascending to descending order (highest energy first)
    sorted_roms = sorted(roms, key=lambda x: x["Energy"] if x["Energy"] is not None else 0, reverse=True)
    return sorted_roms

def claim_energy(headers, sorted_roms, threshold=200):
    """Claim energy until threshold is reached"""
    url = "https://gigaverse.io/api/roms/factory/claim"
    total_claimed = 0
    claimed_roms = []
    
    print(colored("\n=== Claiming Energy ===", "cyan"))
    
    for rom in sorted_roms:
        energy = rom.get("Energy", 0)
        if energy < 10:  # Skip if energy is too low
            print(colored(f"  Skipping ROM {rom['RomID']} (energy: {energy}) - below minimum threshold.", "yellow"))
            continue
        
        if total_claimed >= threshold:
            print(colored(f"  Reached energy threshold ({threshold}). Stopping claims.", "green"))
            break
        
        rom_id = rom["RomID"]
        payload = {"romId": rom_id, "claimId": "energy"}
        
        print(colored(f"  Claiming energy from ROM {rom_id} ({energy} energy)...", "cyan"))
        
        try:
            r = requests.post(url, headers=headers, json=payload)
            time.sleep(1)  # Delay between requests
            
            if r.status_code == 200 and r.json().get("success"):
                print(colored(f"  ✅ Claimed {energy} energy from ROM {rom_id}", "green"))
                total_claimed += energy
                claimed_roms.append({"id": rom_id, "amount": energy})
            else:
                print(colored(f"  ❌ Failed to claim energy from ROM {rom_id}: {r.status_code}", "red"))
        except Exception as e:
            print(colored(f"  ❌ Error claiming energy from ROM {rom_id}: {e}", "red"))
    
    print(colored(f"\nTotal energy claimed: {total_claimed}", "green", attrs=["bold"]))
    
    return {"total": total_claimed, "claimed_roms": claimed_roms}

def claim_shards(headers, sorted_roms):
    """Claim all available shards"""
    url = "https://gigaverse.io/api/roms/factory/claim"
    total_claimed = 0
    claimed_roms = []
    
    print(colored("\n=== Claiming Shards ===", "cyan"))
    
    for rom in sorted_roms:
        shards = rom.get("Shards", 0)
        if shards <= 0:
            continue
        
        rom_id = rom["RomID"]
        payload = {"romId": rom_id, "claimId": "shard"}
        
        print(colored(f"  Claiming shards from ROM {rom_id} ({shards} shards)...", "cyan"))
        
        try:
            r = requests.post(url, headers=headers, json=payload)
            time.sleep(1)  # Delay between requests
            
            if r.status_code == 200 and r.json().get("success"):
                print(colored(f"  ✅ Claimed {shards} shards from ROM {rom_id}", "green"))
                total_claimed += shards
                claimed_roms.append({"id": rom_id, "amount": shards})
            else:
                print(colored(f"  ❌ Failed to claim shards from ROM {rom_id}: {r.status_code}", "red"))
        except Exception as e:
            print(colored(f"  ❌ Error claiming shards from ROM {rom_id}: {e}", "red"))
    
    print(colored(f"\nTotal shards claimed: {total_claimed}", "green", attrs=["bold"]))
    
    return {"total": total_claimed, "claimed_roms": claimed_roms}

def claim_dust(headers, sorted_roms):
    """Claim all available dust"""
    url = "https://gigaverse.io/api/roms/factory/claim"
    total_claimed = 0
    claimed_roms = []
    
    print(colored("\n=== Claiming Dust ===", "cyan"))
    
    for rom in sorted_roms:
        dust = rom.get("Dust", 0)
        if dust <= 0:
            continue
        
        rom_id = rom["RomID"]
        payload = {"romId": rom_id, "claimId": "dust"}
        
        print(colored(f"  Claiming dust from ROM {rom_id} ({dust} dust)...", "cyan"))
        
        try:
            r = requests.post(url, headers=headers, json=payload)
            time.sleep(1)  # Delay between requests
            
            if r.status_code == 200 and r.json().get("success"):
                print(colored(f"  ✅ Claimed {dust} dust from ROM {rom_id}", "green"))
                total_claimed += dust
                claimed_roms.append({"id": rom_id, "amount": dust})
            else:
                print(colored(f"  ❌ Failed to claim dust from ROM {rom_id}: {r.status_code}", "red"))
        except Exception as e:
            print(colored(f"  ❌ Error claiming dust from ROM {rom_id}: {e}", "red"))
    
    print(colored(f"\nTotal dust claimed: {total_claimed}", "green", attrs=["bold"]))
    
    return {"total": total_claimed, "claimed_roms": claimed_roms}

def claim_resources(headers, resource_type="all", energy_threshold=200):
    """Main function to claim resources"""
    print(colored("\n" + "="*60, "cyan"))
    print(colored("📦 RESOURCE CLAIMING PROCESS 📦".center(60), "cyan", attrs=["bold"]))
    print(colored("="*60, "cyan"))
    
    print(colored("\nFetching ROM data...", "cyan"))
    sorted_roms = get_sorted_roms(headers)
    
    if not sorted_roms:
        print(colored("❌ No ROM data available or could not access ROM data.", "red"))
        return {"error": "No ROM data available"}
    
    print(colored(f"✅ Found {len(sorted_roms)} ROMs", "green"))
    
    results = {}
    
    if resource_type in ["all", "energy"]:
        energy_result = claim_energy(headers, sorted_roms, energy_threshold)
        results["energy"] = energy_result
    
    if resource_type in ["all", "shards"]:
        shards_result = claim_shards(headers, sorted_roms)
        results["shards"] = shards_result
    
    if resource_type in ["all", "dust"]:
        dust_result = claim_dust(headers, sorted_roms)
        results["dust"] = dust_result
    
    print(colored("\n" + "="*60, "cyan"))
    print(colored("📦 CLAIMING PROCESS COMPLETE 📦".center(60), "green", attrs=["bold"]))
    print(colored("="*60, "cyan"))
    
    return results

if __name__ == "__main__":
    # When running as a standalone script, ask for headers
    print(colored("\n" + "="*60, "magenta"))
    print(colored("📦 GIGAVERSE RESOURCE CLAIMER 📦".center(60), "magenta", attrs=["bold"]))
    print(colored("="*60, "magenta"))
    
    print(colored(f"\nUsing wallet address: {WALLET_ADDRESS}", "cyan"))
    
    # Simple headers for standalone usage
    headers = {
        "accept": "*/*",
        "content-type": "application/json",
        "authorization": "Bearer YOUR_TOKEN_HERE"  # Replace with your token if running standalone
    }
    
    # Ask what resources to claim
    print(colored("\nWhat resources would you like to claim?", "cyan"))
    print(colored("1. All Resources (Energy, Shards, Dust)", "cyan"))
    print(colored("2. Energy Only", "cyan"))
    print(colored("3. Shards Only", "cyan"))
    print(colored("4. Dust Only", "cyan"))
    
    choice = input(colored("Enter your choice (1-4): ", "yellow"))
    
    resource_map = {
        "1": "all",
        "2": "energy",
        "3": "shards",
        "4": "dust"
    }
    
    resource_type = resource_map.get(choice, "all")
    
    # For energy, ask for threshold
    threshold = 200
    if resource_type in ["all", "energy"]:
        threshold_input = input(colored("Energy threshold (default: 200): ", "yellow"))
        if threshold_input.strip() and threshold_input.isdigit():
            threshold = int(threshold_input)
    
    # Claim resources
    claim_resources(headers, resource_type, threshold)
