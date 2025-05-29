"use strict";

class ModernDial {
    static get RADS_PER_TICK() { return 2 * Math.PI / 100; }
    static get MAX_WIDTH() { return 400; }

    constructor(parentDiv, options = {}) {
        this.parentDiv = parentDiv;
        
        // Default theme
        this.theme = {
            primary: "#2196F3",
            secondary: "#1976D2",
            accent: "#64B5F6",
            background: "#ffffff",
            text: "#333333",
            tickMinor: "#e0e0e0",
            tickMajor: "#bdbdbd",
            needle: "#F44336",
            glow: "rgba(33, 150, 243, 0.3)"
        };

        // Apply custom theme if provided
        if (options.theme) {
            Object.assign(this.theme, options.theme);
        }

        // Apply legacy options for compatibility
        if (options.numberColor) {
            this.theme.text = options.numberColor;
        }
        if (options.needleColor) {
            this.theme.needle = options.needleColor;
        }

        this.ctxDial = null;
        this.dialValue = 0;
        this.targetValue = 0;
        this.animationId = null;
        
        this.bodyWidth = 100;
        this.bodyHeight = 100;
        this.bodyMiddle = 50;

        this.paddingDiv = undefined;
        this.bodyCanvas = undefined;
        this.digitalDisplay = undefined;

        if (this.parentDiv) this.init();
    }

    init() {
        this.paddingDiv = document.createElement("div");
        this.bodyCanvas = document.createElement("canvas");
        this.digitalDisplay = document.createElement("div");

        this.ctxDial = this.bodyCanvas.getContext("2d");

        this.parentDiv.innerHTML = "";
        
        this.digitalDisplay.style.cssText = `
            position: absolute;
            bottom: 25%;
            left: 50%;
            transform: translateX(-50%);
            font-size: 24px;
            font-weight: 600;
            color: ${this.theme.text};
            background: rgba(255, 255, 255, 0.9);
            padding: 8px 16px;
            border-radius: 20px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            backdrop-filter: blur(10px);
            font-variant-numeric: tabular-nums;
        `;

        this.paddingDiv.style.position = "relative";
        this.paddingDiv.appendChild(this.bodyCanvas);
        this.paddingDiv.appendChild(this.digitalDisplay);
        this.parentDiv.appendChild(this.paddingDiv);
        
        window.addEventListener("resize", () => this.resize());
        this.resize();
    }

    resize() {
        let padRect = this.paddingDiv.getBoundingClientRect();
        let parentRect = this.parentDiv.getBoundingClientRect();

        this.bodyCanvas.width = Math.min(padRect.width, ModernDial.MAX_WIDTH);
        this.bodyCanvas.height = this.bodyCanvas.width;

        this.bodyWidth = this.bodyCanvas.width;
        this.bodyHeight = this.bodyCanvas.height;
        this.bodyMiddle = this.bodyWidth / 2;
        this.radius = this.bodyWidth * 0.4;

        let topPad = (parentRect.height - this.bodyCanvas.height) / 2;
        let leftPad = (padRect.width - this.bodyCanvas.width) / 2;
        this.paddingDiv.style.paddingTop = topPad + "px";
        this.paddingDiv.style.paddingLeft = leftPad + "px";

        this.bodyDraw();
    }

    bodyDraw() {
        this.ctxDial.clearRect(0, 0, this.bodyWidth, this.bodyHeight);
        
        if (this.bodyWidth < 5) return;

        // Enable anti-aliasing
        this.ctxDial.imageSmoothingEnabled = true;
        this.ctxDial.imageSmoothingQuality = 'high';

        // Draw outer glow
        this.ctxDial.save();
        this.ctxDial.shadowColor = this.theme.glow;
        this.ctxDial.shadowBlur = 20;
        this.ctxDial.beginPath();
        this.ctxDial.arc(this.bodyMiddle, this.bodyMiddle, this.radius * 1.05, 0, 2 * Math.PI);
        this.ctxDial.fillStyle = this.theme.background;
        this.ctxDial.fill();
        this.ctxDial.restore();

        // Draw background with gradient
        const bgGradient = this.ctxDial.createRadialGradient(
            this.bodyMiddle, this.bodyMiddle, 0,
            this.bodyMiddle, this.bodyMiddle, this.radius
        );
        bgGradient.addColorStop(0, this.theme.background);
        bgGradient.addColorStop(1, this.adjustColor(this.theme.background, -10));
        
        this.ctxDial.beginPath();
        this.ctxDial.fillStyle = bgGradient;
        this.ctxDial.arc(this.bodyMiddle, this.bodyMiddle, this.radius, 0, 2 * Math.PI);
        this.ctxDial.fill();

        // Draw outer ring with gradient
        const ringGradient = this.ctxDial.createLinearGradient(
            this.bodyMiddle - this.radius, this.bodyMiddle - this.radius,
            this.bodyMiddle + this.radius, this.bodyMiddle + this.radius
        );
        ringGradient.addColorStop(0, this.theme.primary);
        ringGradient.addColorStop(0.5, this.theme.accent);
        ringGradient.addColorStop(1, this.theme.secondary);
        
        this.drawArc(0, 2 * Math.PI, this.radius, ringGradient, this.bodyWidth * 0.015);

        // Draw colored zones
        this.drawColoredZone(-Math.PI / 2, -Math.PI / 2 + Math.PI * 0.4, "#4CAF50", 0.15);
        this.drawColoredZone(-Math.PI / 2 + Math.PI * 0.4, -Math.PI / 2 + Math.PI * 1.6, "#2196F3", 0.15);
        this.drawColoredZone(-Math.PI / 2 + Math.PI * 1.6, -Math.PI / 2 + Math.PI * 2, "#F44336", 0.15);

        // Draw minor ticks
        let thisTheta = -Math.PI / 2;
        for (let i = 0; i < 100; i++) {
            if (i % 10 !== 0) {
                this.drawLineAngle(thisTheta, this.theme.tickMinor, this.bodyWidth * 0.003, this.radius * 0.9, this.radius * 0.95);
            }
            thisTheta += ModernDial.RADS_PER_TICK;
        }

        // Draw major ticks
        thisTheta = -Math.PI / 2;
        for (let i = 0; i < 10; i++) {
            this.drawLineAngle(thisTheta, this.theme.tickMajor, this.bodyWidth * 0.008, this.radius * 0.85, this.radius * 0.95);
            thisTheta += ModernDial.RADS_PER_TICK * 10;
        }

        // Draw numbers
        thisTheta = -Math.PI / 2;
        for (let i = 0; i < 10; i++) {
            const value = i * 10;
            this.drawTextAngle(thisTheta, value.toString(), this.theme.text, 0.08, 0.7);
            thisTheta += ModernDial.RADS_PER_TICK * 10;
        }

        // Draw needle with shadow
        if (this.dialValue >= -99 && this.dialValue <= 99) {
            const angle = -Math.PI / 2 + ModernDial.RADS_PER_TICK * this.dialValue;
            
            // Needle shadow
            this.ctxDial.save();
            this.ctxDial.shadowColor = "rgba(0, 0, 0, 0.3)";
            this.ctxDial.shadowBlur = 5;
            this.ctxDial.shadowOffsetX = 2;
            this.ctxDial.shadowOffsetY = 2;
            this.drawNeedle(angle, this.theme.needle, 0.06, 0.85);
            this.ctxDial.restore();
        }

        // Draw center cap with gradient
        const capGradient = this.ctxDial.createRadialGradient(
            this.bodyMiddle - this.radius * 0.05, this.bodyMiddle - this.radius * 0.05, 0,
            this.bodyMiddle, this.bodyMiddle, this.radius * 0.12
        );
        capGradient.addColorStop(0, this.adjustColor(this.theme.needle, 20));
        capGradient.addColorStop(1, this.theme.needle);
        
        this.drawArc(0, 2 * Math.PI, this.radius * 0.08, capGradient, this.radius * 0.01, true);

        // Update digital display
        this.digitalDisplay.textContent = Math.round(this.dialValue).toString();
    }

    drawColoredZone(startAngle, endAngle, color, opacity) {
        this.ctxDial.save();
        this.ctxDial.globalAlpha = opacity;
        this.ctxDial.beginPath();
        this.ctxDial.arc(this.bodyMiddle, this.bodyMiddle, this.radius * 0.82, startAngle, endAngle);
        this.ctxDial.arc(this.bodyMiddle, this.bodyMiddle, this.radius * 0.7, endAngle, startAngle, true);
        this.ctxDial.closePath();
        this.ctxDial.fillStyle = color;
        this.ctxDial.fill();
        this.ctxDial.restore();
    }

    drawNeedle(angle, color, base, height) {
        const tip = {
            x: this.bodyMiddle + this.radius * height * Math.cos(angle),
            y: this.bodyMiddle + this.radius * height * Math.sin(angle)
        };
        const base1 = {
            x: this.bodyMiddle + this.radius * base * Math.cos(angle + Math.PI / 2),
            y: this.bodyMiddle + this.radius * base * Math.sin(angle + Math.PI / 2)
        };
        const base2 = {
            x: this.bodyMiddle + this.radius * base * Math.cos(angle - Math.PI / 2),
            y: this.bodyMiddle + this.radius * base * Math.sin(angle - Math.PI / 2)
        };

        this.ctxDial.beginPath();
        this.ctxDial.moveTo(tip.x, tip.y);
        this.ctxDial.lineTo(base1.x, base1.y);
        this.ctxDial.lineTo(base2.x, base2.y);
        this.ctxDial.closePath();
        this.ctxDial.fillStyle = color;
        this.ctxDial.fill();
    }

    drawTextAngle(angle, text, color, ratio, textRadius) {
        const textSize = this.radius * ratio;
        this.ctxDial.save();
        this.ctxDial.font = `${textSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
        this.ctxDial.fillStyle = color;
        this.ctxDial.textAlign = "center";
        this.ctxDial.textBaseline = "middle";
        
        const x = this.bodyMiddle + this.radius * textRadius * Math.cos(angle);
        const y = this.bodyMiddle + this.radius * textRadius * Math.sin(angle);
        
        this.ctxDial.fillText(text, x, y);
        this.ctxDial.restore();
    }

    drawLineAngle(angle, color, width, rStart, rEnd) {
        this.ctxDial.beginPath();
        this.ctxDial.lineWidth = width;
        this.ctxDial.strokeStyle = color;
        this.ctxDial.lineCap = "round";
        this.ctxDial.moveTo(this.bodyMiddle + rStart * Math.cos(angle), this.bodyMiddle + rStart * Math.sin(angle));
        this.ctxDial.lineTo(this.bodyMiddle + rEnd * Math.cos(angle), this.bodyMiddle + rEnd * Math.sin(angle));
        this.ctxDial.stroke();
    }

    drawArc(startAngle, endAngle, radius, color, width, isFill = false) {
        this.ctxDial.beginPath();
        this.ctxDial.lineWidth = width;
        this.ctxDial.strokeStyle = color;
        this.ctxDial.fillStyle = color;
        this.ctxDial.arc(this.bodyMiddle, this.bodyMiddle, radius, startAngle, endAngle);
        isFill ? this.ctxDial.fill() : this.ctxDial.stroke();
    }

    setDial(value, animate = true) {
        const num = parseFloat(value);
        
        if (!isNaN(num) && num >= -99 && num <= 99) {
            this.targetValue = num;
            
            if (animate) {
                this.animateNeedle();
            } else {
                this.dialValue = num;
                this.bodyDraw();
            }
        }
    }

    animateNeedle() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }

        const animate = () => {
            const diff = this.targetValue - this.dialValue;
            
            if (Math.abs(diff) < 0.1) {
                this.dialValue = this.targetValue;
                this.bodyDraw();
                return;
            }

            this.dialValue += diff * 0.1;
            this.bodyDraw();
            this.animationId = requestAnimationFrame(animate);
        };

        animate();
    }

    adjustColor(color, amount) {
        const usePound = color[0] === '#';
        const col = usePound ? color.slice(1) : color;
        const num = parseInt(col, 16);
        let r = (num >> 16) + amount;
        let g = ((num >> 8) & 0x00FF) + amount;
        let b = (num & 0x0000FF) + amount;
        r = r > 255 ? 255 : r < 0 ? 0 : r;
        g = g > 255 ? 255 : g < 0 ? 0 : g;
        b = b > 255 ? 255 : b < 0 ? 0 : b;
        return (usePound ? '#' : '') + (r << 16 | g << 8 | b).toString(16).padStart(6, '0');
    }

    setTheme(theme) {
        Object.assign(this.theme, theme);
        this.digitalDisplay.style.color = this.theme.text;
        this.bodyDraw();
    }
}

// For backward compatibility, create an alias
const Dial = ModernDial;