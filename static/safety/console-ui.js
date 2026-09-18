/* ==========================================================================
   练了么 — console presentation layer.

   Purely additive: it observes the DOM the session loop already writes to and
   translates it into peripheral feedback (stage tone, rep bump, phase track,
   standby art). It never calls the API, never mutates session state, and every
   lookup is guarded so a missing node degrades to plain text.
   ========================================================================== */
(function () {
    "use strict";

    // Cumulative progress through one repetition. Labels come from the phase
    // maps in the page scripts; anything unknown resets the track.
    var PHASE_INDEX = {
        "准备": 0,
        "下降": 1,
        "拉起": 1,
        "弯举": 1,
        "底部": 2,
        "上升": 3,
        "顶点": 3
    };

    function watchText(node, onChange) {
        if (!node || !window.MutationObserver) return;
        var last = node.textContent;
        new MutationObserver(function () {
            var next = node.textContent;
            if (next === last) return;
            last = next;
            onChange(next);
        }).observe(node, { childList: true, characterData: true, subtree: true });
        onChange(last);
    }

    function watchClass(node, onChange) {
        if (!node || !window.MutationObserver) return;
        var last = node.className;
        new MutationObserver(function () {
            var next = node.className;
            if (next === last) return;
            last = next;
            onChange(node);
        }).observe(node, { attributes: true, attributeFilter: ["class"] });
        onChange(node);
    }

    /* --------------------------------------------------------- stage tone */
    function initStageTone(stage) {
        var badge = document.getElementById("statusBadge");
        if (!stage || !badge) return;
        watchClass(badge, function (el) {
            var tone = ["good", "warn", "alert"].filter(function (name) {
                return el.classList.contains(name);
            })[0];
            if (tone) stage.dataset.tone = tone;
            else delete stage.dataset.tone;
        });
    }

    /* ------------------------------------------------------------ rep bump */
    function initRepBump() {
        var readouts = [
            document.getElementById("repCountOverlay"),
            document.getElementById("repCount")
        ];
        readouts.forEach(function (node) {
            if (!node) return;
            var holder = node.closest(".overlay-count") || node.parentElement;
            if (!holder) return;
            var previous = Number(node.textContent) || 0;
            watchText(node, function (value) {
                var next = Number(value) || 0;
                if (next <= previous) {
                    previous = next;
                    return;
                }
                previous = next;
                holder.classList.remove("bump");
                void holder.offsetWidth; // restart the animation
                holder.classList.add("bump");
            });
        });
    }

    /* --------------------------------------------------------- phase track */
    function initPhaseTrack() {
        var track = document.querySelector(".phase-track");
        var source = document.getElementById("phaseText") || document.getElementById("phaseOverlay");
        if (!track || !source) return;
        var segments = track.querySelectorAll("i");
        watchText(source, function (label) {
            var active = PHASE_INDEX[String(label).trim()];
            for (var i = 0; i < segments.length; i++) {
                segments[i].classList.toggle("on", active != null && i <= active);
            }
        });
    }

    /* ------------------------------------------------------------- standby */
    // The standby brief clears the moment the element actually has frames, not
    // when getUserMedia resolves — a granted permission is not yet a picture.
    function initStandby(stage) {
        var video = stage && stage.querySelector("video");
        if (!video) return;
        var reveal = function () {
            if (video.videoWidth > 0) stage.classList.add("is-live");
        };
        ["loadedmetadata", "playing", "resize"].forEach(function (event) {
            video.addEventListener(event, reveal);
        });
        video.addEventListener("emptied", function () {
            stage.classList.remove("is-live");
        });
        reveal();
    }

    /* -------------------------------------------------------- item picker */
    // Cards drive the real <select>, which stays in the DOM as the single
    // source of truth so the page script keeps reading value and dataset.tip.
    function initExercisePicker() {
        var grid = document.querySelector(".pick-grid");
        var select = document.getElementById("exerciseSelect");
        if (!grid || !select) return;

        var options = Array.prototype.slice.call(grid.querySelectorAll("[data-value]"));
        if (!options.length) return;

        var sync = function () {
            options.forEach(function (option) {
                var on = option.dataset.value === select.value;
                option.classList.toggle("on", on);
                option.setAttribute("aria-checked", String(on));
                option.tabIndex = on ? 0 : -1;
            });
        };

        var choose = function (option) {
            if (select.value === option.dataset.value) return;
            select.value = option.dataset.value;
            select.dispatchEvent(new Event("change", { bubbles: true }));
            sync();
        };

        options.forEach(function (option, index) {
            option.addEventListener("click", function () {
                choose(option);
            });
            option.addEventListener("keydown", function (event) {
                var step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1
                    : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
                if (!step) return;
                event.preventDefault();
                var next = options[(index + step + options.length) % options.length];
                choose(next);
                next.focus();
            });
        });

        select.addEventListener("change", sync);
        sync();
    }

    /* ------------------------------------------------------- progress ring */
    // Mirrors the linear bar the page script already drives, so there is one
    // source of progress and no second counter to keep in step.
    function initProgressRing() {
        var bar = document.getElementById("progressFill");
        var ring = document.querySelector(".ring-fg");
        var readout = document.querySelector(".ring-label b");
        if (!bar || !ring || !window.MutationObserver) return;

        var circumference = 245;
        var apply = function () {
            var percent = Math.max(0, Math.min(100, parseFloat(bar.style.width) || 0));
            ring.style.strokeDashoffset = String(circumference * (1 - percent / 100));
            if (readout) readout.textContent = Math.round(percent) + "%";
        };

        new MutationObserver(apply).observe(bar, { attributes: true, attributeFilter: ["style"] });
        apply();
    }

    /* ------------------------------------------------------------ stepper */
    // Derived from which step card is currently visible — no extra state.
    function initStepper() {
        var stepper = document.querySelector(".stepper");
        var cards = ["formCard", "detectCard", "resultCard"].map(function (id) {
            return document.getElementById(id);
        });
        if (!stepper || cards.indexOf(null) !== -1 || !window.MutationObserver) return;

        var items = stepper.querySelectorAll(".stepper-item");
        var apply = function () {
            var active = cards.findIndex(function (card) {
                return !card.hidden;
            });
            if (active < 0) active = 0;
            for (var i = 0; i < items.length; i++) {
                items[i].classList.toggle("active", i === active);
                items[i].classList.toggle("done", i < active);
            }
        };

        cards.forEach(function (card) {
            new MutationObserver(apply).observe(card, {
                attributes: true,
                attributeFilter: ["hidden"]
            });
        });
        apply();
    }

    function boot() {
        var stage = document.querySelector(".video-stage, .video-box");
        initStageTone(stage);
        initStandby(stage);
        initRepBump();
        initPhaseTrack();
        initExercisePicker();
        initProgressRing();
        initStepper();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }
})();
