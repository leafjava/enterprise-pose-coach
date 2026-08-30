/* ==========================================================================
   练了么 — landing page motion layer.

   The hero canvas replays a real squat cycle using the four phase templates
   shipped in config/posture_standards/recruit_squat_50_v1.json, drawn with the
   same COCO-17 skeleton the runtime overlay uses. It is a faithful preview of
   the product, not decorative filler.
   ========================================================================== */
(function () {
    "use strict";

    var reduceMotion =
        window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* ---------------------------------------------------------------- data */
    // COCO-17, normalized to the capture frame. Source: RECRUIT_SQUAT_50_V1.
    var TEMPLATES = {
        ready: [[0.5,0.1],[0.485,0.09],[0.515,0.09],[0.465,0.1],[0.535,0.1],[0.42,0.245],[0.58,0.245],[0.4,0.39],[0.6,0.39],[0.39,0.525],[0.61,0.525],[0.445,0.51],[0.555,0.51],[0.44,0.71],[0.56,0.71],[0.415,0.925],[0.585,0.925]],
        descending: [[0.5,0.165],[0.485,0.155],[0.515,0.155],[0.465,0.165],[0.535,0.165],[0.415,0.305],[0.585,0.305],[0.385,0.43],[0.615,0.43],[0.37,0.545],[0.63,0.545],[0.44,0.535],[0.56,0.535],[0.365,0.695],[0.635,0.695],[0.335,0.9],[0.665,0.9]],
        bottom: [[0.5,0.245],[0.485,0.235],[0.515,0.235],[0.465,0.245],[0.535,0.245],[0.405,0.38],[0.595,0.38],[0.365,0.475],[0.635,0.475],[0.345,0.57],[0.655,0.57],[0.435,0.59],[0.565,0.59],[0.345,0.655],[0.655,0.655],[0.315,0.875],[0.685,0.875]]
    };

    // Torso and limbs only. COCO-17 has no neck edge and its five face points
    // read as a detached cluster at this size, so the hero draws a head circle
    // and a neck instead — same 17 points, more legible as a person.
    var EDGES = [
        [5,6],[5,7],[7,9],[6,8],[8,10],
        [5,11],[6,12],[11,12],[11,13],[13,15],[12,14],[14,16]
    ];
    var NOSE = 0;
    var L_EAR = 3;
    var R_EAR = 4;
    var L_SHOULDER = 5;
    var R_SHOULDER = 6;

    var COLOR = {
        target: "rgba(34, 211, 238, 0.42)",
        good: "#37d99b",
        goodDim: "rgba(55, 217, 155, 0.9)",
        warn: "#fbbf24",
        alert: "#fb923c",
        joint: "#eaf1fb",
        echo: "rgba(93, 139, 255, 0.16)"
    };

    // One rep, in seconds. Descend, hold, rise, reset.
    var REP_SECONDS = 4.2;
    var CUES = {
        good: { text: "动作稳定，节奏保持住", tone: "good" },
        alert: { text: "膝盖向外打开，跟着脚尖方向走", tone: "alert" },
        counted: { text: "完整周期 · 计数 +1", tone: "good" }
    };

    /* ------------------------------------------------------------- helpers */
    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    function lerpPose(from, to, t) {
        var out = [];
        for (var i = 0; i < from.length; i++) {
            out.push([lerp(from[i][0], to[i][0], t), lerp(from[i][1], to[i][1], t)]);
        }
        return out;
    }

    function easeInOut(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function clonePose(pose) {
        return pose.map(function (p) {
            return [p[0], p[1]];
        });
    }

    /* -------------------------------------------------------- hero canvas */
    function HeroStage(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.echoes = [];
        this.reps = 0;
        this.phase = "ready";
        this.cue = CUES.good;
        this.running = false;
        this.elapsed = 0;
        this.lastTick = 0;
        this.rafId = 0;
        this.onscreen = true;

        this.countEl = document.getElementById("heroReps");
        this.phaseEl = document.getElementById("heroPhase");
        this.cueEl = document.getElementById("heroCue");
        this.cueTextEl = document.getElementById("heroCueText");

        this._frame = this._frame.bind(this);
    }

    HeroStage.prototype.resize = function () {
        var rect = this.canvas.getBoundingClientRect();
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var w = Math.max(1, Math.round(rect.width * dpr));
        var h = Math.max(1, Math.round(rect.height * dpr));
        if (this.canvas.width !== w || this.canvas.height !== h) {
            this.canvas.width = w;
            this.canvas.height = h;
        }
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        return { w: rect.width, h: rect.height };
    };

    // Map a normalized keypoint into canvas space, preserving body proportions.
    HeroStage.prototype.project = function (point, box) {
        var scale = (box.h * 0.88) / 0.835;
        var top = box.h * 0.06 - 0.09 * scale;
        return {
            x: box.w / 2 + (point[0] - 0.5) * scale,
            y: top + point[1] * scale
        };
    };

    // The scripted rep: every third rep drifts the knees inward so the
    // correction layer has something real to point at.
    HeroStage.prototype.poseAt = function (elapsed) {
        var repIndex = Math.floor(elapsed / REP_SECONDS);
        var t = (elapsed % REP_SECONDS) / REP_SECONDS;
        var faulty = repIndex % 3 === 2;

        var pose;
        var phase;
        var depth;

        if (t < 0.34) {
            depth = easeInOut(t / 0.34);
            pose = lerpPose(TEMPLATES.ready, TEMPLATES.bottom, depth);
            phase = "下降";
        } else if (t < 0.5) {
            depth = 1;
            pose = clonePose(TEMPLATES.bottom);
            phase = "底部";
        } else if (t < 0.84) {
            depth = 1 - easeInOut((t - 0.5) / 0.34);
            pose = lerpPose(TEMPLATES.ready, TEMPLATES.bottom, depth);
            phase = "上升";
        } else {
            depth = 0;
            pose = clonePose(TEMPLATES.ready);
            phase = "顶点";
        }

        var drift = faulty ? depth * 0.055 : 0;
        if (drift > 0) {
            pose[13][0] += drift; // left knee collapses in
            pose[14][0] -= drift; // right knee collapses in
        }

        return {
            pose: pose,
            phase: phase,
            depth: depth,
            repIndex: repIndex,
            faulty: faulty && depth > 0.45,
            cycle: t
        };
    };

    HeroStage.prototype.drawSkeleton = function (pose, box, opts) {
        var ctx = this.ctx;
        ctx.save();
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.lineWidth = opts.width;
        ctx.strokeStyle = opts.color;
        ctx.globalAlpha = opts.alpha == null ? 1 : opts.alpha;
        ctx.setLineDash(opts.dashed ? [7, 6] : []);
        if (opts.glow) {
            ctx.shadowColor = opts.glow;
            ctx.shadowBlur = 14;
        }
        for (var i = 0; i < EDGES.length; i++) {
            var a = this.project(pose[EDGES[i][0]], box);
            var b = this.project(pose[EDGES[i][1]], box);
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
        }
        this.drawHead(pose, box);
        ctx.restore();
    };

    // Head circle sized off the ear span, plus a neck down to the shoulder
    // midpoint. Inherits the caller's stroke, dash and glow.
    HeroStage.prototype.drawHead = function (pose, box) {
        var ctx = this.ctx;
        var nose = this.project(pose[NOSE], box);
        var left = this.project(pose[L_EAR], box);
        var right = this.project(pose[R_EAR], box);
        var shoulderL = this.project(pose[L_SHOULDER], box);
        var shoulderR = this.project(pose[R_SHOULDER], box);

        var radius = Math.max(6, Math.abs(right.x - left.x) * 0.78);
        var neck = { x: (shoulderL.x + shoulderR.x) / 2, y: (shoulderL.y + shoulderR.y) / 2 };

        ctx.beginPath();
        ctx.arc(nose.x, nose.y, radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(nose.x, nose.y + radius);
        ctx.lineTo(neck.x, neck.y);
        ctx.stroke();
    };

    HeroStage.prototype.drawJoints = function (pose, box, faulty) {
        var ctx = this.ctx;
        var flagged = { 13: true, 14: true, 11: true, 12: true };
        ctx.save();
        // Skip 0–4: the face points live inside the head circle.
        for (var i = 5; i < pose.length; i++) {
            var p = this.project(pose[i], box);
            var isFlagged = faulty && flagged[i];
            var r = isFlagged ? 5.2 : 3.6;
            ctx.beginPath();
            ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
            ctx.fillStyle = isFlagged ? COLOR.alert : COLOR.joint;
            ctx.shadowColor = isFlagged ? "rgba(251,146,60,0.7)" : "rgba(120,170,255,0.55)";
            ctx.shadowBlur = 10;
            ctx.fill();
        }
        ctx.restore();
    };

    HeroStage.prototype.drawArrow = function (from, to, alpha) {
        var ctx = this.ctx;
        var angle = Math.atan2(to.y - from.y, to.x - from.x);
        var head = 9;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = COLOR.alert;
        ctx.fillStyle = COLOR.alert;
        ctx.lineWidth = 3.4;
        ctx.lineCap = "round";
        ctx.shadowColor = "rgba(251,146,60,0.6)";
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(to.x, to.y);
        ctx.lineTo(to.x - head * Math.cos(angle - Math.PI / 6), to.y - head * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(to.x - head * Math.cos(angle + Math.PI / 6), to.y - head * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    };

    HeroStage.prototype.drawFloor = function (box) {
        var ctx = this.ctx;
        var y = this.project([0.5, 0.925], box).y + 6;
        ctx.save();
        var grad = ctx.createRadialGradient(box.w / 2, y, 4, box.w / 2, y, box.w * 0.34);
        grad.addColorStop(0, "rgba(93, 139, 255, 0.24)");
        grad.addColorStop(1, "rgba(93, 139, 255, 0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(box.w / 2, y, box.w * 0.3, box.h * 0.035, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    };

    HeroStage.prototype.render = function (state, box) {
        var ctx = this.ctx;
        ctx.clearRect(0, 0, box.w, box.h);
        this.drawFloor(box);

        // Target skeleton: the standard the candidate is measured against.
        var target = state.depth > 0.5 ? TEMPLATES.bottom : TEMPLATES.ready;
        this.drawSkeleton(target, box, {
            color: COLOR.target,
            width: 2.4,
            dashed: true
        });

        // Motion echo — the last few frames, fading out.
        for (var i = 0; i < this.echoes.length; i++) {
            this.drawSkeleton(this.echoes[i], box, {
                color: COLOR.echo,
                width: 3,
                alpha: 0.16 + i * 0.06
            });
        }

        this.drawSkeleton(state.pose, box, {
            color: state.faulty ? COLOR.warn : COLOR.good,
            width: 4,
            glow: state.faulty ? "rgba(251,191,36,0.55)" : "rgba(55,217,155,0.5)"
        });
        this.drawJoints(state.pose, box, state.faulty);

        if (state.faulty) {
            var pulse = 0.55 + 0.35 * Math.sin(performance.now() / 1000 * Math.PI * 2 * 1.25);
            var lk = this.project(state.pose[13], box);
            var rk = this.project(state.pose[14], box);
            this.drawArrow(lk, { x: lk.x - box.w * 0.1, y: lk.y }, pulse);
            this.drawArrow(rk, { x: rk.x + box.w * 0.1, y: rk.y }, pulse);
        }
    };

    HeroStage.prototype.sync = function (state) {
        if (this.phaseEl && this.phaseEl.textContent !== state.phase) {
            this.phaseEl.textContent = state.phase;
        }

        if (state.repIndex !== this.lastRepIndex) {
            this.lastRepIndex = state.repIndex;
            if (state.repIndex > 0 && this.countEl) {
                this.reps = state.repIndex;
                this.countEl.textContent = String(this.reps);
                this.countEl.animate(
                    [
                        { transform: "translateY(6px) scale(0.94)", opacity: 0.4 },
                        { transform: "none", opacity: 1 }
                    ],
                    { duration: 340, easing: "cubic-bezier(0.34,1.56,0.64,1)" }
                );
            }
        }

        var next = state.faulty ? CUES.alert : state.cycle > 0.84 ? CUES.counted : CUES.good;
        if (next !== this.cue) {
            this.cue = next;
            if (this.cueTextEl) this.cueTextEl.textContent = next.text;
            if (this.cueEl) this.cueEl.dataset.tone = next.tone;
        }
    };

    // Draw once for the current clock. Kept separate from the loop so the first
    // paint lands immediately instead of waiting on the first animation frame.
    HeroStage.prototype.paint = function () {
        var box = this.resize();
        var state = this.poseAt(this.elapsed);
        this.render(state, box);
        this.sync(state);
        return state;
    };

    HeroStage.prototype._frame = function (now) {
        this.rafId = 0;
        if (!this.running) return;

        // Advance on deltas, not on wall clock: a backgrounded tab must resume
        // where it paused instead of fast-forwarding hundreds of reps.
        var delta = this.lastTick ? (now - this.lastTick) / 1000 : 0;
        this.lastTick = now;
        this.elapsed += Math.min(delta, 0.1);

        var state = this.paint();

        if (!this.lastEcho || now - this.lastEcho > 70) {
            this.lastEcho = now;
            this.echoes.push(clonePose(state.pose));
            if (this.echoes.length > 4) this.echoes.shift();
        }

        this.rafId = window.requestAnimationFrame(this._frame);
    };

    HeroStage.prototype.resume = function () {
        if (this.running || reduceMotion) return;
        this.running = true;
        this.lastTick = 0;
        this.rafId = window.requestAnimationFrame(this._frame);
    };

    HeroStage.prototype.pause = function () {
        this.running = false;
        if (this.rafId) window.cancelAnimationFrame(this.rafId);
        this.rafId = 0;
    };

    HeroStage.prototype.start = function () {
        var self = this;
        this.elapsed = reduceMotion ? REP_SECONDS * 0.42 : 0;
        this.paint();

        if (reduceMotion) {
            if (this.countEl) this.countEl.textContent = "12";
            window.addEventListener("resize", function () {
                self.paint();
            });
            return;
        }

        window.addEventListener("resize", function () {
            if (!self.running) self.paint();
        });

        document.addEventListener("visibilitychange", function () {
            if (document.hidden) self.pause();
            else if (self.onscreen !== false) self.resume();
        });

        // Idle when the hero has scrolled away — no reason to burn frames.
        if ("IntersectionObserver" in window) {
            new IntersectionObserver(function (entries) {
                self.onscreen = entries[0].isIntersecting;
                if (self.onscreen && !document.hidden) self.resume();
                else self.pause();
            }, { threshold: 0 }).observe(this.canvas);
        }

        if (!document.hidden) this.resume();
    };

    /* ------------------------------------------------- reveal on scroll */
    function initReveal() {
        var nodes = document.querySelectorAll(".reveal");
        if (!nodes.length) return;

        var revealAll = function () {
            for (var i = 0; i < nodes.length; i++) nodes[i].classList.add("in");
        };

        if (!("IntersectionObserver" in window) || reduceMotion) {
            revealAll();
            return;
        }

        // Only now is it safe to let CSS hide anything.
        document.documentElement.classList.add("js-reveal");

        var observer = new IntersectionObserver(
            function (entries) {
                entries.forEach(function (entry) {
                    if (!entry.isIntersecting) return;
                    entry.target.classList.add("in");
                    observer.unobserve(entry.target);
                });
            },
            { rootMargin: "0px 0px -12% 0px", threshold: 0.08 }
        );

        for (var i = 0; i < nodes.length; i++) observer.observe(nodes[i]);

        // Safety net: whatever happens, nothing stays invisible.
        window.setTimeout(revealAll, 2600);
    }

    /* ------------------------------------------------------ count-up stats */
    // The markup already carries the real figure, so a stalled observer or a
    // dead script still shows the number — the roll-up is pure decoration.
    function countUp(el) {
        var target = Number(el.dataset.count);
        if (!isFinite(target) || reduceMotion) return;

        var duration = 1100;
        var started = null;
        function step(now) {
            if (started === null) started = now;
            var t = Math.min(1, (now - started) / duration);
            var eased = 1 - Math.pow(1 - t, 3);
            el.textContent = Math.round(target * eased).toLocaleString("en-US");
            if (t < 1) window.requestAnimationFrame(step);
        }
        window.requestAnimationFrame(step);
    }

    function initStats() {
        var stats = document.querySelectorAll("[data-count]");
        if (!stats.length || reduceMotion) return;
        if (!("IntersectionObserver" in window)) {
            Array.prototype.forEach.call(stats, countUp);
            return;
        }
        var observer = new IntersectionObserver(
            function (entries) {
                entries.forEach(function (entry) {
                    if (!entry.isIntersecting) return;
                    countUp(entry.target);
                    observer.unobserve(entry.target);
                });
            },
            { threshold: 0.5 }
        );
        Array.prototype.forEach.call(stats, function (node) {
            observer.observe(node);
        });
    }

    /* -------------------------------------------------------------- nav */
    function initNav() {
        var nav = document.querySelector(".nav");
        if (!nav) return;
        var onScroll = function () {
            nav.classList.toggle("stuck", window.scrollY > 8);
        };
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
    }

    /* ------------------------------------------------------------- boot */
    function boot() {
        initNav();
        initReveal();
        initStats();
        var canvas = document.getElementById("heroPose");
        if (canvas) new HeroStage(canvas).start();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }
})();
