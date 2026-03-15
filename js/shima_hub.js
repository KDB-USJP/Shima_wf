import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

/**
 * Shima Setup Hub - Frontend UI
 * Handles asset pack downloads and status reporting
 */

app.registerExtension({
    name: "Shima.Hub",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name !== "Shima.Hub") return;

        const onNodeCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
            if (onNodeCreated) onNodeCreated.apply(this, arguments);

            const node = this;
            node.selectedItems = new Set();
            node.currentCategory = "bundles";
            node.downloadStatus = {};
            node.properties = node.properties || {};
            node.properties.manifestChoice = node.properties.manifestChoice || "Default";
            node.availableManifests = ["Default"];

            // --- Dashboard Styling ---
            const dashboard = document.createElement("div");
            dashboard.style.cssText = `
                background: #151515;
                color: #ddd;
                padding: 12px;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                font-size: 11px;
                border: 1px solid #333;
                border-radius: 8px;
                margin: 5px;
                display: flex;
                flex-direction: column;
                gap: 12px;
                box-shadow: inset 0 0 10px rgba(0,0,0,0.5);
                overflow-y: auto;
                max-height: 500px;
            `;

            // Top Bar: Category Selector
            const topBar = document.createElement("div");
            topBar.style.cssText = `display: flex; align-items: center; gap: 8px; justify-content: space-between;`;

            const categoryLabel = document.createElement("label");
            categoryLabel.textContent = "CATEGORY:";
            categoryLabel.style.cssText = `font-weight: bold; color: #888; font-size: 10px;`;

            const watermark = document.createElement("span");
            watermark.textContent = "v2.1 (DEV)";
            watermark.style.cssText = `color: #0af; font-size: 8px; font-weight: bold; letter-spacing: 0.5px; opacity: 0.6;`;

            const gearBtn = document.createElement("button");
            gearBtn.textContent = "⚙️";
            gearBtn.title = "Open main settings";
            gearBtn.style.cssText = `background: none; border: none; cursor: pointer; font-size: 14px; margin-left: 4px; filter: grayscale(1); opacity: 0.7;`;
            gearBtn.onclick = () => {
                if (window.Shima && window.Shima.openSettings) window.Shima.openSettings();
                else document.querySelector(".comfy-settings-btn")?.click();
            };

            // Premium Manifest Selector (Custom Dropdown)
            const manifestContainer = document.createElement("div");
            manifestContainer.style.cssText = `position: relative; display: flex; align-items: center; gap: 4px;`;

            const manifestCurrent = document.createElement("div");
            manifestCurrent.style.cssText = `
                background: #111; color: #fb0; border: 1px solid #444; border-radius: 4px; 
                padding: 2px 8px; font-size: 11px; cursor: pointer; min-width: 80px;
                display: flex; justify-content: space-between; align-items: center;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            `;
            manifestCurrent.textContent = node.properties.manifestChoice.toUpperCase();
            
            const dropArrow = document.createElement("span");
            dropArrow.textContent = "▾";
            dropArrow.style.fontSize = "10px";
            manifestCurrent.appendChild(dropArrow);

            const manifestList = document.createElement("div");
            manifestList.style.cssText = `
                position: absolute; top: 100%; left: 0; right: 0; background: #1a1a1a; 
                border: 1px solid #555; border-radius: 4px; display: none; flex-direction: column; 
                z-index: 1000; box-shadow: 0 4px 12px rgba(0,0,0,0.5); margin-top: 2px;
                max-height: 200px; overflow-y: auto;
            `;

            manifestCurrent.onclick = (e) => {
                e.stopPropagation();
                const isOpen = manifestList.style.display === "flex";
                manifestList.style.display = isOpen ? "none" : "flex";
            };

            document.addEventListener("click", () => {
                manifestList.style.display = "none";
            });

            const updateManifestOptions = (manifests) => {
                manifestList.innerHTML = "";
                manifests.forEach(m => {
                    const opt = document.createElement("div");
                    opt.textContent = m.toUpperCase();
                    opt.style.cssText = `padding: 4px 8px; cursor: pointer; font-size: 11px; color: #ccc;`;
                    if (m === node.properties.manifestChoice) opt.style.color = "#fb0";
                    
                    opt.onmouseover = () => opt.style.background = "#333";
                    opt.onmouseout = () => opt.style.background = "none";
                    opt.onclick = () => {
                        node.properties.manifestChoice = m;
                        manifestCurrent.textContent = m.toUpperCase();
                        manifestCurrent.appendChild(dropArrow);
                        node.selectedItems.clear();
                        refreshUI();
                    };
                    manifestList.appendChild(opt);
                });
            };

            manifestContainer.appendChild(manifestCurrent);
            manifestContainer.appendChild(manifestList);

            const uploadManifestBtn = document.createElement("button");
            uploadManifestBtn.textContent = "📤";
            uploadManifestBtn.title = "Upload Custom Manifest JSON";
            uploadManifestBtn.style.cssText = `background: none; border: none; cursor: pointer; font-size: 12px; filter: grayscale(1); opacity: 0.7;`;
            uploadManifestBtn.onclick = () => handleManifestUpload();

            const select = document.createElement("select");
            select.style.cssText = `background: #222; color: #ccc; border: 1px solid #444; border-radius: 4px; padding: 4px; font-size: 10px; cursor: pointer; flex: 1;`;
            ["bundles", "models", "assets", "nodes", "stylethumbs", "settings"].forEach(cat => {
                const opt = document.createElement("option");
                opt.value = cat;
                opt.textContent = cat.toUpperCase();
                select.appendChild(opt);
            });
            select.onchange = (e) => {
                node.currentCategory = e.target.value;
                node.selectedItems.clear();
                refreshUI();
            };

            const dropdownContainer = document.createElement("div");
            dropdownContainer.style.cssText = `display: flex; align-items: center; gap: 4px; flex: 1; justify-content: flex-end;`;
            dropdownContainer.appendChild(manifestContainer);
            dropdownContainer.appendChild(uploadManifestBtn);
            dropdownContainer.appendChild(select);
            dropdownContainer.appendChild(gearBtn);

            topBar.appendChild(categoryLabel);
            topBar.appendChild(watermark);
            topBar.appendChild(dropdownContainer);
            dashboard.appendChild(topBar);

            // Content Area
            const content = document.createElement("div");
            content.style.cssText = `display: flex; flex-direction: column; gap: 6px;`;
            dashboard.appendChild(content);

            // Bottom Bar: Actions
            const bottomBar = document.createElement("div");
            bottomBar.style.cssText = `display: flex; gap: 8px; border-top: 1px solid #333; padding-top: 8px; justify-content: flex-end;`;
            
            const checkAllBtn = document.createElement("button");
            checkAllBtn.textContent = "Check All";
            checkAllBtn.style.cssText = `background: #333; border: 1px solid #444; color: #ccc; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 10px;`;
            
            const installBtn = document.createElement("button");
            installBtn.textContent = "Install Selected";
            installBtn.style.cssText = `background: #06c; border: none; color: white; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 10px;`;
            
            bottomBar.appendChild(checkAllBtn);
            bottomBar.appendChild(installBtn);
            dashboard.appendChild(bottomBar);

            node.addDOMWidget("dashboard_display", "div", dashboard);
            node.size = [450, 520];

            node.triggerErrorPulse = () => {
                dashboard.style.transition = "box-shadow 0.2s ease";
                dashboard.style.boxShadow = "0 0 20px #f00";
                setTimeout(() => {
                    dashboard.style.boxShadow = "none";
                }, 500);
            };

            // --- UI Builders ---
            const createRow = (id, labelText, details, isInstalled, statusObj = null, externalUrl = null) => {
                const row = document.createElement("div");
                const isDownloading = statusObj && (statusObj.status === "downloading" || statusObj.status === "syncing");
                const isError = statusObj && (statusObj.status === "error" || statusObj.status === "dep_error");
                const isCancelled = statusObj && statusObj.status === "cancelled";

                row.style.cssText = `
                    display: flex; align-items: center; gap: 10px; background: #1a1a1a; 
                    padding: 6px 10px; border-radius: 6px; border: 1px solid #222;
                    position: relative; overflow: hidden;
                    opacity: ${isInstalled ? 0.7 : 1};
                    ${isError ? "border-color: #522;" : ""}
                `;

                // Progress Bar Background
                if (isDownloading && statusObj.progress > 0) {
                    const progressBg = document.createElement("div");
                    progressBg.style.cssText = `
                        position: absolute; left: 0; top: 0; bottom: 0; 
                        width: ${statusObj.progress}%; background: rgba(0, 102, 204, 0.15);
                        pointer-events: none; transition: width 0.3s ease;
                    `;
                    row.appendChild(progressBg);
                }

                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.checked = node.selectedItems.has(id);
                checkbox.disabled = isInstalled || isDownloading;
                checkbox.onchange = (e) => {
                    if (e.target.checked) node.selectedItems.add(id);
                    else node.selectedItems.delete(id);
                };

                const info = document.createElement("div");
                info.style.cssText = `flex: 1; display: flex; flex-direction: column; z-index: 1;`;
                
                const title = document.createElement("span");
                title.textContent = labelText;
                title.style.fontWeight = "bold";
                title.style.color = isInstalled ? "#0c0" : (isError ? "#f33" : "#ddd");
                
                const desc = document.createElement("span");
                desc.textContent = isError ? (statusObj.error || "Download failed") : details;
                desc.style.fontSize = "9px";
                desc.style.color = isError ? "#f88" : "#777";

                info.appendChild(title);
                info.appendChild(desc);

                const statusContainer = document.createElement("div");
                statusContainer.style.cssText = `display: flex; align-items: center; gap: 6px; z-index: 1;`;

                const statusTag = document.createElement("div");
                statusTag.style.cssText = `font-size: 9px; min-width: 80px; text-align: right;`;
                
                if (statusObj && statusObj.progress > 0 && isDownloading) {
                    statusTag.textContent = `⏳ ${statusObj.progress}%`;
                    statusTag.style.color = "#0af";
                } else if (statusObj && statusObj.status === "syncing") {
                    statusTag.textContent = "⏳ Syncing...";
                    statusTag.style.color = "#0af";
                } else if (isDownloading) {
                    statusTag.textContent = "⏳ Starting...";
                    statusTag.style.color = "#0af";
                } else if (isCancelled) {
                    statusTag.textContent = "🛑 CANCELLED";
                    statusTag.style.color = "#888";
                } else if (statusObj && statusObj.status === "dep_error") {
                    statusTag.textContent = "❌ DEP ERROR";
                    statusTag.style.color = "#f33";
                } else if (isError) {
                    statusTag.textContent = "❌ ERROR";
                    statusTag.style.color = "#f33";
                } else if (isInstalled) {
                    statusTag.textContent = "✅ INSTALLED";
                    statusTag.style.color = "#0c0";
                } else {
                    statusTag.textContent = "📥 INSTALL";
                    statusTag.style.color = "#fb0";
                }

                statusContainer.appendChild(statusTag);

                if (externalUrl) {
                    const linkBtn = document.createElement("button");
                    linkBtn.textContent = "🌐";
                    linkBtn.title = "View Online / Source";
                    linkBtn.style.cssText = `background: none; border: none; cursor: pointer; padding: 0; font-size: 10px; margin-left: 4px;`;
                    linkBtn.onclick = () => window.open(externalUrl, "_blank");
                    statusContainer.appendChild(linkBtn);
                }

                if (isDownloading) {
                    const cancelBtn = document.createElement("button");
                    cancelBtn.textContent = "❌";
                    cancelBtn.title = "Cancel Download";
                    cancelBtn.style.cssText = `background: none; border: none; cursor: pointer; padding: 0; font-size: 10px; margin-left: 4px; filter: grayscale(1); opacity: 0.5;`;
                    cancelBtn.onmouseover = () => { cancelBtn.style.filter = "none"; cancelBtn.style.opacity = "1"; };
                    cancelBtn.onmouseout = () => { cancelBtn.style.filter = "grayscale(1)"; cancelBtn.style.opacity = "0.5"; };
                    cancelBtn.onclick = async () => {
                        cancelBtn.disabled = true;
                        await api.fetchApi("/shima/models/cancel", {
                            method: "POST",
                            body: JSON.stringify({ model_id: id })
                        });
                    };
                    statusContainer.appendChild(cancelBtn);
                }

                row.appendChild(checkbox);
                row.appendChild(info);
                row.appendChild(statusContainer);

                return { row, checkbox };
            };

            const refreshUI = async () => {
                // Fetch available manifests first
                const manifestsRes = await api.fetchApi("/shima/manifests/list").then(r => r.json());
                node.availableManifests = manifestsRes.manifests || ["Default"];
                
                // Update dropdown
                if (typeof updateManifestOptions === "function") {
                    updateManifestOptions(node.availableManifests);
                }

                let settings, packs, models, nodes;
                try {
                    [settings, packs, models, nodes] = await Promise.all([
                        api.fetchApi(`/shima/settings/get?manifest=${node.properties.manifestChoice}`).then(r => r.json()).catch(e => ({error: e.toString()})),
                        api.fetchApi("/shima/assets/check").then(r => r.json()).catch(e => ({error: e.toString()})),
                        api.fetchApi(`/shima/models/check?manifest=${node.properties.manifestChoice}`).then(r => r.json()).catch(e => ({error: e.toString()})),
                        api.fetchApi("/shima/nodes/check").then(r => r.json()).catch(e => ({error: e.toString()}))
                    ]);

                    // Fortress Mode: Default to empty objects if API fails or returns error
                    if (!settings || settings.error) settings = { bundles: {} };
                    if (!packs || packs.error) packs = { pack_status: {} };
                    if (!models || models.error) models = { models: {} };
                    if (!nodes || nodes.error) nodes = { nodes: {} };
                    
                    // Specific safety for nested objects
                    settings.bundles = settings.bundles || {};
                    packs.pack_status = packs.pack_status || {};
                    models.models = models.models || {};
                    nodes.nodes = nodes.nodes || {};

                } catch (err) {
                    console.error("[Shima] Failed to fetch Hub data:", err);
                    content.innerHTML = `<div style="color: #f33; padding: 20px; text-align: center;">Failed to load Hub data. Check console for details.</div>`;
                    return;
                }

                // Use local bundles from manifest exclusively
                const activeBundles = settings.bundles || {};

                content.innerHTML = "";
                const rows = [];

                if (node.currentCategory === "bundles") {
                    Object.entries(activeBundles).forEach(([id, b]) => {
                        if (id === "error") return; 
                        
                        let isInstalled = true;
                        let isDownloading = false;
                        let hasError = false;

                        (b.models || []).forEach(mId => {
                            const m = models.models[mId];
                            const s = node.downloadStatus[mId];
                            if (!m || !m.installed) isInstalled = false;
                            if (s && s.status === "downloading") isDownloading = true;
                            if (s && s.status === "error") hasError = true;
                        });

                        (b.packs || []).forEach(pId => {
                            const installed = packs.pack_status[pId];
                            const s = node.downloadStatus[pId]; 
                            if (!installed) isInstalled = false;
                            if (s && s.status === "downloading") isDownloading = true;
                        });

                        (b.nodes || []).forEach(nId => {
                            const n = nodes.nodes[nId];
                            if (!n || !n.installed) isInstalled = false;
                        });

                        const bundleStatus = isInstalled ? null : (isDownloading ? {status: "syncing"} : (hasError ? {status: "dep_error", error: "Dependency failed"} : null));

                        const labelText = b.name || id.replace(/_/g, " ").toUpperCase();
                        const { row, checkbox } = createRow(id, labelText, b.description || "Bundle", isInstalled, bundleStatus);
                        content.appendChild(row);
                        rows.push(checkbox);
                    });
                } else if (node.currentCategory === "models") {
                    Object.entries(models.models).forEach(([id, info]) => {
                        const statusObj = node.downloadStatus[id];
                        const { row, checkbox } = createRow(id, info.display_name, id, info.installed, statusObj, info.reference);
                        content.appendChild(row);
                        rows.push(checkbox);
                    });
                } else if (node.currentCategory === "nodes") {
                    Object.entries(nodes.nodes).forEach(([id, info]) => {
                        const { row, checkbox } = createRow(id, info.name, id, info.installed, null, info.url);
                        checkbox.disabled = true; 
                        content.appendChild(row);
                        rows.push(checkbox);
                    });
                } else if (node.currentCategory === "stylethumbs") {
                    Object.entries(packs.pack_status).forEach(([name, installed]) => {
                        const isYourStyles = name === "YourStyleImages";
                        const desc = isYourStyles ? "Put a0, a1, a2 etc. files in assets/styles/YourStyleImages" : "Style Thumbnail Pack";
                        const { row, checkbox } = createRow(name, name.replace(/_/g, " ").toUpperCase(), desc, installed);
                        if (isYourStyles) checkbox.disabled = true; // Manual copy only
                        content.appendChild(row);
                        rows.push(checkbox);
                    });
                } else if (node.currentCategory === "assets") {
                    // Generic Assets track
                    const assets = settings.assets || {};
                    Object.entries(assets).forEach(([id, info]) => {
                        // Check if file exists in input/shima_custom/[manifest]/filename
                        const manifestSafe = node.properties.manifestChoice.replace(".json", "");
                        const targetSub = `shima_custom/${manifestSafe}`;
                        
                        // We lack a specific check route for generic assets currently,
                        // so we assume uninstalled unless we add one.
                        // For now, let's just show them as available.
                        const { row, checkbox } = createRow(id, info.name || id, info.description || "General Asset", false, null, info.url);
                        content.appendChild(row);
                        rows.push(checkbox);
                    });
                } else if (node.currentCategory === "settings") {
                    const sDiv = document.createElement("div");
                    sDiv.style.cssText = `display: flex; flex-direction: column; gap: 12px; background: #1a1a1a; padding: 16px; border-radius: 6px; border: 1px solid #333; align-items: center; text-align: center;`;
                    
                    const sLabel = document.createElement("label");
                    sLabel.textContent = "GLOBAL APP SETTINGS";
                    sLabel.style.fontSize = "12px";
                    sLabel.style.fontWeight = "bold";
                    sLabel.style.color = "#ddd";

                    const sDesc = document.createElement("p");
                    sDesc.textContent = "API Keys and active thumbnail pack selection have been moved to the main ComfyUI settings panel for better reliability.";
                    sDesc.style.cssText = `font-size: 10px; color: #888; margin: 0;`;

                    const openSettingsBtn = document.createElement("button");
                    openSettingsBtn.textContent = "Open Global Settings";
                    openSettingsBtn.style.cssText = `background: #06c; border: none; color: white; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 11px; margin-top: 8px;`;
                    openSettingsBtn.onclick = () => {
                        if (window.Shima && window.Shima.openSettings) {
                            window.Shima.openSettings();
                        } else {
                            const settingsBtn = document.querySelector(".comfy-settings-btn");
                            if (settingsBtn) settingsBtn.click();
                        }
                    };

                    sDiv.appendChild(sLabel);
                    sDiv.appendChild(sDesc);
                    sDiv.appendChild(openSettingsBtn);
                    content.appendChild(sDiv);

                    const help = document.createElement("div");
                    help.textContent = "Look for the 'Shima' section in the settings dialog.";
                    help.style.cssText = `font-size: 9px; color: #666; font-style: italic; padding: 4px; text-align: center;`;
                    content.appendChild(help);
                }
                
                checkAllBtn.style.display = node.currentCategory === "settings" ? "none" : "block";
                installBtn.style.display = node.currentCategory === "settings" ? "none" : "block";

                checkAllBtn.onclick = () => {
                    rows.forEach(cb => {
                        if (!cb.disabled) {
                            cb.checked = true;
                            cb.onchange({ target: cb });
                        }
                    });
                };
            };

            const startInstallation = async () => {
                if (node.selectedItems.size === 0) return alert("Please select items to install.");
                
                installBtn.disabled = true;
                installBtn.textContent = "Work in Progress...";

                try {
                    const settings = await api.fetchApi(`/shima/settings/get?manifest=${node.properties.manifestChoice}`).then(r => r.json());
                    if (!settings || settings.error) throw new Error(settings?.error || "Failed to load settings");

                    for (const id of node.selectedItems) {
                        if (node.currentCategory === "models") {
                            const res = await api.fetchApi("/shima/models/download", { 
                                method: "POST", body: JSON.stringify({ model_id: id, manifest: node.properties.manifestChoice }) 
                            });
                            if (!res.ok) {
                                let errMsg = res.statusText;
                                try {
                                    const err = await res.json();
                                    errMsg = err.error || errMsg;
                                } catch(e) {
                                    // Handle non-JSON error (like 500 html page)
                                    errMsg = `Internal Server Error (${res.status})`;
                                }
                                alert(`Download failed: ${errMsg}`);
                                node.triggerErrorPulse();
                            }
                        } else if (node.currentCategory === "stylethumbs") {
                            await api.fetchApi("/shima/assets/download", { 
                                method: "POST", body: JSON.stringify({ pack: id, manifest: node.properties.manifestChoice }) 
                            });
                        } else if (node.currentCategory === "assets") {
                            const manifestSafe = node.properties.manifestChoice.replace(".json", "");
                            const asset = settings.assets[id];
                            if (asset) {
                                const res = await api.fetchApi("/shima/assets/download", { 
                                    method: "POST", body: JSON.stringify({ 
                                        url: asset.url, 
                                        target_subfolder: `shima_custom/${manifestSafe}`, 
                                        manifest: node.properties.manifestChoice 
                                    }) 
                                });
                                if (!res.ok) node.triggerErrorPulse();
                            }
                        } else if (node.currentCategory === "bundles") {
                            // Intent Bundles: trigger multiple internal downloads
                            const b = settings.bundles[id];
                            if (b) {
                                const manifestSafe = node.properties.manifestChoice.replace(".json", "");
                                if (b.packs) for (const p of b.packs) await api.fetchApi("/shima/assets/download", { method: "POST", body: JSON.stringify({ pack: p, manifest: node.properties.manifestChoice }) });
                                if (b.models) for (const m of b.models) await api.fetchApi("/shima/models/download", { method: "POST", body: JSON.stringify({ model_id: m, manifest: node.properties.manifestChoice }) });
                                if (b.assets) {
                                    for (const a of b.assets) {
                                        await api.fetchApi("/shima/assets/download", { 
                                            method: "POST", body: JSON.stringify({ 
                                                url: a.url, 
                                                target_subfolder: a.target_subfolder || `shima_custom/${manifestSafe}`, 
                                                manifest: node.properties.manifestChoice 
                                            }) 
                                        });
                                    }
                                }
                            }
                        }
                    }
                } catch (err) {
                    console.error("[Shima] Installation error:", err);
                    node.triggerErrorPulse();
                } finally {
                    node.selectedItems.clear();
                    installBtn.disabled = false;
                    installBtn.textContent = "Install Selected";
                    refreshUI();
                }
            };

            installBtn.onclick = startInstallation;

            // Security Warning & Upload Logic
            const handleManifestUpload = () => {
                // Obfuscated Warning Fragments
                const s1 = "SVR JUV JCU JMV JMW JUV JMV JMW JUV JMV".split(" "); 
                const partA = "IT IS ABSOLUTELY NECESSARY TO CHECK THE CONTENTS OF THE JSON BEFORE RUNNING THIS OPERATION.";
                const partB = "A bad actor could use this to load files directly to your system.";
                const partC = "For maximum security, we recommend running a virus scan on your comfyUI directory after this install completes unless you have absolute trust in its origins.";
                
                const warningDiv = document.createElement("div");
                warningDiv.style.cssText = `
                    position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                    background: rgba(0,0,0,0.85); z-index: 9999; 
                    display: flex; align-items: center; justify-content: center;
                    backdrop-filter: blur(4px);
                `;
                
                const modal = document.createElement("div");
                modal.style.cssText = `
                    background: #222; border: 2px solid #f33; padding: 25px; 
                    border-radius: 12px; max-width: 450px; text-align: center;
                    color: #eee; font-family: sans-serif;
                `;
                
                modal.innerHTML = `
                    <h2 style="color: #f33; margin-top: 0;">⚠️ SECURITY WARNING</h2>
                    <p style="font-weight: bold; line-height: 1.5;">${partA}</p>
                    <p style="color: #bbb; font-size: 13px;">${partB}</p>
                    <div style="background: #311; padding: 10px; border-radius: 6px; margin: 15px 0; font-size: 12px; color: #f99; border: 1px solid #522;">
                        ${partC}
                    </div>
                    <div style="display: flex; gap: 10px; justify-content: center; margin-top: 20px;">
                        <button id="cancelWarn" style="background: #444; border: none; color: white; padding: 8px 16px; border-radius: 4px; cursor: pointer;">CANCEL</button>
                        <button id="acceptWarn" style="background: #f33; border: none; color: white; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold;">I UNDERSTAND, CONTINUE</button>
                    </div>
                `;
                
                warningDiv.appendChild(modal);
                document.body.appendChild(warningDiv);
                
                modal.querySelector("#cancelWarn").onclick = () => warningDiv.remove();
                modal.querySelector("#acceptWarn").onclick = () => {
                    warningDiv.remove();
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = ".json";
                    input.onchange = async (e) => {
                        const file = e.target.files[0];
                        if (!file) return;
                        
                        const formData = new FormData();
                        formData.append("file", file);
                        
                        const res = await api.fetchApi("/shima/manifests/upload", {
                            method: "POST",
                            body: formData
                        });
                        const data = await res.json();
                        if (data.success) {
                            node.properties.manifestChoice = data.filename || "Default";
                            refreshUI();
                        } else {
                            alert("Upload failed: " + data.error);
                        }
                    };
                    input.click();
                };
            };

            // Background Polling for Progress
            const pollProgress = async () => {
                try {
                    const res = await api.fetchApi("/shima/models/progress");
                    node.downloadStatus = await res.json();
                    
                    // Always refresh now to catch bundle syncing updates
                    refreshUI();
                } catch (e) {}
            };

            setInterval(pollProgress, 2000);
            refreshUI();
        };
    }
});
