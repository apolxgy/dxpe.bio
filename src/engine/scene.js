import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

import { buildCardField } from "./cards.js";
import {
  SKY_VERT,
  SKY_FRAG,
  STARS_VERT,
  STARS_FRAG,
  FIELD_VERT,
  FIELD_FRAG,
  FINAL_FRAG,
} from "./shaders.js";

const POSES = [
  {
    pos: [0, 1.7, 14.5],
    look: [0.9, 1.05, 0],
    core: 0.34,
    field: 0.12,
    deck: { x: 0.3, y: 8.2, z: 1.4, zoom: 2.35, boost: 2.2 },
  },
  { pos: [0, 1.25, 7.8], look: [0.7, 1.05, 0], core: 0.92, field: 0.55 },
  { pos: [0, 1.05, 10.6], look: [0.45, 0.95, 0], core: 0.5, field: 0.28 },
  { pos: [0, 1.5, 12.2], look: [1.0, 1.1, 0], core: 0.34, field: 0.46 },
  {
    pos: [0, 1.2, 16.6],
    look: [0.4, 1.1, 0],
    core: 0.28,
    field: 0.1,
    deck: { x: 0.4, y: 1.4, z: 2.6, zoom: 1.0, boost: 3.2 },
  },
];

const forceMotion = new URLSearchParams(location.search).has("motion");
const reduced = !forceMotion && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function createWorld(canvas) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: "high-performance",
      stencil: false,
    });
  } catch (err) {
    return null;
  }
  if (!renderer.getContext()) return null;

  let ratio = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(ratio);
  renderer.setClearColor(0x050505, 1);
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 500);
  camera.position.set(0, 0.4, 10.8);
  camera.lookAt(0, 0.7, 0);

  const skyMat = new THREE.ShaderMaterial({
    vertexShader: SKY_VERT,
    fragmentShader: SKY_FRAG,
    uniforms: { uTime: { value: 0 }, uHeat: { value: 1 } },
    side: THREE.BackSide,
    depthWrite: false,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(220, 32, 24), skyMat);
  sky.renderOrder = -20;
  scene.add(sky);

  const STAR_N = reduced ? 1400 : 4200;
  const starGeo = new THREE.BufferGeometry();
  const sPos = new Float32Array(STAR_N * 3);
  const sCol = new Float32Array(STAR_N * 3);
  const sSize = new Float32Array(STAR_N);
  const sSeed = new Float32Array(STAR_N);
  const palette = [
    [0.98, 0.98, 1.0],
    [0.83, 0.69, 0.22],
    [1.0, 1.0, 1.0],
    [0.62, 0.65, 0.72],
  ];

  for (let i = 0; i < STAR_N; i++) {
    const r = 70 + Math.random() * 130;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    sPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    sPos[i * 3 + 1] = r * Math.cos(phi) * 0.7;
    sPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

    const roll = Math.random();
    const c = roll > 0.94 ? palette[2] : roll > 0.8 ? palette[1] : roll > 0.45 ? palette[0] : palette[3];
    const dim = 0.25 + Math.random() * 0.75;
    sCol[i * 3] = c[0] * dim;
    sCol[i * 3 + 1] = c[1] * dim;
    sCol[i * 3 + 2] = c[2] * dim;
    sSize[i] = 0.5 + Math.random() * Math.random() * 3.4;
    sSeed[i] = Math.random();
  }

  starGeo.setAttribute("position", new THREE.BufferAttribute(sPos, 3));
  starGeo.setAttribute("aColor", new THREE.BufferAttribute(sCol, 3));
  starGeo.setAttribute("aSize", new THREE.BufferAttribute(sSize, 1));
  starGeo.setAttribute("aSeed", new THREE.BufferAttribute(sSeed, 1));

  const starMat = new THREE.ShaderMaterial({
    vertexShader: STARS_VERT,
    fragmentShader: STARS_FRAG,
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: ratio },
      uOpacity: { value: 0.6 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const stars = new THREE.Points(starGeo, starMat);
  stars.renderOrder = -10;
  scene.add(stars);

  const fieldMat = new THREE.ShaderMaterial({
    vertexShader: FIELD_VERT,
    fragmentShader: FIELD_FRAG,
    uniforms: {
      uTime: { value: 0 },
      uMix: { value: 0.45 },
      uAmp: { value: 3.0 },
      uPixelRatio: { value: ratio },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const field = new THREE.Points(new THREE.PlaneGeometry(180, 180, 190, 190), fieldMat);
  field.rotation.x = -Math.PI / 2;
  field.position.y = -4.8;
  field.frustumCulled = false;
  scene.add(field);

  const core = new THREE.Group();
  core.position.set(2.6, 1.3, 0);
  scene.add(core);

  const deck = buildCardField({ count: reduced ? 14 : 24 });
  core.add(deck.group);

  const SPARK_N = reduced ? 54 : 110;
  const sparkGeo = new THREE.BufferGeometry();
  const sp = new Float32Array(SPARK_N * 3);
  const ssize = new Float32Array(SPARK_N);
  for (let i = 0; i < SPARK_N; i++) {
    const r = 3.1 + Math.random() * 1.7;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    sp[i * 3] = r * Math.sin(ph) * Math.cos(th);
    sp[i * 3 + 1] = r * Math.cos(ph) * 0.85;
    sp[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
    ssize[i] = 0.5 + Math.random() * 1.1;
  }
  sparkGeo.setAttribute("position", new THREE.BufferAttribute(sp, 3));
  sparkGeo.setAttribute("aSize", new THREE.BufferAttribute(ssize, 1));
  sparkGeo.setAttribute("aSeed", new THREE.BufferAttribute(new Float32Array(SPARK_N).map(() => Math.random()), 1));
  sparkGeo.setAttribute("aColor", new THREE.BufferAttribute(
    new Float32Array(SPARK_N * 3).map((_, i) => (i % 11 === 0 ? 0.83 : 1)),
    3,
  ));

  const sparkMat = new THREE.ShaderMaterial({
    vertexShader: STARS_VERT,
    fragmentShader: STARS_FRAG,
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: ratio },
      uOpacity: { value: 1 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const sparks = new THREE.Points(sparkGeo, sparkMat);
  core.add(sparks);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.34, 0.5, 0.72);
  composer.addPass(bloom);

  const finalPass = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      uRes: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 },
      uGrain: { value: 0.05 },
      uVignette: { value: 0.42 },
      uAberration: { value: 0.0035 },
      uInvert: { value: 0 },
    },
    vertexShader:  `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: FINAL_FRAG,
  });
  composer.addPass(finalPass);
  composer.addPass(new OutputPass());

  const weights = { core: 0.34, field: 0.12 };
  const camTarget = new THREE.Vector3();
  const lookTarget = new THREE.Vector3();
  const camPos = new THREE.Vector3().fromArray(POSES[0].pos);
  const camLook = new THREE.Vector3().fromArray(POSES[0].look);
  const pointer = { x: 0, y: 0 };
  let station = 0;
  let invert = 0;
  let invertTarget = 0;
  let frameAcc = 0;
  let frameCount = 0;
  let degraded = false;
  let narrow = false;
  const deckPos = new THREE.Vector3(2.6, 1.3, 0);
  let deckZoom = 1;
  let deckBoost = 1;

  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    narrow = camera.aspect < 0.95;
    renderer.setPixelRatio(ratio);
    renderer.setSize(w, h, false);
    composer.setPixelRatio(ratio);
    composer.setSize(w, h);
    bloom.setSize(w, h);
    finalPass.uniforms.uRes.value.set(w * ratio, h * ratio);
    starMat.uniforms.uPixelRatio.value = ratio;
    fieldMat.uniforms.uPixelRatio.value = ratio;
  }

  resize();

  return {
    setStation(index) {
      station = Math.min(POSES.length - 1, Math.max(0, index));
    },
    setTheme(theme) {
      invertTarget = theme === "light" ? 1 : 0;
    },
    setPointer(x, y) {
      pointer.x = x;
      pointer.y = y;
    },
    update(dt, time) {
      const pose = POSES[station];
      const drift = reduced ? 0 : 1;

      camTarget.fromArray(pose.pos);
      lookTarget.fromArray(pose.look);

      camTarget.x += pointer.x * 0.85 * drift + Math.sin(time * 0.23) * 0.24 * drift;
      camTarget.y += -pointer.y * 0.45 * drift + Math.sin(time * 0.37) * 0.1 * drift;
      lookTarget.x += pointer.x * 0.4 * drift;
      lookTarget.y += -pointer.y * 0.26 * drift;

      const k = 1 - Math.exp(-dt * 1.9);
      camPos.lerp(camTarget, k);
      camLook.lerp(lookTarget, k * 0.9);
      camera.position.copy(camPos);
      camera.lookAt(camLook);

      const wk = 1 - Math.exp(-dt * 2.2);
      weights.core += (pose.core - weights.core) * wk;
      weights.field += (pose.field - weights.field) * wk;

      const dk = pose.deck;
      const baseX = narrow ? 1.15 : 2.6;
      const baseY = narrow ? 1.55 : 1.3;
      deckPos.x += ((dk ? dk.x : baseX) - deckPos.x) * wk;
      deckPos.y += ((dk ? dk.y : baseY) - deckPos.y) * wk;
      deckPos.z += ((dk ? dk.z : 0) - deckPos.z) * wk;
      deckZoom += ((dk ? dk.zoom : 1) - deckZoom) * wk;
      deckBoost += ((dk ? dk.boost : 1) - deckBoost) * wk;

      deck.setStrength(Math.min(1, weights.core * (narrow ? 0.55 : 1) * deckBoost));
      core.position.copy(deckPos);
      sparkMat.uniforms.uTime.value = time;
      sparkMat.uniforms.uOpacity.value = 0.25 + weights.core * 0.75;
      core.scale.setScalar((0.9 + weights.core * 0.2) * deckZoom);

      fieldMat.uniforms.uMix.value = weights.field;
      fieldMat.uniforms.uTime.value = time;
      skyMat.uniforms.uTime.value = time;
      skyMat.uniforms.uHeat.value = 0.75 + weights.core * 0.4;

      starMat.uniforms.uTime.value = time;
      starMat.uniforms.uOpacity.value = 0.42 + weights.field * 0.34;

      finalPass.uniforms.uTime.value = time;

      invert += (invertTarget - invert) * (1 - Math.exp(-dt * 3.5));
      finalPass.uniforms.uInvert.value = invert;
      deck.setInvert(invert);
      bloom.strength = 0.34 * (1 - invert * 0.7);

      deck.update(reduced ? time * 0.34 : time);

      if (!reduced) {
        sparks.rotation.y -= dt * 0.045;
        field.position.z = ((time * 1.1) % 9) - 4.5;
      }

      frameAcc += dt;
      frameCount++;
      if (!degraded && frameCount > 90) {
        const avg = frameAcc / frameCount;
        if (avg > 0.028 && ratio > 1.25) {
          ratio = 1.25;
          degraded = true;
          resize();
        }
        frameAcc = 0;
        frameCount = 0;
      }
    },
    render() {
      composer.render();
    },
    resize,
  };
}
