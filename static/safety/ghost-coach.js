(function () {
    "use strict";

    const DEFAULT_EDGES = [
        [0, 1], [0, 2], [1, 3], [2, 4], [5, 6], [5, 7], [7, 9],
        [6, 8], [8, 10], [5, 11], [6, 12], [11, 12], [11, 13],
        [13, 15], [12, 14], [14, 16],
    ];
    const COLORS = {
        good: "#4ade80",
        warn: "#facc15",
        alert: "#fb4d56",
        low: "#94a3b8",
        target: "rgba(34, 211, 238, 0.72)",
        arrow: "#fb923c",
        arrowText: "#fff7ed",
    };
    const STATE_RANK = { low: 0, good: 1, warn: 2, alert: 3 };

    function clonePoints(points) {
        return points.map((point) => point.slice());
    }

    function demoPayload(step) {
        const bottom = [
            [0.500, 0.245, 1], [0.485, 0.235, 1], [0.515, 0.235, 1], [0.465, 0.245, 1], [0.535, 0.245, 1],
            [0.405, 0.380, 1], [0.595, 0.380, 1], [0.365, 0.475, 1], [0.635, 0.475, 1], [0.345, 0.570, 1], [0.655, 0.570, 1],
            [0.435, 0.590, 1], [0.565, 0.590, 1], [0.345, 0.655, 1], [0.655, 0.655, 1], [0.315, 0.875, 1], [0.685, 0.875, 1],
        ];
        const ready = [
            [0.500, 0.100, 1], [0.485, 0.090, 1], [0.515, 0.090, 1], [0.465, 0.100, 1], [0.535, 0.100, 1],
            [0.420, 0.245, 1], [0.580, 0.245, 1], [0.400, 0.390, 1], [0.600, 0.390, 1], [0.390, 0.525, 1], [0.610, 0.525, 1],
            [0.445, 0.510, 1], [0.555, 0.510, 1], [0.440, 0.710, 1], [0.560, 0.710, 1], [0.415, 0.925, 1], [0.585, 0.925, 1],
        ];
        const actual = clonePoints(step === "counted" ? ready : bottom);
        const jointStates = Object.fromEntries(Array.from({ length: 17 }, (_, index) => [String(index), "good"]));
        let guides = [];
        let message = "动作稳定，继续保持";
        let phase = step === "counted" ? "ready" : "bottom";
        let count = step === "counted" ? 1 : 0;

        if (step === "error") {
            actual[13][0] = 0.455;
            actual[14][0] = 0.545;
            actual[5][0] += 0.075;
            actual[6][0] += 0.075;
            [13, 14].forEach((index) => { jointStates[String(index)] = "alert"; });
            [5, 6, 11, 12].forEach((index) => { jointStates[String(index)] = "warn"; });
            guides = [
                {
                    code: "squat_knees_out",
                    label: "膝盖向外打开",
                    arrows: [
                        { start: [0.455, 0.655], end: [0.345, 0.655] },
                        { start: [0.545, 0.655], end: [0.655, 0.655] },
                    ],
                },
                {
                    code: "squat_chest_up",
                    label: "胸口抬起，躯干回正",
                    arrows: [{ start: [0.575, 0.380], end: [0.535, 0.300] }],
                },
            ];
            message = "跟随箭头修正膝盖和躯干";
        }

        return {
            available: true,
            reason: "",
            message,
            standard_id: "RECRUIT_SQUAT_50_V1",
            template_version: "1.0.0-demo",
            template_phase: phase,
            confidence: 0.99,
            frame: { width: 1280, height: 720 },
            mirrored: false,
            skeleton_edges: DEFAULT_EDGES,
            actual_keypoints: actual,
            target_keypoints: step === "counted" ? ready : bottom,
            joint_states: jointStates,
            guides,
            max_guides: 2,
            arrow_pulse_hz: 1.25,
            demo_step: step,
            demo_rep_count: count,
        };
    }

    class GhostCoachOverlay {
        constructor(canvas, statusElement) {
            if (!canvas) throw new Error("GhostCoachOverlay requires a canvas");
            this.canvas = canvas;
            this.context = canvas.getContext("2d");
            this.statusElement = statusElement || null;
            this.payload = null;
            this.reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            this.animationFrame = null;
            this._animate = this._animate.bind(this);
            this.animationFrame = window.requestAnimationFrame(this._animate);
            this.reset();
        }

        update(payload) {
            this.payload = payload || null;
            if (!payload || !payload.available) {
                const message = payload?.message || "视觉引导待命";
                this._setStatus("unavailable", message, payload?.reason || "idle", []);
                return;
            }
            const codes = (payload.guides || []).map((guide) => guide.code);
            const state = codes.length ? "guiding" : "stable";
            this._setStatus(state, payload.message || (codes.length ? "请跟随箭头修正" : "动作稳定"), "", codes);
        }

        reset(message = "视觉引导待命") {
            this.payload = null;
            this._setStatus("unavailable", message, "idle", []);
            this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }

        destroy() {
            if (this.animationFrame) window.cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }

        _setStatus(state, message, reason, codes) {
            if (!this.statusElement) return;
            this.statusElement.textContent = message;
            this.statusElement.dataset.ghostState = state;
            this.statusElement.dataset.ghostReason = reason || "";
            this.statusElement.dataset.ghostGuides = (codes || []).join(",");
            this.statusElement.dataset.ghostPhase = this.payload?.template_phase || "";
            this.statusElement.dataset.ghostDemoStep = this.payload?.demo_step || "";
            this.statusElement.dataset.ghostAvailable = String(Boolean(this.payload?.available));
        }

        _animate(timestamp) {
            this._draw(timestamp || performance.now());
            this.animationFrame = window.requestAnimationFrame(this._animate);
        }

        _resize() {
            const rect = this.canvas.getBoundingClientRect();
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const width = Math.max(1, Math.round(rect.width * dpr));
            const height = Math.max(1, Math.round(rect.height * dpr));
            if (this.canvas.width !== width || this.canvas.height !== height) {
                this.canvas.width = width;
                this.canvas.height = height;
            }
            this.context.setTransform(dpr, 0, 0, dpr, 0, 0);
            return { width: rect.width, height: rect.height };
        }

        _project(point, display) {
            const frame = this.payload?.frame || { width: 1280, height: 720 };
            const scale = Math.max(display.width / frame.width, display.height / frame.height);
            const offsetX = (display.width - frame.width * scale) / 2;
            const offsetY = (display.height - frame.height * scale) / 2;
            return {
                x: offsetX + Number(point[0]) * frame.width * scale,
                y: offsetY + Number(point[1]) * frame.height * scale,
                confidence: Number(point[2] ?? 1),
            };
        }

        _draw(timestamp) {
            const display = this._resize();
            const ctx = this.context;
            ctx.clearRect(0, 0, display.width, display.height);
            const payload = this.payload;
            if (!payload?.available) return;

            this._drawSkeleton(payload.target_keypoints, payload.skeleton_edges, display, {
                color: COLORS.target,
                width: 3,
                dashed: true,
                nodes: false,
            });
            this._drawCurrentSkeleton(payload, display);
            this._drawGuides(payload, display, timestamp);
        }

        _drawSkeleton(points, edges, display, style) {
            if (!Array.isArray(points)) return;
            const ctx = this.context;
            ctx.save();
            ctx.strokeStyle = style.color;
            ctx.lineWidth = style.width;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.setLineDash(style.dashed ? [8, 7] : []);
            (edges || DEFAULT_EDGES).forEach(([from, to]) => {
                const first = this._project(points[from], display);
                const second = this._project(points[to], display);
                if (first.confidence < 0.35 || second.confidence < 0.35) return;
                ctx.beginPath();
                ctx.moveTo(first.x, first.y);
                ctx.lineTo(second.x, second.y);
                ctx.stroke();
            });
            ctx.restore();
        }

        _jointState(payload, index) {
            const point = payload.actual_keypoints[index];
            if (Number(point?.[2] ?? 0) < 0.35) return "low";
            return payload.joint_states?.[String(index)] || "good";
        }

        _drawCurrentSkeleton(payload, display) {
            const ctx = this.context;
            const points = payload.actual_keypoints || [];
            ctx.save();
            ctx.lineWidth = 4;
            ctx.lineCap = "round";
            ctx.setLineDash([]);
            (payload.skeleton_edges || DEFAULT_EDGES).forEach(([from, to]) => {
                if (!points[from] || !points[to]) return;
                const first = this._project(points[from], display);
                const second = this._project(points[to], display);
                const firstState = this._jointState(payload, from);
                const secondState = this._jointState(payload, to);
                const state = STATE_RANK[firstState] >= STATE_RANK[secondState] ? firstState : secondState;
                ctx.strokeStyle = COLORS[state];
                ctx.beginPath();
                ctx.moveTo(first.x, first.y);
                ctx.lineTo(second.x, second.y);
                ctx.stroke();
            });
            points.forEach((point, index) => {
                const projected = this._project(point, display);
                const state = this._jointState(payload, index);
                ctx.fillStyle = COLORS[state];
                ctx.strokeStyle = "rgba(15, 23, 42, 0.92)";
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(projected.x, projected.y, state === "alert" ? 7 : 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            });
            ctx.restore();
        }

        _drawGuides(payload, display, timestamp) {
            const ctx = this.context;
            const hz = Math.min(1.5, Math.max(0.5, Number(payload.arrow_pulse_hz || 1.25)));
            const pulse = this.reducedMotion ? 0.84 : 0.77 + 0.15 * Math.sin(timestamp * Math.PI * 2 * hz / 1000);
            (payload.guides || []).slice(0, Number(payload.max_guides || 2)).forEach((guide, guideIndex) => {
                (guide.arrows || []).forEach((arrow) => {
                    const start = this._project(arrow.start, display);
                    const end = this._project(arrow.end, display);
                    this._drawArrow(start, end, pulse);
                });
                const firstArrow = guide.arrows?.[0];
                if (firstArrow) {
                    const labelPoint = this._project(firstArrow.end, display);
                    this._drawLabel(guide.label, labelPoint.x, labelPoint.y + 22 + guideIndex * 3, pulse);
                }
            });
            ctx.globalAlpha = 1;
        }

        _drawArrow(start, end, alpha) {
            const ctx = this.context;
            const angle = Math.atan2(end.y - start.y, end.x - start.x);
            const head = 13;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = COLORS.arrow;
            ctx.fillStyle = COLORS.arrow;
            ctx.lineWidth = 6;
            ctx.lineCap = "round";
            ctx.shadowColor = "rgba(251, 146, 60, 0.72)";
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(end.x, end.y);
            ctx.lineTo(end.x - head * Math.cos(angle - Math.PI / 6), end.y - head * Math.sin(angle - Math.PI / 6));
            ctx.lineTo(end.x - head * Math.cos(angle + Math.PI / 6), end.y - head * Math.sin(angle + Math.PI / 6));
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }

        _drawLabel(text, x, y, alpha) {
            const ctx = this.context;
            ctx.save();
            ctx.font = "600 14px 'Microsoft YaHei', 'PingFang SC', sans-serif";
            const width = ctx.measureText(text).width + 18;
            ctx.globalAlpha = Math.min(1, alpha + 0.08);
            ctx.fillStyle = "rgba(124, 45, 18, 0.88)";
            ctx.fillRect(x - width / 2, y - 17, width, 25);
            ctx.fillStyle = COLORS.arrowText;
            ctx.textAlign = "center";
            ctx.fillText(text, x, y);
            ctx.restore();
        }
    }

    function startDemo(overlay, step, onStep) {
        const normalized = ["error", "correct", "counted"].includes(step) ? step : "sequence";
        const apply = (name) => {
            const payload = demoPayload(name);
            overlay.update(payload);
            if (typeof onStep === "function") onStep(payload);
        };
        if (normalized !== "sequence") {
            apply(normalized);
            return () => {};
        }
        apply("error");
        const timers = [
            window.setTimeout(() => apply("correct"), 2600),
            window.setTimeout(() => apply("counted"), 5000),
        ];
        return () => timers.forEach((timer) => window.clearTimeout(timer));
    }

    window.GhostCoachOverlay = GhostCoachOverlay;
    window.GhostCoachDemo = { payload: demoPayload, start: startDemo };
})();
