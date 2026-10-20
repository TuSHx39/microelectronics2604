/* Intro-only lifecycle; animation resources stop when the dialog closes. */
(() => {
  "use strict";
  const intro = document.querySelector(".intro");
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const exitAnimations = new Set();
  let startFrame = 0;

  intro.querySelectorAll("#intro-title > span").forEach((line, row) => {
    const letters = [...line.textContent];
    line.replaceChildren(...letters.map((letter, column) => {
      const glyph = document.createElement("i");
      glyph.className = "opening-letter";
      glyph.textContent = letter;
      glyph.style.setProperty("--letter-delay", `${.72 + row * .48 + column * .105}s`);
      return glyph;
    }));
  });
  intro.querySelectorAll(".intro-route > *").forEach((element, index) => {
    element.style.setProperty("--route-order", index);
  });
  // A small fixed set of transform-only motes; no canvas or perpetual JS frame loop.
  const motes = intro.querySelector(".opening-motes");
  for (let i = 0; i < 26; i++) {
    const mote = document.createElement("span");
    mote.className = "opening-mote";
    mote.style.cssText = `--x:${(i * 37 + 7) % 100}%;--y:${(i * 23 + 11) % 100}%;--size:${i % 3 + 2}px;--duration:${7 + i % 6}s;--delay:${-i * .47}s;--drift:${i % 2 ? 25 : -25}px`;
    motes.append(mote);
  }
  function reset() {
    cancelAnimationFrame(startFrame);
    exitAnimations.forEach(animation => animation.cancel());
    exitAnimations.clear();
    intro.classList.remove("opening-run", "opening-leaving");
    intro.querySelector(".opening-skip").disabled = false;
  }
  function start() {
    reset();
    startFrame = requestAnimationFrame(() => intro.classList.add("opening-run"));
  }
  async function move(element, frames, duration, delay = 0) {
    if (motion.matches || typeof element.animate !== "function") return;
    const animation = element.animate(frames, {
      duration, delay, fill: "forwards", easing: "cubic-bezier(.65,0,.25,1)"
    });
    exitAnimations.add(animation);
    try { await animation.finished; }
    catch (error) { if (error.name !== "AbortError") throw error; }
  }
  async function leave({ quick = false } = {}) {
    intro.classList.add("opening-leaving");
    intro.querySelector(".opening-skip").disabled = true;
    if (motion.matches) return;
    if (quick) {
      await move(intro, [{ opacity: 1 }, { opacity: 0 }], 150);
      return;
    }
    const photos = intro.querySelectorAll(".opening-memory");
    await Promise.all([
      move(intro.querySelector(".intro-content"), [{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "translateY(-18px) scale(1.09)" }], 520),
      move(intro.querySelector(".opening-scenery"), [{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(1.2)" }], 900),
      ...Array.from(photos, (photo, index) => move(photo, [
        { opacity: getComputedStyle(photo).opacity, transform: getComputedStyle(photo).transform },
        { opacity: 0, transform: `translateX(${index < 2 ? -160 : 160}px) rotate(${index < 2 ? -16 : 16}deg) scale(.9)` }
      ], 600)),
      move(intro.querySelector(".opening-leaf-left"), [{ transform: "translateX(0)" }, { transform: "translateX(-101%)" }], 950, 140),
      move(intro.querySelector(".opening-leaf-right"), [{ transform: "translateX(0)" }, { transform: "translateX(101%)" }], 950, 140),
      ...[".opening-institutions", ".opening-skip", ".intro-bottom"].map(selector =>
        move(intro.querySelector(selector), [{ opacity: 1 }, { opacity: 0 }], 300))
    ]);
  }
  intro.addEventListener("close", reset);
  window.IntroExperience = { start, leave };
})();
