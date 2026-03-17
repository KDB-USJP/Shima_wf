import json
import secrets
from pathlib import Path

def regenerate():
    print("--- Shima Security: Seed Regeneration Utility ---")
    
    settings_path = Path(__file__).parent / "config" / "shima_settings.json"
    
    if not settings_path.exists():
        print(f"Error: {settings_path} not found.")
        return

    try:
        with open(settings_path, "r", encoding="utf-8") as f:
            settings = json.load(f)
        
        old_seed = settings.get("_sys_seed", "none")
        new_seed = secrets.token_hex(16)
        
        settings["_sys_seed"] = new_seed
        
        with open(settings_path, "w", encoding="utf-8") as f:
            json.dump(settings, f, indent=4)
            
        print(f"SUCCESS: Obfuscation seed regenerated.")
        print(f"Old seed: {old_seed[:8]}...")
        print(f"New seed: {new_seed[:8]}...")
        print("\nIMPORTANT: Existing workflows in islands.db are now unreadable.")
        print("You must re-sync them from the website or your local backups.")
        
    except Exception as e:
        print(f"FAILED: {e}")

if __name__ == "__main__":
    regenerate()
