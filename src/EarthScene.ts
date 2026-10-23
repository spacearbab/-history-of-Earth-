import * as THREE from "three";
import { ERAS, LAST, type Era } from "./eras";

import mapProtoplanet from "./assets/protoplanet.jpg";
import mapMagma from "./assets/magma.jpg";
import mapOceans from "./assets/oceans.jpg";
import mapOxygen from "./assets/oxygen.jpg";
import mapSnowball from "./assets/snowball.jpg";
import mapPangaea from "./assets/pangaea.jpg";
import mapToday from "./assets/today.jpg";
import mapLights from "./assets/lights.jpg";

/* keep hex colours byte-identical to the stylesheet (we render in display space) */
THREE.ColorManagement.enabled = false;

const MAP_URLS = [
  mapProtoplanet,
  mapMagma,
  mapOceans,
  mapOxygen,
  mapSnowball,
  mapPangaea,
  mapToday,
];

/* ------------------------------------------------------------------ */
/* GLSL                                                                */
/* ------------------------------------------------------------------ */

const NOISE = /* glsl */ `
vec3 dtMod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 dtMod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 dtPermute(vec4 x){return dtMod289(((x*34.0)+1.0)*x);}
vec4 dtTaylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = dtMod289(i);
  vec4 p = dtPermute(dtPermute(dtPermute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = dtTaylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
`;

const SURF_VERT = /* glsl */ `
uniform float uTime;
uniform float uDisplace;
varying vec2 vUv;
varying vec3 vWorldN;
varying vec3 vWorldP;
varying vec3 vLocal;
varying vec3 vViewDir;
${NOISE}
void main(){
  vUv = uv;
  vLocal = normalize(position);
  float n1 = snoise(position * 2.3);
  float n2 = snoise(position * 6.7 + 13.0);
  vec3 p = position + normal * uDisplace * (n1 * 0.072 + n2 * 0.026);
  vWorldN = normalize(mat3(modelMatrix) * normal);
  vec4 wp = modelMatrix * vec4(p, 1.0);
  vWorldP = wp.xyz;
  vViewDir = cameraPosition - wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const SURF_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D uTexA;
uniform sampler2D uTexB;
uniform sampler2D uLightTex;
uniform float uMix;
uniform vec3  uTint;
uniform float uEmissive;
uniform vec3  uAtmos;
uniform float uAtmosStr;
uniform float uLights;
uniform vec3  uSunDir;
uniform vec3  uRippleDir;
uniform vec3  uRippleColor;
uniform float uRippleT;
uniform float uRippleAmp;
uniform vec3  uPulseColor;
uniform float uPulse;
uniform float uTime;
varying vec2 vUv;
varying vec3 vWorldN;
varying vec3 vWorldP;
varying vec3 vLocal;
varying vec3 vViewDir;

void main(){
  vec3 N = normalize(vWorldN);
  vec3 V = normalize(vViewDir);

  vec3 base = mix(texture2D(uTexA, vUv).rgb, texture2D(uTexB, vUv).rgb, uMix) * uTint;

  float ndl = dot(N, uSunDir);
  float wrap = clamp((ndl + 0.14) / 1.14, 0.0, 1.0);
  wrap = pow(wrap, 1.15);

  vec3 color = base * (wrap + 0.05);
  color = mix(color, base * 1.75, uEmissive);

  // night-side civilisation
  float night = 1.0 - smoothstep(-0.30, 0.07, ndl);
  vec3 lc = texture2D(uLightTex, vUv).rgb;
  color += lc * night * uLights * 2.0;

  // atmosphere limb
  float fres = pow(1.0 - max(dot(N, V), 0.0), 2.7);
  float day = smoothstep(-0.40, 0.45, ndl);
  color += uAtmos * fres * uAtmosStr * (0.30 + 0.95 * day);
  color += uAtmos * 0.05 * uAtmosStr * day;

  // click shockwave — expands from the point of contact
  if (uRippleAmp > 0.001) {
    float ang = acos(clamp(dot(normalize(vLocal), uRippleDir), -1.0, 1.0));
    float r = uRippleT * 3.14159265;
    float t = (ang - r) * 6.5;
    float band = exp(-t * t);
    float spot = exp(-ang * ang * 30.0) * max(0.0, 1.0 - uRippleT * 2.6);
    color += uRippleColor * (band * 1.6 + spot * 1.5) * (1.0 - uRippleT) * uRippleAmp;
  }

  // whole-atmosphere flash
  color += uPulseColor * uPulse * (0.10 + fres * 1.7);

  gl_FragColor = vec4(color, 1.0);
}
`;

const CLOUD_VERT = /* glsl */ `
varying vec3 vWorldN;
varying vec3 vLocal;
varying vec3 vViewDir;
void main(){
  vLocal = normalize(position);
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldN = normalize(mat3(modelMatrix) * normal);
  vViewDir = cameraPosition - wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const CLOUD_FRAG = /* glsl */ `
precision highp float;
uniform float uTime;
uniform float uCoverage;
uniform vec3 uSunDir;
uniform vec3 uAtmos;
varying vec3 vWorldN;
varying vec3 vLocal;
varying vec3 vViewDir;
${NOISE}
void main(){
  vec3 N = normalize(vWorldN);
  vec3 V = normalize(vViewDir);
  float n = snoise(vLocal * 3.1 + vec3(uTime * 0.010, 0.0, uTime * 0.006));
  n += 0.5 * snoise(vLocal * 7.4 - vec3(0.0, uTime * 0.018, 0.0));
  n += 0.22 * snoise(vLocal * 16.0 + vec3(uTime * 0.01));
  n = n * 0.57 + 0.5;
  float a = smoothstep(0.50, 0.76, n) * uCoverage;
  if (a < 0.004) discard;
  float ndl = dot(N, uSunDir);
  float lit = clamp((ndl + 0.30) / 1.30, 0.0, 1.0);
  vec3 col = mix(vec3(0.07, 0.09, 0.14), vec3(1.0), lit);
  col += uAtmos * 0.35 * pow(1.0 - max(dot(N, V), 0.0), 2.0);
  gl_FragColor = vec4(col, a * (0.18 + 0.82 * smoothstep(-0.32, 0.14, ndl)));
}
`;

const PT_VERT = /* glsl */ `
attribute float aSize;
attribute float aLife;
attribute float aAlpha;
attribute vec3 aColor;
uniform float uScale;
varying float vAlpha;
varying vec3 vColor;
void main(){
  vColor = aColor;
  vAlpha = aAlpha;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float grow = 0.30 + 0.70 * smoothstep(0.0, 0.40, 1.0 - aLife);
  gl_PointSize = aSize * grow * uScale / max(0.001, -mv.z);
  gl_Position = projectionMatrix * mv;
}
`;

const PT_FRAG = /* glsl */ `
precision mediump float;
varying float vAlpha;
varying vec3 vColor;
void main(){
  vec2 d = gl_PointCoord - 0.5;
  float r = dot(d, d) * 4.0;
  if (r > 1.0) discard;
  float a = pow(1.0 - r, 2.2);
  gl_FragColor = vec4(vColor, a * vAlpha);
}
`;

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const SUN = new THREE.Vector3(0.82, 0.28, 0.5).normalize();
const MAX_POINTS = 1600;

export type SceneOptions = {
  onEraChange?: (index: number) => void;
  onProgress?: (pct: number) => void;
  onReady?: () => void;
  onInteract?: () => void;
  /** called every frame with the smoothed timeline value (0 → 6) */
  onStage?: (value: number) => void;
};

export type SceneHandle = {
  setTarget: (v: number) => void;
  getTarget: () => number;
  setScrubbing: (v: boolean) => void;
  dispose: () => void;
};

export function createEarthScene(
  host: HTMLElement,
  anchor: HTMLElement,
  opts: SceneOptions = {},
): SceneHandle {
  const reduced =
    typeof matchMedia === "function" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- renderer ---------------- */
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  const canvas = renderer.domElement;
  canvas.style.position = "absolute";
  canvas.style.inset = "0";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.touchAction = "none";
  canvas.style.cursor = "grab";
  host.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 200);
  camera.position.set(0, 0, 4.5);

  const root = new THREE.Group();
  const tilt = new THREE.Group();
  tilt.rotation.z = 0.3;
  root.add(tilt);
  scene.add(root);

  /* ---------------- surfaces ---------------- */
  const uniforms = {
    uTime: { value: 0 },
    uDisplace: { value: 0.03 },
    uTexA: { value: null as THREE.Texture | null },
    uTexB: { value: null as THREE.Texture | null },
    uLightTex: { value: null as THREE.Texture | null },
    uMix: { value: 0 },
    uTint: { value: new THREE.Color("#ffffff") },
    uEmissive: { value: 0 },
    uAtmos: { value: new THREE.Color("#6fa8ff") },
    uAtmosStr: { value: 0.6 },
    uLights: { value: 1 },
    uSunDir: { value: SUN.clone() },
    uRippleDir: { value: new THREE.Vector3(0, 0, 1) },
    uRippleColor: { value: new THREE.Color("#8fb8ff") },
    uRippleT: { value: 1 },
    uRippleAmp: { value: 0 },
    uPulseColor: { value: new THREE.Color("#8fb8ff") },
    uPulse: { value: 0 },
  };

  const surfMat = new THREE.ShaderMaterial({
    vertexShader: SURF_VERT,
    fragmentShader: SURF_FRAG,
    uniforms,
  });
  const surfGeo = new THREE.SphereGeometry(1, 160, 110);
  const earth = new THREE.Mesh(surfGeo, surfMat);
  tilt.add(earth);

  const cloudUniforms = {
    uTime: { value: 0 },
    uCoverage: { value: 0.5 },
    uSunDir: { value: SUN.clone() },
    uAtmos: { value: new THREE.Color("#6fa8ff") },
  };
  const cloudMat = new THREE.ShaderMaterial({
    vertexShader: CLOUD_VERT,
    fragmentShader: CLOUD_FRAG,
    uniforms: cloudUniforms,
    transparent: true,
    depthWrite: false,
  });
  const cloudGeo = new THREE.SphereGeometry(1.035, 110, 76);
  const clouds = new THREE.Mesh(cloudGeo, cloudMat);
  tilt.add(clouds);

  /* ---------------- halo (planetarium lamp behind the globe) ------- */
  const glowCanvas = document.createElement("canvas");
  glowCanvas.width = 256;
  glowCanvas.height = 256;
  const gctx = glowCanvas.getContext("2d");
  if (gctx) {
    const grd = gctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    grd.addColorStop(0, "rgba(255,255,255,1)");
    grd.addColorStop(0.24, "rgba(255,255,255,0.40)");
    grd.addColorStop(0.55, "rgba(255,255,255,0.085)");
    grd.addColorStop(1, "rgba(255,255,255,0)");
    gctx.fillStyle = grd;
    gctx.fillRect(0, 0, 256, 256);
  }
  const glowTex = new THREE.CanvasTexture(glowCanvas);
  glowTex.colorSpace = THREE.NoColorSpace;
  const haloMat = new THREE.SpriteMaterial({
    map: glowTex,
    color: new THREE.Color(ERAS[LAST].glow),
    blending: THREE.AdditiveBlending,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    depthTest: true,
  });
  const halo = new THREE.Sprite(haloMat);
  halo.scale.setScalar(8);
  halo.position.set(0, 0, -1.2);
  halo.renderOrder = -10;
  root.add(halo);

  /* ---------------- particles ---------------- */
  const pGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(MAX_POINTS * 3);
  const pCol = new Float32Array(MAX_POINTS * 3);
  const pSize = new Float32Array(MAX_POINTS);
  const pLife = new Float32Array(MAX_POINTS);
  const pAlpha = new Float32Array(MAX_POINTS);
  const pVel = new Float32Array(MAX_POINTS * 3);
  const pMax = new Float32Array(MAX_POINTS);
  const pGrav = new Float32Array(MAX_POINTS);
  const pDrag = new Float32Array(MAX_POINTS);
  pLife.fill(0);
  pAlpha.fill(0);
  pPos.fill(0);

  pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
  pGeo.setAttribute("aColor", new THREE.BufferAttribute(pCol, 3));
  pGeo.setAttribute("aSize", new THREE.BufferAttribute(pSize, 1));
  pGeo.setAttribute("aLife", new THREE.BufferAttribute(pLife, 1));
  pGeo.setAttribute("aAlpha", new THREE.BufferAttribute(pAlpha, 1));
  pGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 50);

  const pUniforms = {
    uScale: { value: 400 },
    uTime: { value: 0 },
  };
  const pMat = new THREE.ShaderMaterial({
    vertexShader: PT_VERT,
    fragmentShader: PT_FRAG,
    uniforms: pUniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(pGeo, pMat);
  points.frustumCulled = false;
  scene.add(points);

  let cursor = 0;

  function spawnBurst(worldPos: THREE.Vector3, worldN: THREE.Vector3, era: Era) {
    const b = era.burst;
    const cA = new THREE.Color(b.colorA);
    const cB = new THREE.Color(b.colorB);
    const tmp = new THREE.Color();
    const up = Math.abs(worldN.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    const t1 = new THREE.Vector3().crossVectors(worldN, up).normalize();
    const t2 = new THREE.Vector3().crossVectors(worldN, t1).normalize();
    const count = reduced ? Math.round(b.count * 0.55) : b.count;

    for (let i = 0; i < count; i++) {
      const idx = cursor;
      cursor = (cursor + 1) % MAX_POINTS;
      const i3 = idx * 3;

      pPos[i3] = worldPos.x + worldN.x * 0.012;
      pPos[i3 + 1] = worldPos.y + worldN.y * 0.012;
      pPos[i3 + 2] = worldPos.z + worldN.z * 0.012;

      const speed = b.speed * (0.4 + Math.random() * 0.95);
      const radial = (0.55 + Math.random() * 0.9) * speed;
      const ang = Math.random() * Math.PI * 2;
      const tang = b.spread * speed * (0.15 + Math.random() * 0.95);
      const tx = Math.cos(ang) * tang;
      const ty = Math.sin(ang) * tang;

      pVel[i3] = worldN.x * radial + t1.x * tx + t2.x * ty;
      pVel[i3 + 1] = worldN.y * radial + t1.y * tx + t2.y * ty;
      pVel[i3 + 2] = worldN.z * radial + t1.z * tx + t2.z * ty;

      pLife[idx] = 1;
      pMax[idx] = b.life * (0.55 + Math.random() * 0.9);
      pSize[idx] = b.size * (0.5 + Math.random() * 1.0);
      pAlpha[idx] = 0;
      pGrav[idx] = b.gravity;
      pDrag[idx] = b.drag;

      tmp.copy(cA).lerp(cB, Math.random());
      pCol[i3] = tmp.r;
      pCol[i3 + 1] = tmp.g;
      pCol[i3 + 2] = tmp.b;
    }
    pGeo.attributes.position.needsUpdate = true;
    pGeo.attributes.aColor.needsUpdate = true;
    pGeo.attributes.aSize.needsUpdate = true;
  }

  function stepParticles(dt: number) {
    let any = false;
    for (let i = 0; i < MAX_POINTS; i++) {
      if (pLife[i] <= 0) continue;
      any = true;
      const i3 = i * 3;
      const life = pLife[i] - dt / pMax[i];
      pLife[i] = life > 0 ? life : 0;

      const damp = Math.exp(-pDrag[i] * dt);
      pVel[i3 + 1] += pGrav[i] * dt;
      pVel[i3] *= damp;
      pVel[i3 + 1] *= damp;
      pVel[i3 + 2] *= damp;

      pPos[i3] += pVel[i3] * dt;
      pPos[i3 + 1] += pVel[i3 + 1] * dt;
      pPos[i3 + 2] += pVel[i3 + 2] * dt;

      const l = pLife[i];
      pAlpha[i] = Math.min(1, (1 - l) * 9) * Math.min(1, l * 3);
    }
    if (any) {
      pGeo.attributes.position.needsUpdate = true;
      pGeo.attributes.aLife.needsUpdate = true;
      pGeo.attributes.aAlpha.needsUpdate = true;
    }
  }

  /* ---------------- textures ---------------- */
  const loader = new THREE.TextureLoader();
  const textures: THREE.Texture[] = [];
  let lightTex: THREE.Texture | null = null;
  const totalAssets = MAP_URLS.length + 1;
  let done = 0;

  function loadTex(url: string): Promise<THREE.Texture> {
    return new Promise((resolve, reject) => {
      loader.load(
        url,
        (t) => {
          t.colorSpace = THREE.NoColorSpace;
          t.wrapS = THREE.RepeatWrapping;
          t.wrapT = THREE.ClampToEdgeWrapping;
          t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
          t.minFilter = THREE.LinearMipmapLinearFilter;
          done++;
          opts.onProgress?.(Math.round((done / totalAssets) * 100));
          resolve(t);
        },
        undefined,
        reject,
      );
    });
  }

  /* ---------------- layout ---------------- */
  let radiusWorld = 0.6;
  let radiusPx = 200;
  let visH = 1;

  function syncLayout() {
    const w = Math.max(1, host.clientWidth);
    const h = Math.max(1, host.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    visH = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.position.z;
    const visW = visH * camera.aspect;

    const hb = host.getBoundingClientRect();
    const ab = anchor.getBoundingClientRect();
    const cx = ab.left + ab.width / 2 - hb.left;
    const cy = ab.top + ab.height / 2 - hb.top;

    root.position.set((cx / w) * 2 - 1, 1 - (cy / h) * 2, 0);
    root.position.x *= visW / 2;
    root.position.y *= visH / 2;

    radiusWorld = (ab.height / 2 / h) * visH;
    radiusPx = ab.height / 2;
    root.scale.setScalar(radiusWorld);

    pUniforms.uScale.value = renderer.domElement.height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
  }

  /* ---------------- timeline stage ---------------- */
  let target = LAST;
  let smooth = LAST;
  let stageVel = 0;
  let scrubbing = false;
  let reported = -1;

  /* ---------------- rotation / input ---------------- */
  /* open on Africa / Europe so the first frame reads unmistakably as Earth:
     front-facing u = 0.25 - yaw / 2π  →  yaw −1.9 puts u ≈ 0.55 (18°E) */
  let yaw = -1.9;
  let pitch = 0.16;
  let velYaw = 0;
  let velPitch = 0;
  let dragging = false;
  let moved = 0;
  let lastX = 0;
  let lastY = 0;
  let lastMoveT = 0;
  let downT = 0;
  let interacted = false;

  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();

  function onDown(e: PointerEvent) {
    dragging = true;
    moved = 0;
    lastX = e.clientX;
    lastY = e.clientY;
    lastMoveT = performance.now();
    downT = lastMoveT;
    velYaw = 0;
    velPitch = 0;
    canvas.style.cursor = "grabbing";
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
    if (!interacted) {
      interacted = true;
      opts.onInteract?.();
    }
  }

  function onMove(e: PointerEvent) {
    if (!dragging) return;
    const now = performance.now();
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    moved += Math.abs(dx) + Math.abs(dy);
    const dtm = Math.max(0.01, (now - lastMoveT) / 1000);
    lastMoveT = now;

    const k = Math.PI / Math.max(70, radiusPx);
    yaw += dx * k;
    pitch = clamp(pitch + dy * k, -1.15, 1.15);
    velYaw = clamp((dx * k) / dtm, -5, 5);
    velPitch = clamp((dy * k) / dtm, -5, 5);
  }

  function onUp(e: PointerEvent) {
    if (!dragging) return;
    dragging = false;
    canvas.style.cursor = "grab";
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
    const quick = performance.now() - downT < 650;
    if (moved < 7 && quick) handleClick(e);
    else {
      velYaw *= 0.75;
      velPitch *= 0.75;
    }
  }

  function handleClick(e: PointerEvent) {
    const r = canvas.getBoundingClientRect();
    ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObject(earth, false)[0];
    if (!hit) return;

    const worldPos = hit.point.clone();
    const worldN = worldPos.clone().sub(root.position).normalize();
    const local = earth.worldToLocal(hit.point.clone()).normalize();

    const era = ERAS[clamp(Math.round(smooth), 0, LAST)];
    uniforms.uRippleDir.value.copy(local);
    uniforms.uRippleColor.value.set(era.ripple);
    uniforms.uPulseColor.value.set(era.ripple);
    uniforms.uRippleT.value = 0;
    uniforms.uRippleAmp.value = 1;
    uniforms.uPulse.value = 1;

    spawnBurst(worldPos, worldN, era);
  }

  function onKey(e: KeyboardEvent) {
    let d = 0;
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") d = -1;
    else if (e.key === "ArrowRight" || e.key === "ArrowUp") d = 1;
    else if (e.key === "Home") {
      target = 0;
      e.preventDefault();
      return;
    } else if (e.key === "End") {
      target = LAST;
      e.preventDefault();
      return;
    }
    if (d !== 0) {
      target = clamp(Math.round(target) + d, 0, LAST);
      e.preventDefault();
      if (!interacted) {
        interacted = true;
        opts.onInteract?.();
      }
    }
  }

  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onUp);
  window.addEventListener("keydown", onKey);

  const ro = new ResizeObserver(syncLayout);
  ro.observe(host);
  window.addEventListener("resize", syncLayout);
  document.fonts?.ready.then(() => syncLayout()).catch(() => {});

  /* ---------------- frame ---------------- */
  const cTmpA = new THREE.Color();
  const cTmpB = new THREE.Color();
  let raf = 0;
  let last = performance.now();
  let ready = false;
  const baseSpin = reduced ? 0 : 0.055;

  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, Math.max(0.0005, (now - last) / 1000));
    last = now;

    /* --- stage spring --- */
    const k = scrubbing ? 90 : 26;
    const d = scrubbing ? 24 : 10.5;
    stageVel += (target - smooth) * k * dt;
    stageVel -= stageVel * d * dt;
    smooth += stageVel * dt;
    if (smooth < 0) {
      smooth = 0;
      stageVel = Math.max(0, stageVel);
    } else if (smooth > LAST) {
      smooth = LAST;
      stageVel = Math.min(0, stageVel);
    }
    if (Math.abs(target - smooth) < 0.0004 && Math.abs(stageVel) < 0.0006) {
      smooth = target;
      stageVel = 0;
    }

    const idx = clamp(Math.floor(smooth), 0, LAST);
    const nxt = Math.min(LAST, idx + 1);
    const f = clamp(smooth - idx, 0, 1);
    const mixS = f * f * (3 - 2 * f);
    const A = ERAS[idx];
    const B = ERAS[nxt];

    if (ready) {
      uniforms.uTexA.value = textures[idx];
      uniforms.uTexB.value = textures[nxt];
      uniforms.uMix.value = mixS;
      uniforms.uTint.value.copy(cTmpA.set(A.tint).lerp(cTmpB.set(B.tint), f));
      uniforms.uAtmos.value.copy(cTmpA.set(A.atmos).lerp(cTmpB.set(B.atmos), f));
      uniforms.uEmissive.value = lerp(A.emissive, B.emissive, f);
      uniforms.uAtmosStr.value = lerp(A.atmosStr, B.atmosStr, f) * (1 + 0.05 * Math.sin(now * 0.0011));
      uniforms.uLights.value = lerp(A.lights, B.lights, f);
      uniforms.uDisplace.value = lerp(A.displace, B.displace, f);
      cloudUniforms.uCoverage.value = lerp(A.cloud, B.cloud, f);
      cloudUniforms.uAtmos.value.copy(uniforms.uAtmos.value);
      haloMat.color.copy(cTmpA.set(A.glow).lerp(cTmpB.set(B.glow), f));
      haloMat.opacity = (0.7 + 0.35 * lerp(A.atmosStr, B.atmosStr, f)) * (1 + 0.45 * uniforms.uPulse.value);
    }

    opts.onStage?.(smooth);

    const rounded = clamp(Math.round(smooth), 0, LAST);
    if (rounded !== reported) {
      reported = rounded;
      opts.onEraChange?.(rounded);
    }

    /* --- interaction decay --- */
    if (dragging) {
      /* a held-but-still pointer must not keep its old flick */
      velYaw *= Math.exp(-7 * dt);
      velPitch *= Math.exp(-7 * dt);
    } else {
      velYaw *= Math.exp(-1.8 * dt);
      velPitch *= Math.exp(-3.4 * dt);
      yaw += velYaw * dt;
      pitch = clamp(pitch + velPitch * dt, -1.15, 1.15);
    }
    yaw += baseSpin * dt;

    tilt.rotation.x = pitch;
    earth.rotation.y = yaw;
    clouds.rotation.y = yaw * 1.24 + now * 0.0000085;

    if (uniforms.uRippleAmp.value > 0) {
      uniforms.uRippleT.value += dt / 1.25;
      if (uniforms.uRippleT.value >= 1) {
        uniforms.uRippleT.value = 1;
        uniforms.uRippleAmp.value = 0;
      }
    }
    uniforms.uPulse.value *= Math.exp(-3.1 * dt);
    if (uniforms.uPulse.value < 0.002) uniforms.uPulse.value = 0;

    uniforms.uTime.value = now * 0.001;
    cloudUniforms.uTime.value = now * 0.001;

    stepParticles(dt);
    renderer.render(scene, camera);
  }

  /* ---------------- boot ---------------- */
  syncLayout();

  Promise.all([
    ...MAP_URLS.map(loadTex),
    loadTex(mapLights),
  ])
    .then((all) => {
      for (let i = 0; i < MAP_URLS.length; i++) textures[i] = all[i];
      lightTex = all[all.length - 1];
      uniforms.uTexA.value = textures[LAST];
      uniforms.uTexB.value = textures[LAST];
      uniforms.uLightTex.value = lightTex;
      ready = true;
      scene.add(root);
      opts.onProgress?.(100);
      opts.onReady?.();
    })
    .catch(() => {
      opts.onProgress?.(100);
      opts.onReady?.();
    });

  raf = requestAnimationFrame(frame);

  return {
    setTarget(v: number) {
      target = clamp(v, 0, LAST);
    },
    getTarget() {
      return target;
    },
    setScrubbing(v: boolean) {
      scrubbing = v;
      if (!v) {
        /* settle onto the nearest engraved stop */
        target = clamp(Math.round(target), 0, LAST);
      }
    },
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", syncLayout);
      window.removeEventListener("keydown", onKey);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      surfGeo.dispose();
      cloudGeo.dispose();
      pGeo.dispose();
      surfMat.dispose();
      cloudMat.dispose();
      pMat.dispose();
      textures.forEach((t) => t.dispose());
      lightTex?.dispose();
      renderer.dispose();
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    },
  };
}
