/* ==========================================================================
   MRD Group — Canvas stage
   --------------------------------------------------------------------------
   The ground is a plaster bas-relief: a procedural height field, lit by a
   lamp that follows the pointer. Moving the mouse sweeps light across the
   surface, so ridges catch highlights and hollows fall into shadow.

   Why a height field and not a gradient: a smooth wash on a light page reads
   as an empty page. Relief gives local contrast — real highlights and real
   shadows — which is what makes a pale surface feel like a material.

   Why raw WebGL and no 3D library:
     · one draw call, no geometry, no per-frame JavaScript
     · the scroll never competes with the scene for main-thread time
     · the whole surface is ~6 KB of shader source, nothing to download

   The canvas is decorative and aria-hidden. Every word on the page is real
   HTML above it.
   ========================================================================== */

/* Chapter → mood. `warp` moves the relief to a different part of the noise
   field so each chapter is carved differently; `light` is where the lamp
   rests when the pointer is still; `depth` scales how deep the carving cuts.

   The `warp` steps are deliberately small (1.5 apart). Because `field()` adds
   uWarp straight to the sample coordinate, the gap between two chapters is how
   far the whole surface slides during one scroll section — large steps make
   the background race past the scroll. 1.5 keeps each chapter visibly distinct
   while the drift stays calm under the reader. */
const CHAPTERS = {
  intro:    { color: [0.541, 0.373, 0.169], warp: 0.0, light: [ 0.26, 0.12], depth: 1.00 },
  group:    { color: [0.541, 0.373, 0.169], warp: 1.5, light: [-0.20, 0.06], depth: 0.82 },
  market:   { color: [0.180, 0.384, 0.267], warp: 3.0, light: [-0.30, 0.14], depth: 1.02 },
  insaat:   { color: [0.612, 0.310, 0.149], warp: 4.5, light: [ 0.32, 0.10], depth: 1.10 },
  enerji:   { color: [0.149, 0.271, 0.420], warp: 6.0, light: [ 0.04, 0.18], depth: 1.04 },
  approach: { color: [0.541, 0.373, 0.169], warp: 7.5, light: [-0.24, 0.02], depth: 0.78 },
  close:    { color: [0.541, 0.373, 0.169], warp: 9.0, light: [ 0.00, 0.16], depth: 0.92 },
};

const NAMES = Object.keys(CHAPTERS);

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2  uRes;
uniform float uTime;
uniform vec2  uPointer;   // lamp position, aspect-corrected units
uniform vec3  uColor;     // chapter accent
uniform float uWarp;
uniform float uDepth;
uniform vec3  uPaper;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i),                  hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

/* Plain fractal noise — soft, cloud-shaped. Used for the broad haze. */
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.55;
  for (int i = 0; i < 3; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}

/* Ridged fractal noise. Folding the noise around its midpoint turns smooth
   blobs into creases and crests — the shapes a chisel leaves, not clouds. */
float ridged(vec2 p) {
  float h = 0.0;
  float a = 0.52;
  for (int i = 0; i < 4; i++) {
    float n = noise(p);
    n = 1.0 - abs(n * 2.0 - 1.0);
    h += a * n * n;
    p = p * 2.07 + vec2(2.3, 4.7);
    a *= 0.52;
  }
  return h;
}

/* The carved surface. Warped so the ridges flow instead of running straight. */
float field(vec2 p) {
  float t = uTime * 0.010;
  vec2 w = vec2(
    noise(p * 0.85 + vec2(uWarp, t)),
    noise(p * 0.85 + vec2(t * 0.8, uWarp + 5.2))
  );
  return ridged(p * 1.02 + (w - 0.5) * 1.15 + vec2(uWarp, 0.0));
}

void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;

  /* The relief is carved into the upper right and fades towards the lower
     left, where the headline and body copy sit. Text always lands on calm
     paper; the material shows in the space beside it. */
  float m = smoothstep(-0.52, 0.34, p.x * 0.72 + p.y * 0.88);
  float mask = 0.36 + 0.64 * m;

  float e = 1.4 / uRes.y;
  float h  = field(p);
  float hx = field(p + vec2(e, 0.0));
  float hy = field(p + vec2(0.0, e));

  float amp = 0.070 * uDepth * mask;
  vec3 n = normalize(vec3((h - hx) * amp, (h - hy) * amp, e * 0.62));

  /* Lamp. The z term keeps it above the surface so the light grazes rather
     than blows out the crests. */
  vec3 L = normalize(vec3(uPointer - p, 0.46));
  float diff = max(dot(n, L), 0.0);

  vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
  float spec = pow(max(dot(n, H), 0.0), 36.0);

  /* Crevices sit in their own shadow. */
  float ao = clamp(h * 1.15, 0.0, 1.0);

  /* The lit side is capped just above paper white so highlights never clip;
     the contrast is carried by the shadows instead. That is how a pale
     material actually reads — blown highlights look like a cheap filter. */
  float shade = 0.76 + 0.26 * diff;
  shade *= mix(0.91, 1.02, ao);

  vec3 col = uPaper * mix(1.0, shade, mask);
  col += spec * 0.07 * mask;

  /* Chapter colour settles in the shadows, the way warm light does on stone. */
  col = mix(col, mix(col, uColor, 0.22), (1.0 - diff) * mask);

  /* A broad haze drifting over everything — including the calm text side, so
     the page reads as one atmosphere rather than a carved half and a blank
     half. Low frequency and low amplitude: felt, not seen. */
  float haze = fbm(p * 0.62 + vec2(uWarp * 0.25, uTime * 0.007));
  col *= 0.948 + 0.104 * haze;

  /* Quiet vignette keeps the eye on the centre column of text. */
  float vig = smoothstep(1.40, 0.34, length(p * vec2(0.78, 1.0)));
  col -= (1.0 - vig) * 0.040;

  /* Paper tooth. Deliberately STATIC — reseeding the grain every frame turns
     the whole page into film noise, which reads as the screen trembling once
     anything starts moving. Fixed grain stops banding without flickering. */
  float grain = hash(floor(gl_FragCoord.xy));
  col += (grain - 0.5) * 0.016;

  gl_FragColor = vec4(col, 1.0);
}
`;

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    /* Without this the page just falls back to a flat gradient and nobody
       ever finds out why. A compile failure is worth one line in the console. */
    console.warn("Stage shader failed to compile:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

const lerp = (a, b, t) => a + (b - a) * t;
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export function createScene(container) {
  const canvas = document.createElement("canvas");
  const gl =
    canvas.getContext("webgl", { alpha: false, antialias: false, depth: false }) ||
    canvas.getContext("experimental-webgl", { alpha: false, depth: false });
  if (!gl) return null;

  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;

  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]), // one oversized triangle
    gl.STATIC_DRAW
  );
  const aPos = gl.getAttribLocation(program, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const u = {};
  for (const name of ["uRes", "uTime", "uPointer", "uColor", "uWarp", "uDepth", "uPaper"]) {
    u[name] = gl.getUniformLocation(program, name);
  }

  /* Read the paper colour from the design tokens so the shader can never
     drift away from the CSS. */
  const paperCss = getComputedStyle(document.documentElement)
    .getPropertyValue("--c-paper")
    .trim();
  const paper = hexToRgb(paperCss) || [0.914, 0.906, 0.886];
  gl.uniform3f(u.uPaper, paper[0], paper[1], paper[2]);

  /* A WebGL buffer starts black. Clearing to paper means that even in the
     window before the first frame is drawn the ground matches the page. */
  gl.clearColor(paper[0], paper[1], paper[2], 1);

  container.appendChild(canvas);

  /* The relief is low-frequency and soft, so it can render at half display
     resolution and be upscaled by the browser for free. Lower is not just a
     size win — the fragment shader samples noise ~15 times per pixel, and at
     0.7 that fill cost competed with the scroll for frames and read as a
     tremble. Half resolution buys the headroom that makes scrolling smooth. */
  const SCALE = 0.5;
  let aspect = 1;

  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const width = Math.max(2, Math.round(w * dpr * SCALE));
    const height = Math.max(2, Math.round(h * dpr * SCALE));
    canvas.width = width;
    canvas.height = height;
    aspect = w / h;
    gl.viewport(0, 0, width, height);
    gl.uniform2f(u.uRes, width, height);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }
  resize();

  window.addEventListener("resize", resize, { passive: true });
  let ro = null;
  if ("ResizeObserver" in window) {
    ro = new ResizeObserver(resize);
    ro.observe(container);
  }

  const state = { from: 0, to: 0, k: 1 };

  /* Lamp position in the shader's aspect-corrected space: x spans ±aspect/2,
     y spans ±0.5. `has` stays false until the pointer actually moves, so
     touch devices keep the drifting lamp instead of a stuck one. */
  const pointer = { x: 0, y: 0, tx: 0, ty: 0, has: false };

  function onPointer(e) {
    pointer.tx = (e.clientX / window.innerWidth - 0.5) * aspect;
    pointer.ty = -(e.clientY / window.innerHeight - 0.5);
    pointer.has = true;
  }
  window.addEventListener("pointermove", onPointer, { passive: true });

  function update(time, dt) {
    const a = CHAPTERS[NAMES[state.from]];
    const b = CHAPTERS[NAMES[state.to]];
    const k = easeInOut(state.k);

    /* Where the lamp wants to be: the chapter's rest position plus a slow
       orbit, so the surface breathes even when nothing is moving. */
    const driftX = Math.sin(time * 0.11) * 0.20;
    const driftY = Math.cos(time * 0.083) * 0.10;
    const baseX = lerp(a.light[0], b.light[0], k) + driftX;
    const baseY = lerp(a.light[1], b.light[1], k) + driftY;

    const targetX = pointer.has ? pointer.tx : baseX;
    const targetY = pointer.has ? pointer.ty : baseY;

    /* Frame-rate independent easing: fast enough to feel attached to the
       hand, slow enough that heavy stone does not snap around. */
    const smooth = 1 - Math.pow(0.0000006, Math.min(dt, 0.05));
    pointer.x = lerp(pointer.x, targetX, smooth);
    pointer.y = lerp(pointer.y, targetY, smooth);

    gl.uniform1f(u.uTime, time);
    gl.uniform2f(u.uPointer, pointer.x, pointer.y);
    gl.uniform3f(
      u.uColor,
      lerp(a.color[0], b.color[0], k),
      lerp(a.color[1], b.color[1], k),
      lerp(a.color[2], b.color[2], k)
    );
    gl.uniform1f(u.uWarp, lerp(a.warp, b.warp, k));
    gl.uniform1f(u.uDepth, lerp(a.depth, b.depth, k));

    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  /* Paint once synchronously so the ground is correct before the first
     ticker frame ever arrives. */
  update(0, 0.016);

  return {
    /* from/to index into NAMES, k is the 0..1 blend between them. */
    setBlend(from, to, k) {
      const max = NAMES.length - 1;
      state.from = Math.max(0, Math.min(max, from));
      state.to = Math.max(0, Math.min(max, to));
      state.k = Math.max(0, Math.min(1, k));
    },

    indexOf(name) {
      return NAMES.indexOf(name);
    },

    update,

    destroy() {
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointer);
      if (ro) ro.disconnect();
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      canvas.remove();
    },
  };
}

function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return null;
  return [
    parseInt(m[1], 16) / 255,
    parseInt(m[2], 16) / 255,
    parseInt(m[3], 16) / 255,
  ];
}
