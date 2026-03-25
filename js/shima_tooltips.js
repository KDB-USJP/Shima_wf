/**
 * Shima Tooltip System - Reusable HTML/Markdown Hover State
 * Centralized singleton for high-fidelity documentation overlays.
 */

window.Shima = window.Shima || {};

window.Shima.Tooltip = (function() {
    let tooltipDiv = null;
    let isVisible = false;

    function init() {
        if (tooltipDiv) return;

        tooltipDiv = document.createElement("div");
        tooltipDiv.id = "shima-global-tooltip";
        tooltipDiv.style.cssText = `
            position: fixed;
            z-index: 10000;
            pointer-events: none;
            background: rgba(20, 20, 20, 0.85);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            color: #eee;
            padding: 12px 16px;
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
            font-family: inherit;
            font-size: 13px;
            line-height: 1.5;
            max-width: 350px;
            opacity: 0;
            transition: opacity 0.15s ease-out;
            transform: translate(15px, 15px);
        `;
        document.body.appendChild(tooltipDiv);
    }

    function parseMarkdown(text) {
        if (!text) return "";
        // Reusing and slightly improving Shima's regex parser
        return text
            .replace(/^# (.*$)/gim, '<h3 style="margin: 0 0 8px 0; color: #fff; border-bottom: 1px solid #444; padding-bottom: 4px;">$1</h3>')
            .replace(/^## (.*$)/gim, '<h4 style="margin: 10px 0 6px 0; color: #fff;">$1</h4>')
            .replace(/\*\*(.*)\*\*/gim, '<b style="color: #fff;">$1</b>')
            .replace(/\*(.*)\*/gim, '<i>$1</i>')
            .replace(/\n/gim, '<br>');
    }

    return {
        show: function(content, type, x, y) {
            init();
            if (!content || content.trim() === "") return;
            if (typeof x === "undefined" || typeof y === "undefined") return;

            let html = "";
            if (type === "Markdown") {
                html = parseMarkdown(content);
            } else if (type === "HTML") {
                html = content;
            } else {
                // Plain text - preserve line breaks
                html = content.replace(/\n/gim, '<br>');
            }

            tooltipDiv.innerHTML = html;
            tooltipDiv.style.left = x + "px";
            tooltipDiv.style.top = y + "px";
            tooltipDiv.style.opacity = "1";
            isVisible = true;
        },

        update: function(x, y) {
            if (!tooltipDiv || !isVisible) return;
            if (typeof x === "undefined" || typeof y === "undefined") return;
            
            // Boundary checks to keep tooltip on screen
            const padding = 20;
            const tw = tooltipDiv.offsetWidth;
            const th = tooltipDiv.offsetHeight;
            const sw = window.innerWidth;
            const sh = window.innerHeight;

            let finalX = x + 15;
            let finalY = y + 15;

            if (finalX + tw > sw - padding) finalX = x - tw - 15;
            if (finalY + th > sh - padding) finalY = y - th - 15;

            tooltipDiv.style.left = finalX + "px";
            tooltipDiv.style.top = finalY + "px";
        },

        hide: function() {
            if (tooltipDiv) {
                tooltipDiv.style.opacity = "0";
                isVisible = false;
            }
        }
    };
})();
