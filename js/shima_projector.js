import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

/**
 * Shima Crystal Ball / Projector - Frontend Extension
 * Premium holographic and panel-based image preview.
 */

const PROJECTOR_SVG_URL = "/shima/assets/projector.svg";
let projectorImg = null;

function loadProjectorSVG() {
    if (projectorImg) return projectorImg;
    projectorImg = new Image();
    projectorImg.src = PROJECTOR_SVG_URL;
    return projectorImg;
}

// === Global Live Preview Interceptor ===
let _shimaCurrentNode = null;
api.addEventListener("progress", (event) => {
    _shimaCurrentNode = event.detail?.node ?? null;
});

api.addEventListener("b_preview", (event) => {
    try {
        const blob = event.detail;
        if (!blob || !_shimaCurrentNode) return;
        const crystalNodes = app.graph._nodes.filter(n => n.comfyClass === "Shima.CrystalBall");
        if (crystalNodes.length === 0) return;
        const originNodeId = String(_shimaCurrentNode);

        crystalNodes.forEach(node => {
            const input = node.inputs?.[0];
            if (!input || input.link === null) return;
            const link = app.graph.links[input.link];
            if (link && String(link.origin_id) === originNodeId) {
                if (node._is_loading_preview) return;
                node._is_loading_preview = true;
                const url = URL.createObjectURL(blob);
                const img = new Image();
                img.onload = () => {
                    node._preview_image = img;
                    node._has_final_image = false;
                    node.setDirtyCanvas(true);
                    node._is_loading_preview = false;
                    URL.revokeObjectURL(url);
                };
                img.onerror = () => {
                    node._is_loading_preview = false;
                    URL.revokeObjectURL(url);
                };
                img.src = url;
            }
        });
    } catch (err) { }
});

// Custom Configuration Dialog
function showConfigDialog(node) {
    const dialog = document.createElement("dialog");
    dialog.style.cssText = `
        padding: 20px;
        border: 1px solid #444;
        border-radius: 8px;
        background: #1a1a1a;
        color: #eee;
        width: 280px;
        font-family: sans-serif;
        box-shadow: 0 10px 25px rgba(0,0,0,0.5);
        z-index: 10001;
    `;

    const title = document.createElement("h3");
    title.textContent = "Crystal Ball Settings";
    title.style.margin = "0 0 15px 0";
    dialog.appendChild(title);

    const createSelect = (label, options, currentValue, onSelect) => {
        const wrap = document.createElement("div");
        wrap.style.marginBottom = "12px";
        const l = document.createElement("label");
        l.textContent = label;
        l.style.display = "block";
        l.style.fontSize = "11px";
        l.style.textTransform = "uppercase";
        l.style.color = "#888";
        l.style.marginBottom = "4px";
        const s = document.createElement("select");
        s.style.width = "100%";
        s.style.padding = "6px";
        s.style.background = "#333";
        s.style.color = "#fff";
        s.style.border = "1px solid #555";
        s.style.borderRadius = "4px";
        options.forEach(opt => {
            const o = document.createElement("option");
            o.value = opt;
            o.textContent = opt;
            if (opt === currentValue) o.selected = true;
            s.appendChild(o);
        });
        s.onchange = (e) => onSelect(e.target.value);
        wrap.appendChild(l);
        wrap.appendChild(s);
        return wrap;
    };

    const wMode = node.widgets.find(w => w.name === "mode");
    const wShape = node.widgets.find(w => w.name === "shape");
    const wGlow = node.widgets.find(w => w.name === "glow_color");

    dialog.appendChild(createSelect("Projection Mode", ["Hologram", "Panel"], wMode?.value, (val) => {
        if (wMode) wMode.value = val;
    }));

    dialog.appendChild(createSelect("Geometry", ["Sphere", "Rounded Rectangle"], wShape?.value, (val) => {
        if (wShape) wShape.value = val;
    }));

    const cWrap = document.createElement("div");
    cWrap.style.marginBottom = "20px";
    const cL = document.createElement("label");
    cL.textContent = "Glow Color";
    cL.style.display = "block";
    cL.style.fontSize = "11px";
    cL.style.textTransform = "uppercase";
    cL.style.color = "#888";
    cL.style.marginBottom = "4px";
    const cI = document.createElement("input");
    cI.type = "color";
    cI.value = wGlow?.value || "#0088ff";
    cI.style.width = "100%";
    cI.style.height = "30px";
    cI.style.border = "none";
    cI.style.padding = "0";
    cI.style.background = "none";
    cI.onchange = (e) => { if (wGlow) wGlow.value = e.target.value; };
    cWrap.appendChild(cL);
    cWrap.appendChild(cI);
    dialog.appendChild(cWrap);

    const footer = document.createElement("div");
    footer.style.display = "flex";
    footer.style.gap = "10px";

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "DONE";
    closeBtn.style.cssText = `
        flex: 1;
        padding: 10px;
        background: #444;
        color: #fff;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
    `;
    closeBtn.onclick = () => {
        dialog.close();
        document.body.removeChild(dialog);
        node.setDirtyCanvas(true, true);
    };
    footer.appendChild(closeBtn);
    dialog.appendChild(footer);

    document.body.appendChild(dialog);
    dialog.showModal();
}

app.registerExtension({
    name: "Shima.CrystalBall",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "Shima.CrystalBall") {
            nodeType.title_mode = LiteGraph.NO_TITLE;
            nodeType.collapsable = false;

            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function () {
                if (onNodeCreated) onNodeCreated.apply(this, arguments);
                this.size = [300, 360];
                this.serialize_widgets = true;
                this._preview_image = null;
                this.bgcolor = "transparent";
                this.boxcolor = "transparent";
                this.shima_ignore_color = true;
                this.flags = this.flags || {};
                this.flags.no_header = true;
                this.flags.resizable = true;

                loadProjectorSVG();

                const cleanupUI = () => {
                    if (this.widgets) {
                        this.widgets.forEach(w => {
                            w.type = "hidden";
                            w.computeSize = () => [0, -4];
                            w.hidden = true;
                        });
                    }
                    this._repositionSlots();
                };
                cleanupUI();
                setTimeout(cleanupUI, 100);
            };

            nodeType.prototype._repositionSlots = function () {
                const bottomY = this.size[1] - 12;
                if (this.inputs) this.inputs.forEach(inp => inp.pos = [0, bottomY]);
                if (this.outputs) this.outputs.forEach(out => out.pos = [this.size[0], bottomY]);
            };

            const origOnResize = nodeType.prototype.onResize;
            nodeType.prototype.onResize = function (size) {
                if (origOnResize) origOnResize.call(this, size);
                this._repositionSlots();
            };

            const origGetExtraMenuOptions = nodeType.prototype.getExtraMenuOptions;
            nodeType.prototype.getExtraMenuOptions = function (canvas, options) {
                if (origGetExtraMenuOptions) origGetExtraMenuOptions.call(this, canvas, options);
                options.push({
                    content: "Configure Crystal Ball...",
                    callback: () => showConfigDialog(this)
                });
            };

            nodeType.prototype.onDrawBackground = function (ctx) {
                if (this.flags.collapsed) return;
                const [w, h] = this.size;
                const widgets = this.widgets || [];
                const mode = widgets.find(w => w.name === "mode")?.value || "Hologram";
                const glowColor = widgets.find(w => w.name === "glow_color")?.value || "#0088ff";
                const hasFinishedImage = this._has_final_image === true;
                const opacity = hasFinishedImage ? 1.0 : 0.7;
                const scaleFactor = hasFinishedImage ? 1.0 : 0.98;

                ctx.save();
                if (mode === "Hologram") this.drawHologram(ctx, w, h, glowColor, opacity, scaleFactor);
                else this.drawPanel(ctx, w, h, glowColor);
                ctx.restore();
            };

            nodeType.prototype.drawHologram = function (ctx, w, h, glowColor, opacity, scaleFactor) {
                const centerX = w / 2;
                const projectorSize = w * 0.95;
                const svgW = 1415.17, svgH = 1439.7;
                const aspect = svgW / svgH;
                const dw = projectorSize, dh = dw / aspect;
                const dy = h - dh;
                const scale = dw / svgW;
                const sphereCX = (centerX - dw/2) + (714.14 * scale);
                const sphereCY = dy + (574.68 * scale);
                const sphereR = 543 * scale * 0.96;

                const widgets = this.widgets || [];
                const shape = widgets.find(w => w.name === "shape")?.value || "Sphere";
                // 1. Draw the Preview Image FIRST (Layer 0: Background)
                if (this._preview_image) {
                    ctx.save();
                    // Hologram mode is strictly spherical
                    ctx.beginPath();
                    ctx.arc(sphereCX, sphereCY, sphereR, 0, Math.PI * 2);
                    ctx.clip();
                    
                    ctx.globalAlpha = opacity;
                    ctx.fillStyle = "#000";
                    ctx.fill();

                    const img = this._preview_image;
                    const imgScale = Math.max((sphereR*2.5) / img.width, (sphereR*2.5) / img.height) * scaleFactor;
                    const drawW = img.width * imgScale, drawH = img.height * imgScale;
                    
                    ctx.drawImage(img, sphereCX - drawW / 2, sphereCY - drawH / 2, drawW, drawH);
                    
                    // Projector Mist (Emerging light)
                    const mistSize = sphereR;
                    const mist = ctx.createLinearGradient(sphereCX, sphereCY + mistSize, sphereCX, sphereCY);
                    mist.addColorStop(0, glowColor);
                    mist.addColorStop(0.2, glowColor + "22");
                    mist.addColorStop(0.4, "rgba(0,0,0,0)");
                    ctx.globalAlpha = 0.4 * opacity;
                    ctx.fillStyle = mist;
                    ctx.fill();
                    
                    ctx.restore();
                }

                // 2. Draw the Projector SVG with Baked Glass/Glint (Layer 1: Top Overlay)
                if (projectorImg && projectorImg.complete) {
                    ctx.save();
                    ctx.globalAlpha = 0.95;
                    ctx.drawImage(projectorImg, centerX - dw/2, dy, dw, dh);
                    ctx.restore();
                }
            };

            nodeType.prototype.onExecuted = function (message) {
                if (message?.images) {
                    const imgData = message.images[0];
                    const img = new Image();
                    img.onload = () => {
                        this._preview_image = img;
                        this._has_final_image = true;
                        this.setDirtyCanvas(true);
                    };
                    img.src = `/view?filename=${imgData.filename}&subfolder=${imgData.subfolder}&type=${imgData.type}&t=${Date.now()}`;
                }
            };

            nodeType.prototype.drawPanel = function (ctx, w, h, glowColor) {
                const centerX = w / 2, centerY = h / 2;
                const widgets = this.widgets || [];
                const shape = widgets.find(w => w.name === "shape")?.value || "Sphere";

                if (shape === "Sphere") {
                    // Panel Circle Mode
                    const radius = Math.min(w, h) * 0.38;
                    ctx.fillStyle = "#121212";
                    ctx.beginPath(); ctx.roundRect(10, 10, w - 20, h - 20, 12); ctx.fill();
                    ctx.strokeStyle = "#282828"; ctx.lineWidth = 2; ctx.stroke();
                    
                    const pulse = (Math.sin(performance.now() / 400) + 1) / 2;
                    ctx.save();
                    ctx.shadowColor = glowColor; ctx.shadowBlur = 12 + pulse * 8;
                    ctx.strokeStyle = glowColor; ctx.lineWidth = 4 + pulse;
                    ctx.beginPath(); ctx.arc(centerX, centerY, radius + 2, 0, Math.PI * 2); ctx.stroke();
                    ctx.restore();

                    if (this._preview_image) {
                        ctx.save();
                        ctx.beginPath(); ctx.arc(centerX, centerY, radius, 0, Math.PI * 2); ctx.clip();
                        const img = this._preview_image, scale = Math.max((radius*2) / img.width, (radius*2) / img.height);
                        ctx.drawImage(img, centerX - (img.width*scale) / 2, centerY - (img.height*scale) / 2, img.width*scale, img.height*scale);
                        ctx.restore();
                    }
                } else {
                    // Panel Rounded Rectangle Mode
                    const rW = w * 0.8, rH = h * 0.6;
                    const rX = centerX - rW / 2, rY = centerY - rH / 2;
                    
                    ctx.fillStyle = "#121212";
                    ctx.beginPath(); ctx.roundRect(10, 10, w - 20, h - 20, 12); ctx.fill();
                    ctx.strokeStyle = "#282828"; ctx.lineWidth = 2; ctx.stroke();
                    
                    const pulse = (Math.sin(performance.now() / 400) + 1) / 2;
                    ctx.save();
                    ctx.shadowColor = glowColor; ctx.shadowBlur = 12 + pulse * 8;
                    ctx.strokeStyle = glowColor; ctx.lineWidth = 4 + pulse;
                    ctx.beginPath(); ctx.roundRect(rX - 2, rY - 2, rW + 4, rH + 4, 14); ctx.stroke();
                    ctx.restore();

                    if (this._preview_image) {
                        ctx.save();
                        ctx.beginPath(); ctx.roundRect(rX, rY, rW, rH, 12); ctx.clip();
                        const img = this._preview_image, scale = Math.max(rW / img.width, rH / img.height);
                        ctx.drawImage(img, centerX - (img.width*scale) / 2, centerY - (img.height*scale) / 2, img.width*scale, img.height*scale);
                        ctx.restore();
                    }
                }
            };
        }
    }
});
