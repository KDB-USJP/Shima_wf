import { app } from "../../scripts/app.js";

/**
 * Shima Dymo Label - Frontend Extension
 * Embossed plastic tape aesthetic for industrial labeling.
 */

app.registerExtension({
    name: "Shima.DymoLabel",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "Shima.DymoLabel") {
            nodeType.title_mode = LiteGraph.NO_TITLE;
            nodeType.collapsable = false;
        }
    },
    async nodeCreated(node) {
        if (node.comfyClass === "Shima.DymoLabel") {
            node.properties = node.properties || { 
                font: "Courier, 'Courier New', monospace",
                tooltip: "",
                tooltip_type: "Text",
                always_on_top: false
            };
            node.bgcolor = "transparent";
            node.boxcolor = "transparent";
            node.shima_ignore_color = true;
            node.flags = node.flags || {};
            node.flags.no_header = true;
            node.resizable = false;

            // Random jitter between -2 and 2 degrees
            node._jitter_angle = (Math.random() * 4 - 2) * (Math.PI / 180);
            node.properties.jitter = true;

            // Hide widgets
            const cleanupUI = () => {
                if (node.widgets) {
                    node.widgets.forEach(w => {
                        w.type = "hidden";
                        w.computeSize = () => [0, -4];
                        w.hidden = true;
                    });
                }
            };
            cleanupUI();
            setTimeout(cleanupUI, 50);

            // Dynamic Sizing
            node.computeSize = function () {
                const text = this.widgets?.find(w => w.name === "text")?.value || "";
                const fontSize = this.widgets?.find(w => w.name === "font_size")?.value || 18;
                const font = this.properties.font || "Courier, 'Courier New', monospace";
                const lines = text.split("\n");
                const lineHeight = fontSize * 1.4;

                let maxW = 40;
                const tempCtx = document.createElement("canvas").getContext("2d");
                tempCtx.font = `bold ${fontSize}px ${font}`;
                lines.forEach(line => {
                    maxW = Math.max(maxW, tempCtx.measureText(line.toUpperCase()).width);
                });

                // Recalculate jitter whenever size/text changes
                this._jitter_angle = (Math.random() * 4 - 2) * (Math.PI / 180);

                return [maxW + 40, Math.max(30, lines.length * lineHeight + 20)];
            };

            // Tooltip Handlers
            node.onMouseEnter = function (e) {
                if (this.properties.tooltip && window.Shima?.Tooltip) {
                    const x = e.event?.clientX || e.clientX;
                    const y = e.event?.clientY || e.clientY;
                    window.Shima.Tooltip.show(this.properties.tooltip, this.properties.tooltip_type, x, y);
                }
            };
            node.onMouseMove = function (e) {
                if (this.properties.tooltip && window.Shima?.Tooltip) {
                    const x = e.event?.clientX || e.clientX;
                    const y = e.event?.clientY || e.clientY;
                    window.Shima.Tooltip.update(x, y);
                }
            };
            node.onMouseLeave = function () {
                if (window.Shima?.Tooltip) {
                    window.Shima.Tooltip.hide();
                }
            };

            node.onDrawBackground = function (ctx) {
                if (this.flags.collapsed || this.properties.hidden) return;

                const textWidget = this.widgets?.find(w => w.name === "text");
                const text = textWidget?.value || "";
                const baseColor = this.widgets?.find(w => w.name === "base_color")?.value || "#222";
                const fontSize = this.widgets?.find(w => w.name === "font_size")?.value || 18;
                const font = this.properties.font || "Courier, 'Courier New', monospace";
                const useJitter = this.widgets?.find(w => w.name === "jitter")?.value ?? true;
                const [w, h] = this.size;
                const lines = text.split("\n");

                ctx.save();

                // Apply Jitter
                if (useJitter) {
                    ctx.translate(w / 2, h / 2);
                    ctx.rotate(this._jitter_angle);
                    ctx.translate(-w / 2, -h / 2);
                }

                // 1. Tape Border
                ctx.beginPath();
                const r = 3;
                ctx.moveTo(r, 0); ctx.lineTo(w - r, 0); ctx.quadraticCurveTo(w, 0, w, r);
                ctx.lineTo(w, h - r); ctx.quadraticCurveTo(w, h, w - r, h);
                ctx.lineTo(r, h); ctx.quadraticCurveTo(0, h, 0, h - r);
                ctx.lineTo(0, r); ctx.quadraticCurveTo(0, 0, r, 0);
                ctx.closePath();

                const tapeGrad = ctx.createLinearGradient(0, 0, 0, h);
                tapeGrad.addColorStop(0, "rgba(255,255,255,0.15)");
                tapeGrad.addColorStop(0.1, baseColor);
                tapeGrad.addColorStop(0.5, baseColor);
                tapeGrad.addColorStop(0.9, baseColor);
                tapeGrad.addColorStop(1, "rgba(0,0,0,0.3)");
                
                ctx.fillStyle = tapeGrad;
                ctx.fill();

                // 2. Embossed Text
                ctx.fillStyle = "rgba(255,255,255,0.9)";
                ctx.font = `bold ${fontSize}px ${font}`;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";

                const lineHeight = fontSize * 1.4;
                const totalH = lines.length * lineHeight;
                const startY = (h - totalH) / 2 + (lineHeight / 2);

                lines.forEach((line, i) => {
                    const py = startY + (i * lineHeight);
                    // Subtle Shadow for Emboss Effect
                    ctx.shadowColor = "rgba(0,0,0,0.5)";
                    ctx.shadowBlur = 2;
                    ctx.shadowOffsetX = 1;
                    ctx.shadowOffsetY = 1;
                    ctx.fillText(line.toUpperCase(), w / 2, py);
                });

                ctx.restore();
            };

            node.onDblClick = function () {
                showDymoModal(this);
            };
        }
    }
});

function showDymoModal(node) {
    const textW = node.widgets?.find(w => w.name === "text");
    const colorW = node.widgets?.find(w => w.name === "base_color");
    const sizeW = node.widgets?.find(w => w.name === "font_size");

    const modal = document.createElement("dialog");
    modal.style.cssText = `
        padding: 24px;
        background: rgba(25, 25, 25, 0.95);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        color: #fff;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        width: 500px;
        max-width: 90vw;
        box-shadow: 0 20px 60px rgba(0,0,0,0.7);
        font-family: sans-serif;
    `;

    modal.innerHTML = `
        <div style="margin-bottom: 20px;">
            <h3 style="margin: 0; font-size: 1.2rem; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">🏷️ Configure Dymo Label</h3>
            <div style="font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px;">Premium Documentation Suite</div>
        </div>
        
        <div style="display: flex; flex-direction: column; gap: 16px;">
            <div>
                <label style="display: block; font-size: 11px; text-transform: uppercase; color: #888; margin-bottom: 6px;">Label Content</label>
                <textarea id="dymo-text" style="width: 100%; height: 70px; background: #111; border: 1px solid #333; color: #fff; padding: 10px; border-radius: 6px; font-family: monospace; resize: none; box-sizing: border-box; outline: none;">${textW.value}</textarea>
            </div>

            <div style="display: flex; gap: 12px;">
                <div style="flex: 1;">
                    <label style="display: block; font-size: 11px; text-transform: uppercase; color: #888; margin-bottom: 6px;">Tape Color</label>
                    <input id="dymo-color" type="color" value="${colorW.value}" style="width: 100%; height: 38px; background: #111; border: 1px solid #333; cursor: pointer; border-radius: 6px; padding: 2px;">
                </div>
                <div style="flex: 1;">
                     <label style="display: block; font-size: 11px; text-transform: uppercase; color: #888; margin-bottom: 6px;">Font Size</label>
                     <input id="dymo-size" type="number" value="${sizeW.value}" min="10" max="40" style="width: 100%; height: 38px; background: #111; border: 1px solid #333; color: #fff; padding: 0 10px; border-radius: 6px; box-sizing: border-box; outline: none;">
                </div>
            </div>

            <div style="background: rgba(255,255,255,0.03); padding: 16px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <label style="font-size: 11px; text-transform: uppercase; color: #aaa; font-weight: bold;">Hover Tooltip (Rich Docs)</label>
                    <select id="dymo-tooltip-type" style="background: #333; border: 1px solid #555; color: #fff; font-size: 10px; padding: 3px 6px; border-radius: 4px; outline: none; cursor: pointer;">
                        <option value="Text" ${node.properties.tooltip_type === "Text" ? "selected" : ""}>PLAIN TEXT</option>
                        <option value="Markdown" ${node.properties.tooltip_type === "Markdown" ? "selected" : ""}>MARKDOWN</option>
                        <option value="HTML" ${node.properties.tooltip_type === "HTML" ? "selected" : ""}>HTML ENGINE</option>
                    </select>
                </div>
                <textarea id="dymo-tooltip" placeholder="Add technical details, workflow notes, or instructions..." style="width: 100%; height: 110px; background: #111; border: 1px solid #444; color: #00df81; padding: 12px; border-radius: 6px; font-family: 'Consolas', monospace; font-size: 12px; resize: none; box-sizing: border-box; outline: none; line-height: 1.4;">${node.properties.tooltip || ""}</textarea>
            </div>

            <div style="display: flex; align-items: center; gap: 10px; user-select: none; margin-top: 4px;">
                <input type="checkbox" id="dymo-aot" ${node.properties.always_on_top ? "checked" : ""} style="width: 16px; height: 16px; cursor: pointer;">
                <label for="dymo-aot" style="font-size: 13px; color: #aaa; cursor: pointer;">Stay Always On Top (Global Layer)</label>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 10px;">
                <button id="dymo-cancel" style="padding: 10px 20px; background: transparent; border: 1px solid #444; color: #888; border-radius: 8px; cursor: pointer; transition: all 0.2s; font-size: 13px;">Discard</button>
                <button id="dymo-save" style="padding: 10px 28px; background: #0088ff; border: none; color: #fff; border-radius: 8px; cursor: pointer; font-weight: bold; transition: all 0.3s; box-shadow: 0 4px 15px rgba(0, 136, 255, 0.3); font-size: 13px;">Save Configuration</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    modal.showModal();

    modal.querySelector("#dymo-save").onclick = () => {
        textW.value = modal.querySelector("#dymo-text").value;
        colorW.value = modal.querySelector("#dymo-color").value;
        sizeW.value = parseInt(modal.querySelector("#dymo-size").value) || 18;
        
        node.properties.tooltip = modal.querySelector("#dymo-tooltip").value;
        node.properties.tooltip_type = modal.querySelector("#dymo-tooltip-type").value;
        node.properties.always_on_top = modal.querySelector("#dymo-aot").checked;

        if (node.properties.always_on_top && window.Shima?.moveAOTNodesToFront) {
            window.Shima.moveAOTNodesToFront();
        }

        node.setSize(node.computeSize());
        node.setDirtyCanvas(true, true);
        modal.close();
        modal.remove();
    };

    modal.querySelector("#dymo-cancel").onclick = () => {
        modal.close();
        modal.remove();
    };

    // Style hover effects
    const saveBtn = modal.querySelector("#dymo-save");
    saveBtn.onmouseenter = () => saveBtn.style.background = "#009dff";
    saveBtn.onmouseleave = () => saveBtn.style.background = "#0088ff";
}
