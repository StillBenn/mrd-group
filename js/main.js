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

  const hoverables = "a, button, [data-cursor]";
  document.addEventListener("pointerover", (e) => {
    if (e.target.closest(hoverables)) el.classList.add("is-hover");
    if (e.target.closest(".map-frame")) el.classList.add("is-hidden");
  });
  document.addEventListener("pointerout", (e) => {
    if (e.target.closest(hoverables)) el.classList.remove("is-hover");
    if (e.target.closest(".map-frame")) el.classList.remove("is-hidden");
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
  const items = $$("[data-reveal], .split-line, .reveal-media");
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

  if (window.gsap && window.ScrollTrigger) {
    window.gsap.registerPlugin(window.ScrollTrigger);
  }

  const loader = createLoader();

  initHeader();
  initFloatingCta();

  initCursor();
  const lenis = initSmoothScroll();
  const scene = await initStage();

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
  if (window.ScrollTrigger) window.ScrollTrigger.refresh();
  loader.finish();
})();
