/* ==========================================================================
   MRD Group — Front-end orchestration
   --------------------------------------------------------------------------
   Everything that needs a frame runs inside ONE ticker, in a fixed order:

     1. Lenis integrates the scroll position
     2. ScrollTrigger reads it (via Lenis' scroll event) and updates blends
     3. The cursor follows
     4. The canvas draws

   Separate requestAnimationFrame loops were the cause of the stutter: each
   one woke the main thread independently, so scroll interpolation and
   rendering fought for the same frame.
   ========================================================================== */

import { applyConfig } from "./config.js";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/* --------------------------------------------------------------------------
   Loader — progress reflects work that actually finished.
   -------------------------------------------------------------------------- */
function createLoader() {
  const el = $(".loader");
  if (!el) return { track: (p) => Promise.all(p), finish: () => {} };

  const fill = $(".loader__fill", el);
  const pct = $(".loader__pct", el);
  let total = 0;
  let done = 0;

  const paint = () => {
    const value = total ? Math.round((done / total) * 100) : 100;
    if (fill) fill.style.width = value + "%";
    if (pct) pct.textContent = String(value).padStart(3, "0");
  };

  return {
    track(promises) {
      total += promises.length;
      paint();
      return Promise.all(
        promises.map((p) =>
          Promise.resolve(p)
            .catch(() => {})
            .then(() => {
              done++;
              paint();
            })
        )
      );
    },
    finish() {
      done = total;
      paint();
      el.classList.add("is-done");
      document.body.classList.remove("is-loading");
      setTimeout(() => el.remove(), 1400);
    },
  };
}

/* --------------------------------------------------------------------------
   Smooth scroll. `lerp` (not `duration`) is what makes the wheel feel
   continuous rather than a series of eased jumps.
   -------------------------------------------------------------------------- */
function initSmoothScroll() {
  if (reduceMotion || typeof window.Lenis !== "function") return null;

  const lenis = new window.Lenis({
    /* A low lerp is what makes the wheel glide rather than step. Raising it
       towards 0.15 makes the page feel abrupt; lowering it past ~0.05 makes
       it feel detached from the hand. */
    lerp: 0.075,
    wheelMultiplier: 1,
    smoothWheel: true,
    syncTouch: false, // native momentum on touch beats emulating it
  });

  if (window.ScrollTrigger) {
    lenis.on("scroll", window.ScrollTrigger.update);
  }

  $$('a[href^="#"]').forEach((a) => {
    const id = a.getAttribute("href");
    if (id.length < 2) return;
    a.addEventListener("click", (e) => {
      const target = document.getElementById(id.slice(1));
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: -70 });
    });
  });

  return lenis;
}

/* --------------------------------------------------------------------------
   Cursor — a single dot, written straight from the pointer event.

   No interpolation and no ticker work: a cursor that eases towards the hand
   is indistinguishable from a cursor that is lagging.
   -------------------------------------------------------------------------- */
function initCursor() {
  const el = $(".cursor");
  if (!el) return;
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  if (reduceMotion) return;

  document.body.classList.add("has-cursor");

  /* Regions painted in the same near-black as the dot; over these it flips
     to paper so it never disappears. */
  const darkRegions = ".site-footer, .wa-float";

  window.addEventListener(
    "pointermove",
    (e) => {
      el.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      const overDark =
        e.target instanceof Element && !!e.target.closest(darkRegions);
      el.classList.toggle("is-inverse", overDark);
    },
    { passive: true }
  );

  /* The dot only grows over interactive elements. No text label rides with it:
     a word pinned to the pointer covers the very copy it sits on, and the
     element's own hover state (rule, arrow, colour) already says "clickable". */
  document.addEventListener("pointerover", (e) => {
    const el2 = e.target instanceof Element ? e.target : null;
    if (el2 && el2.closest("a, button")) el.classList.add("is-hover");
    if (el2 && el2.closest(".map-frame")) el.classList.add("is-hidden");
  });
  document.addEventListener("pointerout", (e) => {
    const el2 = e.target instanceof Element ? e.target : null;
    if (el2 && el2.closest("a, button")) el.classList.remove("is-hover");
    if (el2 && el2.closest(".map-frame")) el.classList.remove("is-hidden");
  });
}

/* --------------------------------------------------------------------------
   Header state + mobile menu
   -------------------------------------------------------------------------- */
function initHeader() {
  const header = $(".site-header");
  const toggle = $(".menu-toggle");
  const menu = $(".menu");

  if (header) {
    let stuck = false;
    const onScroll = () => {
      const next = window.scrollY > 40;
      if (next === stuck) return; // only touch the DOM when the state changes
      stuck = next;
      header.classList.toggle("is-stuck", stuck);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  if (!toggle || !menu) return;

  const setOpen = (open) => {
    document.body.classList.toggle("menu-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Menüyü kapat" : "Menüyü aç");
    menu.setAttribute("aria-hidden", String(!open));
    document.documentElement.style.overflow = open ? "hidden" : "";
  };

  toggle.addEventListener("click", () =>
    setOpen(!document.body.classList.contains("menu-open"))
  );
  $$("a", menu).forEach((a) => a.addEventListener("click", () => setOpen(false)));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && document.body.classList.contains("menu-open")) {
      setOpen(false);
      toggle.focus();
    }
  });
  setOpen(false);
}

/* --------------------------------------------------------------------------
   Scroll reveals — CSS owns the animation, JS only flips a class.
   -------------------------------------------------------------------------- */
function initReveals() {
  /* The hero has its own orchestrated entrance (initHeroIntro) that plays as
     the loader curtain lifts, so it is excluded here. */
  const items = $$("[data-reveal], .split-line, .reveal-media").filter(
    (el) => !el.closest(".hero")
  );
  if (!items.length) return;

  if (reduceMotion || !("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("is-in"));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        io.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -10% 0px", threshold: 0.1 }
  );

  items.forEach((el) => {
    if (!el.style.getPropertyValue("--reveal-delay")) {
      const peers = el.parentElement ? [...el.parentElement.children] : [];
      const idx = peers.indexOf(el);
      el.style.setProperty("--reveal-delay", `${Math.min(Math.max(idx, 0), 5) * 0.09}s`);
    }
    io.observe(el);
  });
}

/* --------------------------------------------------------------------------
   Hero entrance — one orchestrated sequence played as the loader curtain
   lifts, instead of the hero fading in on its own the moment the page mounts.
   Returns a play() the boot sequence calls once loading is done. CSS still
   owns the animation; JS only sets the per-element delay and flips the class.
   -------------------------------------------------------------------------- */
function initHeroIntro() {
  const hero = $(".hero");
  if (!hero) return () => {};

  const seq = [
    hero.querySelector(".hero__eyebrow"),
    ...$$(".split-line", hero),
    hero.querySelector(".hero__lead"),
    hero.querySelector(".scroll-cue"),
  ].filter(Boolean);

  /* Staggered so the eyebrow leads, the three sector words fall in turn, then
     the supporting copy — a read order, not a single pop. */
  seq.forEach((el, i) => el.style.setProperty("--reveal-delay", (i * 0.1).toFixed(2) + "s"));

  return () => seq.forEach((el) => el.classList.add("is-in"));
}

/* --------------------------------------------------------------------------
   Chapter rail — a hairline index on the right showing which of the seven
   story chapters the reader is in, with a click to jump. Built from the same
   [data-scene] sections the ground reads, so the two never disagree. Homepage
   only (needs several chapters); desktop only (hidden by CSS under 1024px).
   -------------------------------------------------------------------------- */
function initChapterRail(lenis) {
  const sections = $$("[data-scene]");
  if (sections.length < 4) return; // the multi-chapter homepage story only
  /* The rail is navigation, not decoration, so reduced-motion keeps it — CSS
     drops its transitions. Only a missing IntersectionObserver disables it,
     since without one no node could ever be marked current. */
  if (!("IntersectionObserver" in window)) return;

  const LABELS = {
    intro: "Giriş", group: "Kurumsal", market: "Market", insaat: "İnşaat",
    enerji: "Enerji", approach: "Yaklaşım", close: "İletişim",
  };
  const COLORS = {
    market: "var(--c-market)", insaat: "var(--c-insaat)", enerji: "var(--c-petrol)",
  };

  const rail = document.createElement("nav");
  rail.className = "chapter-rail";
  rail.setAttribute("aria-label", "Bölüm göstergesi");

  const items = sections.map((sec) => {
    const key = sec.dataset.scene;
    if (!sec.id) sec.id = "bolum-" + key;
    const label = LABELS[key] || key;
    const a = document.createElement("a");
    a.className = "chapter-rail__item";
    a.href = "#" + sec.id;
    a.style.setProperty("--rail-c", COLORS[key] || "var(--c-brand)");
    a.setAttribute("aria-label", label + " bölümüne git");
    a.innerHTML =
      '<span class="chapter-rail__label">' + label + "</span>" +
      '<span class="chapter-rail__dot" aria-hidden="true"></span>';
    a.addEventListener("click", (e) => {
      e.preventDefault();
      if (lenis && lenis.scrollTo) lenis.scrollTo(sec, { offset: -70 });
      else sec.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
    });
    rail.appendChild(a);
    return { sec, a };
  });

  document.body.appendChild(rail);
  /* A timeout, not requestAnimationFrame: rAF never fires while the tab is in
     the background, which would leave the rail stuck at opacity 0 for anyone
     who opened the page in a new tab. The small delay still lets the fade run. */
  setTimeout(() => rail.classList.add("is-ready"), 30);

  const setActive = (sec) =>
    items.forEach((it) => it.a.classList.toggle("is-active", it.sec === sec));

  /* A section counts as current only while it straddles the screen's middle
     band, so exactly one node is ever active. */
  const io = new IntersectionObserver(
    (entries) => entries.forEach((en) => en.isIntersecting && setActive(en.target)),
    { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
  );
  items.forEach((it) => io.observe(it.sec));
  setActive(sections[0]);
}

/* --------------------------------------------------------------------------
   Parallax depth — the sector media drifts a little slower than the copy as
   its section passes, so foreground text and midground image separate into
   layers instead of moving as one flat plane. Driven by a scrubbed
   ScrollTrigger (GSAP owns the frame; no second loop), transform only.
   -------------------------------------------------------------------------- */
function initParallax() {
  if (reduceMotion || !window.gsap || !window.ScrollTrigger) return;

  $$(".sector__media").forEach((media) => {
    const sector = media.closest(".sector") || media;
    window.gsap.fromTo(
      media,
      { y: 34 },
      {
        y: -34,
        ease: "none",
        scrollTrigger: {
          trigger: sector,
          start: "top bottom",
          end: "bottom top",
          scrub: 0.6,
        },
      }
    );
  });
}

/* --------------------------------------------------------------------------
   Embossed chapter mark — as a sector section takes the screen, its name is
   pressed into the paper ground itself. The word has no colour: it exists as
   relief, so it only surfaces where the lamp grazes it and disappears again
   as the light moves on. The shader owns the effect; this only says which
   word, and when.
   -------------------------------------------------------------------------- */
function initMark(scene) {
  if (!scene || typeof scene.setMark !== "function") return;
  if (reduceMotion || !("IntersectionObserver" in window)) return;

  const LABEL = { market: "MARKET", insaat: "İNŞAAT", enerji: "ENERJİ" };
  const sections = $$("[data-scene]").filter((s) => LABEL[s.dataset.scene]);
  if (!sections.length) return;

  /* Only a section holding the middle band of the screen counts as current,
     so the word never flickers between two neighbours. */
  let current = null;
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) current = en.target;
        else if (current === en.target) current = null;
      });
      scene.setMark(current ? LABEL[current.dataset.scene] : "");
    },
    { rootMargin: "-40% 0px -40% 0px", threshold: 0 }
  );
  sections.forEach((s) => io.observe(s));
}

/* --------------------------------------------------------------------------
   WhatsApp prefill — every wa.me link gets a message tuned to the page's
   sector, so a tap opens WhatsApp with the right context already typed.
   -------------------------------------------------------------------------- */
function initWhatsappPrefill() {
  const messages = {
    market: "Merhaba, Cizre Park hakkında bilgi almak istiyorum.",
    insaat: "Merhaba, MRD İnşaat projeleri hakkında bilgi almak istiyorum.",
    enerji: "Merhaba, MRD Enerji hakkında bilgi almak istiyorum.",
    "": "Merhaba, MRD Group hakkında bilgi almak istiyorum.",
  };
  const text = messages[document.body.dataset.sector || ""] || messages[""];
  const q = "text=" + encodeURIComponent(text);
  $$('a[href*="wa.me"]').forEach((a) => {
    const href = a.getAttribute("href");
    if (!href || /[?&]text=/.test(href)) return;
    a.setAttribute("href", href + (href.includes("?") ? "&" : "?") + q);
  });
}

/* --------------------------------------------------------------------------
   Sector hover → ground colour. On the homepage, hovering a sector row washes
   the WebGL ground to that sector's hue; leaving returns it to the scroll
   state. Ties the decorative background to the brand, so it feels responsive
   rather than ambient.
   -------------------------------------------------------------------------- */
function initSectorHover(scene) {
  if (!scene || reduceMotion) return;
  if (document.body.dataset.sector) return; // homepage only (sub-pages are locked)
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

  $$(".sector[data-scene]").forEach((sec) => {
    const key = sec.dataset.scene;
    if (!key) return;
    sec.addEventListener("pointerenter", () => scene.setHover(key));
    sec.addEventListener("pointerleave", () => scene.setHover(null));
  });
}

/* --------------------------------------------------------------------------
   Page transitions — a paper curtain rises to cover the screen before an
   internal navigation. Combined with the loader curtain on the incoming page,
   the separate HTML pages feel like one continuous application.
   -------------------------------------------------------------------------- */
function initPageTransitions() {
  if (reduceMotion) return;

  const wipe = document.createElement("div");
  wipe.className = "page-wipe";
  wipe.setAttribute("aria-hidden", "true");
  const mark = document.createElement("img");
  mark.className = "page-wipe__logo";
  mark.src = "./img/mrd-group.png";
  mark.alt = "";
  wipe.appendChild(mark);
  document.body.appendChild(wipe);

  let leaving = false;

  const isInternal = (a) => {
    const href = a.getAttribute("href");
    if (!href) return false;
    if (a.target && a.target !== "_self") return false;
    if (a.hasAttribute("download")) return false;
    if (/^(https?:|mailto:|tel:|#)/.test(href)) return false;
    return true; // ./*.html, ./ , relative paths
  };

  document.addEventListener("click", (e) => {
    if (leaving) return;
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest("a");
    if (!a || !isInternal(a)) return;
    e.preventDefault();
    leaving = true;
    document.body.classList.add("is-leaving");
    const go = () => (window.location.href = a.href);
    // navigate once the curtain has covered the screen
    setTimeout(go, 560);
  });

  /* A browser back/forward that restores this page from cache would leave the
     curtain stuck down. Clear it whenever the page is shown again. */
  window.addEventListener("pageshow", (e) => {
    if (e.persisted) {
      leaving = false;
      document.body.classList.remove("is-leaving");
    }
  });
}

/* --------------------------------------------------------------------------
   Count-up figures — numbers climb from zero the first time they scroll in.
   -------------------------------------------------------------------------- */
function initCountUp() {
  const nums = $$("[data-count]");
  if (!nums.length) return;

  const statOf = (el) => el.closest(".stat");
  /* Turkish thousands separator: 16500 must read as 16.500, not 16500. */
  const fmt = (v) => Math.round(v).toLocaleString("tr-TR");
  const settle = (el) => {
    el.textContent = fmt(parseFloat(el.dataset.count) || 0);
    const stat = statOf(el);
    if (stat) stat.classList.add("is-counted");
  };
  if (reduceMotion || !("IntersectionObserver" in window)) {
    nums.forEach(settle);
    return;
  }

  const run = (el) => {
    const stat = statOf(el);
    if (stat) stat.classList.add("is-counted"); // draws the accent rule
    const target = parseFloat(el.dataset.count) || 0;
    const dur = 1500;
    let start = null;
    const step = (now) => {
      if (start === null) start = now;
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = fmt(target * eased);
      if (t < 1) requestAnimationFrame(step);
      else el.textContent = fmt(target);
    };
    requestAnimationFrame(step);
  };

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        /* Stagger by the figure's position in the band so the four numbers
           land in sequence, not all at once — a cinematic proof beat. */
        const stat = statOf(e.target);
        const idx =
          stat && stat.parentElement
            ? [...stat.parentElement.children].indexOf(stat)
            : 0;
        setTimeout(() => run(e.target), Math.min(Math.max(idx, 0), 5) * 140);
      });
    },
    { threshold: 0.5 }
  );
  nums.forEach((n) => io.observe(n));
}

/* --------------------------------------------------------------------------
   Coverflow carousel — 12 slides per sector. The centre slide is sharp and
   full; its neighbours peek in from the sides, blurred and scaled back. Slides
   advance on arrows, drag/swipe, clicking a side slide, or a gentle autoplay;
   the centre slide opens in the lightbox.

   Real photos come from the admin panel (localStorage per sector) and take the
   leading slots; the rest stay as placeholders until filled.
   -------------------------------------------------------------------------- */
function initCarousel() {
  const roots = $$("[data-carousel]");
  if (!roots.length) return;
  const sector = document.body.dataset.sector || "";
  const label = sector === "market" ? "Cizre Park" : sector === "insaat" ? "Proje" : "Görsel";
  let custom = [];
  try {
    custom = JSON.parse(localStorage.getItem("mrd.gallery." + sector) || "[]");
  } catch (e) {
    custom = [];
  }
  custom = (Array.isArray(custom) ? custom : []).filter(
    (d) => typeof d === "string" && d.startsWith("data:image")
  );

  /* Market ships the client's own REAL Cizre Park photos (6); construction and
     energy still use the 12 sample placeholders until their real photos arrive. */
  const SHIPPED = { market: 6 };
  const shippedCount = SHIPPED[sector] || 12;

  /* Captions belong to the SHIPPED photos, so they must travel with their own
     file — pairing them by slide index would mislabel every photo as soon as
     an admin upload shifts the order. */
  const CAPTIONS = {
    market: [
      "Açık hava çarşısı",
      "Cizre Park — dış cephe",
      "Gün batımında Cizre Park",
      "Gece promenadı",
      "Play Park — çocuk eğlence alanı",
      "İç mekân — yeme, içme ve sosyal alan",
    ],
  };

  /* Admin uploads lead; the shipped photos follow. Every upload is kept — an
     editor who adds ten photos must see all ten. */
  const shipped = [];
  for (let i = 1; i <= shippedCount; i++) {
    shipped.push({
      src: "./img/gallery/" + sector + "-" + String(i).padStart(2, "0") + ".jpg",
      caption: (CAPTIONS[sector] && CAPTIONS[sector][i - 1]) || "",
    });
  }
  const sources = custom
    .map((src) => ({ src: src, caption: "" }))
    .concat(shipped);

  roots.forEach((root) => {
    root.setAttribute("role", "group");
    root.setAttribute("aria-roledescription", "galeri");
    root.setAttribute("aria-label", label + " görselleri");

    const viewport = document.createElement("div");
    viewport.className = "carousel__viewport";
    const track = document.createElement("div");
    track.className = "carousel__track";
    viewport.appendChild(track);

    sources.forEach((item, i) => {
      const slide = document.createElement("button");
      slide.type = "button";
      slide.className = "carousel__slide";
      slide.setAttribute("aria-label", label + " görseli " + (i + 1));
      slide.setAttribute("data-caption", item.caption);
      const img = document.createElement("img");
      img.alt = item.caption || label + " görseli " + (i + 1);
      img.loading = "lazy";
      img.decoding = "async";
      /* Resolve from soft over-scan once decoded, so real photos feel placed
         rather than popped (CSS owns the transition). */
      img.addEventListener("load", () => img.classList.add("is-loaded"), { once: true });
      img.src = item.src;
      if (img.complete && img.naturalWidth) img.classList.add("is-loaded");
      slide.appendChild(img);
      track.appendChild(slide);
    });

    const prev = document.createElement("button");
    prev.type = "button";
    prev.className = "carousel__nav carousel__nav--prev";
    prev.setAttribute("aria-label", "Önceki");
    prev.innerHTML =
      '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M15 5l-7 7 7 7"/></svg>';
    const next = document.createElement("button");
    next.type = "button";
    next.className = "carousel__nav carousel__nav--next";
    next.setAttribute("aria-label", "Sonraki");
    next.innerHTML =
      '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 5l7 7-7 7"/></svg>';

    root.appendChild(viewport);
    root.appendChild(prev);
    root.appendChild(next);

    const slides = [...track.children];
    let active = 0; // the loop wraps, so every index has neighbours on both sides
    let dragging = false;
    let moved = false;
    let startX = 0;
    let step = 0;
    const n = slides.length;

    /* Distance between neighbour centres. On a wide screen the neighbours sit
       beside the centre slide; on a narrow one that would push them off-screen
       entirely, so they tuck partly BEHIND it (they already carry a lower
       z-index) and keep peeking in — the 3-up read survives on phones. */
    const measure = () => {
      const w = slides[0] ? slides[0].offsetWidth : 0;
      step = viewport.clientWidth < 640
        ? w * 0.62
        : w + Math.min(w * 0.06 + 20, 44);
    };

    /* Shortest signed distance from the active slide to slide i, wrapping at
       the ends — this is what makes the coverflow an endless loop with a
       neighbour always present on both sides. */
    const dist = (i) => {
      let d = i - active;
      if (d > n / 2) d -= n;
      if (d < -n / 2) d += n;
      return d;
    };

    const layout = (animate) => {
      if (!animate) slides.forEach((s) => (s.style.transition = "none"));
      slides.forEach((s, i) => {
        const d = dist(i);
        const abs = Math.abs(d);
        const near = abs <= 1; // centre + the two neighbours: the only visible ones
        const scale = d === 0 ? 1 : 0.82;
        s.style.transform =
          "translate(calc(-50% + " + d * step + "px), -50%) scale(" + scale + ")";
        s.style.opacity = near ? (d === 0 ? "1" : "0.55") : "0";
        s.style.zIndex = String(20 - abs);
        s.style.pointerEvents = near ? "auto" : "none";
        /* Off-stage slides drop their blur and their GPU layer. Leaving a dozen
           blurred, promoted layers alive costs real frames while scrolling. */
        s.style.filter = near ? "" : "none";
        s.style.willChange = near ? "transform, opacity" : "auto";
        s.classList.toggle("is-active", d === 0);
      });
      if (!animate) {
        void viewport.offsetWidth; // reflow so the cleared transition settles
        slides.forEach((s) => (s.style.transition = ""));
      }
    };

    const setActive = (i) => {
      active = ((i % n) + n) % n; // wrap both ways — infinite
      layout(true);
    };

    measure();
    layout(false);

    prev.addEventListener("click", () => setActive(active - 1));
    next.addEventListener("click", () => setActive(active + 1));

    slides.forEach((slide, i) => {
      slide.addEventListener("click", (e) => {
        if (moved) {
          e.stopPropagation();
          return;
        }
        if (i !== active) {
          e.stopPropagation(); // side slide focuses, does not open the viewer
          setActive(i);
        }
        // active slide falls through to the delegated lightbox handler
      });
    });

    /* Swipe — decide direction on release; a real click keeps `moved` false so
       the viewer still opens. No pointer capture (it swallowed the click). */
    viewport.addEventListener("pointerdown", (e) => {
      dragging = true;
      moved = false;
      startX = e.clientX;
      measure();
    });
    viewport.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      if (Math.abs(e.clientX - startX) > 8) moved = true;
    });
    const endDrag = (e) => {
      if (!dragging) return;
      dragging = false;
      const dx = e.clientX - startX;
      if (step && Math.abs(dx) > 40) setActive(active + (dx < 0 ? 1 : -1));
    };
    viewport.addEventListener("pointerup", endDrag);
    viewport.addEventListener("pointercancel", endDrag);

    /* Gentle autoplay — always forward, wraps seamlessly, pauses on interaction. */
    let timer = null;
    const tick = () => setActive(active + 1);
    const startAuto = () => {
      if (reduceMotion || timer) return;
      timer = setInterval(tick, 4200);
    };
    const stopAuto = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };
    root.addEventListener("pointerenter", stopAuto);
    root.addEventListener("pointerleave", startAuto);
    root.addEventListener("focusin", stopAuto);
    [prev, next].forEach((b) => b.addEventListener("click", stopAuto));
    startAuto();

    window.addEventListener("resize", () => {
      measure();
      layout(false);
    }, { passive: true });
  });
}

/* --------------------------------------------------------------------------
   Lightbox — clicking the centre carousel slide opens it full-screen. Works
   with a real <img> inside the slide, or falls back to the slide's caption for
   placeholders. Click handling is delegated.
   -------------------------------------------------------------------------- */
function initLightbox() {
  const slides = $$(".carousel__slide");
  if (!slides.length) return;

  const svg = (path, w) =>
    '<svg viewBox="0 0 24 24" width="' + w + '" height="' + w +
    '" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="' +
    path + '"/></svg>';

  const box = document.createElement("div");
  box.className = "lightbox";
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-modal", "true");
  box.setAttribute("aria-hidden", "true");
  box.setAttribute("aria-label", "Görsel galerisi");
  box.innerHTML =
    '<button class="lightbox__close" type="button" aria-label="Kapat">' + svg("M6 6l12 12M18 6L6 18", 20) + "</button>" +
    '<button class="lightbox__nav lightbox__nav--prev" type="button" aria-label="Önceki görsel">' + svg("M15 5l-7 7 7 7", 24) + "</button>" +
    '<figure class="lightbox__panel"></figure>' +
    '<button class="lightbox__nav lightbox__nav--next" type="button" aria-label="Sonraki görsel">' + svg("M9 5l7 7-7 7", 24) + "</button>" +
    '<div class="lightbox__bar"><span class="lightbox__caption"></span><span class="lightbox__count"></span></div>';
  document.body.appendChild(box);

  const panel = box.querySelector(".lightbox__panel");
  const captionEl = box.querySelector(".lightbox__caption");
  const countEl = box.querySelector(".lightbox__count");
  let index = 0;
  let lastFocus = null;

  const render = () => {
    const tile = slides[index];
    panel.querySelectorAll("img").forEach((n) => n.remove());
    const src = tile.querySelector("img");
    const caption = tile.getAttribute("data-caption") || "";
    if (src) {
      const big = document.createElement("img");
      big.src = src.currentSrc || src.src;
      big.alt = src.alt || caption;
      panel.appendChild(big);
    }
    captionEl.textContent = caption;
    countEl.textContent = index + 1 + " / " + slides.length;
  };

  /* Wrap around at the ends so the viewer feels like a continuous gallery. */
  const go = (dir) => {
    index = ((index + dir) % slides.length + slides.length) % slides.length;
    render();
  };
  const openAt = (i) => {
    index = ((i % slides.length) + slides.length) % slides.length;
    render();
    lastFocus = document.activeElement;
    box.classList.add("is-open");
    box.setAttribute("aria-hidden", "false");
    document.documentElement.style.overflow = "hidden";
    box.querySelector(".lightbox__close").focus();
  };
  const close = () => {
    box.classList.remove("is-open");
    box.setAttribute("aria-hidden", "true");
    document.documentElement.style.overflow = "";
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  };

  box.querySelector(".lightbox__nav--prev").addEventListener("click", (e) => { e.stopPropagation(); go(-1); });
  box.querySelector(".lightbox__nav--next").addEventListener("click", (e) => { e.stopPropagation(); go(1); });

  document.addEventListener("click", (e) => {
    const tile = e.target.closest(".carousel__slide");
    if (tile && slides.indexOf(tile) > -1) {
      openAt(slides.indexOf(tile));
      return;
    }
    if (e.target === box || e.target.closest(".lightbox__close")) close();
  });
  document.addEventListener("keydown", (e) => {
    if (!box.classList.contains("is-open")) return;
    if (e.key === "Escape") close();
    else if (e.key === "ArrowLeft") go(-1);
    else if (e.key === "ArrowRight") go(1);
  });
}

/* --------------------------------------------------------------------------
   Floating WhatsApp — appears once the hero is behind the reader.
   -------------------------------------------------------------------------- */
function initFloatingCta() {
  const btn = $(".wa-float");
  const hero = $(".hero");
  if (!btn) return;
  if (!hero || !("IntersectionObserver" in window)) {
    btn.classList.add("is-in");
    return;
  }
  const io = new IntersectionObserver(
    ([entry]) => btn.classList.toggle("is-in", !entry.isIntersecting),
    { threshold: 0.12 }
  );
  io.observe(hero);
}

/* --------------------------------------------------------------------------
   Canvas stage bound to the chapter sequence.
   -------------------------------------------------------------------------- */
async function initStage() {
  const stage = $(".stage");
  if (!stage) return null;

  const chapters = $$("[data-scene]");
  if (reduceMotion || !chapters.length) {
    stage.classList.add("stage--fallback");
    return null;
  }

  let scene = null;
  try {
    const mod = await import("./scene.js");
    scene = mod.createScene(stage);
  } catch (err) {
    scene = null;
  }

  if (!scene) {
    stage.classList.add("stage--fallback");
    return null;
  }

  const ST = window.ScrollTrigger;
  const indices = chapters.map((el) => {
    const i = scene.indexOf(el.dataset.scene);
    return i < 0 ? 0 : i;
  });
  scene.setBlend(indices[0], indices[0], 1);

  if (ST) {
    chapters.forEach((el, i) => {
      if (i === 0) return;
      ST.create({
        trigger: el,
        start: "top bottom",
        end: "top top",
        /* A number, not true: ScrollTrigger eases the scrubbed value over ~0.7s
           instead of snapping it to every scroll event. That damping is what
           turns the background's stepping into a smooth drift. */
        scrub: 0.7,
        onUpdate: (self) =>
          scene.setBlend(indices[i - 1], indices[i], self.progress),
      });
    });
  }

  return scene;
}

/* --------------------------------------------------------------------------
   Boot
   -------------------------------------------------------------------------- */
(async function boot() {
  document.body.classList.add("is-loading");
  applyConfig();

  /* Arm the hero entrance now (sets per-line delays; the hero stays hidden
     until play() runs as the loader lifts). */
  const playHero = initHeroIntro();

  if (window.gsap && window.ScrollTrigger) {
    window.gsap.registerPlugin(window.ScrollTrigger);
  }

  const loader = createLoader();

  initHeader();
  initFloatingCta();
  initPageTransitions();
  initWhatsappPrefill();

  initCursor();
  const lenis = initSmoothScroll();
  const scene = await initStage();
  initSectorHover(scene);
  initMark(scene);

  /* Overall scroll progress (0..1) for the scene's shape on sector pages.
     Prefer Lenis' own progress (no layout read); otherwise fall back to a
     cached scroll height so the ticker never forces a reflow. */
  let scrollMax = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  const refreshMax = () => {
    scrollMax = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  };
  window.addEventListener("resize", refreshMax, { passive: true });
  if (window.ScrollTrigger) window.ScrollTrigger.addEventListener("refresh", refreshMax);
  const scrollProgress = () =>
    lenis && typeof lenis.progress === "number" && !Number.isNaN(lenis.progress)
      ? lenis.progress
      : window.scrollY / scrollMax;

  /* One ticker for the whole page: the scroll is integrated first, then the
     ground is drawn against the position it just produced. */
  if (window.gsap) {
    window.gsap.ticker.lagSmoothing(0);
    let last = 0;
    window.gsap.ticker.add((time) => {
      const dt = last ? Math.min(time - last, 0.05) : 0.016;
      last = time;
      if (lenis) lenis.raf(time * 1000);
      if (scene) {
        scene.setScroll(scrollProgress());
        scene.update(time, dt);
      }
    });
  } else {
    let last = performance.now();
    const frame = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (lenis) lenis.raf(now);
      if (scene) {
        scene.setScroll(scrollProgress());
        scene.update(now / 1000, dt);
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  await loader.track([
    document.fonts ? document.fonts.ready : Promise.resolve(),
    ...$$("img[data-preload]").map((img) =>
      img.complete && img.naturalWidth
        ? Promise.resolve()
        : new Promise((res) => {
            img.addEventListener("load", res, { once: true });
            img.addEventListener("error", res, { once: true });
          })
    ),
  ]);

  initReveals();
  initCountUp();
  initCarousel();
  initLightbox();
  initChapterRail(lenis);
  initParallax();
  if (window.ScrollTrigger) window.ScrollTrigger.refresh();
  loader.finish();

  /* Play the hero entrance as the curtain rises — a short beat so the lift is
     already underway and the two motions read as one. */
  setTimeout(playHero, reduceMotion ? 0 : 500);
})();
