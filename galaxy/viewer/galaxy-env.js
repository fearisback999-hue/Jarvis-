// Procedural Milky Way environment — astronomy-informed generation.
//
// Structure follows the real galaxy:
//  · exponential radial disk profile (surface density ∝ e^(-r/Rd))
//  · four logarithmic spiral arms at ~12.5° pitch angle (Milky Way-like)
//  · a BARRED central bulge (the Milky Way is a barred spiral) with
//    old, warm K/M-giant colors
//  · young hot OB stars (blue-white) concentrated on the arm ridges,
//    older yellow population between arms
//  · pink HII star-forming regions sprinkled along the arms
//  · dark dust lanes hugging the inner edges of the arms
//  · thin-disk vertical structure (gaussian scale height) + sparse halo
//
// Everything is THREE.Points/Sprites — renders 75k+ stars at 60fps.

export function buildMilkyWay(THREE) {
  const group = new THREE.Group();

  const ARMS = 4;
  const PITCH = (12.5 * Math.PI) / 180; // pitch angle
  const TAN_PITCH = Math.tan(PITCH);
  const R_DISK = 2300; // galactic radius (scene units)
  const R_SCALE = 620; // exponential scale length
  const SCALE_HEIGHT = 55; // thin disk

  const rand = mulberry32(42); // seeded — same galaxy every load
  const gauss = () => (rand() + rand() + rand() + rand() - 2) / 2;

  // soft round star texture (shared)
  const starTex = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d");
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.4, "rgba(255,255,255,.45)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();

  const mkPoints = (positions, colors, size, opacity, additive = true) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(positions), 3));
    geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(colors), 3));
    return new THREE.Points(geo, new THREE.PointsMaterial({
      size, map: starTex, vertexColors: true, transparent: true, opacity,
      depthWrite: false, sizeAttenuation: true,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    }));
  };

  const push = (arr, x, y, z) => { arr.push(x, y, z); };
  const pushColor = (arr, hex, dim) => {
    const c = new THREE.Color(hex);
    arr.push(c.r * dim, c.g * dim, c.b * dim);
  };

  // radial sample from exponential disk
  const sampleR = () => Math.min(R_DISK, -R_SCALE * Math.log(1 - rand() * 0.985));
  // spiral arm angle for a radius (log spiral: θ = ln(r/r0)/tan(i))
  const armTheta = (r, arm) => Math.log(Math.max(r, 40) / 40) / TAN_PITCH + (arm * 2 * Math.PI) / ARMS;

  // ── old disk population (yellowish, everywhere) ──────────────────
  {
    const pos = [], col = [];
    const palette = ["#fff3d8", "#ffe9c2", "#ffdfb0", "#f6ecd8"];
    for (let i = 0; i < 34000; i++) {
      const r = sampleR();
      const theta = rand() * Math.PI * 2;
      const z = gauss() * SCALE_HEIGHT * (1 + r / R_DISK);
      push(pos, r * Math.cos(theta), z, r * Math.sin(theta));
      pushColor(col, palette[(rand() * palette.length) | 0], 0.28 + rand() * 0.5);
    }
    group.add(mkPoints(pos, col, 3.2, 0.75));
  }

  // ── spiral arms: young blue-white stars on the ridges ────────────
  {
    const pos = [], col = [];
    const palette = ["#aac8ff", "#cfe0ff", "#ffffff", "#dbe9ff", "#9fc2ff"];
    for (let i = 0; i < 22000; i++) {
      const r = 120 + sampleR() * 0.92;
      const arm = (rand() * ARMS) | 0;
      // gaussian scatter around the arm ridge, tighter near the ridge
      const theta = armTheta(r, arm) + gauss() * (0.16 + 90 / (r + 120));
      const z = gauss() * SCALE_HEIGHT * 0.7;
      push(pos, r * Math.cos(theta), z, r * Math.sin(theta));
      pushColor(col, palette[(rand() * palette.length) | 0], 0.5 + rand() * 0.5);
    }
    group.add(mkPoints(pos, col, 3.6, 0.9));
  }

  // ── barred central bulge (old, warm stars; bar stretched in x) ───
  {
    const pos = [], col = [];
    const palette = ["#ffd9a0", "#ffcf8e", "#ffc478", "#ffe6bd"];
    for (let i = 0; i < 17000; i++) {
      const x = gauss() * 300 * 1.75; // the bar
      const y = gauss() * 300 * 0.55;
      const zz = gauss() * 300 * 0.9;
      if (Math.hypot(x / 1.75, y / 0.55, zz / 0.9) > 340) continue;
      push(pos, x, y * 0.9, zz);
      pushColor(col, palette[(rand() * palette.length) | 0], 0.35 + rand() * 0.6);
    }
    group.add(mkPoints(pos, col, 3.4, 0.9));
  }

  // ── sparse old halo ──────────────────────────────────────────────
  {
    const pos = [], col = [];
    for (let i = 0; i < 2600; i++) {
      const r = 300 + rand() * 2200;
      const theta = rand() * Math.PI * 2;
      const phi = Math.acos(2 * rand() - 1);
      push(pos, r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi) * 0.8, r * Math.sin(phi) * Math.sin(theta));
      pushColor(col, "#ffe9d0", 0.15 + rand() * 0.3);
    }
    group.add(mkPoints(pos, col, 2.6, 0.5));
  }

  // ── dust lanes: dark clouds on the arms' inner edges ─────────────
  {
    const pos = [], col = [];
    for (let i = 0; i < 9000; i++) {
      const r = 180 + sampleR() * 0.85;
      const arm = (rand() * ARMS) | 0;
      const theta = armTheta(r, arm) - (0.10 + 60 / (r + 100)) + gauss() * 0.05; // inner edge
      const z = gauss() * SCALE_HEIGHT * 0.45;
      push(pos, r * Math.cos(theta), z, r * Math.sin(theta));
      const shade = 0.02 + rand() * 0.05;
      col.push(shade * 1.4, shade, shade * 0.8); // brownish black
    }
    const dust = mkPoints(pos, col, 26, 0.5, false); // NORMAL blending = absorbs light
    dust.renderOrder = 2;
    group.add(dust);
  }

  // ── HII star-forming regions: pink knots along the arms ──────────
  {
    const pos = [], col = [];
    for (let i = 0; i < 500; i++) {
      const r = 260 + sampleR() * 0.8;
      const arm = (rand() * ARMS) | 0;
      const theta = armTheta(r, arm) + gauss() * 0.07;
      push(pos, r * Math.cos(theta), gauss() * 30, r * Math.sin(theta));
      pushColor(col, rand() > 0.5 ? "#ff8fb8" : "#ff6f9e", 0.5 + rand() * 0.5);
    }
    group.add(mkPoints(pos, col, 14, 0.55));
  }

  // ── galactic core glow ───────────────────────────────────────────
  const coreGlow = (size, hex, opacity) => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d");
    const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, hex);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(c), transparent: true, opacity,
      depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    sp.scale.set(size, size * 0.72, 1);
    return sp;
  };
  group.add(coreGlow(950, "rgba(255,214,160,0.9)", 0.55));
  group.add(coreGlow(340, "rgba(255,240,220,1)", 0.9));

  return group;
}

// deterministic PRNG so the galaxy is identical every load
function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
