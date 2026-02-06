/* valentine.io - playful button physics, but accessible.
   - Pointer users: NO dodges forever.
   - Keyboard users: after 3 dodges triggered via focus, NO becomes clickable.
   - Reduced motion: NO only nudges gently instead of teleporting.
*/

(() => {
  const area = document.getElementById("buttonArea");
  const yesBtn = document.getElementById("yesBtn");
  const noBtn = document.getElementById("noBtn");
  const microcopy = document.getElementById("microcopy");
  const burstLayer = document.getElementById("burstLayer");
  const successTop = document.getElementById("successTop");
  const successBottom = document.getElementById("successBottom");

  const title = document.getElementById("mainTitle");
  const subtitle = document.getElementById("subtitleText");
  const kicker = document.getElementById("kickerText");

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const messages = [
    "Nice try 😄",
    "Nope!",
    "That button is shy…",
    "Absolutely not 😂",
    "The ‘No’ button is on a coffee break ☕️",
    "Plot twist: you meant YES 💖",
    "Try again, mortal.",
    "Error 418: I’m a teapot (and also… no).",
  ];

  let yesScale = 1;
  let pointerDodges = 0;
  let keyboardDodges = 0;

  // Track last input method (best-effort)
  let lastInput = "pointer";
  window.addEventListener("pointerdown", () => (lastInput = "pointer"), { passive: true });
  window.addEventListener("mousemove", () => (lastInput = "pointer"), { passive: true });
  window.addEventListener("keydown", (e) => {
    // consider Tab/Enter/Space as keyboard navigation intent
    if (e.key === "Tab" || e.key === "Enter" || e.key === " ") lastInput = "keyboard";
  });

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function setMicrocopy(text) {
    microcopy.textContent = text;
  }

  function bumpYes() {
    const max = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--max-yes-scale")) || 1.35;
    yesScale = clamp(yesScale + 0.07, 1, max);
    yesBtn.style.transform = `translateY(-50%) scale(${yesScale})`;
  }

  // Place NO initially in the "right side" area, without overlap
  function placeNoInitial() {
    const rect = area.getBoundingClientRect();
    const noRect = noBtn.getBoundingClientRect();
    const safe = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--safe")) || 14;

    const x = clamp(rect.width - noRect.width - safe, safe, rect.width - noRect.width - safe);
    const y = clamp((rect.height - noRect.height) / 2, safe, rect.height - noRect.height - safe);

    noBtn.style.left = `${x}px`;
    noBtn.style.top = `${y}px`;
    noBtn.style.right = "auto";
    noBtn.style.transform = "translate(0, 0)";
    noBtn.style.position = "absolute";
  }

  function rectsOverlap(a, b, padding = 10) {
    return !(
      a.right + padding < b.left ||
      a.left - padding > b.right ||
      a.bottom + padding < b.top ||
      a.top - padding > b.bottom
    );
  }

  function dodgeNo({ mode }) {
    // mode: "pointer" or "keyboard"
    const rect = area.getBoundingClientRect();
    const noRect = noBtn.getBoundingClientRect();
    const yesRect = yesBtn.getBoundingClientRect();

    const safe = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--safe")) || 14;

    const maxX = rect.width - noRect.width - safe;
    const maxY = rect.height - noRect.height - safe;
    const minX = safe;
    const minY = safe;

    // current position relative to area
    const currentLeft = parseFloat(noBtn.style.left || "0");
    const currentTop = parseFloat(noBtn.style.top || "0");

    let nextLeft = currentLeft;
    let nextTop = currentTop;

    const reduced = prefersReducedMotion.matches;

    if (reduced) {
      // Gentle nudge: small delta, clamped.
      const dx = rand(-38, 38);
      const dy = rand(-18, 18);
      nextLeft = clamp(currentLeft + dx, minX, maxX);
      nextTop = clamp(currentTop + dy, minY, maxY);
    } else {
      // Teleport: try a few times to avoid overlapping YES too much
      for (let i = 0; i < 14; i++) {
        const candidateLeft = rand(minX, maxX);
        const candidateTop = rand(minY, maxY);

        // build candidate rect in viewport coords
        const candidateRect = {
          left: rect.left + candidateLeft,
          top: rect.top + candidateTop,
          right: rect.left + candidateLeft + noRect.width,
          bottom: rect.top + candidateTop + noRect.height,
        };

        // avoid overlapping YES too aggressively
        const overlap = rectsOverlap(candidateRect, yesRect, 16);
        if (!overlap || i > 10) {
          nextLeft = candidateLeft;
          nextTop = candidateTop;
          break;
        }
      }
    }

    // Apply movement (no layout jump because container height is fixed)
    noBtn.style.left = `${nextLeft}px`;
    noBtn.style.top = `${nextTop}px`;

    bumpYes();

    const msg = messages[(pointerDodges + keyboardDodges) % messages.length];
    setMicrocopy(msg);

    if (mode === "keyboard") keyboardDodges += 1;
    else pointerDodges += 1;
  }

  function shouldKeyboardDodge() {
    // After 3 keyboard dodges, allow NO to be clicked for accessibility.
    return keyboardDodges < 3;
  }

  // Pointer/touch: dodge on pointerenter and pointerdown
  noBtn.addEventListener("pointerenter", (e) => {
    // Avoid dodging when focus outline triggers on touch sometimes:
    if (e.pointerType === "mouse" || e.pointerType === "pen") {
      dodgeNo({ mode: "pointer" });
    }
  });

  noBtn.addEventListener("pointerdown", (e) => {
    // Always dodge for pointer interactions.
    e.preventDefault(); // keeps it from being "captured" by click timing
    dodgeNo({ mode: "pointer" });
  });

  // Keyboard: when NO receives focus, dodge a few times then allow click
  noBtn.addEventListener("focus", () => {
    if (lastInput === "keyboard" && shouldKeyboardDodge()) {
      dodgeNo({ mode: "keyboard" });
      if (!shouldKeyboardDodge()) {
        setMicrocopy("Okay okay… keyboard victory unlocked 😅 You may click ‘No’ now.");
      }
    }
  });

  // NO click (only realistically happens after keyboard unlock)
  noBtn.addEventListener("click", () => {
    if (lastInput === "keyboard" && !shouldKeyboardDodge()) {
      setMicrocopy("Respect. Bold choice. Still… you’re my Valentine in spirit 😌");
    } else {
      // Pointer users won't typically get here, but just in case:
      setMicrocopy("How did you even—");
    }
  });

  // YES click: celebration + swap content
  yesBtn.addEventListener("click", () => {
    celebrateFromYes();
    showSuccess();
  });

  function celebrateFromYes() {
    const r = yesBtn.getBoundingClientRect();
    const originX = r.left + r.width / 2;
    const originY = r.top + r.height / 2;

    const count = 60; // bigger burst
    for (let i = 0; i < count; i++) {
      const el = document.createElement("span");
      el.className = "burst-heart";

      // Randomized trajectory
      const angle = rand(-Math.PI * 0.85, -Math.PI * 0.15); 
      const distance = rand(220, 900);
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance;

      const rot = `${rand(-160, 160)}deg`;
      const sc = rand(0.7, 1.35);
      const hue = Math.round(rand(0, 360));

      el.style.left = `${originX}px`;
      el.style.top = `${originY}px`;
      el.style.setProperty("--dx", `${dx}px`);
      el.style.setProperty("--dy", `${dy}px`);
      el.style.setProperty("--rot", rot);
      el.style.setProperty("--sc", sc.toFixed(2));
      el.style.setProperty("--hue", `${hue}`);

      // tiny stagger
      el.style.animationDelay = `${rand(0, 120)}ms`;

      burstLayer.appendChild(el);

      el.addEventListener("animationend", () => el.remove(), { once: true });
      // Safety cleanup fallback
      setTimeout(() => el.remove(), 2000);
    }
  }

  function showSuccess() {
    // Hide the original content in a tidy way (no DOM chaos)
    title.hidden = true;
    subtitle.hidden = true;
    kicker.hidden = true;
    area.hidden = true;
    microcopy.hidden = true;

    successTop.hidden = false;
    successBottom.hidden = false;
    // Keep focus sane for keyboard users
    successTop.setAttribute("tabindex", "-1");
    successTop.focus({ preventScroll: true });
  }

  // On resize, keep NO within bounds
  function keepNoInBounds() {
    const rect = area.getBoundingClientRect();
    const noRect = noBtn.getBoundingClientRect();
    const safe = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--safe")) || 14;

    const maxX = rect.width - noRect.width - safe;
    const maxY = rect.height - noRect.height - safe;
    const minX = safe;
    const minY = safe;

    const left = clamp(parseFloat(noBtn.style.left || "0"), minX, maxX);
    const top = clamp(parseFloat(noBtn.style.top || "0"), minY, maxY);
    noBtn.style.left = `${left}px`;
    noBtn.style.top = `${top}px`;
  }

  // Initial layout after paint
  requestAnimationFrame(() => {
    placeNoInitial();
    // Put YES transform baseline
    yesBtn.style.transform = "translateY(-50%) scale(1)";
    keepNoInBounds();
  });

  window.addEventListener("resize", () => {
    keepNoInBounds();
  });
})();
