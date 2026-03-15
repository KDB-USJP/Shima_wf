import importlib
import sys
import os

# Dynamic import to satisfy IDE linters while maintaining cross-environment resilience
def _get_shima_settings():
    # Attempt to find settings_utils through various paths
    # We use importlib to avoid hardcoded imports that trigger linter 'missing' errors
    search_paths = [
        "Shima.utils.settings_utils",
        "utils.settings_utils",
        "..utils.settings_utils"
    ]
    
    for path in search_paths:
        try:
            # For relative paths (starting with .), we need to handle the package context
            if path.startswith("."):
                # Use a safe way to get the package name without triggering name errors
                pkg = globals().get("__package__")
                if pkg:
                    module = importlib.import_module(path, pkg)
                    return module.ShimaSettings
                continue
                
            module = importlib.import_module(path)
            return module.ShimaSettings
        except (ImportError, ValueError):
            continue

    # 3. Last resort: manual path injection
    try:
        base_path = os.path.dirname(os.path.dirname(__file__))
        if base_path not in sys.path:
            sys.path.append(base_path)
        module = importlib.import_module("utils.settings_utils")
        return module.ShimaSettings
    except ImportError:
        pass

    # Final fallback - absolute minimal class to prevent total crash
    class MockSettings:
        @staticmethod
        def get_asset_packs(): return {}
        @staticmethod
        def get_user_config(): return {}
    return MockSettings

ShimaSettings = _get_shima_settings()

class ShimaHub:
    """
    Central hub for Shima settings, asset management, and subscription status.
    This node doesn't 'do' anything in the workflow; it's a UI anchor for the Shima Bootstrap system.
    """
    @classmethod
    def INPUT_TYPES(cls):
        # Fetch dynamic packs from settings
        packs = list(ShimaSettings.get_asset_packs().keys())
        if not packs:
            packs = ["Standard"]
            
        return {
            "required": {
                "active_style_thumbnails": (packs, {"default": packs[0]}),
                "auto_update": ("BOOLEAN", {"default": True}),
            },
            "optional": {
                "custom_download_url": ("STRING", {"default": ""}),
            }
        }

    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("STATUS",)
    FUNCTION = "get_status"
    CATEGORY = "Shima/Panels"

    def get_status(self, active_style_thumbnails, auto_update, custom_download_url=""):
        # The node input acts as a local override or selection, 
        # but the global setting is the 'Active Style Thumbnail Pack' in main settings.
        user_config = ShimaSettings.get_user_config()
        global_pack = user_config.get("active_thumbnail_pack", active_style_thumbnails)
        
        # Determine if we are using the global or node-specific override
        current_pack = global_pack if global_pack else active_style_thumbnails
        
        status = f"Active Pack: {current_pack} (INSTALLED)"
        if auto_update:
            status += " | Auto-Update: Enabled"
            
        return (status,)

NODE_CLASS_MAPPINGS = {
    "Shima.Hub": ShimaHub
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "Shima.Hub": "Shima Setup Hub"
}
