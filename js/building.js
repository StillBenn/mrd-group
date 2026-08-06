/* ==========================================================================
   MRD Group — architectural viewer (construction page)
   --------------------------------------------------------------------------
   A six-storey residential block, modelled procedurally in Blender by
   `building.py`: concrete frame, glazed facades, balconies with railings,
   parapet and entrance canopy. Each storey exports as its own named object
   (Floor_0 … Floor_5), which is what lets this file raise them one at a time
   as the reader scrolls — the building assembles itself, bottom to top.

   The lesson this file is built around: an architectural model without
   image-based lighting reads as grey cardboard. So the renderer uses an HDR
   environment for reflections and soft light, filmic tone mapping, and the
   PBR materials authored in Blender — never a flat colour override.
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

  /* ---- the building ----------------------------------------------------- */
  const gltf = await new Promise((resolve, reject) =>
    new GLTFLoader().load(opts.model || "./img/building.glb", resolve, undefined, reject)
  );
  const building = gltf.scene;
  const floors = [];

  building.children.slice().forEach((child) => {
    if (!child.name.startsWith(FLOOR_PREFIX)) return;
    const idx = parseInt(child.name.slice(FLOOR_PREFIX.length), 10);
    /* Every storey needs its OWN material instances. Blender exports one
       shared concrete/glass material across all six, so fading storey 5 was
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

  /* ---- camera ----------------------------------------------------------- */
  /* Framed close so the block fills the canvas — a small model floating in a
     large empty frame is what made it look like a toy. */
  const TARGET = new THREE.Vector3(0, 10.5, 0);
  const basePos = new THREE.Vector3(24, 17, 28);
  const camPos = basePos.clone();

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

  function frame() {
    raf = 0;
    if (!running) return;
    smoothX += (pointerX - smoothX) * 0.06;
    smoothY += (pointerY - smoothY) * 0.06;

    /* The pointer orbits the model. Wide enough to feel like you are turning
       the object in your hands (~40° each way), still bounded so the reader
       can never lose the building. */
    const a = smoothX * 0.72;
    const px = basePos.x * Math.cos(a) - basePos.z * Math.sin(a);
    const pz = basePos.x * Math.sin(a) + basePos.z * Math.cos(a);
    camPos.lerp(new THREE.Vector3(px, basePos.y - smoothY * 6.5, pz), 0.06);
    camera.position.copy(camPos);
    camera.lookAt(TARGET);

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
