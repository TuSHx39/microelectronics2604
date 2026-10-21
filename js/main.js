(() => {
  "use strict";
  const chapters = [
    { id: "roots", name: "寻根", label: "第一篇章", intro: "红色历史研学、革命精神学习、校史寻访和理论学习。" },
    { id: "resonance", name: "共鸣", label: "第二篇章", intro: "跨校交流、联合支部活动、文体交流和集体凝聚。" },
    { id: "chips", name: "强芯", label: "第三篇章", intro: "科研实验室、竞赛分享、人工智能与专业探索。" },
    { id: "practice", name: "躬行", label: "第四篇章", intro: "志愿服务、环保劳动、国防教育、校园实践与体育锻炼。" }
  ];
  const activities = window.ACTIVITIES;
  const byBoardId = new Map(activities.map(activity => [activity.boardId, activity]));
  const allPhotoEntries = activities.flatMap(activity => activity.photos.map(photo => ({ activity, photo })));
  const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
  const displayText = value => String(value ?? "").replace(/“最佳团日”/g, "最佳团日");
  // Browsing uses 800px previews; the lightbox keeps activity.photos originals.
  const previewSource = src => src.replace(/^assets\/photos\/(.+)\.[^.]+$/, "assets/previews/$1.webp");
  const editorial = window.PHOTO_EDITORIAL || { schools: [], photos: {} };
  const approvedPhoto = photo => {
    const id = photo.src.split("/").pop().replace(/\.[^.]+$/, "");
    const record = editorial.photos[id];
    return record?.status === "confirmed" ? record : null;
  };
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const lightweight = window.matchMedia("(max-width: 900px), (pointer: coarse)");
  const page = document.querySelector(".page-shell");
  const reader = document.querySelector(".chapter-reader");
  const intro = document.querySelector(".intro");
  const curtain = document.querySelector(".chapter-curtain");
  const indexDialog = document.querySelector(".activity-index");
  const lightbox = document.querySelector(".lightbox");
  let activeChapter = null;
  let changingChapter = false;
  let pendingHash = null;
  let entered = false;
  let initialHash = window.location.hash;

  // Finite, user-triggered transitions, with a reduced-motion path.
  async function animate(element, frames, duration) {
    if (reducedMotion.matches || typeof element.animate !== "function") return;
    try {
      const animation = element.animate(frames, { duration, easing: "cubic-bezier(.22,1,.36,1)", fill: "forwards" });
      try { await animation.finished; }
      finally { animation.cancel(); }
    } catch (error) {
      if (error.name !== "AbortError") throw error;
    }
  }
  function clearAnimations(element) {
    element.getAnimations?.().forEach(animation => {
      // Only clear JavaScript animations; CSS title entrances restart with [open].
      if (typeof CSSAnimation === "undefined" || !(animation instanceof CSSAnimation)) animation.cancel();
    });
  }
  function syncModalLock() {
    document.body.classList.toggle("modal-open", Boolean(document.querySelector("dialog[open]")));
  }
  document.querySelectorAll("dialog").forEach(dialog => dialog.addEventListener("close", syncModalLock));
  function openDialog(dialog) { dialog.showModal(); syncModalLock(); }

  function photoButton(activity, i) {
    const photo = activity.photos[i];
    const record = approvedPhoto(photo);
    return `<figure class="activity-photo" data-school="${escape(record?.schoolId || "")}"><button type="button" class="photo-trigger" data-gallery="${activity.boardId}" data-photo="${i}" aria-label="查看${escape(activity.title)}第${i + 1}张照片"><img src="${escape(previewSource(photo.src))}" alt="${escape(record?.caption || photo.alt)}" width="${photo.width}" height="${photo.height}" loading="lazy" decoding="async" style="object-position:${escape(photo.position || "center")};object-fit:${escape(photo.fit || "cover")}"><span class="photo-open" aria-hidden="true">＋</span></button>${record?.caption ? `<figcaption>${escape(record.caption)}</figcaption>` : ""}</figure>`;
  }
  function schoolGallery(activity) {
    return `<section class="school-gallery" aria-label="四校往来影像"><header><h4>四校往来影像</h4><p>同一份书法作品，随书信邮寄周游四校，最终回到我们手中。点击校徽，看看各校留下的影像。</p></header><div class="school-filters" role="group" aria-label="按学校查看照片"><button type="button" class="school-filter school-filter-all" data-school-filter="all" aria-pressed="true"><span>全部影像</span><small>${activity.photos.length} 张</small></button>${editorial.schools.map(school => {
      const count = activity.photos.filter(photo => approvedPhoto(photo)?.schoolId === school.id).length;
      return `<button type="button" class="school-filter" data-school-filter="${escape(school.id)}" aria-pressed="false"${count ? "" : " disabled"}><img src="${escape(school.logo)}" alt="" width="64" height="64"><span>${escape(school.name)}</span><small>${count} 张</small></button>`;
    }).join("")}</div><div class="school-photo-grid">${activity.photos.map((_, i) => photoButton(activity, i)).join("")}</div></section>`;
  }
  function detailContent(activity) {
    return [
      ["活动初衷", activity.story.why], ["实践回顾", activity.story.actions],
      ["收获与思考", activity.story.takeaway]
    ].map(([title, content]) => {
      const paragraphs = (Array.isArray(content) ? content : [content]).filter(Boolean);
      return paragraphs.length ? `<h4>${title}</h4>${paragraphs.map(p => `<p>${escape(displayText(p))}</p>`).join("")}` : "";
    }).join("");
  }
  function activityMarkup(activity) {
    const cover = activity.photos[activity.coverIndex || 0];
    return `<details class="activity" id="activity-${activity.boardId}" name="activities-${activity.chapter}">
      <summary aria-controls="body-${activity.boardId}">
        <span class="activity-cover">${cover ? `<img src="${escape(previewSource(cover.src))}" alt="${escape(cover.alt)}" width="${cover.width}" height="${cover.height}" loading="lazy" decoding="async" decoding="async" style="object-position:${escape(cover.position || "center")};object-fit:${escape(cover.fit || "cover")}">` : ""}<span class="activity-number">${activity.boardId}</span></span>
        <span class="activity-card-heading"><span class="activity-title">${activity.title.split("，").map(p => `<span>${escape(p)}</span>`).join("")}</span><span class="activity-teaser"><span class="activity-date">${escape(activity.date)}</span><span class="card-toggle"><span class="when-closed">打开活动</span><span class="when-open">收起活动</span><i class="when-closed" aria-hidden="true">＋</i><i class="when-open" aria-hidden="true">−</i></span></span></span>
      </summary>
      <div class="activity-body" id="body-${activity.boardId}">
        <dl class="activity-meta"><div><dt>时间</dt><dd>${escape(activity.date)}</dd></div><div><dt>地点</dt><dd>${escape(activity.location)}</dd></div></dl>
        <p class="activity-summary">${escape(activity.summary)}</p>
        <div class="detail-body">${detailContent(activity)}</div>
        ${activity.boardId === "02" ? schoolGallery(activity) : activity.photos.length ? `<div class="photo-strip">${activity.photos.slice(0, 3).map((_, i) => photoButton(activity, i)).join("")}</div><div class="activity-actions"><button type="button" class="gallery-link" data-gallery="${activity.boardId}" data-photo="0">查看全部 ${activity.photos.length} 张照片 <span aria-hidden="true">↗</span></button></div>` : ""}
      </div>
    </details>`;
  }
  document.querySelector("#chapters").innerHTML = chapters.map((chapter, i) => {
    const items = activities.filter(activity => activity.chapter === chapter.id);
    const next = chapters[(i + 1) % chapters.length];
    return `<section class="chapter chapter--${chapter.id}" id="${chapter.id}" aria-labelledby="${chapter.id}-title" hidden><div class="section-shell">
      <header class="chapter-heading"><div><p>${chapter.label} · ${items.length}项活动</p><h2 class="calligraphy" id="${chapter.id}-title" tabindex="-1">${chapter.name}</h2></div><p class="chapter-intro">${chapter.intro}</p></header>
      <div class="activities">${items.map(activityMarkup).join("")}</div>
      <div class="chapter-transition"><button type="button" data-close-chapter>收起篇章</button><button type="button" data-chapter="${next.id}">${i === 3 ? "重访" : "下一篇章"} · ${next.name} <span aria-hidden="true">↗</span></button></div>
    </div></section>`;
  }).join("");
  document.querySelector(".index-list").innerHTML = activities.map(activity => {
    const chapter = chapters.find(item => item.id === activity.chapter);
    return `<button type="button" class="index-item" data-activity="${activity.boardId}"><span>${activity.boardId}</span><span>${escape(activity.title)}</span><small>${chapter.name}</small></button>`;
  }).join("");

  document.querySelectorAll(".activity").forEach(card => {
    card.addEventListener("toggle", () => {
      if (!card.open) return;
      card.closest(".activities").querySelectorAll(".activity[open]").forEach(other => {
        if (other !== card) other.open = false;
      });
      // A preceding card closing can move this selection above the viewport.
      if (!changingChapter && !card.closest(".chapter").hidden && card.getBoundingClientRect().top < 75) {
        card.scrollIntoView({ behavior: reducedMotion.matches ? "instant" : "smooth", block: "start" });
      }
    });
  });
  function setChapter(id) {
    activeChapter = id;
    reader.hidden = false;
    chapters.forEach(chapter => { document.getElementById(chapter.id).hidden = chapter.id !== id; });
    document.querySelectorAll("[data-chapter]").forEach(button => {
      if (button.dataset.chapter === id) button.setAttribute("aria-current", "true");
      else button.removeAttribute("aria-current");
    });
  }
  function setHash(hash) {
    // Hash assignment also works when index.html is opened directly via file://.
    if (window.location.hash !== hash) window.location.hash = hash;
  }
  function closeChapter() {
    reader.hidden = true;
    activeChapter = null;
    chapters.forEach(chapter => { document.getElementById(chapter.id).hidden = true; });
    document.querySelectorAll("[data-chapter]").forEach(button => button.removeAttribute("aria-current"));
  }
  async function selectChapter(id, boardId = null, updateHash = true) {
    if (changingChapter) return;
    const chapter = chapters.find(item => item.id === id);
    if (!chapter) return;
    changingChapter = true;
    try {
      if (activeChapter !== id) {
        const compact = lightweight.matches;
        clearAnimations(curtain);
        clearAnimations(curtain.querySelector(".curtain-line"));
        curtain.dataset.tone = id;
        curtain.querySelector(".curtain-label").textContent = chapter.label;
        curtain.querySelector("h2").textContent = chapter.name;
        curtain.querySelector(".curtain-intro").textContent = chapter.intro;
        openDialog(curtain);
        await animate(curtain, [{ opacity: 0, transform: `translateY(${compact ? 12 : 25}px)` }, { opacity: 1, transform: "translateY(0)" }], compact ? 180 : 240);
        await animate(curtain.querySelector(".curtain-line"), [{ transform: "scaleX(.2)" }, { transform: "scaleX(1)" }], compact ? 300 : 520);
        setChapter(id);
        if (boardId) document.getElementById(`activity-${boardId}`).open = true;
        const destination = boardId ? document.getElementById(`activity-${boardId}`) : document.getElementById(id);
        destination.scrollIntoView({ behavior: "instant", block: "start" });
        await animate(curtain, [{ opacity: 1 }, { opacity: 0, transform: `translateY(${compact ? -10 : -20}px)` }], compact ? 220 : 330);
        curtain.close();
      } else if (boardId) {
        document.getElementById(`activity-${boardId}`).open = true;
      }
      const target = boardId ? document.getElementById(`activity-${boardId}`) : document.getElementById(id);
      const focusTarget = boardId ? target.querySelector("summary") : target.querySelector("h2");
      if (updateHash && pendingHash === null) setHash(`#${target.id}`);
      target.scrollIntoView({ behavior: "instant", block: "start" });
      focusTarget.focus({ preventScroll: true });
    } finally {
      if (curtain.open) curtain.close();
      changingChapter = false;
      if (pendingHash !== null) {
        const hash = pendingHash;
        pendingHash = null;
        await navigateHash(hash);
      }
    }
  }
  curtain.addEventListener("cancel", event => event.preventDefault());
  function replayIntro() {
    clearAnimations(intro);
    page.inert = true;
    intro.querySelector(".intro-enter").disabled = false;
    openDialog(intro);
    window.IntroExperience.start();
    intro.querySelector("#intro-title").focus({ preventScroll: true });
  }
  intro.addEventListener("cancel", event => {
    event.preventDefault();
    intro.querySelector(".opening-skip").click();
  });
  let leavingIntro = false;
  async function enterExhibition(quick = false) {
    if (leavingIntro) return;
    leavingIntro = true;
    intro.querySelector(".intro-enter").disabled = true;
    document.body.classList.add("entered", "opening-transition");
    window.scrollTo({ top: 0, behavior: "instant" });
    try {
      await window.IntroExperience.prepareHome();
      // Start the homepage once, underneath the opening curtains. Removing this
      // class only after close would restart its opacity animation and flash.
      document.body.classList.remove("opening-transition");
      await window.IntroExperience.leave({ quick });
    } finally {
      intro.close();
      page.inert = false;
      entered = true;
      leavingIntro = false;
      document.body.classList.remove("opening-transition");
    }
    document.querySelector(".hero-enter").focus({ preventScroll: true });
    if (initialHash) {
      const hash = initialHash;
      initialHash = "";
      await navigateHash(hash);
    }
  }
  intro.querySelector(".intro-enter").addEventListener("click", () => enterExhibition());
  intro.querySelector(".opening-skip").addEventListener("click", () => enterExhibition(true));

  let galleryEntries = [];
  let photoIndex = 0;
  let galleryOpener = null;
  let indexOpener = null;
  const image = lightbox.querySelector(".lightbox-image");
  const imageMessage = lightbox.querySelector(".lightbox-message");
  const photoActivityLink = lightbox.querySelector(".lightbox-activity-link");
  function showPhoto(index) {
    photoIndex = (index + galleryEntries.length) % galleryEntries.length;
    const { activity, photo } = galleryEntries[photoIndex];
    window.PhotoCache.warm([photo.src, galleryEntries[(photoIndex + 1) % galleryEntries.length].photo.src, galleryEntries[(photoIndex - 1 + galleryEntries.length) % galleryEntries.length].photo.src]);
    image.hidden = false;
    image.src = photo.src;
    image.alt = approvedPhoto(photo)?.caption || photo.alt;
    lightbox.querySelector(".lightbox-caption").textContent = approvedPhoto(photo)?.caption || "";
    lightbox.querySelector("h2").textContent = `${activity.boardId} / ${activity.title}`;
    photoActivityLink.href = `#activity-${activity.boardId}`;
    photoActivityLink.dataset.photoActivity = activity.boardId;
    photoActivityLink.setAttribute("aria-label", `查看对应活动：${activity.title}`);
    imageMessage.textContent = "";
    lightbox.querySelector(".lightbox-counter").textContent = `${photoIndex + 1} / ${galleryEntries.length}`;
    lightbox.querySelector(".lightbox-prev").hidden = galleryEntries.length < 2;
    lightbox.querySelector(".lightbox-next").hidden = galleryEntries.length < 2;
  }
  function startGallery(entries, index, opener, random = false) {
    if (!entries.length) return;
    galleryEntries = entries;
    galleryOpener = opener;
    photoActivityLink.hidden = !random;
    showPhoto(index);
    openDialog(lightbox);
    lightbox.querySelector(".lightbox-close").focus();
  }
  function openGallery(activity, index, opener, schoolId = "all") {
    if (!activity?.photos.length) return;
    const entries = allPhotoEntries.filter(entry => entry.activity === activity && (schoolId === "all" || approvedPhoto(entry.photo)?.schoolId === schoolId));
    startGallery(entries, Math.max(0, entries.findIndex(entry => entry.photo === activity.photos[index])), opener);
  }
  document.addEventListener("click", async event => {
    const target = event.target.closest("button, a");
    if (!target) return;
    if (target.hasAttribute("data-school-filter")) {
      const gallery = target.closest(".school-gallery"), schoolId = target.dataset.schoolFilter;
      gallery.querySelectorAll(".school-filter").forEach(button => button.setAttribute("aria-pressed", String(button === target)));
      gallery.querySelectorAll(".activity-photo").forEach(figure => {
        figure.hidden = schoolId !== "all" && figure.dataset.school !== schoolId;
        figure.querySelector("button").dataset.gallerySchool = schoolId;
      });
    } else if (target.dataset.chapter) {
      await selectChapter(target.dataset.chapter);
    } else if (target.hasAttribute("data-close-chapter")) {
      const previous = activeChapter;
      closeChapter();
      setHash("#guide");
      document.querySelector(`.directory-card[data-chapter="${previous}"]`).focus({ preventScroll: true });
      document.getElementById("guide").scrollIntoView({ behavior: reducedMotion.matches ? "instant" : "smooth" });
    } else if (target.hasAttribute("data-open-index")) {
      indexOpener = target;
      openDialog(indexDialog);
    } else if (target.dataset.photoActivity) {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      const activity = byBoardId.get(target.dataset.photoActivity);
      galleryOpener = null;
      lightbox.close();
      await selectChapter(activity.chapter, activity.boardId);
    } else if (target.dataset.activity) {
      const activity = byBoardId.get(target.dataset.activity);
      indexDialog.close();
      await selectChapter(activity.chapter, activity.boardId);
    } else if (target.hasAttribute("data-random-photo")) {
      startGallery(allPhotoEntries, Math.floor(Math.random() * allPhotoEntries.length), target, true);
    } else if (target.hasAttribute("data-replay")) {
      replayIntro();
    } else if (target.dataset.gallery) {
      openGallery(byBoardId.get(target.dataset.gallery), Number(target.dataset.photo || 0), target, target.dataset.gallerySchool || "all");
    }
  });
  indexDialog.querySelector(".index-close").addEventListener("click", () => {
    indexDialog.close();
    indexOpener?.focus({ preventScroll: true });
  });
  lightbox.querySelector(".lightbox-close").addEventListener("click", () => lightbox.close());
  lightbox.querySelector(".lightbox-prev").addEventListener("click", () => showPhoto(photoIndex - 1));
  lightbox.querySelector(".lightbox-next").addEventListener("click", () => showPhoto(photoIndex + 1));
  lightbox.addEventListener("close", () => galleryOpener?.focus({ preventScroll: true }));
  lightbox.addEventListener("keydown", event => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      showPhoto(photoIndex + (event.key === "ArrowRight" ? 1 : -1));
    }
  });
  image.addEventListener("error", () => {
    image.hidden = true;
    imageMessage.textContent = "这张照片暂不可用，请切换查看其他照片。";
  });
  let touchStart = null;
  const swipeArea = lightbox.querySelector(".lightbox-stage");
  swipeArea.addEventListener("touchstart", event => {
    touchStart = event.touches.length === 1 && !event.target.closest("button, a") ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
  }, { passive: true });
  swipeArea.addEventListener("touchmove", event => {
    if (event.touches.length !== 1) touchStart = null;
  }, { passive: true });
  swipeArea.addEventListener("touchend", event => {
    if (!touchStart || event.touches?.length || event.changedTouches.length !== 1) {
      touchStart = null;
      return;
    }
    const dx = event.changedTouches[0].clientX - touchStart.x;
    const dy = event.changedTouches[0].clientY - touchStart.y;
    if (Math.abs(dx) >= 45 && Math.abs(dx) > Math.abs(dy) * 1.3) showPhoto(photoIndex + (dx < 0 ? 1 : -1));
    touchStart = null;
  }, { passive: true });
  swipeArea.addEventListener("touchcancel", () => { touchStart = null; }, { passive: true });
  lightbox.addEventListener("close", () => { touchStart = null; }, { passive: true });
  function hideFailedImage(img) {
    img.hidden = true;
    img.closest(".photo-trigger, .activity-cover, .directory-image")?.classList.add("image-unavailable");
  }
  document.querySelectorAll("img:not(.lightbox-image)").forEach(img => {
    img.addEventListener("error", () => hideFailedImage(img));
    if (img.complete && img.naturalWidth === 0) hideFailedImage(img);
  });
  async function navigateHash(hash) {
    let id;
    try { id = decodeURIComponent(hash.slice(1)); }
    catch { return; }
    const activity = id.startsWith("activity-") ? byBoardId.get(id.slice(9)) : null;
    if (activity) await selectChapter(activity.chapter, activity.boardId, false);
    else if (chapters.some(chapter => chapter.id === id)) await selectChapter(id, null, false);
    else {
      if (!id || id === "top" || id === "guide") closeChapter();
      document.getElementById(id || "top")?.scrollIntoView({ behavior: "instant" });
    }
  }
  window.addEventListener("hashchange", () => {
    if (!entered || intro.open) return;
    if (changingChapter) pendingHash = window.location.hash;
    else navigateHash(window.location.hash);
  });
  const backTop = document.querySelector(".back-top");
  let scrollScheduled = false;
  window.addEventListener("scroll", () => {
    if (scrollScheduled) return;
    scrollScheduled = true;
    requestAnimationFrame(() => { backTop.hidden = window.scrollY < 600; scrollScheduled = false; });
  }, { passive: true });
  replayIntro();
  window.PhotoCache.start([
    ...allPhotoEntries.map(entry => previewSource(entry.photo.src)),
    ...allPhotoEntries.map(entry => entry.photo.src)
  ]);
})();
