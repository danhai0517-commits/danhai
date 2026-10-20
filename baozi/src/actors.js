import * as THREE from 'three';
import { geo, palette, parts, material, nameSprite, textTexture, mesh, group, rand, TAU, lerp } from './art.js';
import { BUN_TYPES, LEVELS } from './config.js';

// ---------- Buns ----------
const bunProfile = [[0, 0], [0.28, 0], [0.35, 0.08], [0.36, 0.2], [0.3, 0.33], [0.18, 0.4], [0.06, 0.44], [0, 0.44]].map(([x, y]) => new THREE.Vector2(x, y));
const bunLathe = new THREE.LatheGeometry(bunProfile, 24);
const bunGeometries = {};
export function bunGeometry(type) {
  if (bunGeometries[type]) return bunGeometries[type];
  const t = BUN_TYPES[type];
  const list = [{ geo: bunLathe, color: t.color }];
  for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; list.push({ geo: geo.sphereLow, color: t.color, pos: [Math.cos(a) * 0.1, 0.43, Math.sin(a) * 0.1], scale: [0.055, 0.035, 0.055] }); }
  list.push({ geo: geo.sphereLow, color: t.tip, pos: [0, 0.45, 0], scale: [0.05, 0.035, 0.05] });
  if (type === 'meat') list.push({ geo: geo.sphereLow, color: t.tip, pos: [0, 0.4, 0], scale: [0.12, 0.05, 0.12] });
  if (type === 'spicy') for (let i = 0; i < 3; i++) list.push({ geo: geo.sphereLow, color: '#ffe066', pos: [Math.cos(i * 2.1) * 0.22, 0.25, Math.sin(i * 2.1) * 0.22], scale: [0.04, 0.04, 0.04] });
  const g = parts(list); g.scale(t.scale, t.scale, t.scale);
  bunGeometries[type] = g; return g;
}
const bunMaterial = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: material('#fff').gradientMap });
const bunGlow = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: bunMaterial.gradientMap, emissive: '#ffb347', emissiveIntensity: 0.35 });
export function createBunMesh(type) {
  const m = new THREE.Mesh(bunGeometry(type), type === 'gold' || type === 'super' ? bunGlow : bunMaterial);
  m.castShadow = true; m.receiveShadow = false; m.userData.dynamic = true; return m;
}

// ---------- Units (包子侠) ----------
const faceParts = (skin, team) => [
  { geo: geo.sphere, color: skin, pos: [0, 0.98, 0], scale: [0.42, 0.4, 0.42] },
  { geo: geo.sphere, color: palette.ink, pos: [-0.15, 1.0, 0.33], scale: [0.07, 0.09, 0.05] },
  { geo: geo.sphere, color: palette.ink, pos: [0.15, 1.0, 0.33], scale: [0.07, 0.09, 0.05] },
  { geo: geo.sphereLow, color: '#ffffff', pos: [-0.13, 1.04, 0.37], scale: [0.025, 0.03, 0.02] },
  { geo: geo.sphereLow, color: '#ffffff', pos: [0.17, 1.04, 0.37], scale: [0.025, 0.03, 0.02] },
  { geo: geo.sphere, color: '#ff9b8a', pos: [-0.24, 0.9, 0.3], scale: [0.08, 0.05, 0.04] },
  { geo: geo.sphere, color: '#ff9b8a', pos: [0.24, 0.9, 0.3], scale: [0.08, 0.05, 0.04] },
  { geo: geo.torus, color: team.dark, pos: [0, 1.08, 0], rot: [Math.PI / 2, 0, 0], scale: [0.4, 0.4, 0.5] },
  { geo: geo.sphereLow, color: team.dark, pos: [-0.3, 1.14, -0.3], scale: [0.09, 0.07, 0.09] },
  { geo: geo.sphereLow, color: team.dark, pos: [-0.42, 1.08, -0.36], scale: [0.1, 0.05, 0.06] },
  { geo: geo.sphereLow, color: team.dark, pos: [-0.3, 1.0, -0.42], scale: [0.06, 0.1, 0.06] },
];
const bodyParts = (team) => [
  { geo: geo.sphere, color: palette.cream, pos: [0, 0.45, 0], scale: [0.34, 0.36, 0.3] },
  { geo: geo.sphere, color: team.color, pos: [0, 0.4, 0.06], scale: [0.3, 0.3, 0.28] },
  { geo: geo.box, color: team.color, pos: [0, 0.58, 0.2], scale: [0.26, 0.18, 0.12] },
  { geo: geo.box, color: team.dark, pos: [0, 0.3, 0.26], scale: [0.2, 0.14, 0.06] },
];
const geometryCache = new Map();
function cached(key, build) { if (!geometryCache.has(key)) geometryCache.set(key, build()); return geometryCache.get(key); }
const vcMat = bunMaterial;
function vcMesh(parent, geometry) { const m = new THREE.Mesh(geometry, vcMat); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; }

export function hatGeometry(level, team) {
  return cached('hat' + level + team.id, () => {
    if (level === 2) return parts([
      { geo: geo.cylinder, color: palette.white, pos: [0, 1.42, 0], scale: [0.3, 0.14, 0.3] },
      { geo: geo.sphere, color: palette.white, pos: [0, 1.62, 0], scale: [0.36, 0.3, 0.36] },
      { geo: geo.sphere, color: palette.white, pos: [-0.22, 1.6, 0.1], scale: [0.2, 0.2, 0.2] },
      { geo: geo.sphere, color: palette.white, pos: [0.22, 1.6, -0.1], scale: [0.2, 0.2, 0.2] },
      { geo: geo.torus, color: team.color, pos: [0, 1.38, 0], rot: [Math.PI / 2, 0, 0], scale: [0.3, 0.3, 0.5] },
    ]);
    if (level === 3) {
      const list = [{ geo: geo.cylinder, color: palette.gold, pos: [0, 1.42, 0], scale: [0.3, 0.14, 0.3] }];
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; list.push({ geo: geo.cone, color: palette.gold, pos: [Math.cos(a) * 0.26, 1.58, Math.sin(a) * 0.26], scale: [0.09, 0.2, 0.09] }); }
      list.push({ geo: geo.sphereLow, color: team.color, pos: [0, 1.5, 0.3], scale: [0.07, 0.07, 0.05] });
      return parts(list);
    }
    const list = [{ geo: geo.cylinder, color: '#ff3d3d', pos: [0, 1.4, 0], scale: [0.3, 0.1, 0.3] }, { geo: geo.cylinder, color: palette.gold, pos: [0, 1.5, 0], scale: [0.36, 0.1, 0.36] }];
    for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; list.push({ geo: geo.cone, color: palette.gold, pos: [Math.cos(a) * 0.32, 1.68, Math.sin(a) * 0.32], scale: [0.1, 0.26, 0.1] }); }
    list.push({ geo: geo.sphere, color: '#ff3d3d', pos: [0, 1.75, 0], scale: [0.1, 0.1, 0.1] });
    return parts(list);
  });
}

export function createUnitMesh(team, { hero = false, name = '' } = {}) {
  const g = new THREE.Group(); g.userData.dynamic = true;
  const skin = hero ? palette.skinDark : palette.skin;
  const head = vcMesh(g, cached('head' + team.id + skin, () => parts(faceParts(skin, team))));
  const body = vcMesh(g, cached('body' + team.id, () => parts(bodyParts(team))));
  const foot = cached('foot', () => parts([{ geo: geo.sphere, color: palette.ink, scale: [0.12, 0.08, 0.15] }]));
  const footL = vcMesh(g, foot), footR = vcMesh(g, foot); footL.position.set(-0.14, 0.08, 0.02); footR.position.set(0.14, 0.08, 0.02);
  const arm = cached('arm' + skin, () => parts([{ geo: geo.capsule, color: skin, pos: [0, -0.14, 0], scale: [0.07, 0.12, 0.07] }, { geo: geo.sphere, color: skin, pos: [0, -0.3, 0], scale: [0.09, 0.09, 0.09] }]));
  const armL = vcMesh(g, arm), armR = vcMesh(g, arm); armL.position.set(-0.36, 0.6, 0.05); armR.position.set(0.36, 0.6, 0.05);
  const carry = new THREE.Group(); carry.position.set(0, 1.42, 0); g.add(carry);
  let hat = null, aura = null, extra = null;
  if (hero) {
    const cape = mesh(g, geo.plane, team.dark, [0, 0.62, -0.3], [0.7, 0.75, 1]); cape.material = material(team.dark, { side: THREE.DoubleSide }); cape.rotation.x = 0.15;
    extra = cape;
    const spatula = new THREE.Group(); spatula.position.set(0.5, 0.5, 0.1); spatula.rotation.z = -0.5;
    vcMesh(spatula, cached('spatula', () => parts([{ geo: geo.cylinder, color: palette.woodDark, pos: [0, 0.4, 0], scale: [0.05, 0.9, 0.05] }, { geo: geo.box, color: palette.steel, pos: [0, 1.0, 0], scale: [0.36, 0.34, 0.06] }, { geo: geo.box, color: palette.steel, pos: [0, 1.2, 0], scale: [0.3, 0.1, 0.06] }])));
    g.add(spatula); g.userData.spatula = spatula;
    hat = vcMesh(g, hatGeometry(2, team));
    g.scale.setScalar(1.45);
  }
  const label = nameSprite(name, team.color, { hero }); label.position.set(0, hero ? 2.0 : 1.75, 0); g.add(label);
  Object.assign(g.userData, { head, body, footL, footR, armL, armR, carry, hat, aura, extra, label, team, hero, phase: rand(0, TAU) });
  return g;
}
export function setUnitLevel(g, level) {
  const d = g.userData;
  if (d.hat) { g.remove(d.hat); d.hat = null; }
  if (level >= 2) d.hat = vcMesh(g, hatGeometry(Math.min(level, 4), d.team));
  if (level >= 3 && !d.aura) {
    const ring = new THREE.Mesh(geo.torus, material(level >= 4 ? '#ffd35a' : d.team.light, { emissive: level >= 4 ? '#ffb347' : d.team.color, emissiveIntensity: 0.6 }));
    ring.rotation.x = Math.PI / 2; ring.scale.set(0.62, 0.62, 0.35); ring.position.y = 0.06; ring.castShadow = false; g.add(ring); d.aura = ring;
  }
  const scale = LEVELS[Math.min(level, LEVELS.length) - 1].scale * (d.hero ? 1.45 : 1);
  g.scale.setScalar(scale);
  d.label.position.y = (d.hat ? 1.95 : 1.75) + (d.hero ? 0.2 : 0);
}
// Walking, carrying and dancing animations.
export function animateUnit(g, t, moving, dashing, dancing) {
  const d = g.userData; const sp = dashing ? 22 : 14; const w = moving ? 1 : 0;
  const bob = Math.sin(t * sp + d.phase);
  g.position.y = Math.abs(bob) * 0.12 * w + (dancing ? Math.abs(Math.sin(t * 9 + d.phase)) * 0.35 : 0);
  d.footL.position.z = 0.02 + bob * 0.16 * w; d.footR.position.z = 0.02 - bob * 0.16 * w;
  d.footL.position.y = 0.08 + Math.max(0, bob) * 0.1 * w; d.footR.position.y = 0.08 + Math.max(0, -bob) * 0.1 * w;
  d.armL.rotation.x = bob * 0.8 * w; d.armR.rotation.x = -bob * 0.8 * w;
  if (d.carry.children.length) { d.armL.rotation.x = -2.6; d.armR.rotation.x = -2.6; d.armL.rotation.z = 0.2; d.armR.rotation.z = -0.2; }
  else { d.armL.rotation.z = dancing ? Math.sin(t * 9) * 1.2 - 1.2 : 0; d.armR.rotation.z = dancing ? -Math.sin(t * 9 + 1) * 1.2 + 1.2 : 0; }
  d.head.rotation.z = dancing ? Math.sin(t * 9 + d.phase) * 0.25 : bob * 0.04 * w;
  d.head.position.y = Math.sin(t * 3 + d.phase) * 0.012;
  if (d.hat) { d.hat.rotation.z = d.head.rotation.z; }
  if (d.extra) d.extra.rotation.x = 0.15 + (moving ? 0.35 + Math.sin(t * sp) * 0.1 : 0);
  if (d.aura) d.aura.rotation.z = t * 1.5;
  g.rotation.x = moving ? (dashing ? 0.22 : 0.1) : 0;
}

// ---------- Mice (馋嘴老鼠) ----------
export function createMouseMesh() {
  const g = new THREE.Group(); g.userData.dynamic = true;
  const body = vcMesh(g, cached('mouse', () => parts([
    { geo: geo.sphere, color: palette.grey, pos: [0, 0.3, 0], scale: [0.3, 0.28, 0.42] },
    { geo: geo.sphere, color: palette.grey, pos: [0, 0.42, 0.3], scale: [0.26, 0.24, 0.3] },
    { geo: geo.sphere, color: palette.pink, pos: [0, 0.4, 0.6], scale: [0.07, 0.06, 0.07] },
    { geo: geo.sphere, color: palette.grey, pos: [-0.2, 0.62, 0.22], scale: [0.14, 0.14, 0.05] },
    { geo: geo.sphere, color: palette.grey, pos: [0.2, 0.62, 0.22], scale: [0.14, 0.14, 0.05] },
    { geo: geo.sphere, color: palette.pink, pos: [-0.2, 0.62, 0.25], scale: [0.09, 0.09, 0.03] },
    { geo: geo.sphere, color: palette.pink, pos: [0.2, 0.62, 0.25], scale: [0.09, 0.09, 0.03] },
    { geo: geo.sphere, color: palette.ink, pos: [-0.1, 0.48, 0.5], scale: [0.05, 0.06, 0.04] },
    { geo: geo.sphere, color: palette.ink, pos: [0.1, 0.48, 0.5], scale: [0.05, 0.06, 0.04] },
    { geo: geo.sphere, color: '#d8d8df', pos: [0, 0.2, 0.1], scale: [0.2, 0.14, 0.3] },
  ])));
  const tail = vcMesh(g, cached('tail', () => parts([{ geo: geo.torus, color: palette.pink, pos: [0, 0.2, -0.5], rot: [0, Math.PI / 2, 0], scale: [0.25, 0.25, 0.25] }])));
  tail.scale.set(1, 1, 1); g.userData.body = body; g.userData.tail = tail; g.userData.phase = rand(0, TAU);
  return g;
}
export function animateMouse(g, t) { const d = g.userData; g.position.y = Math.abs(Math.sin(t * 18 + d.phase)) * 0.08; d.tail.rotation.x = Math.sin(t * 10 + d.phase) * 0.6; d.body.rotation.z = Math.sin(t * 18 + d.phase) * 0.08; }

// ---------- Chef & central steamer ----------
export function createChef(parent) {
  const g = group(parent, 0, 0, -3.6); g.userData.dynamic = true;
  const body = vcMesh(g, cached('chef', () => parts([
    { geo: geo.sphere, color: palette.white, pos: [0, 0.95, 0], scale: [0.9, 0.95, 0.8] },
    { geo: geo.box, color: palette.red, pos: [0, 0.75, 0.6], scale: [0.6, 0.7, 0.3] },
    { geo: geo.sphere, color: palette.skin, pos: [0, 2.0, 0.05], scale: [0.62, 0.58, 0.6] },
    { geo: geo.sphere, color: palette.ink, pos: [-0.22, 2.08, 0.5], scale: [0.09, 0.11, 0.06] },
    { geo: geo.sphere, color: palette.ink, pos: [0.22, 2.08, 0.5], scale: [0.09, 0.11, 0.06] },
    { geo: geo.sphere, color: '#ff9b8a', pos: [-0.36, 1.92, 0.45], scale: [0.12, 0.07, 0.06] },
    { geo: geo.sphere, color: '#ff9b8a', pos: [0.36, 1.92, 0.45], scale: [0.12, 0.07, 0.06] },
    { geo: geo.torus, color: palette.ink, pos: [0, 1.84, 0.56], rot: [0, 0, 0], scale: [0.14, 0.1, 0.1] },
    { geo: geo.sphere, color: '#5a3a22', pos: [-0.16, 1.9, 0.56], scale: [0.14, 0.06, 0.05] },
    { geo: geo.sphere, color: '#5a3a22', pos: [0.16, 1.9, 0.56], scale: [0.14, 0.06, 0.05] },
    { geo: geo.cylinder, color: palette.white, pos: [0, 2.6, 0], scale: [0.5, 0.3, 0.5] },
    { geo: geo.sphere, color: palette.white, pos: [0, 2.95, 0], scale: [0.6, 0.45, 0.6] },
    { geo: geo.sphere, color: palette.white, pos: [-0.4, 2.9, 0.1], scale: [0.3, 0.3, 0.3] },
    { geo: geo.sphere, color: palette.white, pos: [0.4, 2.9, -0.1], scale: [0.3, 0.3, 0.3] },
    { geo: geo.torus, color: palette.red, pos: [0, 1.52, 0], rot: [Math.PI / 2, 0, 0], scale: [0.62, 0.62, 0.6] },
    { geo: geo.sphere, color: palette.ink, pos: [-0.35, 0.08, 0.1], scale: [0.26, 0.12, 0.34] },
    { geo: geo.sphere, color: palette.ink, pos: [0.35, 0.08, 0.1], scale: [0.26, 0.12, 0.34] },
  ])));
  const arm = cached('chefArm', () => parts([{ geo: geo.capsule, color: palette.white, pos: [0, -0.3, 0], scale: [0.16, 0.25, 0.16] }, { geo: geo.sphere, color: palette.skin, pos: [0, -0.68, 0], scale: [0.2, 0.2, 0.2] }]));
  const armL = vcMesh(g, arm), armR = vcMesh(g, arm); armL.position.set(-0.85, 1.4, 0.2); armR.position.set(0.85, 1.4, 0.2);
  const steamer = group(parent, 0, 0, 0);
  const lid = group(steamer, 0, 0.95, 0); lid.userData.dynamic = true;
  return { group: g, body, armL, armR, lid, steamer, phase: 0 };
}
export function animateChef(chef, t, lidOpen) {
  const target = lidOpen ? 1 : 0; chef.phase = lerp(chef.phase, target, 0.08);
  const p = chef.phase;
  chef.lid.position.y = 0.95 + p * 1.6; chef.lid.position.z = -p * 1.1; chef.lid.rotation.x = -p * 0.55;
  chef.armL.rotation.x = -0.6 - p * 1.4; chef.armR.rotation.x = -0.6 - p * 1.4;
  chef.body.position.y = Math.sin(t * 2.4) * 0.03; chef.body.rotation.z = Math.sin(t * 1.2) * 0.02;
  chef.group.rotation.y = Math.sin(t * 0.7) * 0.06;
}

// ---------- Baskets ----------
const basketProfile = [[0.55, 0], [0.9, 0.02], [1.0, 0.3], [1.08, 0.7], [1.15, 0.95], [1.05, 0.95], [0.98, 0.7], [0.92, 0.3], [0.86, 0.1], [0.5, 0.08]].map(([x, y]) => new THREE.Vector2(x, y));
const basketLathe = new THREE.LatheGeometry(basketProfile, 20);
export function createBasket(parent, team, x, z, weaveMat) {
  const g = group(parent, x, 0, z, Math.atan2(x, z));
  const body = new THREE.Mesh(basketLathe, weaveMat); body.castShadow = body.receiveShadow = true; g.add(body);
  mesh(g, geo.torus, team.color, [0, 0.95, 0], [1.1, 1.1, 0.5]);
  const flagPole = mesh(g, geo.cylinder, palette.woodDark, [0, 1.6, -1.2], [0.05, 2.2, 0.05]);
  const flag = mesh(g, geo.plane, team.color, [0.35, 2.4, -1.2], [0.7, 0.5, 1]); flag.material = material(team.color, { side: THREE.DoubleSide }); flag.userData.dynamic = true;
  const letter = new THREE.Mesh(geo.plane, new THREE.MeshBasicMaterial({ map: textTexture(team.id, { width: 128, height: 128, color: '#fff', font: 'bold 96px sans-serif' }), transparent: true, side: THREE.DoubleSide }));
  letter.position.set(0.35, 2.4, -1.19); letter.scale.set(0.45, 0.45, 1); letter.userData.dynamic = true; g.add(letter);
  const pile = new THREE.Group(); pile.position.y = 0.2; g.add(pile); pile.userData.dynamic = true;
  mesh(g, geo.cylinder, '#d8b07a', [0, 0.2, 0], [0.85, 0.05, 0.85]);
  void flagPole;
  return { group: g, pile, flag, team, x, z, bunMeshes: [] };
}
export function updateBasketPile(basket, count, bunFactory) {
  const target = Math.min(14, Math.floor(count / 2));
  while (basket.bunMeshes.length < target) {
    const i = basket.bunMeshes.length; const layer = i < 7 ? 0 : i < 12 ? 1 : 2; const idx = layer === 0 ? i : layer === 1 ? i - 7 : i - 12; const n = layer === 0 ? 7 : layer === 1 ? 5 : 2;
    const a = idx / n * TAU + layer, r = layer === 0 ? 0.52 : layer === 1 ? 0.32 : 0.15;
    const m = bunFactory(i % 5 === 4 ? 'meat' : 'plain'); m.position.set(Math.cos(a) * r, 0.05 + layer * 0.3, Math.sin(a) * r); m.scale.setScalar(0.8); m.rotation.y = a;
    basket.pile.add(m); basket.bunMeshes.push(m);
  }
  while (basket.bunMeshes.length > target) basket.pile.remove(basket.bunMeshes.pop());
}
