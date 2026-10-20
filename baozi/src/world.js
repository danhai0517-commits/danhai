import * as THREE from 'three';
import { geo, palette, material, mesh, ball, box, cylinder, group, bakeStatic, woodTexture, bambooTexture, weaveTexture, arenaTexture, textTexture, rand, TAU, toonRamp } from './art.js';
import { TEAMS, ARENA_RADIUS, CENTER_RADIUS, BASKET_RADIUS } from './config.js';
import { createBasket, createChef } from './actors.js';

const TABLE_TOP = -1.1;

function steamerStack(parent, x, z, tiers, radius, bambooMat, withLid = true) {
  const g = group(parent, x, TABLE_TOP, z, rand(0, TAU));
  for (let i = 0; i < tiers; i++) {
    const y = i * 0.9;
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.85, 24, 1, true), bambooMat); ring.position.y = y + 0.45; ring.castShadow = ring.receiveShadow = true; g.add(ring);
    mesh(g, geo.cylinder, '#e3c48f', [0, y + 0.86, 0], [radius - 0.05, 0.08, radius - 0.05]);
    mesh(g, geo.torus, palette.bambooDark, [0, y + 0.1, 0], [radius, radius, 0.3]).rotation.x = Math.PI / 2;
    mesh(g, geo.torus, palette.bambooDark, [0, y + 0.82, 0], [radius, radius, 0.3]).rotation.x = Math.PI / 2;
  }
  if (withLid) {
    const y = tiers * 0.9;
    mesh(g, geo.cylinder, '#e3c48f', [0, y + 0.1, 0], [radius + 0.05, 0.2, radius + 0.05]);
    const dome = ball(g, palette.bamboo, [0, y + 0.1, 0], [radius * 0.92, 0.5, radius * 0.92]);
    dome.geometry = new THREE.SphereGeometry(1, 20, 10, 0, TAU, 0, Math.PI / 2);
    mesh(g, geo.torus, palette.bambooDark, [0, y + 0.55, 0], [0.28, 0.28, 0.5]).rotation.x = Math.PI / 2;
  }
  return g;
}
function bowl(parent, x, z, radius, color, inner = '#fff3dc') {
  const g = group(parent, x, TABLE_TOP, z);
  const profile = [[0.3, 0], [radius * 0.5, 0.05], [radius * 0.9, radius * 0.4], [radius, radius * 0.62], [radius * 0.92, radius * 0.62], [radius * 0.82, radius * 0.4], [radius * 0.45, 0.14], [0, 0.12]].map(([a, b]) => new THREE.Vector2(a, b));
  const m = new THREE.Mesh(new THREE.LatheGeometry(profile, 24), material(color)); m.castShadow = m.receiveShadow = true; g.add(m);
  mesh(g, geo.cylinder, inner, [0, radius * 0.3, 0], [radius * 0.72, 0.04, radius * 0.72]);
  return g;
}
function lantern(parent, x, z, height, light) {
  const g = group(parent, x, TABLE_TOP, z, rand(0, TAU));
  cylinder(g, palette.woodDark, [0, height / 2, 0], [0.12, height, 0.12]);
  cylinder(g, palette.woodDark, [0, 0.12, 0], [0.45, 0.24, 0.45]);
  box(g, palette.woodDark, [0, height - 0.1, 0.5], [0.08, 0.08, 1.1]);
  const body = ball(g, palette.red, [0, height - 0.9, 0.95], [0.55, 0.45, 0.55], { emissive: '#ff5a2a', emissiveIntensity: 0.55 });
  body.material = material(palette.red, { emissive: '#ff6a30', emissiveIntensity: 0.6 });
  cylinder(g, palette.gold, [0, height - 0.45, 0.95], [0.26, 0.1, 0.26]);
  cylinder(g, palette.gold, [0, height - 1.35, 0.95], [0.26, 0.1, 0.26]);
  cylinder(g, palette.gold, [0, height - 1.7, 0.95], [0.04, 0.6, 0.04]);
  for (let i = 0; i < 5; i++) mesh(g, geo.torus, '#c0392b', [0, height - 0.9, 0.95], [0.5, 0.42, 0.14]).rotation.y = i / 5 * Math.PI;
  if (light) { const l = new THREE.PointLight('#ff9a4a', 22, 16, 2); l.position.set(0, height - 0.9, 0.95); g.add(l); g.userData.light = l; }
  g.userData.lamp = body; g.userData.dynamic = false;
  return g;
}
function signboard(parent, x, z) {
  const g = group(parent, x, TABLE_TOP, z);
  cylinder(g, palette.woodDark, [-2.6, 2.2, 0], [0.16, 4.4, 0.16]); cylinder(g, palette.woodDark, [2.6, 2.2, 0], [0.16, 4.4, 0.16]);
  box(g, palette.wood, [0, 3.6, 0], [6.4, 1.7, 0.25]); box(g, palette.woodDark, [0, 3.6, -0.02], [6.7, 2.0, 0.15]);
  const plate = new THREE.Mesh(geo.plane, new THREE.MeshBasicMaterial({ map: textTexture('包 子 铺', { width: 1024, height: 256, font: 'bold 190px "PingFang SC","Microsoft YaHei",serif', color: '#ffe9b8', stroke: '#5a2a12' }), transparent: true }));
  plate.position.set(0, 3.6, 0.14); plate.scale.set(6, 1.5, 1); g.add(plate);
  box(g, palette.red, [-3.2, 3.6, 0.1], [0.5, 2.0, 0.3]); box(g, palette.red, [3.2, 3.6, 0.1], [0.5, 2.0, 0.3]);
  ball(g, palette.gold, [-3.2, 4.75, 0.1], [0.3, 0.3, 0.3]); ball(g, palette.gold, [3.2, 4.75, 0.1], [0.3, 0.3, 0.3]);
  return g;
}
function teapot(parent, x, z) {
  const g = group(parent, x, TABLE_TOP, z, rand(0, TAU));
  ball(g, '#6fa3a6', [0, 0.7, 0], [0.9, 0.7, 0.9]); cylinder(g, '#6fa3a6', [0, 1.3, 0], [0.5, 0.2, 0.5]); ball(g, '#5a8285', [0, 1.5, 0], [0.14, 0.14, 0.14]);
  const spout = cylinder(g, '#6fa3a6', [0.95, 0.9, 0], [0.12, 0.9, 0.12]); spout.rotation.z = -0.9;
  mesh(g, geo.torus, '#6fa3a6', [-0.95, 0.8, 0], [0.45, 0.45, 0.9]).rotation.y = Math.PI / 2;
  for (let i = 0; i < 3; i++) { const a = i * 1.8 + 1; const c = group(g, Math.cos(a) * 1.7, 0, Math.sin(a) * 1.7); cylinder(c, '#6fa3a6', [0, 0.25, 0], [0.32, 0.5, 0.32]); cylinder(c, '#8d5a2b', [0, 0.46, 0], [0.26, 0.08, 0.26]); }
  return g;
}
function bottle(parent, x, z, color, cap) {
  const g = group(parent, x, TABLE_TOP, z);
  cylinder(g, color, [0, 0.9, 0], [0.42, 1.8, 0.42]); ball(g, color, [0, 1.8, 0], [0.42, 0.3, 0.42]); cylinder(g, color, [0, 2.2, 0], [0.16, 0.5, 0.16]); cylinder(g, cap, [0, 2.5, 0], [0.2, 0.2, 0.2]);
  box(g, '#fff3dc', [0, 0.9, 0.42], [0.5, 0.7, 0.04]);
  return g;
}
function flourSack(parent, x, z) {
  const g = group(parent, x, TABLE_TOP, z, rand(0, TAU));
  ball(g, '#f0e4cf', [0, 0.9, 0], [1.1, 1.0, 0.9]); ball(g, '#f0e4cf', [0, 1.7, 0], [0.6, 0.45, 0.5]); cylinder(g, '#c0392b', [0, 1.95, 0], [0.3, 0.2, 0.3]);
  cylinder(g, '#fffaf0', [1.4, 0.03, 0.8], [1.2, 0.05, 1.0]);
  const pin = cylinder(g, palette.woodLight, [1.8, 0.3, -0.6], [0.26, 2.6, 0.26]); pin.rotation.z = Math.PI / 2; pin.rotation.y = 0.6;
  cylinder(g, palette.woodDark, [3.2, 0.3, -1.4], [0.14, 0.5, 0.14]).rotation.set(Math.PI / 2, 0, -0.6);
  cylinder(g, palette.woodDark, [0.4, 0.3, 0.2], [0.14, 0.5, 0.14]).rotation.set(Math.PI / 2, 0, -0.6);
  return g;
}
function chiliString(parent, x, z) {
  const g = group(parent, x, TABLE_TOP, z);
  cylinder(g, palette.woodDark, [0, 1.6, 0], [0.1, 3.2, 0.1]);
  for (let i = 0; i < 9; i++) { const a = i / 9 * TAU; const c = ball(g, palette.chili, [Math.cos(a) * 0.35, 2.7 - (i % 3) * 0.5, Math.sin(a) * 0.35], [0.12, 0.42, 0.12]); c.rotation.z = Math.cos(a) * 0.5; c.rotation.x = Math.sin(a) * 0.5; }
  for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; ball(g, '#fffaf0', [Math.cos(a) * 0.3, 1.1 - (i % 2) * 0.3, Math.sin(a) * 0.3], [0.2, 0.2, 0.2]); }
  return g;
}
function bunPlate(parent, x, z, count) {
  const g = group(parent, x, TABLE_TOP, z, rand(0, TAU));
  cylinder(g, '#fffaf0', [0, 0.06, 0], [1.4, 0.12, 1.4]); mesh(g, geo.torus, '#8ec1d6', [0, 0.12, 0], [1.3, 1.3, 0.4]).rotation.x = Math.PI / 2;
  for (let i = 0; i < count; i++) { const a = i / count * TAU; ball(g, '#fff3dc', [Math.cos(a) * 0.7, 0.4, Math.sin(a) * 0.7], [0.4, 0.34, 0.4]); ball(g, '#f3dcc0', [Math.cos(a) * 0.7, 0.72, Math.sin(a) * 0.7], [0.08, 0.05, 0.08]); }
  return g;
}
function stool(parent, x, z) {
  const g = group(parent, x, -3.5, z, rand(0, TAU));
  cylinder(g, palette.wood, [0, 2.0, 0], [1.3, 0.3, 1.3]);
  for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + 0.5; const leg = cylinder(g, palette.woodDark, [Math.cos(a) * 1.0, 1.0, Math.sin(a) * 1.0], [0.12, 2.0, 0.12]); leg.rotation.z = -Math.cos(a) * 0.12; leg.rotation.x = Math.sin(a) * 0.12; }
  return g;
}

export function buildWorld(scene) {
  const world = new THREE.Group(); scene.add(world);
  const woodMat = new THREE.MeshToonMaterial({ map: woodTexture('#c98a4b', 4), gradientMap: toonRamp });
  const woodDarkMat = new THREE.MeshToonMaterial({ map: woodTexture('#7d4a24', 8), gradientMap: toonRamp });
  const bambooMat = new THREE.MeshToonMaterial({ map: bambooTexture(6), gradientMap: toonRamp, side: THREE.DoubleSide });
  const weaveMat = new THREE.MeshToonMaterial({ map: weaveTexture('#dcb87c', 6), gradientMap: toonRamp });

  // Floor far below the table, then the big round table.
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(260, 260), woodDarkMat); floor.rotation.x = -Math.PI / 2; floor.position.y = -3.6; floor.receiveShadow = true; world.add(floor);
  const table = new THREE.Mesh(new THREE.CylinderGeometry(17.5, 17.2, 1.4, 64), woodMat); table.position.y = TABLE_TOP - 0.7; table.receiveShadow = table.castShadow = true; world.add(table);
  mesh(world, geo.torus, palette.woodDark, [0, TABLE_TOP - 0.1, 0], [17.4, 17.4, 1.2]).rotation.x = Math.PI / 2;
  for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + Math.PI / 4; cylinder(world, palette.woodDark, [Math.cos(a) * 13, -3, Math.sin(a) * 13], [0.9, 2.4, 0.9]); }

  // The arena: a giant bamboo steamer whose mat is the battlefield.
  const arena = group(world, 0, 0, 0);
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(ARENA_RADIUS + 0.6, ARENA_RADIUS + 0.75, 1.8, 72, 1, true), bambooMat); wall.position.y = TABLE_TOP + 0.9; wall.castShadow = wall.receiveShadow = true; arena.add(wall);
  const innerWall = new THREE.Mesh(new THREE.CylinderGeometry(ARENA_RADIUS + 0.1, ARENA_RADIUS + 0.1, 0.7, 72, 1, true), material(palette.bambooDark, { side: THREE.BackSide })); innerWall.position.y = 0.35; arena.add(innerWall);
  mesh(arena, geo.torus, palette.bambooDark, [0, 0.72, 0], [ARENA_RADIUS + 0.38, ARENA_RADIUS + 0.38, 1.6]).rotation.x = Math.PI / 2;
  mesh(arena, geo.torus, palette.bambooDark, [0, TABLE_TOP + 0.2, 0], [ARENA_RADIUS + 0.72, ARENA_RADIUS + 0.72, 1.4]).rotation.x = Math.PI / 2;
  for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; box(arena, palette.bambooDark, [Math.cos(a) * (ARENA_RADIUS + 0.62), 0.1, Math.sin(a) * (ARENA_RADIUS + 0.62)], [0.14, 1.6, 0.14]).rotation.y = -a; }
  const floorTex = arenaTexture(TEAMS, ARENA_RADIUS, CENTER_RADIUS);
  const mat = new THREE.Mesh(new THREE.CircleGeometry(ARENA_RADIUS + 0.6, 96), new THREE.MeshToonMaterial({ map: floorTex, gradientMap: toonRamp })); mat.rotation.x = -Math.PI / 2; mat.position.y = 0; mat.receiveShadow = true; arena.add(mat);
  const slats = new THREE.Mesh(new THREE.CylinderGeometry(ARENA_RADIUS + 0.6, ARENA_RADIUS + 0.6, 1.1, 72), bambooMat); slats.position.y = -0.55; arena.add(slats);
  // Sector divider ridges and centre steamer.
  for (let i = 0; i < 4; i++) { const a = i / 4 * TAU; const r = (CENTER_RADIUS + ARENA_RADIUS) / 2; const ridge = box(arena, '#fff3dc', [Math.cos(a) * r, 0.05, Math.sin(a) * r], [ARENA_RADIUS - CENTER_RADIUS - 0.4, 0.1, 0.16]); ridge.rotation.y = -a; }
  const centre = group(arena, 0, 0, 0);
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(CENTER_RADIUS - 0.25, CENTER_RADIUS - 0.1, 0.95, 36, 1, true), bambooMat); pot.position.y = 0.48; pot.castShadow = pot.receiveShadow = true; centre.add(pot);
  mesh(centre, geo.torus, palette.bambooDark, [0, 0.12, 0], [CENTER_RADIUS - 0.15, CENTER_RADIUS - 0.15, 0.4]).rotation.x = Math.PI / 2;
  mesh(centre, geo.torus, palette.bambooDark, [0, 0.9, 0], [CENTER_RADIUS - 0.2, CENTER_RADIUS - 0.2, 0.4]).rotation.x = Math.PI / 2;
  mesh(centre, geo.cylinder, '#e3c48f', [0, 0.5, 0], [CENTER_RADIUS - 0.3, 0.1, CENTER_RADIUS - 0.3]);
  for (let i = 0; i < 9; i++) { const a = i / 9 * TAU; ball(centre, '#fff3dc', [Math.cos(a) * 1.3, 0.75, Math.sin(a) * 1.3], [0.42, 0.34, 0.42]); }
  ball(centre, '#fff3dc', [0, 0.75, 0], [0.45, 0.36, 0.45]);
  const chef = createChef(arena);
  const lid = chef.lid;
  const lidTop = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 12, 0, TAU, 0, Math.PI / 2), bambooMat); lidTop.scale.set(CENTER_RADIUS - 0.05, 0.6, CENTER_RADIUS - 0.05); lidTop.castShadow = true; lid.add(lidTop);
  const lidRim = new THREE.Mesh(geo.cylinder, material('#e3c48f')); lidRim.scale.set(CENTER_RADIUS, 0.18, CENTER_RADIUS); lidRim.castShadow = true; lid.add(lidRim);
  const knob = new THREE.Mesh(geo.torus, material(palette.bambooDark)); knob.scale.set(0.35, 0.35, 0.6); knob.rotation.x = Math.PI / 2; knob.position.y = 0.6; lid.add(knob);
  lid.traverse(n => { n.userData.dynamic = true; });
  chef.group.traverse(n => { n.userData.dynamic = true; });

  // Team baskets with flags.
  const baskets = TEAMS.map(team => { const k = BASKET_RADIUS / Math.SQRT2; return createBasket(arena, team, team.dir[0] * k, team.dir[1] * k, weaveMat); });
  for (const b of baskets) { b.group.traverse(n => { n.userData.dynamic = true; }); }

  // Lanterns on the sector borders light the arena.
  const lanterns = [];
  for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; const r = ARENA_RADIUS + (i % 2 ? 2.4 : 1.9); lanterns.push(lantern(world, Math.cos(a) * r, Math.sin(a) * r, i % 2 ? 3.4 : 4.2, i % 2 === 0)); }
  for (const l of lanterns) l.rotation.y = Math.atan2(-l.position.x, -l.position.z);

  // Night market props around the table.
  signboard(world, 0, -15.6);
  steamerStack(world, -13.5, -8.5, 3, 2.2, bambooMat); steamerStack(world, -11.2, -11.8, 2, 1.7, bambooMat); steamerStack(world, 13.6, -8.2, 2, 2.3, bambooMat); steamerStack(world, 11.6, -12, 4, 1.5, bambooMat, false);
  bowl(world, 13.2, 1.5, 2.0, '#8ec1d6'); teapot(world, 14.2, -3.4);
  bottle(world, -14.6, -2.6, palette.soy, palette.red); bottle(world, -13.4, -4.2, '#8a3b2b', palette.gold); bottle(world, -15.2, -0.6, '#d9b45a', '#3b2418');
  flourSack(world, -13.8, 4.8); chiliString(world, 14.2, 6.2); bunPlate(world, -9.5, 13.2, 6); bunPlate(world, 10.2, 12.6, 5);
  bowl(world, 3.5, 15.2, 1.4, '#c0392b', '#ffd35a'); bowl(world, -3.8, 15.6, 1.2, '#6fa3a6');
  stool(world, -21, -4); stool(world, 21, 2);
  for (let i = 0; i < 12; i++) { const a = rand(0, TAU), r = rand(12.6, 16.2); if (Math.abs(Math.sin(a)) < 0.25 && Math.cos(a) < 0) continue; ball(world, '#fff3dc', [Math.cos(a) * r, TABLE_TOP + 0.3, Math.sin(a) * r], [0.36, 0.3, 0.36]); }
  const chopsticks = group(world, 12.2, TABLE_TOP + 0.08, 4.6, 0.7); cylinder(chopsticks, palette.woodDark, [0, 0, 0], [0.08, 3.4, 0.08]).rotation.x = Math.PI / 2; cylinder(chopsticks, palette.woodDark, [0.25, 0, 0.2], [0.08, 3.4, 0.08]).rotation.x = Math.PI / 2;

  // Lights.
  scene.add(new THREE.HemisphereLight('#ffe2bf', '#5a3420', 0.75));
  const key = new THREE.DirectionalLight('#fff1dc', 1.9); key.position.set(10, 26, 14); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = key.shadow.camera.bottom = -17; key.shadow.camera.right = key.shadow.camera.top = 17; key.shadow.camera.near = 5; key.shadow.camera.far = 70; key.shadow.bias = -0.0008; key.shadow.normalBias = 0.03; key.shadow.radius = 3;
  scene.add(key); scene.add(key.target);
  const fill = new THREE.DirectionalLight('#9ec5ff', 0.35); fill.position.set(-14, 10, -8); scene.add(fill);
  const centreGlow = new THREE.PointLight('#ffc98a', 18, 14, 2); centreGlow.position.set(0, 3.5, 0); scene.add(centreGlow);

  const baked = bakeStatic(world);
  return { world, arena, baked, baskets, chef, lanterns, lid, tableTop: TABLE_TOP, floorTex, centreGlow };
}
