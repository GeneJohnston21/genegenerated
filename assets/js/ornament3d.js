// Spin-it-with-your-finger 3D ornament preview (three.js).
// The ornament is modelled the way it's printed: a flat body with a bevelled edge,
// raised script lettering, raised snowflakes, a raised rim and a hanging loop.
// Raised details are built from stacked alpha-masked layers, which keeps this light
// (no font files for three.js) while still catching light like real raised print.
import * as THREE from "../vendor/three.module.min.js";
import { starPoints } from "./orn2d.js";

const DEPTH = 0.14, BEVEL = 0.03;
const FRONT = DEPTH / 2 + BEVEL;
const PLANE = 2.3;            // world units covered by the art canvas
const TEX = 1024;             // art canvas size in px
const PX = TEX / PLANE;       // px per world unit
const LAYERS = 7, STEP = 0.0075;

function webglOK() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch { return false; }
}

function outlineShape(shape, scale = 1) {
  const s = new THREE.Shape();
  if (shape === "star") {
    const pts = starPoints(0, 0, 1.1 * scale, 0.52 * scale).map(([x, y]) => [x, -y]);
    s.moveTo(pts[0][0], pts[0][1]);
    pts.slice(1).forEach(([x, y]) => s.lineTo(x, y));
    s.closePath();
  } else {
    s.absarc(0, 0, scale, 0, Math.PI * 2, false);
  }
  return s;
}

function holePath(r) {
  const p = new THREE.Path();
  p.absarc(0, 0, r, 0, Math.PI * 2, true);
  return p;
}

function canvas() {
  const c = document.createElement("canvas");
  c.width = c.height = TEX;
  return c;
}

const toPx = (x, y) => [TEX / 2 + x * PX, TEX / 2 - y * PX];

function fitFont(ctx, text, family, weight, maxW, startPx, minPx = 40) {
  let size = startPx;
  ctx.font = `${weight} ${size}px ${family}`;
  while (ctx.measureText(text).width > maxW && size > minPx) {
    size -= 4;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

function drawFlake(ctx, x, y, r) {
  const [cx, cy] = toPx(x, y);
  const R = r * PX;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.lineCap = "round";
  ctx.lineWidth = R * 0.22;
  for (let i = 0; i < 6; i++) {
    ctx.rotate(Math.PI / 3);
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(0, -R);
    ctx.moveTo(0, -R * 0.55); ctx.lineTo(-R * 0.28, -R * 0.8);
    ctx.moveTo(0, -R * 0.55); ctx.lineTo(R * 0.28, -R * 0.8);
    ctx.stroke();
  }
  ctx.restore();
}

function arcText(ctx, text, radius, sizePx, family, weight) {
  // Text along the bottom of a circle, reading left to right, letters upright.
  // Canvas angles run clockwise from +x, so the bottom of the circle is +90°.
  ctx.font = `${weight} ${sizePx}px ${family}`;
  const R = radius * PX;
  const chars = [...text];
  const gap = sizePx * 0.04;
  const widths = chars.map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + gap * (chars.length - 1);
  let phi = Math.PI / 2 + total / R / 2;
  ctx.save();
  ctx.translate(TEX / 2, TEX / 2);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  chars.forEach((ch, i) => {
    phi -= widths[i] / R / 2;
    ctx.save();
    ctx.rotate(phi - Math.PI / 2);
    ctx.translate(0, R);
    ctx.fillText(ch, 0, 0);
    ctx.restore();
    phi -= widths[i] / R / 2 + gap / R;
  });
  ctx.restore();
}

// Mask canvases: white = raised, black = flat. One per color.
function buildMasks(o) {
  const ink = canvas(), acc = canvas();
  const ci = ink.getContext("2d"), ca = acc.getContext("2d");
  [ci, ca].forEach((c) => { c.fillStyle = "#000"; c.fillRect(0, 0, TEX, TEX); c.fillStyle = "#fff"; c.strokeStyle = "#fff"; c.textAlign = "center"; c.textBaseline = "alphabetic"; });
  const star = o.shape === "star";

  if (o.kind === "photo") {
    const label = (o.text || "").trim() || "Caption";
    if (star) {
      const size = fitFont(ci, label, "Fredoka, sans-serif", 700, 0.9 * PX, 0.17 * PX, 30);
      const [x, y] = toPx(0, -0.66);
      ci.fillText(label, x, y + size * 0.35);
    } else {
      const caption = `${label} · ${o.year}`;
      let size = 0.15 * PX;
      ci.font = `700 ${size}px Fredoka, sans-serif`;
      while (ci.measureText(caption).width > 0.76 * Math.PI * PX * 0.9 && size > 30) { size -= 3; ci.font = `700 ${size}px Fredoka, sans-serif`; }
      arcText(ci, caption, 0.77, size, "Fredoka, sans-serif", 700);
      drawFlake(ca, -0.55, 0.55, 0.1); drawFlake(ca, 0.55, 0.55, 0.1); drawFlake(ca, 0, 0.8, 0.08);
    }
    return { ink, acc, flush: true };
  }

  const name = (o.text || "").trim() || "Your Name";
  const maxW = (star ? 1.0 : 1.48) * PX;
  const size = fitFont(ci, name, "Pacifico, cursive", 400, maxW, (star ? 0.36 : 0.5) * PX, 50);
  const [nx, ny] = toPx(0, star ? -0.02 : 0.02);
  ci.font = `400 ${size}px Pacifico, cursive`;
  ci.fillText(name, nx, ny + size * 0.28);

  const ySize = (star ? 0.13 : 0.19) * PX;
  ci.font = `700 ${ySize}px Fredoka, sans-serif`;
  if ("letterSpacing" in ci) ci.letterSpacing = `${Math.round(ySize * 0.18)}px`;
  const [yx, yy] = toPx(0, star ? -0.3 : -0.5);
  ci.fillText(o.year, yx, yy + ySize * 0.35);
  if ("letterSpacing" in ci) ci.letterSpacing = "0px";

  if (star) {
    drawFlake(ca, 0, 0.55, 0.11);
  } else {
    drawFlake(ca, -0.42, 0.5, 0.12); drawFlake(ca, 0.42, 0.5, 0.12); drawFlake(ca, 0, -0.76, 0.09);
  }
  return { ink, acc, flush: false };
}

function photoTexture(photoURL) {
  const c = canvas();
  const g = c.getContext("2d");
  const grad = g.createLinearGradient(0, 0, 0, TEX);
  grad.addColorStop(0, "#c9d6ff"); grad.addColorStop(1, "#8fa0d8");
  g.fillStyle = grad; g.fillRect(0, 0, TEX, TEX);
  g.fillStyle = "#6f7fb8";
  g.beginPath(); g.arc(TEX / 2, TEX * 0.42, TEX * 0.16, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(TEX / 2, TEX * 0.95, TEX * 0.32, TEX * 0.3, 0, Math.PI, 0); g.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  if (photoURL) {
    const img = new Image();
    img.onload = () => {
      const s = Math.min(img.width, img.height);
      g.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, TEX, TEX);
      tex.needsUpdate = true;
    };
    img.src = photoURL;
  }
  return tex;
}

export async function createOrnamentViewer(container, initial, schemes) {
  if (!webglOK()) return null;
  try {
    await Promise.all([
      document.fonts.load(`400 120px Pacifico`),
      document.fonts.load(`700 60px Fredoka`),
    ]);
  } catch { /* draw with fallback fonts */ }

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
  } catch { return null; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const el = renderer.domElement;
  el.className = "orn3d-canvas";
  container.appendChild(el);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  scene.add(new THREE.HemisphereLight(0xc8d4ff, 0x1a1030, 1.1));
  const key = new THREE.DirectionalLight(0xfff1dc, 2.2); key.position.set(1.6, 2.2, 3); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffc145, 1.4); rim.position.set(-2.5, 1, -1.5); scene.add(rim);
  const fill = new THREE.DirectionalLight(0x5b86ff, 0.7); fill.position.set(-2, -1, 2); scene.add(fill);

  const pivot = new THREE.Group();   // swings from the hanging loop
  const model = new THREE.Group();
  pivot.add(model);
  scene.add(pivot);

  let opts = { ...initial };
  const disposables = [];
  const track = (x) => (disposables.push(x), x);

  function clear() {
    model.clear();
    disposables.splice(0).forEach((d) => d.dispose && d.dispose());
  }

  function build() {
    clear();
    const s = schemes[opts.scheme] || Object.values(schemes)[0];
    const star = opts.shape === "star";
    const photo = opts.kind === "photo";
    const bodyMat = track(new THREE.MeshStandardMaterial({ color: s.body, roughness: 0.5, metalness: 0.02 }));
    const inkCol = new THREE.Color(s.ink);
    const accCol = new THREE.Color(s.accent);

    // Body (with a round window for photo ornaments)
    const outline = outlineShape(opts.shape);
    const windowR = star ? 0.44 : 0.56;
    if (photo) outline.holes.push(holePath(windowR));
    const bodyGeo = track(new THREE.ExtrudeGeometry(outline, { depth: DEPTH, bevelEnabled: true, bevelThickness: BEVEL, bevelSize: BEVEL, bevelSegments: 4, curveSegments: 72 }));
    bodyGeo.translate(0, 0, -DEPTH / 2);
    model.add(new THREE.Mesh(bodyGeo, bodyMat));

    // Raised rim
    const rimOuter = star ? null : 0.95, rimInner = star ? null : 0.89;
    if (!star) {
      const ring = new THREE.Shape(); ring.absarc(0, 0, rimOuter, 0, Math.PI * 2, false); ring.holes.push(holePath(rimInner));
      const rg = track(new THREE.ExtrudeGeometry(ring, { depth: 0.04, bevelEnabled: false, curveSegments: 96 }));
      rg.translate(0, 0, FRONT - 0.002);
      model.add(new THREE.Mesh(rg, track(new THREE.MeshStandardMaterial({ color: inkCol, roughness: 0.45 }))));
    }

    if (photo) {
      // Inner window ring in the ink color, the photo, and the flexible snap-in back.
      const lip = new THREE.Shape(); lip.absarc(0, 0, windowR + 0.06, 0, Math.PI * 2, false); lip.holes.push(holePath(windowR));
      const lg = track(new THREE.ExtrudeGeometry(lip, { depth: 0.035, bevelEnabled: false, curveSegments: 96 }));
      lg.translate(0, 0, FRONT - 0.002);
      model.add(new THREE.Mesh(lg, track(new THREE.MeshStandardMaterial({ color: inkCol, roughness: 0.45 }))));
      const ph = new THREE.Mesh(track(new THREE.CircleGeometry(windowR + 0.01, 72)), track(new THREE.MeshStandardMaterial({ map: track(photoTexture(opts.photoURL)), roughness: 0.35 })));
      ph.position.z = -0.01;
      model.add(ph);
      const back = new THREE.Mesh(track(new THREE.CylinderGeometry(windowR + 0.05, windowR + 0.05, 0.05, 72)), track(new THREE.MeshStandardMaterial({ color: 0x2a2f48, roughness: 0.9 })));
      back.rotation.x = Math.PI / 2; back.position.z = -FRONT + 0.005;
      model.add(back);
    }

    // Raised (or flush, for photo captions) artwork
    const masks = buildMasks(opts);
    const inkTex = track(new THREE.CanvasTexture(masks.ink));
    const accTex = track(new THREE.CanvasTexture(masks.acc));
    const planeGeo = track(new THREE.PlaneGeometry(PLANE, PLANE));
    const layers = masks.flush ? 1 : LAYERS;
    [[inkTex, inkCol], [accTex, accCol]].forEach(([tex, col]) => {
      for (let i = 0; i < layers; i++) {
        const top = i === layers - 1;
        const c = col.clone().multiplyScalar(top ? 1 : 0.62 + 0.05 * i);
        const m = track(masks.flush
          ? new THREE.MeshStandardMaterial({ color: c, alphaMap: tex, transparent: true, depthWrite: false, roughness: 0.42, metalness: 0.02 })
          : new THREE.MeshStandardMaterial({ color: c, alphaMap: tex, alphaTest: 0.5, alphaToCoverage: true, roughness: 0.42, metalness: 0.02 }));
        const mesh = new THREE.Mesh(planeGeo, m);
        mesh.position.z = FRONT + 0.0015 + i * STEP;
        model.add(mesh);
      }
    });

    // Hanging loop + string
    const topY = star ? 1.1 : 1.0;
    const loop = new THREE.Mesh(track(new THREE.TorusGeometry(0.12, 0.04, 16, 40)), track(new THREE.MeshStandardMaterial({ color: inkCol, roughness: 0.45 })));
    loop.position.y = topY + 0.1;
    model.add(loop);
    const stringGeo = track(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, topY + 0.2, 0), new THREE.Vector3(0, topY + 3, 0)]));
    model.add(new THREE.Line(stringGeo, track(new THREE.LineBasicMaterial({ color: 0x8a90b8 }))));

    // Hang from the loop: shift the model so the pivot sits at the loop.
    model.position.y = -(topY + 0.1);
    pivot.position.y = topY + 0.1 - 0.05;
    frameCamera();
  }

  function frameCamera() {
    const w = container.clientWidth || 300, h = container.clientHeight || 300;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const halfH = 1.38, halfW = 1.25;
    const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const dist = Math.max(halfH / t, halfW / (t * camera.aspect)) * 1.08;
    camera.position.set(0, 0, dist);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }

  // Interaction: drag to spin (horizontal), a little tilt (vertical), inertia, idle sway.
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let rotY = -0.35, rotX = 0.05, vel = 0, dragging = false, lastX = 0, lastY = 0, lastInput = -1e9, interacted = false;
  el.style.touchAction = "pan-y";
  el.addEventListener("pointerdown", (e) => { dragging = true; lastX = e.clientX; lastY = e.clientY; vel = 0; el.setPointerCapture(e.pointerId); markInput(); });
  el.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    rotY += dx * 0.012; vel = dx * 0.012;
    rotX = Math.max(-0.5, Math.min(0.5, rotX + dy * 0.006));
    markInput();
  });
  const end = () => { dragging = false; };
  el.addEventListener("pointerup", end);
  el.addEventListener("pointercancel", end);
  container.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") { rotY -= 0.35; markInput(); e.preventDefault(); }
    if (e.key === "ArrowRight") { rotY += 0.35; markInput(); e.preventDefault(); }
  });
  function markInput() { lastInput = performance.now(); if (!interacted) { interacted = true; container.dispatchEvent(new CustomEvent("orn:interacted", { bubbles: true })); } }

  let visible = true, raf = 0, t0 = performance.now();
  function tick(now) {
    raf = 0;
    const idle = now - lastInput > 2500 && !dragging;
    if (!dragging) { rotY += vel; vel *= 0.92; }
    if (idle && !reduce) {
      // ease back toward a gentle sway, facing front
      const turns = Math.round(rotY / (Math.PI * 2)) * Math.PI * 2;
      const target = turns + Math.sin((now - t0) / 1600) * 0.5;
      rotY += (target - rotY) * 0.03;
      rotX += (0.05 - rotX) * 0.03;
    }
    pivot.rotation.set(rotX, rotY, reduce ? 0 : Math.sin((now - t0) / 2100) * 0.025);
    renderer.render(scene, camera);
    if (visible && !document.hidden) raf = requestAnimationFrame(tick);
  }
  function start() { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(tick); }

  new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; start(); }).observe(container);
  document.addEventListener("visibilitychange", start);
  new ResizeObserver(() => { frameCamera(); start(); }).observe(container);

  let pending = 0;
  build();
  start();

  return {
    update(next) {
      opts = { ...opts, ...next };
      if (pending) return;
      pending = requestAnimationFrame(() => { pending = 0; build(); start(); });
    },
    spinTo(angle) { rotY = angle; markInput(); },
  };
}
