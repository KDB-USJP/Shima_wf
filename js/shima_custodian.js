import { app } from "../../scripts/app.js";

/**
 * Shima Custodian - Frontend Extension
 * Maintenance utilities for the Shima extension.
 */

app.registerExtension({
    name: "Shima.Custodian",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name === "Shima.Custodian") {
            nodeType.title_mode = LiteGraph.NO_TITLE;
            nodeType.collapsable = false;
        }
    },
    async nodeCreated(node) {
        if (node.comfyClass === "Shima.Custodian") {
            node.properties = node.properties || {};
            node.bgcolor = "transparent";
            node.boxcolor = "transparent";
            node.shima_ignore_color = true;
            node.flags = node.flags || {};
            node.flags.no_header = true;
            node.resizable = false;
            node.size = [240, 340];

            node.computeSize = function () {
                return [240, 340];
            };

            node._status_msg = "System Ready";

            // Hide native widgets
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

            // Button Rectangles [x, y, w, h] - Centered for 240 width
            const bX = (240 - 200) / 2;
            const btn1 = [bX, 50, 200, 26];
            const btn2 = [bX, 85, 200, 26];
            const btn3 = [bX, 120, 200, 26];
            const btn4 = [bX, 155, 200, 26]; // Clear Restrictions
            const btn5 = [bX, 190, 200, 26]; // Extras menu
            const btn6 = [bX, 225, 200, 26]; // Nuke All

            node.size = [240, 275];

            node.computeSize = function () {
                return [240, 275];
            };

            const drawBtn = (ctx, rect, label, color, isHovered) => {
                const [bx, by, bw, bh] = rect;
                ctx.fillStyle = isHovered ? color : "#222";
                ctx.beginPath();
                ctx.roundRect(bx, by, bw, bh, 4);
                ctx.fill();
                ctx.strokeStyle = color;
                ctx.lineWidth = 1.5;
                ctx.stroke();

                ctx.fillStyle = isHovered ? "#111" : color;
                ctx.font = "bold 11px Arial";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(label, bx + bw / 2, by + bh / 2 + 1);
            };

            node.onDrawBackground = function (ctx) {
                if (this.flags.collapsed) return;
                const [w, h] = this.size;

                ctx.save();

                // Chassis Floor
                ctx.fillStyle = "#161616";
                ctx.beginPath();
                ctx.roundRect(0, 0, w, h, 8);
                ctx.fill();
                ctx.strokeStyle = "#333";
                ctx.lineWidth = 2;
                ctx.stroke();

                // Header
                ctx.fillStyle = "#f2a900"; // Caution yellow
                ctx.font = "bold 13px Arial";
                ctx.textAlign = "center";
                ctx.fillText("SHIMA CUSTODIAN", w / 2, 24);

                // Divider
                ctx.beginPath();
                ctx.moveTo(15, 34);
                ctx.lineTo(w - 15, 34);
                ctx.strokeStyle = "#f2a900";
                ctx.lineWidth = 1;
                ctx.stroke();

                // Buttons
                drawBtn(ctx, btn1, "☢️ NUKE __PYCACHE__", "#ff4444", this._hover_btn === 1);
                drawBtn(ctx, btn2, "🏷️ TOGGLE ALL DYMOS", "#44aaff", this._hover_btn === 2);
                drawBtn(ctx, btn3, "📰 TOGGLE ALL HEADLINES", "#44aaff", this._hover_btn === 3);
                drawBtn(ctx, btn4, "🏝️ CLEAR GROUP-REGS", "#00df81", this._hover_btn === 4);
                drawBtn(ctx, btn5, "📂 OPEN EXTRAS", "#ffffff", this._hover_btn === 5);
                drawBtn(ctx, btn6, "🌋 NUKE GROUPS & REGS", "#ff8800", this._hover_btn === 6);

                // Status
                ctx.fillStyle = "#666";
                ctx.font = "10px sans-serif";
                ctx.fillText(this._status_msg || "System Ready", w / 2, h - 12);

                ctx.restore();
            };

            // Hit Testing
            const testHit = (x, y, rect) => {
                return (x >= rect[0] && x <= rect[0] + rect[2] && y >= rect[1] && y <= rect[1] + rect[3]);
            };

            node.onMouseMove = function (e, localPos) {
                const [x, y] = localPos;
                let h = 0;
                if (testHit(x, y, btn1)) h = 1;
                else if (testHit(x, y, btn2)) h = 2;
                else if (testHit(x, y, btn3)) h = 3;
                else if (testHit(x, y, btn4)) h = 4;
                else if (testHit(x, y, btn5)) h = 5;
                else if (testHit(x, y, btn6)) h = 6;

                if (this._hover_btn !== h) {
                    this._hover_btn = h;
                    this.setDirtyCanvas(true);
                }
            };

            node.onMouseLeave = function () {
                this._hover_btn = 0;
                this.setDirtyCanvas(true);
            };

            function showShimaDialog({ title, message, onConfirm, isAlert = false, customHtml = "" }) {
                const dialog = document.createElement("dialog");
                dialog.style.cssText = `
                    padding: 0;
                    border: 1px solid #555;
                    border-radius: 8px;
                    background: #2a2a2a;
                    color: #eee;
                    min-width: 380px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                    z-index: 10001;
                `;
                dialog.innerHTML = `
                    <div style="padding: 24px; font-family: sans-serif;">
                        <h3 style="margin: 0 0 15px; color: #ffcc00; display: flex; align-items: center; gap: 8px;">
                            ${title}
                        </h3>
                        ${customHtml || `
                        <p style="color: #ccc; line-height: 1.5; margin-bottom: 24px; font-size: 14px;">
                            ${message.replace(/\n/g, "<br>")}
                        </p>
                        `}
                        <div style="display: flex; gap: 12px; justify-content: flex-end;">
                            ${isAlert || customHtml ? "" : `
                                <button id="shima-dlg-cancel" style="padding: 10px 20px; background: #444; border: none; border-radius: 4px; color: #fff; cursor: pointer; font-weight: bold;">
                                    Cancel
                                </button>
                            `}
                            <button id="shima-dlg-confirm" style="padding: 10px 20px; background: #3a7c5a; border: none; border-radius: 4px; color: #fff; cursor: pointer; font-weight: bold;">
                                ${isAlert || customHtml ? "Close" : "Proceed"}
                            </button>
                        </div>
                    </div>
                `;
                document.body.appendChild(dialog);
                dialog.showModal();

                const cleanup = () => {
                    dialog.close();
                    dialog.remove();
                    // Crucial: Use setTimeout and focus more aggressively to fix keyboard lock
                    setTimeout(() => {
                        window.focus();
                        if (app.canvas && app.canvas.canvas) {
                            app.canvas.canvas.focus();
                        }
                    }, 50);
                };

                dialog.querySelector("#shima-dlg-confirm").onclick = () => {
                    cleanup();
                    if (onConfirm) onConfirm();
                };
                if (!isAlert && !customHtml) {
                    dialog.querySelector("#shima-dlg-cancel").onclick = cleanup;
                }
                dialog.oncancel = cleanup;
            }

            async function showExtrasModal() {
                try {
                    const response = await fetch("/shima/custodian_extras.json");
                    const extras = await response.json();
                    
                    let html = `<div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px;">`;
                    extras.forEach(item => {
                        html += `
                            <button class="shima-extra-btn" data-url="${item.url}" data-name="${item.windowName}" data-size="${item.windowSize}" 
                                    style="padding: 12px; background: #333; border: 1.5px solid ${item.color}; border-radius: 6px; color: ${item.color}; cursor: pointer; font-weight: bold; text-align: center; transition: all 0.2s;">
                                ${item.label}
                            </button>
                        `;
                    });
                    html += `</div>`;

                    showShimaDialog({
                        title: "📂 Shima Extras",
                        customHtml: html
                    });

                    // Add click handlers
                    setTimeout(() => {
                        document.querySelectorAll(".shima-extra-btn").forEach(btn => {
                            btn.onclick = () => {
                                const url = btn.getAttribute("data-url");
                                const name = btn.getAttribute("data-name");
                                const size = btn.getAttribute("data-size");
                                window.open(url, name, size);
                            };
                            btn.onmouseover = () => { btn.style.background = btn.style.borderColor; btn.style.color = "#fff"; };
                            btn.onmouseout = () => { btn.style.background = "#333"; btn.style.color = btn.style.borderColor; };
                        });
                    }, 50);

                } catch (err) {
                    console.error("Failed to load extras:", err);
                }
            }

            node.onMouseDown = function (e, localPos) {
                if (e.button !== 0) return; // Only left-click
                const [x, y] = localPos;

                if (testHit(x, y, btn1)) { // Nuke Pycache
                    showShimaDialog({
                        title: "🏝️ Nuke Pycache",
                        message: "This will recursively delete ALL __pycache__ folders inside the Shima extension directory.\n\nProceed?",
                        onConfirm: () => {
                            this._status_msg = "Nuking cache...";
                            this.setDirtyCanvas(true);
                            fetch("/shima/maintenance/pycache", { method: "POST" })
                                .then(r => r.json())
                                .then(data => {
                                    if (data.success) {
                                        this._status_msg = `Deleted ${data.count} caches.`;
                                        showShimaDialog({
                                            title: "🏝️ Success",
                                            message: `Deleted ${data.count} __pycache__ folders.`,
                                            isAlert: true
                                        });
                                    } else {
                                        this._status_msg = `Error: ${data.message}`;
                                    }
                                    this.setDirtyCanvas(true);
                                }).catch(err => {
                                    this._status_msg = "Network Error.";
                                    this.setDirtyCanvas(true);
                                });
                        }
                    });
                    return true;
                }

                const toggleNodes = (targetClass, label) => {
                    const nodes = app.graph._nodes.filter(n => n.comfyClass === targetClass);
                    if (nodes.length === 0) {
                        this._status_msg = `No ${label}s found.`;
                        this.setDirtyCanvas(true);
                        return;
                    }
                    const isHidden = !nodes[0].properties.hidden;
                    nodes.forEach(n => {
                        n.properties.hidden = isHidden;
                        n.setDirtyCanvas(true, true);
                    });
                    this._status_msg = `${label}s ${isHidden ? "HIDDEN" : "VISIBLE"}`;
                    this.setDirtyCanvas(true);
                };

                if (testHit(x, y, btn2)) {
                    toggleNodes("Shima.DymoLabel", "Dymo");
                    return true;
                }

                if (testHit(x, y, btn3)) {
                    toggleNodes("Shima.Headline", "Headline");
                    return true;
                }

                if (testHit(x, y, btn4)) { // Clear Group Restrictions (Regex Only)
                    showShimaDialog({
                        title: "🏝️ Clear Group Restrictions",
                        message: "This will clear ALL Use Everywhere Group Restrictions from every node. This does NOT delete groups. Proceed?",
                        onConfirm: () => {
                            let count = 0;
                            app.graph._nodes.forEach(n => {
                                if (n.properties?.ue_properties?.group_regex) {
                                    n.properties.ue_properties.group_regex = "";
                                    count++;
                                    if (n.setDirtyCanvas) n.setDirtyCanvas(true, true);
                                }
                            });
                            this._status_msg = `Cleared ${count} restrictions.`;
                            this.setDirtyCanvas(true);
                        }
                    });
                    return true;
                }

                if (testHit(x, y, btn6)) { // Nuke Groups & Restrictions (Both)
                    showShimaDialog({
                        title: "🌋 Nuke Groups & Restrictions",
                        message: "This will delete ALL visual Groups from your graph and clear ALL Use Everywhere restrictions. Proceed?",
                        onConfirm: () => {
                            const groupCount = app.graph._groups ? app.graph._groups.length : 0;
                            app.graph._groups = [];
                            let nodeCount = 0;
                            app.graph._nodes.forEach(n => {
                                let cleared = false;
                                if (n.properties?.ue_properties?.group_regex) {
                                    n.properties.ue_properties.group_regex = "";
                                    cleared = true;
                                }
                                if (n.widgets) {
                                    n.widgets.forEach(w => {
                                        if (w.name === "group_restriction" || w.name === "group_regex") {
                                            if (w.value !== "") { w.value = ""; cleared = true; }
                                        }
                                    });
                                }
                                if (cleared) {
                                    nodeCount++;
                                    if (n.setDirtyCanvas) n.setDirtyCanvas(true, true);
                                }
                            });
                            this._status_msg = `Nuked ${groupCount} groups and ${nodeCount} restrictions.`;
                            showShimaDialog({
                                title: "🌋 Nuke Complete",
                                message: `Removed ${groupCount} Groups and ${nodeCount} Restrictions.`,
                                isAlert: true
                            });
                            if (app.canvas && app.canvas.draw) app.canvas.draw(true, true);
                        }
                    });
                    return true;
                }

                if (testHit(x, y, btn5)) { // Open Extras
                    showExtrasModal();
                    this._status_msg = "Extras Menu Opened";
                    this.setDirtyCanvas(true);
                    return true;
                }
            };
        }
    }
});
