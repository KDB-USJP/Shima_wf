import torch

class ShimaDymoLabel:
    """
    Embossed plastic label node with high-fidelity tooltip support.
    """
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "text": ("STRING", {"default": "LABEL", "multiline": True}),
                "base_color": ("STRING", {"default": "#000000"}),
                "font_size": ("INT", {"default": 18, "min": 10, "max": 40}),
                "jitter": ("BOOLEAN", {"default": True}),
            },
            "optional": {
                "tooltip": ("STRING", {"default": "", "multiline": True}),
                "tooltip_type": (["Text", "Markdown", "HTML"], {"default": "Text"}),
            }
        }
    
    RETURN_TYPES = ()
    FUNCTION = "execute"
    CATEGORY = "Shima/Design"

    def execute(self, **kwargs):
        # All rendering is handled on the frontend via shima_dymo.js
        return ()

NODE_CLASS_MAPPINGS = {
    "Shima.DymoLabel": ShimaDymoLabel
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "Shima.DymoLabel": "Shima Dymo Label"
}
