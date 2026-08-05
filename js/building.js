/* ==========================================================================
   MRD Group — architectural viewer (construction page)
   --------------------------------------------------------------------------
   Two procedurally modelled scenes, built in Blender by `building.py`:

     building.glb  a six-storey block — concrete frame, glazed facades,
                   balconies, railings, parapet. Each storey is its own named
                   object (Floor_0 … Floor_5), so they can rise one at a time
                   as the reader scrolls, and be hit-tested individually.
     flat.glb      one apartment interior, entered by clicking a storey.

   The lesson this file is built around: an architectural model without
   image-based lighting reads as grey cardboard. So the renderer uses an HDR
   environment for reflections and soft light, filmic tone mapping, and the
   materials authored in Blender — never a flat colour override.
   ========================================================================== */

const DPR_CAP = 1.6;
const FLOOR_PREFIX = "Floor_";

export async function createBuilding(canvas, opts = {}) {
  const THREE = await import("./vendor/three/three.module.min.js");
  const { GLTFLoader } = await import("./vendor/three/GLTFLoader.js");
  const { RGBELoader } = await import("./vendor/three/RGBELoader.js");

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, DPR_CAP));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  /* Filmic tone mapping is the difference between "3D render" and
     "photograph": it rolls highlights off instead of clipping them. */
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 400);

  /* ---- environment ------------------------------------------------------
     One HDR does the work of a dozen lights: it gives every surface something
     to reflect, which is what makes concrete look like concrete and glass
     look like glass. */
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();

  const loadHDR = (url) =>
    new Promise((resolve, reject) => {
      new RGBELoader().load(
        url,
        (tex) => {
          const env = pmrem.fromEquirectangular(tex).texture;
          tex.dispose();
          resolve(env);
        },
        undefined,
        reject
      );
    });

  const envOutdoor = await loadHDR(opts.hdrOutdoor || "./img/hdr/kloofendal_48d_partly_cloudy.hdr");
  scene.environment = envOutdoor;

  /* A key light on top of the environment, purely for the shadows — an HDR
     alone lights a scene beautifully but casts nothing. */
  const key = new THREE.DirectionalLight(0xfff6e8, 2.2);
  key.position.set(26, 34, 20);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 140;
  key.shadow.camera.left = -34;
  key.shadow.camera.right = 34;
  key.shadow.camera.top = 40;
  key.shadow.camera.bottom = -10;
  key.shadow.bias = -0.0009;
  key.shadow.normalBias = 0.02;
  scene.add(key);

  const loader = new GLTFLoader();
  const loadGLB = (url) =>
    new Promise((resolve, reject) => loader.load(url, resolve, undefined, reject));

  /* ---- the building ----------------------------------------------------- */
  const gltf = await loadGLB(opts.model || "./img/building.glb");
  const building = gltf.scene;
  const floors = [];

  building.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true;
    o.receiveShadow = true;
    const m = o.material;
    if (m) {
      m.envMapIntensity = 1.15;
      /* Blender exports glass as transmissive; keep it, just make sure it is
         not written into the depth buffer as an opaque wall. */
      if (m.transmission > 0 || m.opacity < 1) m.depthWrite = false;
    }
  });

  building.children.slice().forEach((child) => {
    if (child.name.startsWith(FLOOR_PREFIX)) {
      const idx = parseInt(child.name.slice(FLOOR_PREFIX.length), 10);
      floors.push({ idx, obj: child, baseY: child.position.y });
    }
  });
  floors.sort((a, b) => a.idx - b.idx);
  scene.add(building);

  /* ---- the apartment, loaded lazily on first entry ---------------------- */
  let flat = null;
  let flatLoading = null;

  async function ensureFlat() {
    if (flat) return flat;
    if (!flatLoading) {
      flatLoading = (async () => {
        const g = await loadGLB(opts.flat || "./img/flat.glb");
        const root = g.scene;
        root.traverse((o) => {
          if (!o.isMesh) return;
          o.castShadow = true;
          o.receiveShadow = true;
          if (o.material) o.material.envMapIntensity = 1.0;
        });

        /* A closed interior receives nothing from the environment, so it is
           lit deliberately: daylight through the glazed wall, a soft ceiling
           bounce, and a warm lamp in the corner. */
        const day = new THREE.RectAreaLight(0xffffff, 7.5, 9.2, 2.6);
        day.position.set(0, 1.5, -4.0);
        day.lookAt(0, 1.4, 2);
        root.add(day);

        const bounce = new THREE.HemisphereLight(0xffffff, 0xc8bda8, 1.35);
        root.add(bounce);

        const lamp = new THREE.PointLight(0xffd9a8, 12, 9, 2);
        lamp.position.set(3.9, 1.9, -2.6);
        root.add(lamp);

        root.visible = false;
        scene.add(root);
        flat = root;
        return root;
      })();
    }
    return flatLoading;
  }

  /* ---- camera framing --------------------------------------------------- */
  const OUT_TARGET = new THREE.Vector3(0, 9.5, 0);
  const outPos = new THREE.Vector3(34, 24, 40);
  const target = OUT_TARGET.clone();
  const camPos = outPos.clone();
  let desiredPos = outPos.clone();
  let desiredTarget = OUT_TARGET.clone();

  let mode = "exterior";     // "exterior" | "interior"
  let progress = 0;
  let pointerX = 0, pointerY = 0, smoothX = 0, smoothY = 0;
  let running = false, raf = 0, width = 0, height = 0;

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h || (w === width && h === height)) return;
    width = w; height = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  /* Each storey owns a slice of the scroll, so the frame assembles in
     sequence rather than sliding up as one lump. */
  function layout() {
    const n = floors.length;
    floors.forEach((f, i) => {
      const start = (i / n) * 0.84;
      const end = start + 0.32;
      let t = (progress - start) / (end - start);
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const eased = 1 - Math.pow(1 - t, 3);
      f.obj.position.y = f.baseY + (1 - eased) * 9.0;
      f.obj.visible = eased > 0.004;
      f.obj.traverse((o) => {
        if (!o.isMesh || !o.material) return;
        o.material.transparent = eased < 0.999 || o.material.transmission > 0;
        o.material.opacity = eased;
      });
    });
  }

  function draw() {
    resize();
    renderer.render(scene, camera);
  }

  function frame() {
    raf = 0;
    if (!running) return;
    smoothX += (pointerX - smoothX) * 0.05;
    smoothY += (pointerY - smoothY) * 0.05;

    /* The pointer never takes the camera; it orbits it a few degrees. */
    const orbit = mode === "exterior" ? 0.16 : 0.5;
    const lift = mode === "exterior" ? 0.06 : 0.12;
    const a = smoothX * orbit;
    const px = desiredPos.x * Math.cos(a) - desiredPos.z * Math.sin(a);
    const pz = desiredPos.x * Math.sin(a) + desiredPos.z * Math.cos(a);

    camPos.lerp(new THREE.Vector3(px, desiredPos.y - smoothY * lift * 8, pz), 0.06);
    target.lerp(desiredTarget, 0.06);
    camera.position.copy(camPos);
    camera.lookAt(target);

    draw();
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (running) return;
    running = true;
    if (!raf) raf = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  /* ---- hit testing ------------------------------------------------------ */
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();

  function floorAt(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    ndc.x = ((clientX - r.left) / r.width) * 2 - 1;
    ndc.y = -((clientY - r.top) / r.height) * 2 + 1;
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObject(building, true);
    for (const h of hits) {
      let o = h.object;
      while (o && !o.name.startsWith(FLOOR_PREFIX)) o = o.parent;
      if (o) return parseInt(o.name.slice(FLOOR_PREFIX.length), 10);
    }
    return -1;
  }

  resize();
  layout();
  draw();

  return {
    floorCount: floors.length,

    setProgress(p) {
      progress = p < 0 ? 0 : p > 1 ? 1 : p;
      layout();
      if (mode === "exterior") draw();
    },

    setPointer(x, y) { pointerX = x; pointerY = y; },

    floorAt,

    /* Step inside a storey: the building hides, the apartment appears, and
       the camera drops to standing height inside it. */
    async enter(idx) {
      const root = await ensureFlat();
      mode = "interior";
      building.visible = false;
      root.visible = true;
      scene.environment = envOutdoor;
      desiredPos = new THREE.Vector3(-0.4, 1.62, 3.1);
      desiredTarget = new THREE.Vector3(0.1, 1.45, -3.6);
      camPos.copy(desiredPos);
      target.copy(desiredTarget);
      start();
      draw();
      return idx;
    },

    exit() {
      mode = "exterior";
      if (flat) flat.visible = false;
      building.visible = true;
      desiredPos = outPos.clone();
      desiredTarget = OUT_TARGET.clone();
      draw();
    },

    isInside() { return mode === "interior"; },

    start,
    stop,

    destroy() {
      stop();
      pmrem.dispose();
      renderer.dispose();
      scene.traverse((o) => {
        if (o.isMesh) {
          o.geometry.dispose();
          if (o.material && o.material.dispose) o.material.dispose();
        }
      });
    },
  };
}
