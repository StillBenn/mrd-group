/* ==========================================================================
   MRD Group — Building maquette (construction page)
   --------------------------------------------------------------------------
   A procedurally modelled reinforced-concrete frame, built in Blender by a
   script and exported as a 52 KB glTF. Each storey is its own named object
   (Floor_0 … Floor_5), which is what lets this file raise them one at a time
   as the reader scrolls: the building assembles itself, bottom to top.

   Deliberate constraints, so this stays a maquette on paper rather than a
   game engine dropped into a corporate site:

     · paper-white materials, one soft key light and a fill — no reflections,
       no environment map, no post-processing
     · the model never spins on its own; the pointer only tilts it a few
       degrees, the same restraint the rest of the site uses
     · three.js and the model are fetched ONLY when the section is near the
       viewport, so the other pages never pay for them
     · the renderer stops entirely whenever the canvas is off-screen

   Without WebGL, with reduced motion, or if anything fails to load, the
   section keeps its static fallback and this module simply never runs.
   ========================================================================== */

const DPR_CAP = 1.6;
const FLOOR_PREFIX = "Floor_";

export async function createBuilding(canvas, opts = {}) {
  const THREE = await import("./vendor/three/three.module.min.js");
  const { GLTFLoader } = await import("./vendor/three/GLTFLoader.js");

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, DPR_CAP));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
  camera.position.set(22, 17, 26);
  camera.lookAt(0, 8, 0);

  /* Light rig: one grazing key that casts the shadows the frame needs to read
     as solid, plus a wide fill so the shadow side never goes muddy. */
  const key = new THREE.DirectionalLight(0xffffff, 2.1);
  key.position.set(14, 26, 12);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 80;
  key.shadow.camera.left = -22;
  key.shadow.camera.right = 22;
  key.shadow.camera.top = 30;
  key.shadow.camera.bottom = -6;
  key.shadow.bias = -0.0012;
  scene.add(key);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xc9c2b4, 1.15));

  const fill = new THREE.DirectionalLight(0xffffff, 0.5);
  fill.position.set(-18, 10, -14);
  scene.add(fill);

  /* Load the maquette. */
  const gltf = await new Promise((resolve, reject) => {
    new GLTFLoader().load(opts.model || "./img/building.glb", resolve, undefined, reject);
  });

  const model = gltf.scene;
  const floors = [];
  model.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true;
    o.receiveShadow = true;
    /* Replace the exported material so the frame matches the site's paper
       rather than whatever the exporter guessed. */
    const isGround = o.name.startsWith("Ground") || (o.parent && o.parent.name.startsWith("Ground"));
    o.material = new THREE.MeshStandardMaterial({
      color: isGround ? 0xdcd6cb : 0xeae6de,
      roughness: isGround ? 0.95 : 0.82,
      metalness: 0.0,
      transparent: true,
      opacity: 1,
    });
  });

  model.children.slice().forEach((child) => {
    if (child.name.startsWith(FLOOR_PREFIX)) {
      const idx = parseInt(child.name.slice(FLOOR_PREFIX.length), 10);
      floors.push({ idx, obj: child, baseY: child.position.y });
    }
  });
  floors.sort((a, b) => a.idx - b.idx);

  scene.add(model);

  /* --- state ------------------------------------------------------------ */
  let progress = 0;      // 0..1, how much of the building has risen
  let pointerX = 0;
  let pointerY = 0;
  let smoothX = 0;
  let smoothY = 0;
  let running = false;
  let raf = 0;
  let width = 0;
  let height = 0;

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h || (w === width && h === height)) return;
    width = w;
    height = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  /* Each storey has its own slice of the scroll, so they land in sequence
     instead of all sliding up together. */
  function layout() {
    const n = floors.length;
    floors.forEach((f, i) => {
      const start = (i / n) * 0.86;
      const end = start + 0.3;
      let t = (progress - start) / (end - start);
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const eased = 1 - Math.pow(1 - t, 3);
      f.obj.position.y = f.baseY + (1 - eased) * 7.5;
      f.obj.traverse((o) => {
        if (o.isMesh) o.material.opacity = eased;
      });
      f.obj.visible = eased > 0.001;
    });
  }

  function frame() {
    raf = 0;
    if (!running) return;
    resize();

    /* The pointer only tilts the maquette a few degrees — it never takes
       control of the camera. */
    smoothX += (pointerX - smoothX) * 0.06;
    smoothY += (pointerY - smoothY) * 0.06;
    model.rotation.y = smoothX * 0.32;
    model.rotation.x = smoothY * 0.06;

    renderer.render(scene, camera);
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

  resize();
  layout();
  renderer.render(scene, camera);

  return {
    /* Scroll drives this directly, so it paints synchronously: the storeys
       must land on the exact frame the scroll reports, not one rAF later.
       The loop stays responsible only for easing the pointer tilt. */
    setProgress(p) {
      progress = p < 0 ? 0 : p > 1 ? 1 : p;
      layout();
      resize();
      renderer.render(scene, camera);
    },
    setPointer(x, y) {
      pointerX = x;
      pointerY = y;
    },
    start,
    stop,
    floorCount: floors.length,
    destroy() {
      stop();
      renderer.dispose();
      scene.traverse((o) => {
        if (o.isMesh) {
          o.geometry.dispose();
          if (o.material.dispose) o.material.dispose();
        }
      });
    },
  };
}
