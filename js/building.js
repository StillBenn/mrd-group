/* ==========================================================================
   MRD Group — architectural viewer (construction page)
   --------------------------------------------------------------------------
   A nine-storey residential block, modelled procedurally in Blender by
   `building.py`: a wide podium, a main shaft, a cantilevered bay, a crown that
   steps back, glazed facades and a roofscape. Each storey is its own object
   (Floor_0 … Floor_8), which is what lets this file raise them one at a time
   as the reader scrolls — the building assembles itself, bottom to top.

   The lesson this file is built around: an architectural model without
   image-based lighting reads as grey cardboard. So the renderer uses an HDR
   environment for reflections and soft light, filmic tone mapping, and the
   PBR materials authored in Blender — never a flat colour override.
   ========================================================================== */

const DPR_CAP = 1.6;
const FLOOR_PREFIX = "Floor_";

/* Bump this whenever building.py is re-run. GitHub Pages serves assets with a
   ten-minute cache, and a browser that has already stored the old .glb will
   keep drawing it long after the new one is live — which looks exactly like
   "the fix did not work". The query string makes the new model a new URL. */
const ASSET_VERSION = "4";

export async function createBuilding(canvas, opts = {}) {
  const THREE = await import("./vendor/three/three.module.min.js");
  const { GLTFLoader } = await import("./vendor/three/GLTFLoader.js");
  const { RGBELoader } = await import("./vendor/three/RGBELoader.js");

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    /* The scene is composited over the page, and the only thing drawn on the
       transparent plane is a shadow. With premultiplied alpha that shadow is
       multiplied away to nothing; turning it off is what lets it show. */
    premultipliedAlpha: false,
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
  /* 40° at the distance set below shows 37.9 m of height, against a building
     that reaches 32.8 m at the mast tip. The previous 36° framing only covered
     28.3 m, which is why the roof was cut off. */
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 400);

  /* ---- environment ------------------------------------------------------
     One HDR does the work of a dozen lights: it gives every surface something
     to reflect, which is what makes concrete look like concrete and glass
     look like glass. */
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();

  const env = await new Promise((resolve, reject) => {
    new RGBELoader().load(
      opts.hdr || "./img/hdr/kloofendal_48d_partly_cloudy.hdr",
      (tex) => {
        const t = pmrem.fromEquirectangular(tex).texture;
        tex.dispose();
        resolve(t);
      },
      undefined,
      reject
    );
  });
  scene.environment = env;

  /* A key light on top of the environment, purely for the shadows — an HDR
     alone lights a scene beautifully but casts nothing. */
  const key = new THREE.DirectionalLight(0xfff6e8, 2.2);
  /* This light TURNS WITH THE CAMERA (see updateCamera). With a fixed light,
     rotating the model swung its shadow towards the viewer at some angles and
     the composition ran off the bottom of the frame — measured worst case 1.20
     against a 1.0 budget. Rotating the rig keeps the shadow in the same place
     on screen at every angle: worst case drops to 0.86.
     The elevation is deliberately steep (70 over 26) so the shadow stays
     short; a 46° light cast a 31.7 m shadow that alone overflowed the frame. */
  const LIGHT_BASE = new THREE.Vector3(26, 70, -6);
  key.position.copy(LIGHT_BASE);
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

  /* ---- the building ----------------------------------------------------- */
  const gltf = await new Promise((resolve, reject) =>
    new GLTFLoader().load(
      opts.model || "./img/building.glb?v=" + ASSET_VERSION,
      resolve,
      undefined,
      reject
    )
  );
  const building = gltf.scene;
  const floors = [];

  building.children.slice().forEach((child) => {
    if (!child.name.startsWith(FLOOR_PREFIX)) return;
    const idx = parseInt(child.name.slice(FLOOR_PREFIX.length), 10);
    /* Every storey needs its OWN material instances. Blender exports one
       shared concrete/glass material across every storey, so fading storey 5 was
       fading the entire building — which is why nothing appeared until the
       scroll was nearly finished. */
    child.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      o.material = Array.isArray(o.material)
        ? o.material.map((m) => m.clone())
        : o.material.clone();
    });
    floors.push({ idx, obj: child, baseY: child.position.y });
  });
  floors.sort((a, b) => a.idx - b.idx);

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
  scene.add(building);

  /* The building stands on nothing visible. A modelled plinth — disc or slab —
     always reads as a foreign white shape pasted over the page's own
     background, and whichever way the canvas crops it, it looks broken. This
     plane is invisible except where shadow falls on it, so the block appears
     to stand on the page itself. */
  const shadowCatcher = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 400),
    new THREE.ShadowMaterial({ opacity: 0.38 })
  );
  shadowCatcher.rotation.x = -Math.PI / 2;
  shadowCatcher.position.y = 0;
  shadowCatcher.receiveShadow = true;
  scene.add(shadowCatcher);

  /* ---- camera ----------------------------------------------------------- */
  /* Framed close so the block fills the canvas — a small model floating in a
     large empty frame is what made it look like a toy. */
  /* Distance set by measurement, not by trigonometry: projecting the model's
     bounding box through this camera puts all eight corners inside the frame.
     A closer rig cut the parapet and mast off the top. */
  const TARGET = new THREE.Vector3(0, 16, 0);
  const basePos = new THREE.Vector3(46, 32, 55);
  const camPos = basePos.clone();

  let progress = 0;
  let pointerX = 0, pointerY = 0, smoothX = 0, smoothY = 0;
  let running = false, raf = 0, width = 0, height = 0;

  /* Drag-to-turn. `spin` is the angle the reader has dialled in by dragging and
     it persists; hover parallax is added on top of it, at a fraction of the
     weight, so the two never fight for control. */
  let spin = 0;
  let spinTarget = 0;
  let dragging = false;
  let lastDragX = 0;

  /* How far back the rig sits, as a multiple of basePos. Measured by projecting
     the model AND its cast shadow through this camera across a full rotation:
     the composition needs at least 0.88 while the frame is wider than ~1.1,
     and 0.93/aspect once it narrows. A phone-shaped frame (0.62) therefore
     needs ~1.5 — at 1.0 the building overflowed by 38%, which is why it was
     cut off on narrow screens. */
  let fitScale = 1;

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h || (w === width && h === height)) return;
    width = w; height = h;
    renderer.setSize(w, h, false);
    const aspect = w / h;
    camera.aspect = aspect;
    fitScale = Math.min(2.2, Math.max(0.9, 0.95 / aspect));
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
      f.obj.position.y = f.baseY + (1 - eased) * 5.0;
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

  const wanted = new THREE.Vector3();

  /* Camera placement lives here rather than inside the loop, because dragging
     must move the camera even while the loop is idle (off-screen, or a browser
     that has throttled rAF). `snap` skips the easing for that case. */
  function updateCamera(snap) {
    spin += (spinTarget - spin) * (snap ? 1 : 0.16);
    const a = spin + smoothX * 0.34;
    /* fitScale pushes the whole rig away from TARGET, so a narrow frame gets a
       wider view without changing the composition. */
    const bx = basePos.x * fitScale;
    const bz = basePos.z * fitScale;
    const by = TARGET.y + (basePos.y - TARGET.y) * fitScale;
    wanted.set(
      bx * Math.cos(a) - bz * Math.sin(a),
      /* Kept small: the framing budget above was measured with a ±2 m tilt. */
      by - smoothY * 2.0,
      bx * Math.sin(a) + bz * Math.cos(a)
    );
    if (snap) camPos.copy(wanted);
    else camPos.lerp(wanted, 0.06);
    camera.position.copy(camPos);
    camera.lookAt(TARGET);

    /* Swing the key light by the same angle, so the shadow keeps its place in
       the frame however far the reader has turned the model. */
    key.position.set(
      LIGHT_BASE.x * Math.cos(a) - LIGHT_BASE.z * Math.sin(a),
      LIGHT_BASE.y,
      LIGHT_BASE.x * Math.sin(a) + LIGHT_BASE.z * Math.cos(a)
    );
  }

  function frame() {
    raf = 0;
    if (!running) return;
    smoothX += (pointerX - smoothX) * 0.06;
    smoothY += (pointerY - smoothY) * 0.06;
    updateCamera(false);
    draw();
    raf = requestAnimationFrame(frame);
  }

  resize();
  layout();
  draw();

  return {
    floorCount: floors.length,

    /* Scroll drives this directly, so it paints synchronously: the storeys
       must land on the exact frame the scroll reports, not one rAF later. */
    setProgress(p) {
      progress = p < 0 ? 0 : p > 1 ? 1 : p;
      layout();
      draw();
    },

    setPointer(x, y) {
      pointerX = x;
      pointerY = y;
    },

    /* Left-button drag turns the building, like a model on a turntable. */
    beginDrag(clientX) {
      dragging = true;
      lastDragX = clientX;
    },
    moveDrag(clientX) {
      if (!dragging) return;
      spinTarget += (clientX - lastDragX) * 0.009;
      lastDragX = clientX;
      if (!running) {
        updateCamera(true);
        draw();
      }
    },
    endDrag() {
      dragging = false;
    },
    isDragging() {
      return dragging;
    },

    start() {
      if (running) return;
      running = true;
      if (!raf) raf = requestAnimationFrame(frame);
    },

    stop() {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    },

    destroy() {
      this.stop();
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
