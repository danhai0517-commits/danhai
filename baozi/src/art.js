import * as THREE from 'three';
import { mergeGeometries } from '../../vendor/BufferGeometryUtils.js';

export const TAU = Math.PI * 2;
let seed = 20261020;
export function rand(min = 0, max = 1) { seed = (seed * 1664525 + 1013904223) >>> 0; return min + (seed / 4294967296) * (max - min); }
export const pick = list => list[Math.floor(rand(0, list.length)) % list.length];
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;

const rampData = new Uint8Array([120, 170, 215, 255, 255]);
export const toonRamp = new THREE.DataTexture(rampData, 5, 1, THREE.RedFormat);
toonRamp.minFilter = toonRamp.magFilter = THREE.NearestFilter; toonRamp.needsUpdate = true;

const materials = new Map();
export function material(color, options = {}) {
  const key = color + JSON.stringify(options);
  if (materials.has(key)) return materials.get(key);
  const mat = new THREE.MeshToonMaterial({ color, gradientMap: toonRamp, ...options });
  materials.set(key, mat); return mat;
}
export const vertexColorMaterial = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toonRamp });
export const vertexColorMaterialEmissive = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toonRamp, emissive: '#ffffff', emissiveIntensity: 0.12 });

export const palette = {
  wood: '#c98a4b', woodLight: '#e0a86a', woodDark: '#8d5a2b', bamboo: '#d9ab6e', bambooDark: '#a97a44', bambooGreen: '#b8b06a',
  cream: '#fff3dc', white: '#fffaf0', skin: '#ffe3c2', skinDark: '#f2c9a0', ink: '#3b2418', red: '#e5463a', redDark: '#a82b24', gold: '#ffc83d',
  grey: '#9b9aa5', greyDark: '#6f6d7a', pink: '#ff9fb0', steel: '#b9c3cf', soy: '#4a2a1e', leaf: '#7cb35a', chili: '#e63b2e',
};

export const geo = {
  sphere: new THREE.SphereGeometry(1, 20, 14),
  sphereLow: new THREE.SphereGeometry(1, 12, 9),
  box: new THREE.BoxGeometry(1, 1, 1),
  cylinder: new THREE.CylinderGeometry(1, 1, 1, 18),
  cylinderLow: new THREE.CylinderGeometry(1, 1, 1, 10),
  cone: new THREE.ConeGeometry(1, 1, 12),
  torus: new THREE.TorusGeometry(1, 0.1, 10, 28),
  plane: new THREE.PlaneGeometry(1, 1),
  capsule: new THREE.CapsuleGeometry(1, 1, 6, 14),
};

export function mesh(parent, geometry, color, pos = [0, 0, 0], scale = [1, 1, 1], options = {}) {
  const object = new THREE.Mesh(geometry, typeof color === 'string' ? material(color, options) : color);
  object.position.set(...pos); object.scale.set(...scale); object.castShadow = true; object.receiveShadow = true;
  parent.add(object); return object;
}
export const ball = (p, c, pos, s) => mesh(p, geo.sphere, c, pos, s);
export const box = (p, c, pos, s) => mesh(p, geo.box, c, pos, s);
export const cylinder = (p, c, pos, s) => mesh(p, geo.cylinder, c, pos, s);
export function group(parent, x = 0, y = 0, z = 0, rotation = 0) { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rotation; parent.add(g); return g; }

// Builds a single vertex-colored geometry out of coloured primitive parts.
export function parts(list) {
  const geos = [];
  const color = new THREE.Color();
  for (const part of list) {
    const g = (part.geo || geo.sphere).clone();
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(...(part.rot || [0, 0, 0])));
    const s = part.scale || [1, 1, 1];
    m.compose(new THREE.Vector3(...(part.pos || [0, 0, 0])), q, new THREE.Vector3(...(Array.isArray(s) ? s : [s, s, s])));
    g.applyMatrix4(m);
    color.set(part.color);
    const count = g.attributes.position.count;
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) { colors[i * 3] = color.r; colors[i * 3 + 1] = color.g; colors[i * 3 + 2] = color.b; }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(name)) g.deleteAttribute(name);
    geos.push(g);
  }
  const merged = mergeGeometries(geos, false);
  for (const g of geos) g.dispose();
  return merged;
}
export function partMesh(parent, list, options = {}) {
  const m = new THREE.Mesh(parts(list), options.emissive ? vertexColorMaterialEmissive : vertexColorMaterial);
  m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}

// Merge every static mesh under a group by material, keeping shadows.
export function bakeStatic(root) {
  root.updateMatrixWorld(true);
  const buckets = new Map();
  const removals = [];
  root.traverse(node => {
    if (!node.isMesh || node.userData.dynamic) return;
    const g = node.geometry.clone().applyMatrix4(node.matrixWorld);
    for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(name)) g.deleteAttribute(name);
    const key = node.material.uuid + (g.attributes.color ? 'c' : '') + (g.attributes.uv ? 'u' : '');
    if (!buckets.has(key)) buckets.set(key, { material: node.material, geos: [] });
    buckets.get(key).geos.push(g);
    removals.push(node);
  });
  for (const node of removals) node.parent.remove(node);
  const baked = new THREE.Group();
  for (const { material: mat, geos } of buckets.values()) {
    const hasColor = geos.every(g => g.attributes.color), hasUv = geos.every(g => g.attributes.uv);
    for (const g of geos) { if (!hasColor) g.deleteAttribute('color'); if (!hasUv) g.deleteAttribute('uv'); }
    const m = new THREE.Mesh(mergeGeometries(geos, false), mat);
    m.castShadow = true; m.receiveShadow = true; baked.add(m);
  }
  root.add(baked);
  return baked;
}

// Hand-painted canvas textures.
function canvas(size) { const c = document.createElement('canvas'); c.width = c.height = size; return [c, c.getContext('2d')]; }
function finish(c, repeat = 1) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); t.anisotropy = 4; return t; }
function strokes(ctx, size, count, light, dark, lenMin, lenMax) {
  for (let i = 0; i < count; i++) {
    ctx.strokeStyle = i % 2 ? light : dark; ctx.lineWidth = rand(0.6, 2.4); ctx.beginPath();
    const x = rand(0, size), y = rand(0, size); ctx.moveTo(x, y); ctx.lineTo(x + rand(lenMin, lenMax), y + rand(-2, 2)); ctx.stroke();
  }
}
export function woodTexture(base = '#c98a4b', repeat = 3) {
  const [c, ctx] = canvas(256); ctx.fillStyle = base; ctx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += rand(18, 34)) { ctx.fillStyle = `rgba(90,50,20,${rand(0.08, 0.2)})`; ctx.fillRect(0, y, 256, rand(1.5, 4)); }
  strokes(ctx, 256, 260, 'rgba(255,235,200,.12)', 'rgba(90,50,20,.12)', 20, 90);
  for (let i = 0; i < 6; i++) { ctx.strokeStyle = 'rgba(90,50,20,.18)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(rand(0, 256), rand(0, 256), rand(6, 16), rand(3, 7), 0, 0, TAU); ctx.stroke(); }
  return finish(c, repeat);
}
export function bambooTexture(repeat = 6) {
  const [c, ctx] = canvas(256); ctx.fillStyle = palette.bamboo; ctx.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x += 32) {
    ctx.fillStyle = `rgba(255,240,200,${rand(0.08, 0.18)})`; ctx.fillRect(x + 4, 0, 10, 256);
    ctx.fillStyle = 'rgba(100,60,25,.35)'; ctx.fillRect(x, 0, 3, 256);
    ctx.fillStyle = 'rgba(100,60,25,.18)'; ctx.fillRect(x + 28, 0, 2, 256);
  }
  for (let y = 40; y < 256; y += 88) { ctx.fillStyle = 'rgba(100,60,25,.25)'; ctx.fillRect(0, y, 256, 5); ctx.fillStyle = 'rgba(255,240,200,.25)'; ctx.fillRect(0, y + 5, 256, 2); }
  strokes(ctx, 256, 120, 'rgba(255,240,200,.1)', 'rgba(100,60,25,.1)', 4, 14);
  return finish(c, repeat);
}
export function weaveTexture(base = '#e8cf9c', repeat = 10) {
  const [c, ctx] = canvas(128); ctx.fillStyle = base; ctx.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 16) for (let x = 0; x < 128; x += 16) {
    const odd = ((x + y) / 16) % 2; ctx.fillStyle = odd ? 'rgba(120,80,30,.22)' : 'rgba(255,245,215,.25)'; ctx.fillRect(x + 1, y + 1, 14, 14);
    ctx.fillStyle = 'rgba(120,80,30,.3)'; if (odd) ctx.fillRect(x + 1, y + 7, 14, 1.5); else ctx.fillRect(x + 7, y + 1, 1.5, 14);
  }
  return finish(c, repeat);
}
// Arena floor: steamer mat tiles, four team sectors, dashed borders.
export function arenaTexture(teams, arenaRadius, centerRadius) {
  const size = 2048; const [c, ctx] = canvas(size); const cx = size / 2, px = size / 2 / (arenaRadius + 0.6);
  ctx.fillStyle = '#e9cf9c'; ctx.fillRect(0, 0, size, size);
  for (let y = 0; y < size; y += 20) for (let x = 0; x < size; x += 20) { ctx.fillStyle = ((x + y) / 20) % 2 ? 'rgba(130,85,35,.16)' : 'rgba(255,245,215,.2)'; ctx.fillRect(x + 1, y + 1, 18, 18); }
  const R = arenaRadius * px, r0 = centerRadius * px;
  for (const team of teams) {
    const [dx, dz] = team.dir;
    const a0 = Math.atan2(dz, dx) - Math.PI / 4, a1 = a0 + Math.PI / 2;
    ctx.save(); ctx.beginPath(); ctx.moveTo(cx + Math.cos(a0) * r0, cx + Math.sin(a0) * r0); ctx.arc(cx, cx, R * 0.93, a0, a1); ctx.arc(cx, cx, r0, a1, a0, true); ctx.closePath(); ctx.clip();
    ctx.fillStyle = team.color; ctx.globalAlpha = 0.28; ctx.fillRect(0, 0, size, size);
    ctx.globalAlpha = 0.9; ctx.fillStyle = '#fbf0da';
    const tile = 74, gap = 10;
    for (let y = 0; y < size; y += tile) for (let x = 0; x < size; x += tile) { ctx.beginPath(); ctx.roundRect(x + gap / 2, y + gap / 2, tile - gap, tile - gap, 10); ctx.fill(); }
    ctx.globalAlpha = 0.22; ctx.fillStyle = team.color; ctx.fillRect(0, 0, size, size);
    ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.moveTo(cx + Math.cos(a0) * r0, cx + Math.sin(a0) * r0); ctx.arc(cx, cx, R * 0.93, a0, a1); ctx.arc(cx, cx, r0, a1, a0, true); ctx.closePath();
    ctx.setLineDash([26, 18]); ctx.lineWidth = 12; ctx.strokeStyle = '#fffaf0'; ctx.stroke(); ctx.setLineDash([]); ctx.lineWidth = 4; ctx.strokeStyle = team.dark; ctx.globalAlpha = 0.6; ctx.stroke(); ctx.restore();
  }
  ctx.beginPath(); ctx.arc(cx, cx, r0 * 0.96, 0, TAU); ctx.fillStyle = '#f2dcb0'; ctx.fill(); ctx.lineWidth = 8; ctx.strokeStyle = '#a97a44'; ctx.stroke();
  for (let i = 0; i < 1600; i++) { ctx.fillStyle = i % 2 ? 'rgba(255,255,240,.12)' : 'rgba(100,60,20,.08)'; ctx.fillRect(rand(0, size), rand(0, size), rand(2, 6), rand(1, 3)); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
export function softCircleTexture() {
  const [c, ctx] = canvas(64); const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.55, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); return t;
}
export function starTexture() {
  const [c, ctx] = canvas(64); ctx.translate(32, 32); ctx.fillStyle = '#fff'; ctx.beginPath();
  for (let i = 0; i < 10; i++) { const r = i % 2 ? 11 : 28, a = i * Math.PI / 5 - Math.PI / 2; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
  ctx.closePath(); ctx.fill(); return new THREE.CanvasTexture(c);
}
export function textTexture(text, { width = 512, height = 160, font = 'bold 96px "PingFang SC","Microsoft YaHei",sans-serif', color = '#4a2c14', bg = null, stroke = null } = {}) {
  const c = document.createElement('canvas'); c.width = width; c.height = height; const ctx = c.getContext('2d');
  if (bg) { ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect(0, 0, width, height, height / 2); ctx.fill(); }
  ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (stroke) { ctx.lineWidth = height * 0.12; ctx.strokeStyle = stroke; ctx.lineJoin = 'round'; ctx.strokeText(text, width / 2, height / 2 + 2); }
  ctx.fillStyle = color; ctx.fillText(text, width / 2, height / 2 + 2);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// Floating name tag above a unit.
export function nameSprite(name, teamColor, { hero = false } = {}) {
  const text = name.length > 8 ? name.slice(0, 7) + '…' : name;
  const t = textTexture((hero ? '★ ' : '') + text, { width: 512, height: 128, font: 'bold 64px "PingFang SC","Microsoft YaHei",sans-serif', color: '#ffffff', bg: hero ? '#c0392b' : teamColor, stroke: 'rgba(60,30,12,.55)' });
  const mat = new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false });
  const s = new THREE.Sprite(mat); s.scale.set(hero ? 2.6 : 2.1, hero ? 0.65 : 0.52, 1); s.userData.dynamic = true; return s;
}
