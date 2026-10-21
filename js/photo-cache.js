/* Warm the native URL cache; retain decoded images only around the current photo. */
(() => {
  "use strict";
  const records = new Map();
  const pending = [];
  const nearby = new Map();
  const concurrency = window.matchMedia("(max-width: 900px), (pointer: coarse)").matches ? 2 : 3;
  let active = 0;
  let scheduled = false;
  let ready = false;

  function pump() {
    while (ready && active < concurrency && pending.length) {
      const record = pending.shift();
      active++;
      record.state = "loading";
      const image = new Image();
      record.image = image;
      image.decoding = "async";
      image.fetchPriority = record.priority || "low";
      const finish = state => {
        image.onload = image.onerror = null;
        record.image = null;
        record.state = state;
        active--;
        pump();
      };
      image.onload = () => finish("loaded");
      image.onerror = () => finish("failed");
      image.src = record.src;
    }
  }

  function start(urls) {
    urls.forEach(src => {
      if (records.has(src)) return;
      const record = { src, state: "queued", image: null };
      records.set(src, record);
      pending.push(record);
    });
    if (scheduled) { pump(); return; }
    scheduled = true;
    const schedule = () => {
      const run = () => { ready = true; pump(); };
      if ("requestIdleCallback" in window) window.requestIdleCallback(run, { timeout: 1000 });
      else window.setTimeout(run, 150);
    };
    if (document.readyState === "complete") schedule();
    else window.addEventListener("load", schedule, { once: true });
  }

  function warm(urls) {
    const selected = [...new Set(urls)].slice(0, 3);
    // Promote the actual browsing direction ahead of the remaining background work.
    for (const src of selected.slice().reverse()) {
      const record = records.get(src);
      if (!record) continue;
      record.priority = "high";
      if (record.image) record.image.fetchPriority = "high";
      const index = pending.indexOf(record);
      if (index >= 0) pending.unshift(...pending.splice(index, 1));
    }
    for (const src of nearby.keys()) if (!selected.includes(src)) nearby.delete(src);
    selected.forEach((src, index) => {
      if (nearby.has(src)) return;
      const image = new Image();
      image.decoding = "async";
      image.fetchPriority = index === 0 ? "high" : "auto";
      image.src = src;
      nearby.set(src, image);
      image.decode?.().catch(() => { /* A failed image must not block other photos. */ });
    });
    pump();
  }

  window.PhotoCache = { start, warm };
})();
