"use strict";

// ---------- WPM logic (pure, no DOM, no input handling) ----------
function calcWpm(charCount, elapsedMs) {
  if (!(elapsedMs > 0) || charCount <= 0) return 0; // no division by zero
  return (charCount / 5) / (elapsedMs / 60000);
}

function calcAccuracy(correctCount, totalCount) {
  if (totalCount <= 0) return 0;
  return (correctCount / totalCount) * 100;
}

// ---------- Config / state ----------
const DEFAULT_TEXT = "The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs, and sphinx of black quartz, judge my vow!";
const MIN_DURATION = 10;
const MAX_DURATION = 30;

const state = {
  target: DEFAULT_TEXT,   // active target; only changed by applyText()
  typed: [],              // typed characters
  duration: 30,           // seconds
  status: "idle",         // idle | running | done
  startTime: 0,
  elapsedMs: 0,
  intervalId: null,
};

// ---------- DOM ----------
const $target = document.getElementById("target");
const $wrap = document.querySelector(".typing-wrap");
const $overlay = document.getElementById("overlay");
const $ovWpm = document.getElementById("ov-wpm");
const $ovTime = document.getElementById("ov-time");
const $chip = document.getElementById("prompt-chip");
const $promptIdle = document.getElementById("prompt-idle");
const $promptLive = document.getElementById("prompt-live");
const $wpm = document.getElementById("wpm");
const $timer = document.getElementById("timer");
const $custom = document.getElementById("custom");
const $duration = document.getElementById("duration");
const $backdrop = document.getElementById("backdrop");
const $durationPop = document.getElementById("duration-pop");
const $textPop = document.getElementById("text-pop");
const $clockBtn = document.getElementById("clock-btn");
const $editBtn = document.getElementById("edit-btn");
const $apply = document.getElementById("apply");

let spans = [];
let curLine = 0;

// ---------- Rendering ----------
function buildTarget() {
  $target.textContent = "";
  const win = document.createElement("div");
  win.className = "text-window";
  $target.appendChild(win);
  curLine = 0;
  spans = [...state.target].map(ch => {
    const s = document.createElement("span");
    s.textContent = ch === "\n" ? "⏎\n" : ch;
    win.appendChild(s);
    return s;
  });
}

function render() {
  const t = [...state.target];
  for (let i = 0; i < spans.length; i++) {
    let cls = "pending";
    if (i < state.typed.length) cls = state.typed[i] === t[i] ? "correct" : "incorrect";
    else if (i === state.typed.length && state.status !== "done") cls = "current";
    spans[i].className = t[i] === "\n" ? cls + " nl" : cls;
  }
  const elapsed = state.status === "running" ? performance.now() - state.startTime : state.elapsedMs;
  $wpm.textContent = Math.round(calcWpm(state.typed.length, Math.max(elapsed, 1000)));
  const remaining = Math.max(0, Math.ceil((state.duration * 1000 - elapsed) / 1000));
  $timer.textContent = remaining;
}

function setChipLive(live) {
  $promptIdle.hidden = live;
  $promptLive.hidden = !live;
}

// ---------- Test lifecycle ----------
function resetTest() {
  clearInterval(state.intervalId);
  state.intervalId = null;
  // If a fade-out was mid-flight (user restarted before it finished),
  // cancel the animations and restore the elements before resetting.
  hiddenEls.forEach(el => el.getAnimations().forEach(a => a.cancel()));
  hiddenEls = [];
  document.body.classList.remove("test-running");
  closePopups(true);
  state.typed = [];
  state.status = "idle";
  state.startTime = 0;
  state.elapsedMs = 0;
  $overlay.hidden = true;
  $wrap.classList.remove("blurred");
  $wrap.classList.remove("scrolled");
  setChipLive(false);
  buildTarget();
  render();
  // Reset auto-scroll position
  const win = $target.querySelector(".text-window");
  if (win) win.style.transform = "translateY(0px)";
}

let hiddenEls = [];

function startTimer() {
  if (state.status !== "idle") return;
  state.status = "running";
  state.startTime = performance.now();
  state.intervalId = setInterval(tick, 250);
  setChipLive(true);
  hideExtras(); // fade the non-typing elements out, then collapse them
}

// Fade chip extras out, then apply .test-running (display:none) so
// the layout collapses and only the chip + typing box remain.
function hideExtras() {
  if (state.status !== "running") return;
  hiddenEls = [...document.querySelectorAll(".top-actions")];
  if (hiddenEls.length === 0) {
    document.body.classList.add("test-running");
    return;
  }
  let pending = hiddenEls.length;
  hiddenEls.forEach(el => {
    const anim = el.animate(
      [
        { opacity: 1, transform: "translateY(0)" },
        { opacity: 0, transform: "translateY(-12px)" },
      ],
      { duration: 250, easing: "ease-out", fill: "forwards" }
    );
    anim.onfinish = () => {
      if (--pending === 0) document.body.classList.add("test-running");
    };
  });
}

function finish(elapsedMs) {
  if (state.status === "done") return; // Prevent multiple invocations
  clearInterval(state.intervalId);
  state.intervalId = null;
  state.status = "done";
  state.elapsedMs = elapsedMs;
  // Cancel any lingering animations
  hiddenEls.forEach(el => el.getAnimations().forEach(a => a.cancel()));
  hiddenEls = [];
  document.body.classList.remove("test-running"); // reveal icon buttons
  render();

  // Blur focus to ensure no input focus remains
  if (document.activeElement && typeof document.activeElement.blur === "function") {
    document.activeElement.blur();
  }

  // Blur text, show final score overlay
  const wpm = calcWpm(state.typed.length, state.elapsedMs);
  $ovWpm.textContent = wpm.toFixed(1);
  $ovTime.textContent = (state.elapsedMs / 1000).toFixed(1);
  $wrap.classList.add("blurred");
  $overlay.hidden = false;
}

function tick() {
  if (state.status !== "running") return;
  const elapsed = performance.now() - state.startTime;
  const limit = state.duration * 1000;
  if (elapsed >= limit) {
    finish(limit); // clamp to exact limit and stop
  } else {
    render();
  }
}

// Ensure window blur/tab switch handles accurate elapsed timer check
window.addEventListener("focus", () => {
  if (state.status === "running") {
    const elapsed = performance.now() - state.startTime;
    const limit = state.duration * 1000;
    if (elapsed >= limit) finish(limit);
    else render();
  }
});

// ---------- Keyboard input ----------
document.addEventListener("keydown", (e) => {
  const $t = e.target.closest ? e.target.closest("textarea, input, select") : null;
  if ($t) {
    if (e.key === "Escape") e.target.blur();
    return; // don't hijack form fields
  }
  if (e.isComposing || e.ctrlKey || e.metaKey || e.altKey) return;

  // Tab = restart, in ANY state (idle, running, done, popup open)
  if (e.key === "Tab") {
    e.preventDefault();
    resetTest();
    return;
  }

  if (state.status === "done") {
    e.preventDefault();
    return;
  }

  // Pre-check if time has already expired right before accepting keystroke
  if (state.status === "running") {
    const elapsed = performance.now() - state.startTime;
    const limit = state.duration * 1000;
    if (elapsed >= limit) {
      e.preventDefault();
      finish(limit);
      return;
    }
  }

  if (e.key === "Backspace") {
    e.preventDefault();
    if (state.typed.length > 0) state.typed.pop();
    render();
    keepCurrentCharInView();
    return;
  }

  const k = e.key === "Enter" ? "\n" : e.key;
  if (k.length !== 1) return; // Shift, Ctrl, arrows, etc.
  e.preventDefault();             // stops space from scrolling

  if (state.typed.length >= state.target.length) return;
  if (state.status === "idle") startTimer();

  state.typed.push(k);

  const nowElapsed = performance.now() - state.startTime;
  const limitMs = state.duration * 1000;

  if (state.typed.length === state.target.length) {
    finish(nowElapsed);
  } else if (nowElapsed >= limitMs) {
    finish(limitMs);
  } else {
    render();
    keepCurrentCharInView();
  }
});

// ---------- Auto-scroll: shift one full line at a time; old lines slide under the top blur ----------
function keepCurrentCharInView() {
  const cur = spans[state.typed.length];
  if (!cur) return;
  const lineH = cur.offsetHeight || 48;
  const line = Math.round(cur.offsetTop / lineH);
  if (line === curLine) return;
  curLine = line;
  const win = $target.firstElementChild;
  const offset = Math.max(0, cur.offsetTop - lineH * 2);
  win.style.transform = `translateY(${-offset}px)`;
  $wrap.classList.toggle("scrolled", offset > 0);
}

// ---------- Popups ----------
function openPopup($pop) {
  closePopups(true);
  $backdrop.hidden = false;
  $pop.hidden = false;
  $pop.classList.remove("closing");
  $pop.classList.add("opening");
}

function closePopups(instant) {
  for (const $pop of [$durationPop, $textPop]) {
    if ($pop.hidden) continue;
    if (instant) {
      $pop.hidden = true;
      $pop.classList.remove("opening", "closing");
    } else {
      $pop.classList.remove("opening");
      $pop.classList.add("closing");
      setTimeout(() => {
        $pop.hidden = true;
        $pop.classList.remove("closing");
      }, 240);
    }
  }
  $backdrop.hidden = true;
}

// ---------- Controls ----------
function applyText() {
  // Newlines kept as real line breaks (max 2 in a row); other whitespace collapses.
  const cleaned = $custom.value.split("\n").map(l => l.replace(/[ \t]+/g, " ").trim()).join("\n").replace(/\n{3,}/g, "\n\n").replace(/^\n+|\n+$/g, "");
  if (!cleaned) return; // empty/whitespace only: keep current test untouched
  state.target = cleaned;
  resetTest();
}

function applyDuration() {
  let v = Math.round(Number($duration.value));
  if (!Number.isFinite(v) || $duration.value === "") v = state.duration;
  v = Math.min(MAX_DURATION, Math.max(MIN_DURATION, v));
  $duration.value = v;
  state.duration = v;
  resetTest();
}

$clockBtn.addEventListener("click", () => { openPopup($durationPop); $clockBtn.blur(); });
$editBtn.addEventListener("click", () => { openPopup($textPop); $editBtn.blur(); });
$backdrop.addEventListener("click", () => closePopups(false));
$apply.addEventListener("click", () => { applyText(); $apply.blur(); });
$duration.addEventListener("change", () => { applyDuration(); $duration.blur(); });

// ---------- Init ----------
$custom.value = DEFAULT_TEXT;
resetTest();
