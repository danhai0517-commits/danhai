import * as THREE from 'three';
import { softCircleTexture, starTexture, rand, TAU, geo, material } from './art.js';

const MAX = 900;
class PointPool {
  constructor(scene, texture, blending = THREE.NormalBlending) {
    this.count = 0; this.items = [];
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(MAX * 3); this.col = new Float32Array(MAX * 4); this.size = new Float32Array(MAX);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aColor', new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setDrawRange(0, 0);
    const mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: texture }, scale: { value: 1 } }, transparent: true, depthWrite: false, blending,
      vertexShader: `attribute vec4 aColor; attribute float aSize; varying vec4 vColor; uniform float scale;
        void main(){ vColor=aColor; vec4 mv=modelViewMatrix*vec4(position,1.0); gl_PointSize=aSize*scale/-mv.z; gl_Position=projectionMatrix*mv; }`,
      fragmentShader: `uniform sampler2D map; varying vec4 vColor; void main(){ vec4 t=texture2D(map,gl_PointCoord); gl_FragColor=vec4(vColor.rgb,vColor.a*t.a); if(gl_FragColor.a<0.01) discard; }`,
    });
    this.points = new THREE.Points(g, mat); this.points.frustumCulled = false; this.points.renderOrder = 5; scene.add(this.points); this.geometry = g; this.material = mat;
  }
  emit(p) { if (this.items.length >= MAX) this.items.shift(); this.items.push(p); }
  update(dt) {
    const c = new THREE.Color(); let n = 0;
    for (let i = this.items.length - 1; i >= 0; i--) {
      const p = this.items[i]; p.life -= dt; if (p.life <= 0) { this.items.splice(i, 1); continue; }
      p.vx += (p.ax || 0) * dt; p.vy += (p.ay || 0) * dt; p.vz += (p.az || 0) * dt; p.vx *= p.drag ?? 1; p.vz *= p.drag ?? 1;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      const k = p.life / p.max; const alpha = p.fadeIn ? Math.min(1, (1 - k) * 4) * k : k;
      this.pos[n * 3] = p.x; this.pos[n * 3 + 1] = p.y; this.pos[n * 3 + 2] = p.z;
      c.set(p.color); this.col[n * 4] = c.r; this.col[n * 4 + 1] = c.g; this.col[n * 4 + 2] = c.b; this.col[n * 4 + 3] = alpha * (p.alpha ?? 1);
      this.size[n] = p.size * (p.grow ? 1 + (1 - k) * p.grow : 1); n++;
    }
    this.geometry.attributes.position.needsUpdate = this.geometry.attributes.aColor.needsUpdate = this.geometry.attributes.aSize.needsUpdate = true;
    this.geometry.setDrawRange(0, n);
  }
}

export class Effects {
  constructor(scene, stageHeight) {
    this.soft = new PointPool(scene, softCircleTexture());
    this.stars = new PointPool(scene, starTexture(), THREE.AdditiveBlending);
    this.scale = stageHeight;
    const confettiGeo = new THREE.BoxGeometry(0.22, 0.05, 0.14);
    this.confetti = new THREE.InstancedMesh(confettiGeo, new THREE.MeshToonMaterial({ vertexColors: false, color: '#ffffff', gradientMap: material('#fff').gradientMap }), 300);
    this.confetti.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.confetti.count = 0; this.confetti.frustumCulled = false; scene.add(this.confetti);
    this.confettiItems = []; this.dummy = new THREE.Object3D();
  }
  setPixelScale(h) { this.soft.material.uniforms.scale.value = h * 0.9; this.stars.material.uniforms.scale.value = h * 0.9; }
  steam(x, y, z, amount = 1, spread = 0.6) {
    for (let i = 0; i < amount; i++) this.soft.emit({ x: x + rand(-spread, spread), y, z: z + rand(-spread, spread), vx: rand(-0.2, 0.2), vy: rand(0.9, 1.6), vz: rand(-0.2, 0.2), ax: rand(-0.1, 0.1), life: rand(1.6, 2.6), max: 2.4, size: rand(0.7, 1.3), grow: 1.6, color: '#ffffff', alpha: 0.5, fadeIn: true });
  }
  burst(x, y, z, color = '#ffd35a', count = 12, speed = 3) {
    for (let i = 0; i < count; i++) { const a = rand(0, TAU), s = rand(speed * 0.4, speed); this.stars.emit({ x, y, z, vx: Math.cos(a) * s, vy: rand(1, speed * 1.2), vz: Math.sin(a) * s, ay: -9, life: rand(0.5, 0.9), max: 0.9, size: rand(0.3, 0.6), color }); }
  }
  sparkle(x, y, z, color = '#fff6c0', count = 6) {
    for (let i = 0; i < count; i++) this.stars.emit({ x: x + rand(-0.4, 0.4), y: y + rand(0, 0.6), z: z + rand(-0.4, 0.4), vx: 0, vy: rand(0.6, 1.4), vz: 0, life: rand(0.5, 1), max: 1, size: rand(0.2, 0.45), color });
  }
  puff(x, y, z, color = '#fff', count = 8) {
    for (let i = 0; i < count; i++) { const a = rand(0, TAU), s = rand(0.6, 2); this.soft.emit({ x, y: y + 0.2, z, vx: Math.cos(a) * s, vy: rand(0.3, 1.2), vz: Math.sin(a) * s, drag: 0.94, life: rand(0.4, 0.8), max: 0.8, size: rand(0.5, 0.9), grow: 1.2, color, alpha: 0.8 }); }
  }
  trail(x, y, z, color) { this.soft.emit({ x: x + rand(-0.15, 0.15), y: y + 0.2, z: z + rand(-0.15, 0.15), vx: 0, vy: 0.4, vz: 0, life: 0.35, max: 0.35, size: rand(0.5, 0.8), color, alpha: 0.6 }); }
  fireworks(x, y, z) {
    const colors = ['#ff6b57', '#ffd35a', '#4fa6ff', '#6fd36f', '#b57bff', '#ffffff'];
    for (let i = 0; i < 60; i++) { const a = rand(0, TAU), b = rand(-1, 1), s = rand(4, 9); const c = Math.sqrt(1 - b * b); this.stars.emit({ x, y, z, vx: Math.cos(a) * c * s, vy: b * s + 2, vz: Math.sin(a) * c * s, ay: -4, drag: 0.985, life: rand(1, 1.8), max: 1.8, size: rand(0.3, 0.7), color: colors[i % colors.length] }); }
    this.soft.emit({ x, y, z, vx: 0, vy: 0, vz: 0, life: 0.4, max: 0.4, size: 5, grow: 3, color: '#fff2c0', alpha: 0.7 });
  }
  confettiRain(count = 160, radius = 9) {
    const colors = [0xff6b57, 0xffd35a, 0x4fa6ff, 0x6fd36f, 0xb57bff, 0xffffff];
    for (let i = 0; i < count; i++) { const a = rand(0, TAU), r = Math.sqrt(rand(0, 1)) * radius; this.confettiItems.push({ x: Math.cos(a) * r, y: rand(10, 18), z: Math.sin(a) * r, vx: rand(-0.6, 0.6), vy: rand(-2.5, -1.5), vz: rand(-0.6, 0.6), rx: rand(0, TAU), ry: rand(0, TAU), sx: rand(2, 6), sy: rand(2, 6), color: colors[i % colors.length], life: 9 }); }
  }
  update(dt, t) {
    this.soft.update(dt); this.stars.update(dt);
    const c = new THREE.Color(); let n = 0;
    for (let i = this.confettiItems.length - 1; i >= 0; i--) {
      const p = this.confettiItems[i]; p.life -= dt; p.y += p.vy * dt; p.x += (p.vx + Math.sin(t * 2 + p.ry) * 0.8) * dt; p.z += p.vz * dt; p.rx += p.sx * dt; p.ry += p.sy * dt;
      if (p.life <= 0 || p.y < 0.05 || n >= 300) { if (p.y < 0.05 && p.life > 0) { p.y = 0.05; p.vy = 0; p.vx = p.vz = 0; p.sx = p.sy = 0; } else { this.confettiItems.splice(i, 1); continue; } }
      this.dummy.position.set(p.x, p.y, p.z); this.dummy.rotation.set(p.rx, p.ry, 0); this.dummy.updateMatrix(); this.confetti.setMatrixAt(n, this.dummy.matrix); c.setHex(p.color); this.confetti.setColorAt(n, c); n++;
    }
    this.confetti.count = n; if (n) { this.confetti.instanceMatrix.needsUpdate = true; if (this.confetti.instanceColor) this.confetti.instanceColor.needsUpdate = true; }
  }
}
export { geo };
