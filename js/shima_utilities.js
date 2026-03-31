import { app } from "../../scripts/app.js";
import { disableUEForInputs } from "./ue_helper.js";

/**
 * Shima Utility Nodes - Frontend Extension
 * Handles UE_unconnectable logic to prevent recursion/conflicts
 */

// --- Shima Theme Defaults (Fallback) ---
const SHIMA_PALETTE = {
    "loaders": "#9ba59b",
    "models": "#191919",
    "vae": "#191919",
    "samplers": "#9ba59b",
    "latents": "#eecdec",
    "conditioning": "#191919",
    "clip": "#191919",
    "controlnet": "#191919",
    "images": "#191919",
    "masks": "#191919",
    "upscale": "#191919",
    "prompts_pos": "#1a571a",
    "prompts_neg": "#571a1a",
    "primitives": "#191919",
    "switches": "#14ff3c",
    "reroutes": "#191919",
    "utility": "#eab114",
    "notes": "#1474af",
    "notes_warning": "#d13438",
    "notes_attention": "#ffcc00",
    "notes_info": "#1474af",
    "transparent": "transparent",
    "neutral_light": "#191919",
    "neutral_dark": "#191919",
    "pipes": "#191919",
    "fx": "#191919",
    "passers": "#191919",
    "commons": "#191919",
    "output": "#191919",
    "3d": "#191919",
    "video": "#191919",
    "utilities": "#191919",
    "stylers": "#191919",
    "loras": "#191919",
    "controlnets": "#191919",
    "automation": "#191919",
    "flowcontrol": "#191919",
    "math": "#191919",
    "sigmas": "#191919",
    "segments": "#191919",
    "audio": "#191919",
    "api": "#191919",
    "debug": "#191919"
};

// --- Shima Theme & Coloring ---
if (!window.SHIMA_THEME) {
    window.SHIMA_THEME = {
        active_palette: "Standard",
        palettes: {},
        palette: {}, // Currently active node colors
        _overrides_applied: false
    };
}

/**
 * Core mapping of Shima node types to color categories.
 * Edit this object to change which nodes belong to which color group.
 */
const NODE_CATEGORY_MAP = {
    // Models & Lora
    "Shima.ModelCitizen": "models",
    "Shima.LoraStack": "loras",
    "Shima.LoraLoader": "loras",

    // Samplers
    "Shima.Sampler": "samplers",
    "Shima.SamplerCommons": "samplers",
    "Shima.SamplerCommonsPasser": "passers",
    "Shima.PhotoRemix": "samplers",

    // Latents
    "Shima.LatentMaker": "latents",

    // Loaders & Savers
    "Shima.FileNamer": "loaders",
    "Shima.FileSaver": "loaders",
    "Shima.MultiSaver": "output",
    "Shima.Loader": "loaders",

    // Conditionings & Prompts
    "Shima.MasterPrompt": "conditioning",
    "Shima.CLIPTextEncode": "clip",
    "Shima.PromptPositive": "prompts_pos",
    "Shima.PromptNegative": "prompts_neg",

    // Notes & Content
    "Shima.RichText": "notes",
    "Shima.Markdown": "notes",
    "Shima.Inspector": "debug",
    "Shima.Note": "notes",
    "Note": "notes",

    // ControlNets & Automation
    "Shima.ControlAgent": "controlnets",
    "Shima.PanelControlAgent": "controlnets",

    // Utility & logic
    "Shima.SmartReroute": "reroutes",
    "Shima.Preview": "utilities",
    "Shima.PreviewCompare": "utilities",
    "Shima.CarouselPreview": "utilities",
    "Shima.SeedLogger": "automation",
    "Shima.SeedController": "automation",
    "Shima.BatchImageProcessor": "images",
    "Shima.WorkflowImage": "images",
    "Shima.ChoiceSwitch": "switches",
    "Shima.StyleSelector": "stylers",
    "Shima.StyleIterator": "stylers",
    "Shima.StyleGallery": "stylers",
    "Shima.StyleFavorites": "stylers",

    // Pure nodes (Should be bypassed naturally, but mapped for edge cases)
    "Shima.Sticker": "transparent",
    "Shima.Headline": "transparent"
};

/**
 * Apply a visual palette to Shima nodes and islands
 * Focuses on node coloring and group title visibility
 * @param {string} paletteName - Key from site_default_settings.json
 */
/**
 * Synchronizes the visual palette state with the chosen theme name.
 */
window.applyPalette = function (themeName) {
    if (!themeName || !window.SHIMA_THEME?.palettes) return;

    const theme = window.SHIMA_THEME.palettes[themeName] || (themeName === "Standard" ? { node: SHIMA_PALETTE } : null);
    if (theme) {
        console.log(`[Shima] Updating Active Palette to: ${themeName}`);

        // 1. Update active node palette for NEW nodes
        window.SHIMA_THEME.palette = theme.node || theme;
        window.SHIMA_THEME.active_palette = themeName;

        // 2. Sync EXISTING groups on canvas (Islands are part of the environment theme)
        if (app.canvas?.graph?._groups) {
            const islandColor = theme.node?.islands || "#222222";
            app.canvas.graph._groups.forEach(group => {
                if (group.title && group.title.startsWith("Shima.")) {
                    group.color = islandColor;
                }
            });
            app.canvas.draw(true, true);
        }
    }
};

/**
 * Identify node category and apply color from current palette.
 * Only applies if color is currently default/missing.
 */
function recolorNode(node, force = false) {
    // 1. Respect Existing Colors: If node already has a custom color, don't touch it
    function isDefaultColor(color) {
        if (!color) return true;

        // Handle array [r, g, b] (standard for native nodes)
        if (Array.isArray(color)) {
            // Neutral greys usually have R≈G≈B. Check if they are all close to each other
            // and within a reasonable "dark grey" range (usually 0.1-0.3 or 25-80)
            const r = color[0] > 1 ? color[0] / 255 : color[0];
            const g = color[1] > 1 ? color[1] / 255 : color[1];
            const b = color[2] > 1 ? color[2] / 255 : color[2];

            // Check if it's a "Grey" (low variance between channels)
            const diff = Math.max(r, g, b) - Math.min(r, g, b);
            if (diff > 0.05) return false; // Too much color to be "default grey"

            // Is it in the neutral dark zone?
            return (r >= 0.05 && r <= 0.4);
        }

        if (typeof color === "string") {
            const hex = color.toLowerCase();
            return hex === "#222" || hex === "#222222" ||
                hex === "#333" || hex === "#333333" ||
                hex === "#111" || hex === "#111111" ||
                hex === "#2a2a2a" || hex === "#3a3a3a";
        }
        return false;
    }

    if (node.shima_ignore_color && !force) return;
    if (!isDefaultColor(node.color) && !force) return;

    const palette = window.SHIMA_THEME?.palette;
    if (!palette) return;

    const type = node.comfyClass || node.type;
    if (!type) return;

    // 1. Precise Mapping (Shima Specific)
    let colorKey = NODE_CATEGORY_MAP[type];

    // 2. Fuzzy Fallback (For 3rd party nodes or new Shima nodes)
    if (!colorKey) {
        if (type.includes("Loader")) colorKey = "loaders";
        else if (type.includes("Model") || type.includes("Checkpoint")) colorKey = "models";
        else if (type.includes("Lora")) colorKey = "loras";
        else if (type.includes("VAE")) colorKey = "vae";
        else if (type.includes("Sampler") || type.includes("KSampler")) colorKey = "samplers";
        else if (type.includes("Latent")) colorKey = "latents";
        else if (type.includes("Conditioning")) colorKey = "conditioning";
        else if (type.includes("CLIP")) colorKey = "clip";
        else if (type.includes("Positive")) colorKey = "prompts_pos";
        else if (type.includes("Negative")) colorKey = "prompts_neg";
        else if (type.includes("Face") || type.includes("Segment") || type.includes("Mask")) colorKey = "masks";
        else if (type.includes("Switch") || type.includes("Router")) colorKey = "switches";
        else if (type.includes("Concat") || type.includes("Split")) colorKey = "utilities";
        else if (type.includes("Image")) colorKey = "images";
        else if (type.includes("Video")) colorKey = "video";
        else if (type.includes("Audio")) colorKey = "audio";
        else if (type.includes("Pipe")) colorKey = "pipes";
        else if (type.includes("Math") || type.includes("Number")) colorKey = "math";
        else if (type.includes("ControlNet")) colorKey = "controlnets";
        else if (type.includes("Content") || type.includes("Display")) colorKey = "notes";
    }

    if (!colorKey) return;

    const funcColor = node.shima_custom_color || palette[colorKey];
    if (funcColor && typeof funcColor === "string" && !funcColor.startsWith("(")) {
        
        // PURE UI EXCLUSION BLOCK - Never color these nodes
        const PURE_NODES = ["Shima.Sticker", "Shima.NoodmanSticker", "Shima.CrystalBall", "Shima.Headline", "Shima.Omnijog", "Shima.Fader", "Shima.Knob", "Shima.Demux", "Shima.DemuxList", "Shima.PilotLight", "Shima.RGBIndicator", "Shima.Backdrop", "Shima.RichDisplay", "Shima.Breaker"];
        if (PURE_NODES.includes(type) || colorKey === "transparent") return;

        // Fetch user setting
        const colorMode = app.ui.settings.getSettingValue("Shima.Colors_NodeColorMode") || "Full Color";
        const neutralDark = palette["neutral_dark"] || "#222222";

        // ALWAYS RESET to ensure cleanly switching modes
        node.color = LiteGraph.NODE_DEFAULT_COLOR || "#333";
        node.bgcolor = LiteGraph.NODE_DEFAULT_BGCOLOR || "#222";
        node.title_color = LiteGraph.NODE_TEXT_COLOR || "#fff";

        // Core Full-Color or Stealth Assignments
        if (colorMode === "Full Color") {
            node.color = funcColor;
            node.bgcolor = funcColor;
            
            // Ensure stale explicit tier overrides from previous runs are cleaned up
            delete node.shima_text_tier_color;
            node.title_mode = LiteGraph.NORMAL_TITLE;
        } else if (colorMode === "Stealth (Dark Mode)") {
            node.color = neutralDark;
            node.bgcolor = neutralDark;
            node.properties = node.properties || {};
            node.properties.shima_stealth_text = funcColor;
            node.shima_text_tier_color = funcColor;
            node.title_mode = LiteGraph.NORMAL_TITLE;
        } else if (colorMode === "Stealth (Light Mode)") {
            const neutralLight = palette["neutral_light"] || "#dddddd";
            node.color = neutralLight;
            node.bgcolor = neutralLight;
            node.properties = node.properties || {};
            node.properties.shima_stealth_text = funcColor;
            node.shima_text_tier_color = funcColor;
            node.title_mode = LiteGraph.NORMAL_TITLE;
        } else {
            if (node.properties) delete node.properties.shima_stealth_text;
            delete node.shima_text_tier_color;
            node.title_mode = LiteGraph.NORMAL_TITLE;
        }
    }
}

/**
 * Get contrast color (black or white) for a given color
 */
function getContrastColor(color) {
    if (!color) return "#ffffff";
    let r, g, b;

    if (Array.isArray(color)) {
        // LiteGraph array [r, g, b] (usually 0-1)
        r = color[0] > 1 ? color[0] / 255 : color[0];
        g = color[1] > 1 ? color[1] / 255 : color[1];
        b = color[2] > 1 ? color[2] / 255 : color[2];
    } else if (typeof color === "string" && color.startsWith("#")) {
        let hex = color.replace("#", "");
        if (hex.length === 3) hex = hex.split("").map(c => c + c).join("");
        r = parseInt(hex.substring(0, 2), 16) / 255;
        g = parseInt(hex.substring(2, 4), 16) / 255;
        b = parseInt(hex.substring(4, 6), 16) / 255;
    } else if (typeof color === "string" && color.startsWith("rgb")) {
        const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (match) {
            r = parseInt(match[1]) / 255;
            g = parseInt(match[2]) / 255;
            b = parseInt(match[3]) / 255;
        }
    }

    if (isNaN(r) || isNaN(g) || isNaN(b)) return "#ffffff";

    // Luminance formula
    const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return L > 0.45 ? "#000000" : "#ffffff";
}

/**
 * Fetch palettes from backend
 */
window.fetchPalette = async function fetchPalette() {
    try {
        const cacheBuster = Date.now();
        console.log(`[Shima] Fetching palettes (cb=${cacheBuster})...`);
        const response = await fetch(`/shima/settings/get?t=${cacheBuster}`);
        if (response.ok) {
            const settings = await response.json();
            if (settings.themes?.palettes) {
                window.SHIMA_THEME.palettes = settings.themes.palettes;

                // Sync with current user setting (Palette dropdown in shima.js reads from SHIMA_THEME.palettes)
                let savedValue = app.ui.settings.getSettingValue("Shima.Colors_ActivePalette");
                if (savedValue === undefined || savedValue === null) savedValue = "Standard";
                applyPalette(savedValue);
            }
        }
    } catch (e) {
        console.error("[Shima] Error fetching settings:", e);
    }
}

// 1. Draw Node Override (Force Contrast for Readability)
const originalDrawNode = ensureOriginal(LGraphCanvas.prototype, "drawNode");
LGraphCanvas.prototype.drawNode = function (node, ctx) {
    // Determine base colors for contrast calculations
    const titleBaseColor = node.color || LGraphCanvas.node_colors.default?.color || "#222";
    const bodyBaseColor = node.bgcolor || LGraphCanvas.node_colors.default?.bgcolor || "#222";

    // Store original per-node colors to restore later
    const oldTitleColor = node.title_color;
    const oldTitleTextColor = node.title_text_color;
    const oldTextColor = LiteGraph.NODE_TEXT_COLOR;
    const oldSelectedTitleColor = LiteGraph.NODE_SELECTED_TITLE_COLOR;
    const oldCanvasTitleColor = this.node_title_color;

    const titleContrast = getContrastColor(titleBaseColor);
    const bodyContrast = getContrastColor(bodyBaseColor);

    // Fallback to natively saved properties dict if the memory cache is stale (e.g. F5 reloads)
    const stealthText = node.shima_text_tier_color || node.properties?.shima_stealth_text;

    // If stealth mode is active, FORCE all text (title + inputs) to perfectly match the semantic color natively.
    if (stealthText) {
        LiteGraph.NODE_TEXT_COLOR = stealthText;
        
        node.title_text_color = stealthText;
        node.title_color = stealthText;
        LiteGraph.NODE_SELECTED_TITLE_COLOR = stealthText;
        this.node_title_color = stealthText;
    } else {
        // Apply strict Global Contrast (Inputs & Options text readability depends purely on body background)
        LiteGraph.NODE_TEXT_COLOR = bodyContrast;

        // Apply strict Native Title Contrast (Title String overrides depend purely on header background)
        node.title_text_color = titleContrast;
        node.title_color = titleContrast;
        LiteGraph.NODE_SELECTED_TITLE_COLOR = titleContrast;
        this.node_title_color = titleContrast;
    }

    let result;
    try {
        result = originalDrawNode.apply(this, arguments);
    } catch (e) {
        console.error("[Shima] drawNode safety pass:", e);
    }

    // Restore original colors/strings immediately after render pass
    node.title_color = oldTitleColor;
    node.title_text_color = oldTitleTextColor;
    LiteGraph.NODE_TEXT_COLOR = oldTextColor;
    LiteGraph.NODE_SELECTED_TITLE_COLOR = oldSelectedTitleColor;
    this.node_title_color = oldCanvasTitleColor;

    return result;
};

/**
 * Helper for absolute idempotency: ensures we always have the "clean" original 
 * even if the script is re-evaluated multiple times.
 */
function ensureOriginal(proto, name) {
    const key = `__shima_original_${name}`;
    if (!proto[key]) {
        proto[key] = proto[name];
    }
    return proto[key];
}

// 2. Node Menu Logic (With Aggressive Deduplication)
const originalGetNodeMenuOptions = ensureOriginal(LGraphCanvas.prototype, "getNodeMenuOptions");
LGraphCanvas.prototype.getNodeMenuOptions = function (node) {
    let options = originalGetNodeMenuOptions.apply(this, arguments);
    if (!options) return options;

    const palette = window.SHIMA_THEME?.palette || {};
    if (Object.keys(palette).length > 0) {
        // Add separator
        options.push(null);

        options.push({
            content: "🏝️ Shima Colors",
            submenu: {
                options: Object.entries(palette).map(([key, value]) => {
                    return {
                        content: `<span style="display:inline-block; width:12px; height:12px; background-color:${value}; margin-right:8px; border:1px solid #555; vertical-align:middle;"></span>${key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' ')}`,
                        callback: () => {
                            // Tag the node with a manual explicit custom color override and re-trigger recolor
                            node.shima_custom_color = value;
                            recolorNode(node, true);
                            app.canvas.draw(true, true);
                        }
                    };
                })
            }
        });
    }

    // --- SILVER BULLET DEDUPLICATION ---
    // If LiteGraph or other extensions are causing doubling, we wipe it out here.
    const seen = new Set();
    options = options.filter(opt => {
        if (!opt || !opt.content) return true; // Keep separators
        const key = opt.content;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    return options;
};

app.registerExtension({
    name: "Shima.Utilities",
    async setup() {
        console.log("[Shima] Utilities extension setup...");

        app.ui.settings.addSetting({
            id: "Shima.Colors_NodeColorMode",
            name: "Shima: Node Color Engine Mode",
            tooltip: "Choose between Full Color, or Stealth modes running purely semantic text on neutral backgrounds.",
            type: "combo",
            options: ["Full Color", "Stealth (Dark Mode)", "Stealth (Light Mode)"],
            defaultValue: "Full Color",
            onChange: (value) => {
                // We no longer forcefully recolor the graph here.
                // It cleanly respects already-placed nodes, applying only to newly hatched instances.
            }
        });

        await fetchPalette();
    },
    async nodeCreated(node, app) {
        // Only apply colors to TRULY new nodes (placed by user)
        // Nodes loaded from a workflow already have colors/data set during configure
        if (app.loadingGraph) return;

        setTimeout(() => {
            recolorNode(node);
        }, 10);


        // --- String util safety checks ---
        if (node.comfyClass === "Shima.StringSwitch") {
            disableUEForInputs(node, [
                "string_1", "string_2", "string_3", "string_4",
                "string_5", "string_6", "string_7", "string_8"
            ]);
        }
        if (node.comfyClass === "Shima.StringSplitter") {
            disableUEForInputs(node, ["text"]);
        }
        if (node.comfyClass === "Shima.StringConcat") {
            disableUEForInputs(node, [
                "string_1", "string_2", "string_3", "string_4"
            ]);
        }
        if (node.comfyClass === "Shima.ControlAgent" || node.comfyClass === "Shima.PanelControlAgent") {
            disableUEForInputs(node, ["image"]);
        }
        if (node.comfyClass === "Shima.RichDisplay") {
            disableUEForInputs(node, ["title_override"]);
        }
    }
});
