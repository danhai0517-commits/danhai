import * as THREE from 'three';
import { TEAMS, TEAM_BY_ID, BUN_TYPES, LEVELS, GIFTS, ARENA_RADIUS, CENTER_RADIUS, BASKET_RADIUS, ROUND_SECONDS, RESULT_SECONDS, MAX_UNITS, MAX_BUNS, LIKES_PER_BUN } from './config.js';
import { createUnitMesh, setUnitLevel, animateUnit, createBunMesh, createMouseMesh, animateMouse, animateChef, updateBasketPile } from './actors.js';
import { rand, clamp, lerp, TAU } from './art.js';

const BASE_SPEED = 3.3;
const tmp = new THREE.Vector3();

export class Game {
  constructor({ scene, world, effects, ui, audio }) {
    Object.assign(this, { scene, world, effects, ui, audio });
    this.round = 1; this.time = 0; this.clock = 0; this.phase = 'play'; this.resultTimer = 0;
    this.teams = TEAMS.map(t => ({ ...t, score: 0, delivered: 0, buffUntil: 0, dashUntil: 0, members: 0 }));
    this.teamById = Object.fromEntries(this.teams.map(t => [t.id, t]));
    this.viewers = new Map(); this.units = []; this.buns = []; this.mice = [];
    this.spawnTimer = 3; this.lidOpenUntil = 0; this.releaseQueue = 0; this.mouseTimer = 24; this.likeBucket = 0;
    this.bunsReleased = 0; this.bunsDelivered = 0; this.heroCount = 0; this.likes = 0;
    this.history = { rounds: [] };
    this.estimateTotal();
  }
  get difficulty() { return 1 + clamp(this.time / ROUND_SECONDS, 0, 1); }
  get multiplier() { return this.difficulty; }
  get remaining() { return Math.max(0, ROUND_SECONDS - this.time); }
  get totalScore() { return this.teams.reduce((s, t) => s + t.score, 0); }
  spawnInterval() { return lerp(6.5, 3.6, this.difficulty - 1); }
  burstSize() { return clamp(Math.round(4 + this.units.length * 0.4), 4, 26); }
  estimateTotal() { const remainingBursts = this.remaining / this.spawnInterval(); this.bunTotal = Math.max(this.bunsReleased + 1, Math.round(this.bunsReleased + remainingBursts * this.burstSize())); }
  teamHome(team, spread = 2.4) { const k = 5.6 / Math.SQRT2; return new THREE.Vector3(team.dir[0] * k + rand(-spread, spread), 0, team.dir[1] * k + rand(-spread, spread)); }
  basketPos(team) { const k = BASKET_RADIUS / Math.SQRT2; return new THREE.Vector3(team.dir[0] * k, 0, team.dir[1] * k); }
  randomTeamPoint(team) { const a = Math.atan2(team.dir[1], team.dir[0]) + rand(-0.6, 0.6); const r = rand(CENTER_RADIUS + 1, ARENA_RADIUS - 2.5); return new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r); }
  leastPopulatedTeam() { return [...this.teams].sort((a, b) => a.members - b.members || rand(-1, 1))[0]; }

  // ---------- Viewer actions ----------
  join(user, teamId) {
    const team = this.teamById[teamId]; if (!team) return { ok: false, reason: 'no-team' };
    let viewer = this.viewers.get(user);
    if (viewer) { if (viewer.unit) { viewer.unit.danceUntil = this.clock + 1.2; } return { ok: false, reason: viewer.teamId === teamId ? 'already' : 'locked', viewer }; }
    if (this.units.length >= MAX_UNITS) return { ok: false, reason: 'full' };
    viewer = { name: user, teamId, score: 0, roundScore: 0, level: 1, likes: 0, unit: null, joined: this.clock };
    this.viewers.set(user, viewer);
    const unit = this.spawnUnit(team, { viewer, name: user });
    viewer.unit = unit; team.members++;
    this.ui.event({ icon: team.id, who: user, what: `加入 ${team.name}`, team });
    this.audio.play('join');
    return { ok: true, viewer, team };
  }
  spawnUnit(team, { viewer = null, name = '', hero = false, permanent = true } = {}) {
    const mesh = createUnitMesh(team, { hero, name });
    const spawnAt = this.randomTeamPoint(team);
    const unit = { team, viewer, hero, permanent, mesh, pos: spawnAt.clone(), vel: new THREE.Vector3(), facing: 0, target: null, carrying: [], state: 'idle', idleTarget: this.teamHome(team), idleTimer: rand(0.5, 2), dashUntil: 0, danceUntil: this.clock + 1.4, whackCooldown: 0, spawnScale: 0, name };
    mesh.position.copy(unit.pos); mesh.scale.setScalar(0.01);
    this.scene.add(mesh); this.units.push(unit);
    if (hero) { this.heroCount++; setUnitLevel(mesh, 2); }
    this.effects.puff(spawnAt.x, 0.2, spawnAt.z, team.light, 10); this.effects.sparkle(spawnAt.x, 0.5, spawnAt.z, '#fff6c0', 8);
    return unit;
  }
  dash(user) {
    const v = this.viewers.get(user); if (!v || !v.unit) return false;
    v.unit.dashUntil = this.clock + 2.5; this.audio.play('dash'); this.ui.float(v.unit.pos, '冲!', 'red'); return true;
  }
  cheer(user) {
    const v = this.viewers.get(user); if (!v) return false;
    const team = this.teamById[v.teamId]; team.buffUntil = Math.max(team.buffUntil, this.clock) + 3; team.buffUntil = Math.min(team.buffUntil, this.clock + 12);
    if (v.unit) this.effects.sparkle(v.unit.pos.x, 1.2, v.unit.pos.z, team.light, 6);
    return true;
  }
  dance(user) { const v = this.viewers.get(user); if (!v || !v.unit) return false; v.unit.danceUntil = this.clock + 2.5; return true; }
  like(user, count = 1) {
    this.likes += count; this.likeBucket += count; const v = this.viewers.get(user); if (v) v.likes += count;
    let dropped = 0;
    while (this.likeBucket >= LIKES_PER_BUN && dropped < 6) { this.likeBucket -= LIKES_PER_BUN; this.releaseQueue++; dropped++; }
    if (dropped) { this.lidOpenUntil = Math.max(this.lidOpenUntil, this.clock + 1.2); this.ui.event({ icon: '👍', who: user || '观众', what: `点赞掉落 ${dropped} 个包子`, small: true }); }
    return dropped;
  }
  gift(user, giftName, count = 1) {
    const def = GIFTS[giftName]; if (!def) return null;
    count = clamp(Math.floor(count) || 1, 1, 20);
    let viewer = this.viewers.get(user);
    if (!viewer) { const team = this.leastPopulatedTeam(); this.join(user, team.id); viewer = this.viewers.get(user); }
    if (!viewer) return null;
    const team = this.teamById[viewer.teamId];
    const n = Math.min(count, 5);
    switch (def.effect) {
      case 'cheer': team.buffUntil = Math.min(this.clock + 20, Math.max(team.buffUntil, this.clock) + 6 * count); break;
      case 'bunRain': for (let i = 0; i < 6 * n; i++) this.dropBun(this.randomTeamPoint(team), this.pickBunType(['plain', 'meat']), 9 + rand(0, 5)); break;
      case 'teamDash': for (const u of this.units) if (u.team === team) u.dashUntil = this.clock + 4 * n; team.dashUntil = this.clock + 4 * n; break;
      case 'hero': for (let i = 0; i < n; i++) this.spawnUnit(team, { name: user, hero: true, permanent: false }); this.audio.play('fanfare'); break;
      case 'goldRain': for (let i = 0; i < 3 * n; i++) this.dropBun(this.randomTeamPoint(team), 'gold', 10 + rand(0, 4)); break;
      case 'heroForever':
        for (let i = 0; i < n; i++) this.spawnUnit(team, { name: user, hero: true, permanent: true });
        for (const v of this.viewers.values()) if (v.teamId === team.id) this.addMerit(v, 5);
        this.audio.play('fanfare'); break;
      case 'superBun': for (let i = 0; i < n; i++) this.dropBun(this.randomTeamPoint(team), 'super', 14); this.effects.fireworks(0, 9, -2); this.effects.fireworks(-5, 11, 1); this.effects.fireworks(6, 10, 2); this.audio.play('fanfare'); break;
      default: break;
    }
    this.audio.play('gift');
    this.ui.event({ icon: def.icon, who: user, what: def.label, combo: count > 1 ? count : 0, big: def.tier >= 3, team });
    return def;
  }
  addMerit(viewer, amount) {
    viewer.score += amount; viewer.roundScore += amount;
    const level = LEVELS.filter(l => viewer.score >= l.need).length;
    if (level !== viewer.level) {
      viewer.level = level;
      if (viewer.unit) { setUnitLevel(viewer.unit.mesh, level); this.effects.burst(viewer.unit.pos.x, 1, viewer.unit.pos.z, '#ffd35a', 18, 3.5); this.ui.float(viewer.unit.pos, `升级 L${level}!`, 'gold'); this.ui.event({ icon: '⬆️', who: viewer.name, what: `升级到 L${level}`, small: true }); this.audio.play('gold'); }
    }
  }

  // ---------- Buns ----------
  pickBunType(allowed = null) {
    const entries = Object.entries(BUN_TYPES).filter(([k, v]) => v.weight > 0 && (!allowed || allowed.includes(k)));
    const total = entries.reduce((s, [, v]) => s + v.weight, 0); let r = rand(0, total);
    for (const [k, v] of entries) { r -= v.weight; if (r <= 0) return k; }
    return 'plain';
  }
  addBun(type, pos, vel) {
    if (this.buns.length >= MAX_BUNS) { const old = this.buns.find(b => !b.claimedBy && b.grounded); if (old) this.removeBun(old); else return null; }
    const def = BUN_TYPES[type]; const mesh = createBunMesh(type); mesh.position.copy(pos); mesh.rotation.y = rand(0, TAU);
    const bun = { type, def, mesh, pos: pos.clone(), vel: vel.clone(), grounded: false, claimedBy: null, age: 0, bounces: 0, spin: rand(-3, 3) };
    this.scene.add(mesh); this.buns.push(bun); return bun;
  }
  releaseBun() {
    const a = rand(0, TAU), speed = rand(3.2, 7.2);
    const bun = this.addBun(this.pickBunType(), new THREE.Vector3(Math.cos(a) * 0.4, 1.4, Math.sin(a) * 0.4), new THREE.Vector3(Math.cos(a) * speed, rand(6, 9.5), Math.sin(a) * speed));
    if (bun) { this.bunsReleased++; this.effects.puff(bun.pos.x, 1.2, bun.pos.z, '#ffffff', 2); }
  }
  dropBun(point, type, height = 10) { const b = this.addBun(type, new THREE.Vector3(point.x, height, point.z), new THREE.Vector3(rand(-0.4, 0.4), 0, rand(-0.4, 0.4))); if (b) this.bunsReleased++; return b; }
  removeBun(bun) { this.scene.remove(bun.mesh); const i = this.buns.indexOf(bun); if (i >= 0) this.buns.splice(i, 1); if (bun.claimedBy) { bun.claimedBy.target = null; bun.claimedBy = null; } }
  updateBuns(dt) {
    for (let i = this.buns.length - 1; i >= 0; i--) {
      const b = this.buns[i]; b.age += dt;
      if (!b.grounded) {
        b.vel.y -= 16 * dt; b.pos.addScaledVector(b.vel, dt);
        const r = Math.hypot(b.pos.x, b.pos.z); const limit = ARENA_RADIUS - 0.8;
        if (r > limit) { const nx = b.pos.x / r, nz = b.pos.z / r; b.pos.x = nx * limit; b.pos.z = nz * limit; const dot = b.vel.x * nx + b.vel.z * nz; b.vel.x -= 1.6 * dot * nx; b.vel.z -= 1.6 * dot * nz; }
        if (b.pos.y <= 0) {
          b.pos.y = 0; b.bounces++;
          if (b.vel.y < -3 && b.bounces < 3) { b.vel.y *= -0.38; b.vel.x *= 0.6; b.vel.z *= 0.6; this.effects.puff(b.pos.x, 0, b.pos.z, '#fff', 2); }
          else { b.grounded = true; b.vel.set(0, 0, 0); if (b.type === 'gold' || b.type === 'super') this.effects.sparkle(b.pos.x, 0.3, b.pos.z, '#ffd35a', 8); }
        }
        b.mesh.position.copy(b.pos); b.mesh.rotation.y += b.spin * dt; b.mesh.rotation.x = b.grounded ? 0 : Math.sin(b.age * 6) * 0.3;
      } else {
        b.mesh.position.y = (b.type === 'gold' || b.type === 'super') ? Math.abs(Math.sin(b.age * 3)) * 0.12 : 0; b.mesh.rotation.y += dt * 0.6;
        if (b.type === 'gold' && Math.random() < dt * 2) this.effects.sparkle(b.pos.x, 0.3, b.pos.z, '#ffd35a', 1);
        if (b.age > 70 && !b.claimedBy) this.removeBun(b);
      }
    }
  }

  // ---------- Units ----------
  unitSpeed(u) {
    const level = u.viewer ? u.viewer.level : 2; const lv = LEVELS[Math.min(level, LEVELS.length) - 1];
    let s = BASE_SPEED * lv.speed * (u.hero ? 1.25 : 1);
    if (u.dashUntil > this.clock) s *= 1.9; if (u.team.buffUntil > this.clock) s *= 1.22;
    for (const b of u.carrying) s *= b.def.slow;
    return s;
  }
  capacity(u) { if (u.hero) return 3; const level = u.viewer ? u.viewer.level : 1; return LEVELS[Math.min(level, LEVELS.length) - 1].capacity; }
  nearestFreeBun(u, maxDist = Infinity) {
    let best = null, bestD = maxDist;
    for (const b of this.buns) {
      if (b.claimedBy || (!b.grounded && (b.pos.y > 2.5 || b.vel.y > 0))) continue;
      if (b.type === 'super' && !u.hero && (u.viewer?.level || 1) < 3) continue;
      const d = u.pos.distanceTo(b.pos) / (b.def.value >= 3 ? 1.6 : 1); if (d < bestD) { bestD = d; best = b; }
    }
    return best;
  }
  updateUnits(dt) {
    const now = this.clock;
    for (const u of this.units) {
      u.spawnScale = Math.min(1, u.spawnScale + dt * 2.5);
      const dashing = u.dashUntil > now; const speed = this.unitSpeed(u);
      let dest = null;
      if (u.danceUntil > now && u.carrying.length === 0 && u.state === 'idle') { dest = null; }
      else if (u.carrying.length >= this.capacity(u)) { u.state = 'return'; dest = this.basketPos(u.team); }
      else {
        if (u.target && (u.target.claimedBy !== u || !this.buns.includes(u.target))) u.target = null;
        if (!u.target) { const b = this.nearestFreeBun(u, u.carrying.length ? 7 : Infinity); if (b) { b.claimedBy = u; u.target = b; } }
        if (u.target) { u.state = 'seek'; dest = u.target.pos; }
        else if (u.carrying.length) { u.state = 'return'; dest = this.basketPos(u.team); }
        else {
          u.state = 'idle'; u.idleTimer -= dt;
          if (u.idleTimer <= 0) { u.idleTimer = rand(1.5, 4); u.idleTarget = this.teamHome(u.team, 2.6); }
          dest = u.pos.distanceTo(u.idleTarget) > 0.4 ? u.idleTarget : null;
        }
      }
      // Heroes and nearby units go for mice.
      let mouseTarget = null;
      if (this.mice.length && u.whackCooldown <= now) {
        let bestD = u.hero ? 7 : 2.2;
        for (const m of this.mice) { if (m.state === 'stunned') continue; const d = u.pos.distanceTo(m.pos); if (d < bestD) { bestD = d; mouseTarget = m; } }
        if (mouseTarget && (u.hero || !u.carrying.length)) dest = mouseTarget.pos;
      }
      // Steering.
      const desired = tmp.set(0, 0, 0);
      if (dest) { desired.subVectors(dest, u.pos); desired.y = 0; const d = desired.length(); if (d > 0.001) desired.multiplyScalar((u.state === 'idle' ? 0.55 : 1) * speed / d); }
      // Separation.
      for (const o of this.units) { if (o === u) continue; const dx = u.pos.x - o.pos.x, dz = u.pos.z - o.pos.z; const d2 = dx * dx + dz * dz; if (d2 < 0.64 && d2 > 0.0001) { const d = Math.sqrt(d2); const f = (0.8 - d) / d * 4; desired.x += dx * f; desired.z += dz * f; } }
      // Keep off the chef and inside the arena.
      const cdx = u.pos.x, cdz = u.pos.z + 3.6, cd = Math.hypot(cdx, cdz); if (cd < 1.4) { desired.x += cdx / cd * 4; desired.z += cdz / cd * 4; }
      u.vel.lerp(desired, 1 - Math.exp(-dt * 9));
      u.pos.addScaledVector(u.vel, dt);
      const r = Math.hypot(u.pos.x, u.pos.z); const limit = ARENA_RADIUS - 0.7; if (r > limit) { u.pos.x *= limit / r; u.pos.z *= limit / r; }
      const moving = u.vel.lengthSq() > 0.15;
      if (moving) { const targetFacing = Math.atan2(u.vel.x, u.vel.z); let diff = targetFacing - u.facing; diff = Math.atan2(Math.sin(diff), Math.cos(diff)); u.facing += diff * Math.min(1, dt * 12); }
      // Interactions.
      if (u.target && u.pos.distanceTo(u.target.pos) < 0.7 * (u.hero ? 1.4 : 1) && (u.target.grounded || u.target.pos.y < 1.2)) this.grab(u, u.target);
      if (u.state === 'return' && u.pos.distanceTo(this.basketPos(u.team)) < 1.5) this.deposit(u);
      if (mouseTarget && u.pos.distanceTo(mouseTarget.pos) < 1.1) this.whack(u, mouseTarget);
      if (dashing && moving) this.effects.trail(u.pos.x, 0, u.pos.z, u.team.light);
      // Presentation.
      u.mesh.position.x = u.pos.x; u.mesh.position.z = u.pos.z; u.mesh.rotation.y = u.facing;
      animateUnit(u.mesh, now, moving, dashing, u.danceUntil > now);
      const base = u.mesh.userData.hero ? 1.45 : LEVELS[Math.min(u.viewer?.level || 1, LEVELS.length) - 1].scale;
      const pop = u.spawnScale < 1 ? 1 + Math.sin(u.spawnScale * Math.PI) * 0.3 : 1;
      u.mesh.scale.setScalar(base * u.spawnScale * pop);
    }
  }
  grab(u, bun) {
    if (!this.buns.includes(bun)) { u.target = null; return; }
    this.scene.remove(bun.mesh); this.buns.splice(this.buns.indexOf(bun), 1); bun.claimedBy = null; u.target = null;
    u.carrying.push(bun);
    const carry = u.mesh.userData.carry; bun.mesh.position.set(0, (u.carrying.length - 1) * 0.42 * bun.def.scale, 0); bun.mesh.rotation.set(0, 0, 0); bun.mesh.scale.setScalar(bun.type === 'super' ? 0.6 : 0.9); carry.add(bun.mesh);
    if (bun.type === 'spicy') { u.dashUntil = this.clock + 3; this.effects.burst(u.pos.x, 1, u.pos.z, '#ff6b3d', 10, 2.5); this.ui.float(u.pos, '辣!加速', 'red'); }
    if (bun.type === 'gold') { this.ui.float(u.pos, '金包子!', 'gold'); this.audio.play('gold'); }
    if (bun.type === 'super') { this.ui.float(u.pos, '超级大包子!!', 'gold big'); }
    this.effects.sparkle(u.pos.x, 0.8, u.pos.z, '#fff6c0', 4); this.audio.play('grab');
  }
  deposit(u) {
    if (!u.carrying.length) { u.state = 'idle'; return; }
    const team = u.team; const basket = this.world.baskets.find(b => b.team.id === team.id);
    let points = 0, merit = 0;
    for (const b of u.carrying) { points += Math.round(b.def.value * this.multiplier); merit += b.def.value >= 10 ? 3 : b.def.value >= 3 ? 2 : 1; u.mesh.userData.carry.remove(b.mesh); }
    const special = u.carrying.some(b => b.type === 'gold' || b.type === 'super');
    u.carrying = []; u.state = 'idle';
    team.score += points; team.delivered++; this.bunsDelivered++;
    if (u.viewer) this.addMerit(u.viewer, merit);
    const bp = this.basketPos(team); this.ui.float(bp, `+${points}`, special ? 'gold big' : ''); this.effects.sparkle(bp.x, 1.2, bp.z, team.light, special ? 14 : 5);
    if (special) this.effects.burst(bp.x, 1.2, bp.z, '#ffd35a', 16, 3);
    updateBasketPile(basket, team.delivered, createBunMesh);
    this.audio.play(special ? 'gold' : 'deposit');
  }

  // ---------- Mice ----------
  spawnMouseWave() {
    const n = clamp(Math.round(this.difficulty * 1.6 + this.units.length / 40), 1, 6);
    const richest = [...this.teams].sort((a, b) => b.score - a.score)[0]; if (richest.score <= 0) return;
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU); const pos = new THREE.Vector3(Math.cos(a) * (ARENA_RADIUS - 0.4), 0, Math.sin(a) * (ARENA_RADIUS - 0.4));
      const target = this.teams.filter(t => t.score > 0)[Math.floor(rand(0, this.teams.filter(t => t.score > 0).length))] || richest;
      const mesh = createMouseMesh(); mesh.position.copy(pos); this.scene.add(mesh);
      this.mice.push({ mesh, pos, vel: new THREE.Vector3(), target, state: 'approach', stolen: 0, facing: 0, exitAngle: a + Math.PI + rand(-0.8, 0.8), life: 0 });
    }
    this.ui.event({ icon: '🐭', who: '馋嘴老鼠', what: `${n} 只老鼠来偷包子了！`, small: true }); this.audio.play('squeak');
  }
  updateMice(dt) {
    for (let i = this.mice.length - 1; i >= 0; i--) {
      const m = this.mice[i]; m.life += dt;
      let dest;
      if (m.state === 'approach') { dest = this.basketPos(m.target); if (m.pos.distanceTo(dest) < 1.3) { const steal = Math.min(m.target.score, 6); m.target.score -= steal; m.stolen = steal; m.state = 'flee'; this.ui.float(dest, `-${steal} 被偷!`, 'red'); this.ui.event({ icon: '🐭', who: '老鼠', what: `偷走了 ${m.target.name} ${steal} 分`, small: true }); this.audio.play('squeak'); this.effects.puff(dest.x, 0.4, dest.z, '#bbb', 6); } }
      else { dest = new THREE.Vector3(Math.cos(m.exitAngle) * (ARENA_RADIUS + 2), 0, Math.sin(m.exitAngle) * (ARENA_RADIUS + 2)); if (Math.hypot(m.pos.x, m.pos.z) > ARENA_RADIUS + 0.6 || m.life > 40) { this.scene.remove(m.mesh); this.mice.splice(i, 1); continue; } }
      const speed = m.state === 'flee' ? 4.6 : 3.4 + this.difficulty * 0.5;
      tmp.subVectors(dest, m.pos); tmp.y = 0; const d = tmp.length(); if (d > 0.01) tmp.multiplyScalar(speed / d);
      tmp.x += Math.sin(m.life * 7) * 1.2; m.vel.lerp(tmp, 1 - Math.exp(-dt * 6)); m.pos.addScaledVector(m.vel, dt);
      m.facing = Math.atan2(m.vel.x, m.vel.z); m.mesh.position.x = m.pos.x; m.mesh.position.z = m.pos.z; m.mesh.rotation.y = m.facing; animateMouse(m.mesh, this.clock);
    }
  }
  whack(u, m) {
    const i = this.mice.indexOf(m); if (i < 0) return;
    this.mice.splice(i, 1); this.scene.remove(m.mesh); u.whackCooldown = this.clock + 0.6;
    if (m.stolen) { m.target.score += m.stolen; this.ui.float(m.pos, `夺回 ${m.stolen} 分`, 'gold'); }
    this.effects.burst(m.pos.x, 0.8, m.pos.z, '#ffd35a', 14, 3); this.effects.puff(m.pos.x, 0.3, m.pos.z, '#ddd', 6);
    this.ui.float(u.pos, '揍!', 'red'); if (u.viewer) this.addMerit(u.viewer, 2); this.audio.play('whack');
  }

  // ---------- Round flow ----------
  update(dt) {
    dt = Math.min(dt, 0.05); this.clock += dt;
    if (this.phase === 'play') {
      this.time += dt;
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) { this.spawnTimer = this.spawnInterval(); this.releaseQueue += this.burstSize(); this.lidOpenUntil = this.clock + 1.6 + this.releaseQueue * 0.05; this.audio.play('lid'); this.estimateTotal(); }
      if (this.releaseQueue > 0) { this.releaseAccum = (this.releaseAccum || 0) + dt * 18; while (this.releaseAccum >= 1 && this.releaseQueue > 0) { this.releaseAccum--; this.releaseQueue--; this.releaseBun(); } }
      this.mouseTimer -= dt; if (this.mouseTimer <= 0) { this.mouseTimer = lerp(30, 16, this.difficulty - 1); this.spawnMouseWave(); }
      if (this.time >= ROUND_SECONDS) this.endRound();
    } else { this.resultTimer -= dt; this.ui.resultCountdown(Math.ceil(this.resultTimer)); if (this.resultTimer <= 0) this.startRound(); }
    const lidOpen = this.lidOpenUntil > this.clock;
    animateChef(this.world.chef, this.clock, lidOpen);
    if (lidOpen) this.effects.steam(0, 1.2, 0, 2, 1.2); else if (Math.random() < dt * 3) this.effects.steam(0, 1.1, 0, 1, 0.8);
    for (const b of this.world.baskets) { b.flag.rotation.y = Math.sin(this.clock * 3 + b.x) * 0.2; if (b.bunMeshes.length > 4 && Math.random() < dt * 1.5) this.effects.steam(b.x, 1.2, b.z, 1, 0.4); }
    this.updateBuns(dt); this.updateUnits(dt); this.updateMice(dt);
  }
  endRound() {
    this.phase = 'result'; this.resultTimer = RESULT_SECONDS;
    const teams = [...this.teams].sort((a, b) => b.score - a.score);
    const top = [...this.viewers.values()].filter(v => v.roundScore > 0).sort((a, b) => b.roundScore - a.roundScore).slice(0, 3);
    this.history.rounds.push({ round: this.round, winner: teams[0].id, scores: Object.fromEntries(this.teams.map(t => [t.id, t.score])) });
    this.ui.showResult({ round: this.round, teams, top, tie: teams.length > 1 && teams[0].score === teams[1].score, teamById: this.teamById });
    this.effects.confettiRain(220); this.effects.fireworks(0, 10, 0); this.audio.play('fanfare');
    for (const u of this.units) u.danceUntil = this.clock + RESULT_SECONDS;
  }
  startRound() {
    this.round++; this.time = 0; this.phase = 'play'; this.spawnTimer = 2.5; this.mouseTimer = 24; this.releaseQueue = 0; this.bunsReleased = 0; this.bunsDelivered = 0;
    for (const b of [...this.buns]) this.removeBun(b);
    for (const m of this.mice) this.scene.remove(m.mesh); this.mice = [];
    for (const u of [...this.units]) {
      for (const b of u.carrying) u.mesh.userData.carry.remove(b.mesh); u.carrying = []; u.target = null; u.state = 'idle';
      if (u.hero && !u.permanent) { this.scene.remove(u.mesh); this.units.splice(this.units.indexOf(u), 1); this.heroCount--; }
    }
    for (const t of this.teams) { t.score = 0; t.delivered = 0; t.buffUntil = 0; t.dashUntil = 0; }
    for (const v of this.viewers.values()) v.roundScore = 0;
    for (const b of this.world.baskets) updateBasketPile(b, 0, createBunMesh);
    this.estimateTotal(); this.ui.hideResult(); this.ui.toast(`第 ${this.round} 轮开始！发送 A/B/C/D 加入战队`);
  }
  snapshot() {
    return { round: this.round, phase: this.phase, time: Math.round(this.time), remaining: Math.round(this.remaining), difficulty: +this.difficulty.toFixed(2), teams: this.teams.map(t => ({ id: t.id, name: t.name, score: t.score, members: t.members })), viewers: [...this.viewers.values()].map(v => ({ name: v.name, team: v.teamId, score: v.score, roundScore: v.roundScore, level: v.level })), buns: this.buns.length, mice: this.mice.length, heroes: this.heroCount, likes: this.likes, history: this.history.rounds };
  }
}
