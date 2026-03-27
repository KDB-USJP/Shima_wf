import torch

class ShimaCrystalBall:
    """
    High-fidelity preview node with custom "Crystal Ball" and "Hologram" aesthetics.
    Provides a visual passthrough for images with animated emergence.
    """
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                " ": ("IMAGE",),
            },
            "optional": {
                "current_step": ("INT", {"default": 0, "min": 0, "max": 10000}),
                "total_steps": ("INT", {"default": 20, "min": 1, "max": 1000}),
                "mode": (["Hologram", "Panel"], {"default": "Hologram"}),
                "shape": (["Sphere", "Rounded Rectangle"], {"default": "Sphere"}),
                "glow_color": ("STRING", {"default": "#0088ff"}),
            },
        }

    RETURN_TYPES = ("IMAGE",)
    RETURN_NAMES = (" ",)
    FUNCTION = "execute"
    CATEGORY = "Shima/Design"
    OUTPUT_NODE = True

    def execute(self, current_step=0, total_steps=20, mode="Hologram", shape="Sphere", glow_color="#0088ff", **kwargs):
        # The image input is named " " (space) for minimal UI, grab it from kwargs
        image = kwargs.get(" ")
        if image is None:
            # Fallback: no image connected
            return {"ui": {"images": []}, "result": (torch.zeros(1, 64, 64, 3),)}
            
        try:
            import os
            import random
            import string
            import numpy as np
            from PIL import Image
            import folder_paths

            results = list()
            output_dir = folder_paths.get_temp_directory()
            
            # Save the high-resolution image to a temp file for the UI to display
            for (batch_number, img) in enumerate(image):
                i = 255. * img.cpu().numpy()
                img_pil = Image.fromarray(np.clip(i, 0, 255).astype(np.uint8))
                
                filename = f"shima_ball_{''.join(random.choices(string.ascii_letters + string.digits, k=8))}.png"
                img_path = os.path.join(output_dir, filename)
                img_pil.save(img_path, pnginfo=None, compress_level=4)
                
                results.append({
                    "filename": filename,
                    "subfolder": "",
                    "type": "temp"
                })
                
            return {"ui": {"images": results}, "result": (image,)}
            
        except Exception as e:
            print(f"[ShimaCrystalBall] Error saving high-res preview: {e}")
            return {"ui": {"images": []}, "result": (image,)}

NODE_CLASS_MAPPINGS = {
    "Shima.CrystalBall": ShimaCrystalBall
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "Shima.CrystalBall": "Shima Crystal Ball"
}
