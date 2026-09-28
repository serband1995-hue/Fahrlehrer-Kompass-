/* ============================================================
   Die 3D-Nachtfahrt: Straße, Wald, Berge, Skyline, Fahrschulauto.
   Alles wird im Browser erzeugt, es werden keine Modelle geladen.
   ============================================================ */
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { TessellateModifier } from "three/addons/modifiers/TessellateModifier.js";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);

/* kleiner deterministischer Zufall, damit die Welt bei jedem Besuch gleich aussieht */
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function glowTexture(inner = "rgba(255,240,210,1)", outer = "rgba(255,200,120,0)") {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, inner);
  grd.addColorStop(0.18, inner.replace(/[\d.]+\)$/, "0.55)"));
  grd.addColorStop(1, outer);
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ------------------------------------------------------------ */
export function createScene(canvas, { lowPower = false, reducedMotion = false } = {}) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !lowPower,
    powerPreference: "high-performance",
    alpha: false
  });
  const dprCap = lowPower ? 1.25 : 1.75;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const FOG = new THREE.Color().setRGB(0.018, 0.056, 0.04, THREE.LinearSRGBColorSpace);
  scene.background = FOG.clone();
  scene.fog = new THREE.FogExp2(FOG, 0.0026);

  const camera = new THREE.PerspectiveCamera(36, window.innerWidth / window.innerHeight, 0.1, 6000);

  /* ---------- Umgebung für Spiegelungen im Lack ---------- */
  {
    const envScene = new THREE.Scene();
    const envSky = new THREE.Mesh(
      new THREE.SphereGeometry(50, 32, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        uniforms: {},
        vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
        fragmentShader: `varying vec3 vP; void main(){
          float h = vP.y;
          vec3 c = mix(vec3(0.02,0.04,0.035), vec3(0.07,0.11,0.1), smoothstep(-0.2,0.25,h));
          c = mix(c, vec3(0.015,0.03,0.03), smoothstep(0.25,1.0,h));
          gl_FragColor = vec4(c,1.); }`
      })
    );
    envScene.add(envSky);
    const stripMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 5, 3.6) });
    for (let i = 0; i < 7; i++) {
      const s = new THREE.Mesh(new THREE.PlaneGeometry(26, 1.4), stripMat);
      const a = (i / 7) * TAU;
      s.position.set(Math.cos(a) * 30, 18 + (i % 3) * 5, Math.sin(a) * 30);
      s.lookAt(0, 0, 0);
      envScene.add(s);
    }
    const mint = new THREE.Mesh(new THREE.PlaneGeometry(60, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.4, 1.4, 1.0) }));
    mint.position.set(0, 4, -40);
    mint.material.color.setRGB(0.25, 0.7, 0.5);
    mint.lookAt(0, 0, 0);
    envScene.add(mint);
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(envScene, 0.02).texture;
    pmrem.dispose();
  }

  /* ---------- Licht ---------- */
  const hemi = new THREE.HemisphereLight("#7d9a8e", "#06110b", 0.5);
  scene.add(hemi);
  const moon = new THREE.DirectionalLight("#bfe6d6", 0.9);
  moon.position.set(-300, 400, 200);
  scene.add(moon);

  /* ---------- Himmel ---------- */
  const skyUniforms = { uTime: { value: 0 } };
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(4200, 48, 24),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: skyUniforms,
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = modelViewMatrix*vec4(position,1.); gl_Position = projectionMatrix*p; }`,
      fragmentShader: `
        varying vec3 vDir;
        void main(){
          float h = vDir.y;
          vec3 zenith = vec3(0.004,0.018,0.013);
          vec3 mid    = vec3(0.012,0.055,0.04);
          vec3 horizon= vec3(0.024,0.08,0.058);
          vec3 c = mix(horizon, mid, smoothstep(0.0,0.18,h));
          c = mix(c, zenith, smoothstep(0.18,0.7,h));
          // Lichtglocke über der Stadt (Blickrichtung -Z)
          float city = pow(max(0., dot(normalize(vec3(vDir.x,0.,vDir.z)), vec3(0.,0.,-1.))), 6.);
          c += vec3(0.20,0.15,0.07) * city * exp(-max(h,0.)*9.) * 0.9;
          c = mix(vec3(0.018,0.056,0.04), c, smoothstep(-0.06,0.02,h));
          gl_FragColor = vec4(c,1.);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`
    })
  );
  scene.add(sky);

  /* Sterne */
  {
    const r = rng(7);
    const n = lowPower ? 900 : 1800;
    const pos = new Float32Array(n * 3);
    const seed = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const u = r() * TAU;
      const v = 0.06 + Math.pow(r(), 0.8) * 0.94;
      const R = 3800;
      pos[i * 3] = Math.cos(u) * Math.sqrt(1 - v * v) * R;
      pos[i * 3 + 1] = v * R;
      pos[i * 3 + 2] = Math.sin(u) * Math.sqrt(1 - v * v) * R;
      seed[i] = r();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    const m = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      fog: false,
      blending: THREE.AdditiveBlending,
      uniforms: skyUniforms,
      vertexShader: `attribute float aSeed; uniform float uTime; varying float vA;
        void main(){ vec4 p = modelViewMatrix*vec4(position,1.); gl_Position = projectionMatrix*p;
          float tw = 0.55 + 0.45*sin(uTime*(0.6+aSeed*2.2) + aSeed*40.);
          vA = tw * (0.35 + 0.65*aSeed);
          gl_PointSize = (aSeed > 0.97 ? 3.2 : 1.6) * (0.8 + 0.4*aSeed); }`,
      fragmentShader: `varying float vA; void main(){ vec2 d = gl_PointCoord-0.5; float a = smoothstep(0.5,0.0,length(d)); gl_FragColor = vec4(vec3(0.85,1.0,0.93)*1.3, a*vA);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
    });
    scene.add(new THREE.Points(g, m));
  }

  /* Mond */
  {
    // Mondschein als flache Scheibe (Sprites dieser Größe flackern auf manchen Geräten)
    const m = new THREE.Mesh(new THREE.PlaneGeometry(420, 420), new THREE.MeshBasicMaterial({
      map: glowTexture("rgba(245,240,220,1)", "rgba(180,230,210,0)"),
      color: new THREE.Color(2.2, 2.2, 2.0),
      fog: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      transparent: true
    }));
    m.position.set(-1400, 1500, -2600);
    m.lookAt(0, 0, 0);
    scene.add(m);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(38, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.35, 2.1), fog: false }));
    disc.position.copy(m.position).multiplyScalar(0.999);
    disc.lookAt(0, 0, 0);
    scene.add(disc);
  }

  /* ---------- Straße ---------- */
  const roadPts = [];
  {
    const r = rng(21);
    for (let i = 0; i <= 16; i++) {
      const z = -i * 110;
      const x = i < 2 ? 0 : Math.sin(i * 0.9) * 38 + (r() - 0.5) * 16;
      roadPts.push(new THREE.Vector3(x, 0, z + 40));
    }
  }
  const curve = new THREE.CatmullRomCurve3(roadPts, false, "catmullrom", 0.5);
  const ROAD_LEN = curve.getLength();
  const ROAD_W = 9;
  const SEG = 900;
  const frames = [];
  for (let i = 0; i <= SEG; i++) {
    const u = i / SEG;
    const p = curve.getPointAt(u);
    const t = curve.getTangentAt(u).normalize();
    const side = new THREE.Vector3().crossVectors(t, new THREE.Vector3(0, 1, 0)).normalize();
    frames.push({ p, t, side });
  }
  function frameAt(u) {
    const f = clamp(u, 0, 1) * SEG;
    const i = Math.min(SEG - 1, Math.floor(f));
    const k = f - i;
    const a = frames[i], b = frames[i + 1];
    return {
      p: a.p.clone().lerp(b.p, k),
      t: a.t.clone().lerp(b.t, k).normalize(),
      side: a.side.clone().lerp(b.side, k).normalize()
    };
  }
  function ribbon(offsetA, offsetB, y) {
    const pos = new Float32Array((SEG + 1) * 2 * 3);
    const uv = new Float32Array((SEG + 1) * 2 * 2);
    const idx = [];
    for (let i = 0; i <= SEG; i++) {
      const { p, side } = frames[i];
      const a = p.clone().addScaledVector(side, offsetA);
      const b = p.clone().addScaledVector(side, offsetB);
      pos.set([a.x, y, a.z, b.x, y, b.z], i * 6);
      uv.set([0, (i / SEG) * ROAD_LEN / 8, 1, (i / SEG) * ROAD_LEN / 8], i * 4);
      if (i < SEG) {
        const k = i * 2;
        idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }

  /* Boden */
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(9000, 9000),
    new THREE.MeshStandardMaterial({ color: "#06130c", roughness: 1, metalness: 0 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.02;
  scene.add(ground);

  /* Asphalt mit feiner Körnung */
  const asphaltTex = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d");
    g.fillStyle = "#1a1f1d";
    g.fillRect(0, 0, 256, 256);
    const r = rng(3);
    for (let i = 0; i < 9000; i++) {
      const v = 20 + r() * 30;
      g.fillStyle = `rgb(${v},${v + 2},${v + 1})`;
      g.fillRect(r() * 256, r() * 256, 1, 1);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  })();
  const road = new THREE.Mesh(
    ribbon(-ROAD_W / 2, ROAD_W / 2, 0.01),
    new THREE.MeshStandardMaterial({ map: asphaltTex, color: "#9aa3a0", roughness: 0.82, metalness: 0.0 })
  );
  scene.add(road);
  const shoulderMat = new THREE.MeshStandardMaterial({ color: "#0e1f17", roughness: 1 });
  scene.add(new THREE.Mesh(ribbon(-ROAD_W / 2 - 1.6, -ROAD_W / 2, 0.005), shoulderMat));
  scene.add(new THREE.Mesh(ribbon(ROAD_W / 2, ROAD_W / 2 + 1.6, 0.005), shoulderMat));
  const lineMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.75, 0.8, 0.76) });
  scene.add(new THREE.Mesh(ribbon(-ROAD_W / 2 + 0.25, -ROAD_W / 2 + 0.4, 0.02), lineMat));
  scene.add(new THREE.Mesh(ribbon(ROAD_W / 2 - 0.4, ROAD_W / 2 - 0.25, 0.02), lineMat));

  /* Mittelstreifen (gestrichelt) */
  {
    const dashLen = 3, gap = 6;
    const n = Math.floor(ROAD_LEN / (dashLen + gap));
    const dash = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.16, dashLen), lineMat, n);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1);
    const e = new THREE.Euler();
    for (let i = 0; i < n; i++) {
      const f = frameAt((i * (dashLen + gap)) / ROAD_LEN);
      e.set(-Math.PI / 2, 0, 0);
      q.setFromEuler(e);
      const yaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(f.t.x, f.t.z));
      q.premultiply(yaw);
      m.compose(new THREE.Vector3(f.p.x, 0.021, f.p.z), q, s);
      dash.setMatrixAt(i, m);
    }
    scene.add(dash);
  }

  /* Straßenlaternen mit Lichtkegeln auf dem Asphalt */
  const lampGlowTex = glowTexture("rgba(255,226,170,1)", "rgba(255,190,110,0)");
  const poolTex = glowTexture("rgba(255,214,150,0.9)", "rgba(255,190,120,0)");
  {
    const spacing = 42;
    const n = Math.floor(ROAD_LEN / spacing) - 1;
    const poleGeo = new THREE.CylinderGeometry(0.08, 0.12, 7.5, 6);
    poleGeo.translate(0, 3.75, 0);
    const armGeo = new THREE.BoxGeometry(0.1, 0.1, 2.2);
    armGeo.translate(0, 7.4, 1.0);
    const headGeo = new THREE.BoxGeometry(0.35, 0.12, 0.8);
    headGeo.translate(0, 7.32, 1.95);
    const poleMat = new THREE.MeshStandardMaterial({ color: "#1f2a26", roughness: 0.5, metalness: 0.6 });
    const headMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(4.5, 3.6, 2.4) });
    const poles = new THREE.InstancedMesh(poleGeo, poleMat, n);
    const arms = new THREE.InstancedMesh(armGeo, poleMat, n);
    const heads = new THREE.InstancedMesh(headGeo, headMat, n);
    const poolGeo = new THREE.PlaneGeometry(14, 14);
    poolGeo.rotateX(-Math.PI / 2);
    const pools = new THREE.InstancedMesh(poolGeo, new THREE.MeshBasicMaterial({
      map: poolTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.32
    }), n);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);
    const glowMat = new THREE.SpriteMaterial({ map: lampGlowTex, color: new THREE.Color(1.6, 1.3, 0.9), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    for (let i = 0; i < n; i++) {
      const u = ((i + 1) * spacing) / ROAD_LEN;
      const f = frameAt(u);
      const sgn = i % 2 ? 1 : -1;
      const base = f.p.clone().addScaledVector(f.side, sgn * (ROAD_W / 2 + 1.2));
      const yaw = Math.atan2(f.side.x * -sgn, f.side.z * -sgn);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
      m.compose(base, q, one);
      poles.setMatrixAt(i, m);
      arms.setMatrixAt(i, m);
      heads.setMatrixAt(i, m);
      const head = base.clone().addScaledVector(f.side, -sgn * 1.95);
      m.compose(new THREE.Vector3(head.x, 0.03, head.z), new THREE.Quaternion(), one);
      pools.setMatrixAt(i, m);
      const glow = new THREE.Sprite(glowMat);
      glow.position.set(head.x, 7.2, head.z);
      glow.scale.setScalar(5.5);
      scene.add(glow);
    }
    scene.add(poles, arms, heads, pools);
  }

  /* Wald */
  {
    const r = rng(99);
    const n = lowPower ? 1400 : 2600;
    const cone = new THREE.ConeGeometry(1, 1, 6, 1);
    cone.translate(0, 0.5, 0);
    const trunk = new THREE.CylinderGeometry(0.12, 0.16, 1, 5);
    trunk.translate(0, 0.5, 0);
    const treeMat = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.95, flatShading: true });
    const trees = new THREE.InstancedMesh(cone, treeMat, n);
    const trunks = new THREE.InstancedMesh(trunk, new THREE.MeshStandardMaterial({ color: "#1a120c", roughness: 1 }), n);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion();
    const col = new THREE.Color();
    let k = 0;
    while (k < n) {
      const u = r();
      const f = frameAt(u);
      const sgn = r() < 0.5 ? -1 : 1;
      const d = ROAD_W / 2 + 11 + Math.pow(r(), 1.6) * 220;
      const p = f.p.clone().addScaledVector(f.side, sgn * d);
      p.addScaledVector(f.t, (r() - 0.5) * 30);
      const h = 7 + r() * 11;
      const w = h * (0.26 + r() * 0.1);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * TAU);
      m.compose(new THREE.Vector3(p.x, 1.2, p.z), q, new THREE.Vector3(w, h, w));
      trees.setMatrixAt(k, m);
      m.compose(new THREE.Vector3(p.x, 0, p.z), q, new THREE.Vector3(1, 1.4, 1));
      trunks.setMatrixAt(k, m);
      col.setHSL(0.4 + r() * 0.05, 0.35 + r() * 0.2, 0.035 + r() * 0.045);
      trees.setColorAt(k, col);
      k++;
    }
    scene.add(trees, trunks);
  }

  /* Berge am Horizont */
  {
    const r = rng(5);
    const seg = 180;
    const pos = [];
    const idx = [];
    for (let ring = 0; ring < 3; ring++) {
      const R = 2300 + ring * 500;
      const base = pos.length / 3;
      for (let i = 0; i <= seg; i++) {
        const a = (i / seg) * TAU;
        const dir = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
        const cityGap = Math.pow(Math.max(0, -dir.z), 8);
        const hgt = (30 + 70 * Math.abs(Math.sin(a * 3.1 + ring)) + 45 * r() + ring * 45) * (1 - cityGap * 0.85);
        pos.push(dir.x * R, -5, dir.z * R - 600, dir.x * R, hgt, dir.z * R - 600);
        if (i < seg) {
          const k = base + i * 2;
          idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
        }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    const hills = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(0.012, 0.04, 0.028, THREE.LinearSRGBColorSpace), fog: false, side: THREE.DoubleSide }));
    scene.add(hills);
  }

  /* ---------- Skyline (Frankfurt am Horizont) ---------- */
  const end = frameAt(1);
  const cityCenter = end.p.clone().addScaledVector(end.t, 520);
  const cityUniforms = { uTime: { value: 0 } };
  const cityMat = new THREE.ShaderMaterial({
    fog: false,
    uniforms: cityUniforms,
    vertexShader: `
      attribute float aSeed;
      varying vec3 vW; varying vec3 vN; varying float vSeed; varying float vH;
      void main(){
        mat4 m = modelMatrix;
        #ifdef USE_INSTANCING
          m = modelMatrix * instanceMatrix;
          vSeed = aSeed;
        #else
          vSeed = 0.37;
        #endif
        vec4 w = m * vec4(position,1.);
        vW = w.xyz; vN = normalize(mat3(m) * normal); vH = position.y;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: `
      uniform float uTime;
      varying vec3 vW; varying vec3 vN; varying float vSeed; varying float vH;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)) + vSeed*91.7) * 43758.5453); }
      void main(){
        vec3 base = vec3(0.018,0.045,0.036);
        vec3 col = base * (0.6 + 0.4*max(vN.y,0.));
        if(abs(vN.y) < 0.5){
          float u = abs(vN.x) > abs(vN.z) ? vW.z : vW.x;
          vec2 cell = vec2(floor(u/3.2), floor(vW.y/3.8));
          vec2 f = vec2(fract(u/3.2), fract(vW.y/3.8));
          float win = step(0.18,f.x)*step(f.x,0.82)*step(0.22,f.y)*step(f.y,0.78);
          float h = hash(cell);
          float lit = step(0.7, h);
          vec3 wc = mix(vec3(1.0,0.78,0.45), vec3(0.62,1.0,0.82), step(0.93,h));
          wc = mix(wc, vec3(0.95,0.95,1.0), step(0.985,h));
          float flick = 0.85 + 0.15*sin(uTime*0.7 + h*50.);
          col += win * lit * wc * (1.1 + 1.3*fract(h*7.)) * flick;
          col += win * (1.-lit) * vec3(0.015,0.035,0.03);
        }
        // Dunst zum Boden hin
        float haze = smoothstep(120., 0., vW.y);
        col = mix(col, vec3(0.06,0.1,0.07), haze*0.55);
        gl_FragColor = vec4(col, 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
  const blinkers = [];
  {
    const r = rng(1234);
    const box = new THREE.BoxGeometry(1, 1, 1);
    box.translate(0, 0.5, 0);
    const n = 150;
    const inst = new THREE.InstancedMesh(box, cityMat, n);
    const seeds = new Float32Array(n);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion();
    const right = new THREE.Vector3(-end.t.z, 0, end.t.x);
    for (let i = 0; i < n; i++) {
      const spread = (r() - 0.5) * 2;
      const lateral = spread * 700;
      const depth = (r() - 0.3) * 260;
      const centerBoost = Math.exp(-Math.pow(spread * 2.2, 2));
      const h = 25 + r() * 60 + centerBoost * (70 + r() * 170);
      const w = 18 + r() * 26;
      const p = cityCenter.clone().addScaledVector(right, lateral).addScaledVector(end.t, depth);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(end.t.x, end.t.z) + (r() - 0.5) * 0.3);
      m.compose(new THREE.Vector3(p.x, 0, p.z), q, new THREE.Vector3(w, h, w * (0.7 + r() * 0.6)));
      inst.setMatrixAt(i, m);
      seeds[i] = r();
      if (h > 180 && r() < 0.6) blinkers.push(new THREE.Vector3(p.x, h + 2, p.z));
    }
    inst.geometry = box.clone();
    inst.geometry.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seeds, 1));
    scene.add(inst);

    const yaw = Math.atan2(end.t.x, end.t.z);
    const place = (mesh, lat, dep) => {
      const p = cityCenter.clone().addScaledVector(right, lat).addScaledVector(end.t, dep);
      mesh.position.set(p.x, 0, p.z);
      mesh.rotation.y = yaw;
      scene.add(mesh);
      return p;
    };
    // Turm mit dreieckigem Grundriss und Antenne (angelehnt an Frankfurts Skyline)
    const tri = new THREE.CylinderGeometry(26, 26, 300, 3);
    tri.translate(0, 150, 0);
    const p1 = place(new THREE.Mesh(tri, cityMat), 40, -40);
    blinkers.push(new THREE.Vector3(p1.x, 345, p1.z));
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.2, 45, 6), new THREE.MeshBasicMaterial({ color: "#0c1a14", fog: false }));
    mast.position.set(p1.x, 322, p1.z);
    scene.add(mast);
    // Turm mit Pyramidenspitze
    const sq = new THREE.BoxGeometry(34, 220, 34);
    sq.translate(0, 110, 0);
    const p2 = place(new THREE.Mesh(sq, cityMat), -120, 30);
    const pyr = new THREE.Mesh(new THREE.ConeGeometry(24, 46, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 1.1, 0.6), fog: false }));
    pyr.position.set(p2.x, 243, p2.z);
    pyr.rotation.y = yaw + Math.PI / 4;
    scene.add(pyr);
    blinkers.push(new THREE.Vector3(p2.x, 268, p2.z));
    // runder Turm
    const cyl = new THREE.CylinderGeometry(20, 22, 250, 20);
    cyl.translate(0, 125, 0);
    const p3 = place(new THREE.Mesh(cyl, cityMat), 150, 10);
    blinkers.push(new THREE.Vector3(p3.x, 275, p3.z));
    const mast3 = mast.clone();
    mast3.position.set(p3.x, 262, p3.z);
    mast3.scale.y = 0.6;
    scene.add(mast3);
  }
  const blinkTex = glowTexture("rgba(255,70,50,1)", "rgba(255,40,30,0)");
  const blinkSprites = blinkers.map((p) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: blinkTex, color: new THREE.Color(3, 0.6, 0.4), fog: false, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.position.copy(p);
    s.scale.setScalar(26);
    scene.add(s);
    return s;
  });
  // warmer Lichtschein über der Stadt
  {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture("rgba(255,210,140,0.9)", "rgba(255,190,120,0)"), color: new THREE.Color(0.5, 0.42, 0.28), fog: false, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.position.set(cityCenter.x, 60, cityCenter.z);
    s.scale.set(2200, 520, 1);
    scene.add(s);
  }

  /* ---------- Das Fahrschulauto ---------- */
  // Verjüngt die Karosserie nach oben und zu den Enden hin, damit sie rund wirkt
  function taper(src, y0, y1, topK, endK, halfLen = 2.35) {
    // fein unterteilen, verjüngen und weich schattieren
    let geo = new TessellateModifier(0.07, 10).modify(src.toNonIndexed());
    geo.deleteAttribute("normal");
    geo.deleteAttribute("uv");
    geo = mergeVertices(geo, 1e-4);
    const pa = geo.attributes.position;
    for (let i = 0; i < pa.count; i++) {
      const x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i);
      const t = clamp((y - y0) / (y1 - y0), 0, 1);
      const ty = t * t * (3 - 2 * t);
      const ex = Math.pow(Math.min(1, Math.abs(x) / halfLen), 5);
      pa.setZ(i, z * (1 - topK * ty - endK * ex));
    }
    geo.computeVertexNormals();
    return geo;
  }
  const car = new THREE.Group();
  const carBody = new THREE.Group();
  car.add(carBody);
  const paint = new THREE.MeshPhysicalMaterial({
    color: "#e8ece9",
    metalness: 0.35,
    roughness: 0.26,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    envMapIntensity: 1.3
  });
  const glass = new THREE.MeshPhysicalMaterial({ color: "#050b09", metalness: 0.9, roughness: 0.05, envMapIntensity: 1.6 });
  const trimMat = new THREE.MeshStandardMaterial({ color: "#0b0f0e", roughness: 0.4, metalness: 0.4 });
  {
    // Seitenprofil (x = Länge, y = Höhe), extrudiert über die Breite
    const s = new THREE.Shape();
    s.moveTo(-2.2, 0.34);
    s.lineTo(-2.26, 0.58);
    s.quadraticCurveTo(-2.27, 0.86, -2.08, 0.93);
    s.lineTo(-1.7, 0.98);
    s.lineTo(1.05, 0.96);
    s.quadraticCurveTo(1.75, 0.9, 2.12, 0.78);
    s.quadraticCurveTo(2.3, 0.72, 2.29, 0.52);
    s.lineTo(2.22, 0.34);
    s.lineTo(1.82, 0.32);
    s.absarc(1.36, 0.36, 0.46, 0.05, Math.PI - 0.05, false);
    s.lineTo(-0.9, 0.3);
    s.absarc(-1.36, 0.36, 0.46, 0.05, Math.PI - 0.05, false);
    s.lineTo(-2.2, 0.34);
    const g = new THREE.ExtrudeGeometry(s, { depth: 1.7, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.06, bevelSegments: 6, curveSegments: 32, steps: 1 });
    g.translate(0, 0, -0.85);
    const body = new THREE.Mesh(taper(g, 0.55, 1.0, 0.1, 0.2), paint);
    carBody.add(body);

    // Kabine aus Glas
    const c = new THREE.Shape();
    c.moveTo(-1.72, 0.96);
    c.quadraticCurveTo(-1.35, 1.36, -0.95, 1.42);
    c.lineTo(0.15, 1.44);
    c.quadraticCurveTo(0.55, 1.4, 1.02, 0.96);
    c.lineTo(-1.72, 0.96);
    const cg = new THREE.ExtrudeGeometry(c, { depth: 1.46, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.06, bevelSegments: 5, curveSegments: 24 });
    cg.translate(0, 0, -0.73);
    carBody.add(new THREE.Mesh(taper(cg, 0.95, 1.45, 0.26, 0.0), glass));
    // Dach in Wagenfarbe
    const rf = new THREE.Shape();
    rf.moveTo(-1.02, 1.4);
    rf.lineTo(0.2, 1.42);
    rf.lineTo(0.14, 1.475);
    rf.lineTo(-0.98, 1.46);
    const rg = new THREE.ExtrudeGeometry(rf, { depth: 1.08, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.04, bevelSegments: 3 });
    rg.translate(0, 0.02, -0.54);
    carBody.add(new THREE.Mesh(rg, paint));

    // Schweller, Diffusor, Kühlergrill
    const sill = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.08, 1.9), trimMat);
    sill.position.set(0, 0.32, 0);
    carBody.add(sill);
    const grill = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 1.1), trimMat);
    grill.position.set(2.31, 0.5, 0);
    carBody.add(grill);
    const diff = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 1.3), trimMat);
    diff.position.set(-2.3, 0.42, 0);
    carBody.add(diff);
    // Spiegel
    [-1, 1].forEach((sd) => {
      const mir = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.07, 0.1), trimMat);
      mir.position.set(0.86, 1.0, sd * 0.86);
      carBody.add(mir);
    });
  }
  // Scheinwerfer, Tagfahrlicht, Rückleuchten
  const headMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.2, 0.22, 0.22) });
  const tailMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.25, 0.02, 0.02) });
  [-1, 1].forEach((sd) => {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.07, 0.5), headMat);
    h.position.set(2.24, 0.72, sd * 0.56);
    h.rotation.y = sd * 0.25;
    carBody.add(h);
  });
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 1.62), tailMat);
  tail.position.set(-2.27, 0.8, 0);
  carBody.add(tail);

  // Fahrschul-Dachschild
  const signTex = (() => {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 128;
    const g = c.getContext("2d");
    const grd = g.createLinearGradient(0, 0, 0, 128);
    grd.addColorStop(0, "#f6e3ad");
    grd.addColorStop(1, "#d9b35f");
    g.fillStyle = grd;
    g.fillRect(0, 0, 512, 128);
    g.fillStyle = "#0b2419";
    g.font = "800 64px Archivo, Arial, sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("FAHRSCHULE", 256, 68);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const signMat = new THREE.MeshBasicMaterial({ map: signTex, color: new THREE.Color(1.25, 1.2, 1.1) });
  const signSide = new THREE.MeshStandardMaterial({ color: "#d9b35f", roughness: 0.4, metalness: 0.3, emissive: "#6b4f16", emissiveIntensity: 0.6 });
  {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.26, 0.95), [signMat, signMat, signSide, signSide, signSide, signSide]);
    sign.position.set(-0.4, 1.66, 0);
    const lf = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.03, 0.8), trimMat);
    lf.position.set(-0.4, 1.52, 0);
    carBody.add(sign, lf);
    // Front- und Rückseite zeigen nach vorne/hinten
    signMat.map.center.set(0.5, 0.5);
  }

  // Räder
  const wheels = [];
  {
    const tire = new THREE.CylinderGeometry(0.37, 0.37, 0.27, 36, 1);
    tire.rotateX(Math.PI / 2);
    const rim = new THREE.CylinderGeometry(0.26, 0.26, 0.28, 28, 1);
    rim.rotateX(Math.PI / 2);
    const tireMat = new THREE.MeshStandardMaterial({ color: "#0a0b0b", roughness: 0.85 });
    const rimMat = new THREE.MeshStandardMaterial({ color: "#aeb5b2", roughness: 0.32, metalness: 1, envMapIntensity: 0.8 });
    const hubMat = new THREE.MeshStandardMaterial({ color: "#1a1f1d", roughness: 0.4, metalness: 0.8 });
    const spoke = new THREE.BoxGeometry(0.075, 0.23, 0.035);
    spoke.translate(0, 0.115, 0);
    // Felge als gezeichnete Textur: fünf Doppelspeichen, Bremsscheibe, Nabe
    const rimTex = (() => {
      const c = document.createElement("canvas");
      c.width = c.height = 256;
      const g = c.getContext("2d");
      g.translate(128, 128);
      g.fillStyle = "#0b0d0d";
      g.beginPath(); g.arc(0, 0, 127, 0, TAU); g.fill();
      g.strokeStyle = "#3a403e"; g.lineWidth = 10;
      g.beginPath(); g.arc(0, 0, 70, 0, TAU); g.stroke();
      const grd = g.createLinearGradient(-120, -120, 120, 120);
      grd.addColorStop(0, "#f2f5f4"); grd.addColorStop(0.5, "#9aa29f"); grd.addColorStop(1, "#dfe4e2");
      g.fillStyle = grd;
      for (let i = 0; i < 5; i++) {
        g.save();
        g.rotate((i / 5) * TAU);
        [-0.13, 0.13].forEach((o) => {
          g.save(); g.rotate(o);
          g.beginPath(); g.moveTo(-9, -20); g.lineTo(-13, -118); g.lineTo(13, -118); g.lineTo(9, -20); g.closePath(); g.fill();
          g.restore();
        });
        g.restore();
      }
      g.lineWidth = 12; g.strokeStyle = grd;
      g.beginPath(); g.arc(0, 0, 118, 0, TAU); g.stroke();
      g.fillStyle = grd; g.beginPath(); g.arc(0, 0, 26, 0, TAU); g.fill();
      g.fillStyle = "#1a1f1d"; g.beginPath(); g.arc(0, 0, 11, 0, TAU); g.fill();
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      return t;
    })();
    const faceMat = new THREE.MeshStandardMaterial({ map: rimTex, roughness: 0.3, metalness: 0.85, envMapIntensity: 1.1 });
    const face = new THREE.CircleGeometry(0.27, 40);
    [[1.36, 1], [1.36, -1], [-1.36, 1], [-1.36, -1]].forEach(([x, sd]) => {
      const w = new THREE.Group();
      w.add(new THREE.Mesh(tire, tireMat));
      w.add(new THREE.Mesh(rim, hubMat));
      const fm = new THREE.Mesh(face, faceMat);
      fm.position.z = sd * 0.142;
      if (sd < 0) fm.rotation.y = Math.PI;
      w.add(fm);
      w.position.set(x, 0.37, sd * 0.84);
      car.add(w);
      wheels.push(w);
    });
  }
  // weicher Schatten unter dem Auto
  {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d");
    const grd = g.createRadialGradient(64, 64, 10, 64, 64, 64);
    grd.addColorStop(0, "rgba(0,0,0,0.85)");
    grd.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 2.8), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
    sh.rotation.x = -Math.PI / 2;
    sh.position.y = 0.025;
    car.add(sh);
  }
  // Lichtkegel der Scheinwerfer
  const spots = [-1, 1].map((sd) => {
    const s = new THREE.SpotLight("#f4f7ff", 0, 14, 0.5, 0.8, 1.2);
    s.position.set(2.2, 0.72, sd * 0.56);
    s.target.position.set(9, 0, sd * 1.1);
    car.add(s, s.target);
    return s;
  });
  const beamTex = glowTexture("rgba(235,245,255,0.9)", "rgba(200,230,255,0)");
  const beam = new THREE.Mesh(new THREE.PlaneGeometry(12, 5), new THREE.MeshBasicMaterial({ map: beamTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
  beam.rotation.x = -Math.PI / 2;
  beam.position.set(7.5, 0.04, 0);
  beam.visible = false;
  car.add(beam);
  const flareMat = new THREE.SpriteMaterial({ map: glowTexture("rgba(240,248,255,1)", "rgba(200,230,255,0)"), color: new THREE.Color(2, 2.1, 2.2), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 });
  const flares = [-1, 1].map((sd) => {
    const f = new THREE.Sprite(flareMat);
    f.position.set(2.34, 0.72, sd * 0.58);
    f.scale.setScalar(0.55);
    car.add(f);
    return f;
  });
  const tailGlowMat = new THREE.SpriteMaterial({ map: glowTexture("rgba(255,60,50,1)", "rgba(255,30,20,0)"), color: new THREE.Color(2, 0.3, 0.25), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 });
  [-0.7, 0.7].forEach((z) => {
    const t = new THREE.Sprite(tailGlowMat);
    t.position.set(-2.34, 0.8, z);
    t.scale.setScalar(0.9);
    car.add(t);
  });
  // Das Auto fährt in +X seiner Gruppe; wir drehen es so, dass +X der Fahrtrichtung entspricht
  scene.add(car);

  /* ---------- Kamerafahrten ---------- */
  // Offsets im Koordinatensystem des Autos: x = rechts, y = oben, z = nach vorne
  // Eine Einstellung pro Abschnitt der Seite (Start, Ich, Warum, Weg, Stimmen, Test, Akademie, Buchen, Bewerten, Fragen, Ziel)
  const SHOTS = [
    { cam: [4.8, 1.25, 7.8], look: [0, 0.7, -0.2], fov: 30, sx: 0.2, sy: 0.24 },
    { cam: [-11, 2.2, 2.5], look: [0, 0.9, 0.5], fov: 30, sx: 0.05 },
    { cam: [-0.9, 2.1, -7.4], look: [0, 1.1, 6], fov: 38, sx: -0.12 },
    { cam: [10, 24, -10], look: [0, 0, 14], fov: 42 },
    { cam: [-2, 3, -14], look: [0, 5, 60], fov: 38 },
    { cam: [6.5, 1.5, 7.5], look: [0, 0.7, 0], fov: 30, sx: 0.05 },
    { cam: [2.5, 1.7, -12], look: [0, 3.5, 50], fov: 36, sx: -0.05 },
    { cam: [-8.5, 3.2, 9], look: [0, 0.6, 0], fov: 30, sx: 0.12, sy: 0.1 },
    { cam: [9.5, 2.6, -2], look: [0, 0.9, 1.2], fov: 32, sx: -0.14 },
    { cam: [0, 5.5, -14], look: [0, 1.5, 20], fov: 40 },
    { cam: [0, 11, -30], look: [0, 4, 70], fov: 44 }
  ].map((s, i, arr) => ({ ...s, p: i / (arr.length - 1) }));

  function shotAt(p) {
    let i = 0;
    while (i < SHOTS.length - 2 && p > SHOTS[i + 1].p) i++;
    const a = SHOTS[i], b = SHOTS[i + 1];
    const t = smooth(clamp((p - a.p) / (b.p - a.p), 0, 1));
    return {
      sx: lerp(a.sx || 0, b.sx || 0, t),
      sy: lerp(a.sy || 0, b.sy || 0, t),
      cam: a.cam.map((v, k) => lerp(v, b.cam[k], t)),
      look: a.look.map((v, k) => lerp(v, b.look[k], t)),
      fov: lerp(a.fov, b.fov, t)
    };
  }
  // Wie weit das Auto bei welchem Scrollstand gefahren ist
  const carU = (p) => {
    const q = clamp((p - 0.035) / 0.965, 0, 1);
    return 0.004 + (q * q * (3 - 2 * q) * 0.55 + q * 0.45) * 0.93;
  };

  /* ---------- Nachbearbeitung (Glühen) ---------- */
  let composer = null;
  let bloom = null;
  if (!lowPower) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2), 0.75, 0.55, 0.86);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
  }

  /* ---------- Zustand & Schleife ---------- */
  const state = {
    target: 0,
    p: 0,
    u: carU(0),
    lights: 0,
    lightsTarget: 0,
    speedKmh: 0,
    mx: 0,
    my: 0,
    smx: 0,
    smy: 0,
    idle: 0,
    sx: 0,
    sy: 0,
    running: true
  };
  const tmpCam = new THREE.Vector3();
  const tmpLook = new THREE.Vector3();
  const lookSm = new THREE.Vector3();
  const camSm = new THREE.Vector3();
  let first = true;
  const clock = new THREE.Clock();
  let listeners = [];

  function place(dt) {
    const f = frameAt(state.u);
    car.position.set(f.p.x, 0, f.p.z);
    car.rotation.y = Math.atan2(f.t.x, f.t.z) - Math.PI / 2;
    // leichtes Wippen der Karosserie
    const bob = Math.sin(state.idle * 9) * 0.004 * (0.3 + state.lights);
    carBody.position.y = bob;
    carBody.rotation.z = clamp(state.speedKmh / 130, 0, 1) * -0.012;

    const s = shotAt(state.p);
    const W = window.innerWidth, H = window.innerHeight;
    const portrait = W / H < 0.9;
    if (portrait) s.cam = s.cam.map((v, i) => (i === 1 ? v * 1.15 : v * 1.4));
    const up = new THREE.Vector3(0, 1, 0);
    const fwd = f.t;
    const right = f.side;
    tmpCam.copy(car.position)
      .addScaledVector(right, s.cam[0] + state.smx * 0.6)
      .addScaledVector(up, s.cam[1] + state.smy * 0.3)
      .addScaledVector(fwd, s.cam[2]);
    tmpLook.copy(car.position)
      .addScaledVector(right, s.look[0])
      .addScaledVector(up, s.look[1])
      .addScaledVector(fwd, s.look[2]);
    const k = first || reducedMotion ? 1 : 1 - Math.exp(-dt * 6);
    camSm.lerp(tmpCam, k);
    lookSm.lerp(tmpLook, k);
    if (first) {
      camSm.copy(tmpCam);
      lookSm.copy(tmpLook);
      first = false;
    }
    camera.position.copy(camSm);
    camera.lookAt(lookSm);
    state.sx += ((portrait ? 0 : s.sx) - state.sx) * k;
    state.sy += ((portrait ? s.sy : 0) - state.sy) * k;
    camera.setViewOffset(W, H, -state.sx * W, state.sy * H, W, H);
    if (Math.abs(camera.fov - s.fov) > 0.01) {
      camera.fov = lerp(camera.fov, s.fov, k);
      camera.updateProjectionMatrix();
    }
  }

  function tick() {
    if (!state.running) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const time = clock.elapsedTime;
    state.idle += dt;
    skyUniforms.uTime.value = time;
    cityUniforms.uTime.value = time;

    const prevU = state.u;
    state.p += (state.target - state.p) * (reducedMotion ? 1 : 1 - Math.exp(-dt * 3.2));
    state.u = carU(state.p);
    const dist = (state.u - prevU) * ROAD_LEN;
    const inst = dt > 0 ? Math.abs(dist / dt) * 3.6 * 0.55 : 0;
    state.speedKmh += (Math.min(inst, 160) - state.speedKmh) * (1 - Math.exp(-dt * 4));
    wheels.forEach((w) => (w.rotation.z -= dist / 0.37));

    state.smx += (state.mx - state.smx) * (1 - Math.exp(-dt * 2.5));
    state.smy += (state.my - state.smy) * (1 - Math.exp(-dt * 2.5));

    state.lights += (state.lightsTarget - state.lights) * (1 - Math.exp(-dt * 5));
    const L = state.lights;
    const flick = L < 0.98 && state.lightsTarget > 0 ? (Math.sin(time * 60) > 0.2 ? 1 : 0.35) : 1;
    spots.forEach((s) => (s.intensity = 22 * L * flick));
    headMat.color.setRGB(0.2 + 3.2 * L * flick, 0.22 + 3.4 * L * flick, 0.22 + 3.7 * L * flick);
    tailMat.color.setRGB(0.25 + 3.6 * L, 0.02 + 0.25 * L, 0.02 + 0.2 * L);
    flareMat.opacity = L * flick;
    tailGlowMat.opacity = L * 0.8;
    beam.material.opacity = 0.12 * L * flick;

    blinkSprites.forEach((s, i) => {
      const on = Math.sin(time * 2.2 + i * 1.7) > 0.55;
      s.material.opacity = on ? 1 : 0.08;
    });

    place(dt);
    if (composer) composer.render();
    else renderer.render(scene, camera);
    listeners.forEach((fn) => fn(state));
    requestAnimationFrame(tick);
  }

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h;
    // Auf schmalen Handys etwas mehr Bildwinkel, damit das Auto ganz drauf ist
    camera.filmGauge = 35;
    camera.zoom = w / h < 0.75 ? 0.62 : 1;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    if (composer) {
      composer.setSize(w, h);
      bloom.resolution.set(w / 2, h / 2);
    }
  }
  window.addEventListener("resize", resize);
  resize();
  place(0);

  const paints = {
    perlweiss: { color: "#e8ece9", metalness: 0.35, roughness: 0.26 },
    smaragd: { color: "#0f5a3d", metalness: 0.6, roughness: 0.3 },
    nachtschwarz: { color: "#0a0d0c", metalness: 0.5, roughness: 0.22 },
    champagner: { color: "#c9a560", metalness: 0.85, roughness: 0.28 }
  };

  if (location.search.indexOf("debug") !== -1) window.__three = { scene, camera, THREE };
  requestAnimationFrame(tick);

  return {
    setProgress(p) {
      state.target = clamp(p, 0, 1);
    },
    jump(p) {
      state.target = state.p = clamp(p, 0, 1);
      state.u = carU(state.p);
      state.speedKmh = 0;
      first = true;
    },
    setPointer(x, y) {
      state.mx = x;
      state.my = y;
    },
    lightsOn(on = true) {
      state.lightsTarget = on ? 1 : 0;
    },
    setPaint(name) {
      const c = paints[name];
      if (!c) return;
      const from = paint.color.clone();
      const to = new THREE.Color(c.color);
      const m0 = paint.metalness, r0 = paint.roughness;
      const t0 = performance.now();
      const step = () => {
        const t = smooth(clamp((performance.now() - t0) / 700, 0, 1));
        paint.color.copy(from).lerp(to, t);
        paint.metalness = lerp(m0, c.metalness, t);
        paint.roughness = lerp(r0, c.roughness, t);
        if (t < 1) requestAnimationFrame(step);
      };
      step();
    },
    degrade() {
      if (!composer) return;
      composer = null;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
      resize();
    },
    onFrame(fn) {
      listeners.push(fn);
    },
    pause(v) {
      const was = state.running;
      state.running = !v;
      if (!was && state.running) {
        clock.getDelta();
        requestAnimationFrame(tick);
      }
    },
    get speed() {
      return state.speedKmh;
    }
  };
}
