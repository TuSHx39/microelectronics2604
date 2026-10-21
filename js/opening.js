/* Intro-only lifecycle; animation resources stop when the dialog closes. */
(() => {
  "use strict";
  const intro = document.querySelector(".intro");
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const lightweight = window.matchMedia("(max-width: 900px), (pointer: coarse)");
  const exitAnimations = new Set();
  let startFrame = 0;
  let generation = 0;
  let homeReady;
  const fontReady = document.fonts?.load('24px "Ma Shan Zheng"') || Promise.resolve();

  function warmHome() {
    if (!homeReady) {
      const images = [...document.querySelectorAll('.hero-visual img')];
      images.forEach(image => { image.loading = 'eager'; });
      homeReady = Promise.allSettled([fontReady, ...images.map(image => image.decode?.())]);
    }
    return homeReady;
  }
  async function boundedReady(promise, limit) {
    let timer;
    try { await Promise.race([promise, new Promise(resolve => { timer = setTimeout(resolve, limit); })]); }
    finally { clearTimeout(timer); }
  }
  async function prepareHome() {
    await boundedReady(warmHome(), 650);
    // Give the revealed, still-covered homepage a layout and paint opportunity.
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }

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
  const moteCount = lightweight.matches ? 0 : 24;
  for (let i = 0; i < moteCount; i++) {
    const mote = document.createElement("span");
    mote.className = "opening-mote";
    mote.style.cssText = `--x:${(i * 37 + 7) % 100}%;--y:${(i * 23 + 11) % 100}%;--size:${i % 3 + 2}px;--duration:${7 + i % 6}s;--delay:${-i * .47}s;--drift:${i % 2 ? 25 : -25}px`;
    motes.append(mote);
  }
  function reset() {
    generation++;
    cancelAnimationFrame(startFrame);
    exitAnimations.forEach(animation => animation.cancel());
    exitAnimations.clear();
    intro.classList.remove("opening-run", "opening-leaving");
    intro.querySelector(".opening-skip").disabled = false;
  }
  async function start() {
    reset();
    const run = generation;
    warmHome();
    await boundedReady(fontReady, 350);
    if (run !== generation || !intro.open || intro.classList.contains('opening-leaving')) return;
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
    if (lightweight.matches) {
      await Promise.all([
        move(intro.querySelector(".intro-content"), [{ opacity: 1, transform: "translateY(0)" }, { opacity: 0, transform: "translateY(-12px)" }], 300),
        move(intro.querySelector(".opening-memories"), [{ opacity: 1, transform: "translateY(0)" }, { opacity: 0, transform: "translateY(10px)" }], 280),
        move(intro.querySelector(".opening-leaf-left"), [{ transform: "translateX(0)" }, { transform: "translateX(-101%)" }], 440, 40),
        move(intro.querySelector(".opening-leaf-right"), [{ transform: "translateX(0)" }, { transform: "translateX(101%)" }], 440, 40),
        ...[".opening-institutions", ".opening-skip", ".intro-bottom"].map(selector =>
          move(intro.querySelector(selector), [{ opacity: 1 }, { opacity: 0 }], 180))
      ]);
      return;
    }
    const photos = intro.querySelectorAll(".opening-memory");
    // Read styles together before starting any compositor animations.
    const photoFrames = Array.from(photos, photo => {
      const style = getComputedStyle(photo);
      return { opacity: style.opacity, transform: style.transform };
    });
    await Promise.all([
      move(intro.querySelector(".intro-content"), [{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "translateY(-18px) scale(1.09)" }], 520),
      move(intro.querySelector(".opening-scenery"), [{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(1.2)" }], 900),
      ...Array.from(photos, (photo, index) => move(photo, [
        photoFrames[index],
        { opacity: 0, transform: `translateX(${index < 2 ? -160 : 160}px) rotate(${index < 2 ? -16 : 16}deg) scale(.9)` }
      ], 600)),
      move(intro.querySelector(".opening-leaf-left"), [{ transform: "translateX(0)" }, { transform: "translateX(-101%)" }], 950, 140),
      move(intro.querySelector(".opening-leaf-right"), [{ transform: "translateX(0)" }, { transform: "translateX(101%)" }], 950, 140),
      ...[".opening-institutions", ".opening-skip", ".intro-bottom"].map(selector =>
        move(intro.querySelector(selector), [{ opacity: 1 }, { opacity: 0 }], 300))
    ]);
  }
  intro.addEventListener("close", reset);
  document.addEventListener('visibilitychange', () => {
    intro.classList.toggle('opening-suspended', document.hidden);
  });
  window.IntroExperience = { start, prepareHome, leave };
})();
