import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { mergeGeometries } from './vendor/BufferGeometryUtils.js';

const $ = id => document.getElementById(id);
const TAU = Math.PI * 2;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const TYPES = {
  rabbit: {name:'兔子',nickname:'团团',emoji:'🐰',food:'carrot',price:180,color:'#fff4e2',bg:'#f6e9e1',tag:'软乎乎',description:'一蹦一跳，快乐就来到',scale:.9},
  cow: {name:'奶牛',nickname:'奶糖',emoji:'🐮',food:'grass',price:420,color:'#fff8e9',bg:'#eceddf',tag:'乖巧派',description:'慢悠悠的温柔大朋友',scale:1.08},
  sheep: {name:'绵羊',nickname:'云朵',emoji:'🐑',food:'grass',price:260,color:'#fff0d0',bg:'#f5eddb',tag:'棉花糖',description:'把一朵小云养在身边',scale:.88},
  pig: {name:'小猪',nickname:'桃桃',emoji:'🐷',food:'apple',price:320,color:'#f6ada5',bg:'#fae6de',tag:'干饭王',description:'吃饱就幸福的小桃子',scale:1},
  chicken: {name:'小鸡',nickname:'米粒',emoji:'🐥',food:'corn',price:120,color:'#ffda72',bg:'#faf0cc',tag:'元气满满',description:'叽叽喳喳的太阳小团子',scale:.64},
  duck: {name:'小鸭',nickname:'泡泡',emoji:'🦆',food:'grain',price:150,color:'#ffecc3',bg:'#e8f0df',tag:'游泳健将',description:'水边的快乐散步搭子',scale:.75},
};
const FOODS = {
  carrot:{name:'胡萝卜',emoji:'🥕',stock:24},grass:{name:'青草',emoji:'🌿',stock:30},corn:{name:'玉米',emoji:'🌽',stock:24},apple:{name:'苹果',emoji:'🍎',stock:20},grain:{name:'谷物',emoji:'🌾',stock:30}
};
const SAVE_KEY='happy-farm-v1';
const initialAnimals=[{type:'cow',x:-1.9,z:3.2},{type:'pig',x:4.8,z:5.3},{type:'sheep',x:-1,z:6.2},{type:'rabbit',x:2.2,z:3.2},{type:'rabbit',x:3.2,z:5.7},{type:'chicken',x:-4.8,z:-.4},{type:'chicken',x:-3.8,z:1.1},{type:'duck',x:-7.7,z:4.1}];
let state={coins:1280,xp:120,feeds:0,day:new Date().toLocaleDateString('en-CA'),missionDone:false,stock:Object.fromEntries(Object.entries(FOODS).map(([k,v])=>[k,v.stock])),animals:initialAnimals};
let storageAvailable=true;
try {
  const data=JSON.parse(localStorage.getItem(SAVE_KEY));
  if(data && Array.isArray(data.animals) && Number.isFinite(data.coins)) {
    state.coins=Math.max(0,Math.floor(data.coins));state.xp=Math.max(120,Number(data.xp)||120);
    state.animals=data.animals.filter(a=>TYPES[a.type]&&Number.isFinite(a.x)&&Number.isFinite(a.z)&&Math.abs(a.x)<13&&Math.abs(a.z)<9).slice(0,24);
    if(!state.animals.length)state.animals=initialAnimals;
    for(const key of Object.keys(FOODS))state.stock[key]=Math.max(0,Math.min(999,Number(data.stock?.[key])||0));
    if(data.day===state.day){state.feeds=Math.max(0,Number(data.feeds)||0);state.missionDone=!!data.missionDone;}
  }
}catch {storageAvailable=false;}
function save(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(state));}catch{storageAvailable=false;}}

// Seeded placement, softly imperfect silhouettes, and hand-painted surfaces.
let seed=83416;
function rand(min=0,max=1){seed=(seed*1664525+1013904223)>>>0;return min+(seed/4294967296)*(max-min);}
function material(color,options={}) {
  const key=color+JSON.stringify(options);
  if(materials.has(key))return materials.get(key);
  const mat=new THREE.MeshToonMaterial({color,gradientMap:toonRamp,...options});materials.set(key,mat);return mat;
}
const rampData=new Uint8Array([150,198,232,255]);
const toonRamp=new THREE.DataTexture(rampData,4,1,THREE.RedFormat);toonRamp.minFilter=toonRamp.magFilter=THREE.NearestFilter;toonRamp.needsUpdate=true;
const materials=new Map();
const palette={grass:'#91bb57',grassLight:'#a9cd6b',grassDark:'#7fa449',cream:'#fff2d0',white:'#fff9e8',wood:'#bd8e5b',woodLight:'#ddb282',woodDark:'#8f6b46',red:'#df8070',roof:'#708c80',yellow:'#f3cf69',green:'#75964b',pink:'#f3aba1',eye:'#454844',soil:'#ad8560'};
const geo={sphere:new THREE.SphereGeometry(1,16,12),box:new THREE.BoxGeometry(1,1,1),cylinder:new THREE.CylinderGeometry(1,1,1,12),cone:new THREE.ConeGeometry(1,1,10)};
function mesh(parent,geometry,color,pos=[0,0,0],scale=[1,1,1],options={}){
  const object=new THREE.Mesh(geometry,typeof color==='string'?material(color,options):color);object.position.set(...pos);object.scale.set(...scale);object.castShadow=true;object.receiveShadow=true;parent.add(object);return object;
}
const ball=(p,c,pos,s)=>mesh(p,geo.sphere,c,pos,s);
const box=(p,c,pos,s)=>mesh(p,geo.box,c,pos,s);
const cylinder=(p,c,pos,s)=>mesh(p,geo.cylinder,c,pos,s);
function beam(parent,color,a,b,r=.06){const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b);const obj=cylinder(parent,color,av.clone().add(bv).multiplyScalar(.5).toArray(),[r,av.distanceTo(bv),r]);obj.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),bv.sub(av).normalize());return obj;}
function group(parent,x=0,y=0,z=0,rotation=0){const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=rotation;parent.add(g);return g;}
function paintedTexture(base,kind='wood'){
  const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d');ctx.fillStyle=base;ctx.fillRect(0,0,128,128);
  for(let i=0;i<170;i++){ctx.strokeStyle=i%2?'rgba(255,255,230,.08)':'rgba(110,82,45,.06)';ctx.lineWidth=rand(.5,2);ctx.beginPath();const x=rand(0,128),y=rand(0,128);ctx.moveTo(x,y);ctx.lineTo(x+rand(3,kind==='wood'?22:6),y+rand(-1,3));ctx.stroke();}
  if(kind==='wood'){ctx.strokeStyle='#805c3520';for(let y=31;y<128;y+=32){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(128,y+1);ctx.stroke();}}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
const woodPaint=new THREE.MeshToonMaterial({map:paintedTexture('#d7a473'),gradientMap:toonRamp});
const barnPaint=new THREE.MeshToonMaterial({map:paintedTexture('#e28c7b'),gradientMap:toonRamp});

const scene=new THREE.Scene();
scene.fog=new THREE.Fog('#f2f0de',48,85);
const container=$('scene-container');
let renderer;
try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});}
catch(error){$('loading').innerHTML='<strong>这个浏览器暂时无法绘制 3D 农场</strong><span>请使用支持 WebGL 2 的浏览器，并开启硬件加速。</span>';throw error;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor('#f1efe0',0);container.append(renderer.domElement);
renderer.domElement.setAttribute('aria-label','三维开心农场，可拖动旋转并点击动物');renderer.domElement.tabIndex=0;
const camera=new THREE.OrthographicCamera(-20,20,15,-15,.1,120);camera.position.set(25,30,32);camera.lookAt(0,0,0);
const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,.6,0);controls.enableDamping=true;controls.dampingFactor=.08;controls.minZoom=.75;controls.maxZoom=2.5;controls.minPolarAngle=.28;controls.maxPolarAngle=1.12;controls.enablePan=false;controls.update();
scene.add(new THREE.HemisphereLight('#fff9e6','#c0cb90',2.1));
const sun=new THREE.DirectionalLight('#fff0d0',3.1);sun.position.set(-12,25,15);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-21,right:21,top:21,bottom:-21,near:1,far:70});sun.shadow.normalBias=.035;sun.shadow.bias=-.0002;scene.add(sun);
const fill=new THREE.DirectionalLight('#e6f5df',.7);fill.position.set(15,14,-10);scene.add(fill);
const world=group(scene),dynamic=group(scene),effects=group(scene);
const animators=[];
const smoothShape=(points)=>{const s=new THREE.Shape();const curve=new THREE.SplineCurve(points.map(p=>new THREE.Vector2(...p)));const vertices=curve.getPoints(90);s.moveTo(vertices[0].x,vertices[0].y);for(const v of vertices.slice(1))s.lineTo(v.x,v.y);s.closePath();return s;};
const islandPoints=[[-13,-5],[-10,-8],[-4,-8.8],[2,-9],[8,-8.3],[12,-5],[13.5,-.5],[12.8,4],[9,7.8],[4,9],[0,8.6],[-5,8.4],[-10,7],[-13,3],[-13,-5]];
const landShape=smoothShape(islandPoints);
const landGeometry=new THREE.ExtrudeGeometry(landShape,{depth:.65,bevelEnabled:true,bevelThickness:.2,bevelSize:.25,bevelSegments:2,steps:1});landGeometry.rotateX(-Math.PI/2);
mesh(world,landGeometry,'#c2a579',[0,-.92,0]);
const grassGeometry=new THREE.ShapeGeometry(landShape,30);grassGeometry.rotateX(-Math.PI/2);mesh(world,grassGeometry,palette.grass,[0,-.05,0]);
// Broad grassy brush patches add variation without a rigid grid.
for(let i=0;i<48;i++){const x=rand(-11,11),z=rand(-7,7);if(x*x/144+z*z/64>1)continue;const patch=mesh(world,new THREE.CircleGeometry(1,12),i%3===0?palette.grassDark:palette.grassLight,[x,-.025,z],[rand(.4,1.7),rand(.3,1),1]);patch.rotation.x=-Math.PI/2;patch.rotation.z=rand(0,TAU);}
// Curved little lane through the island.
const laneCurve=new THREE.CatmullRomCurve3([new THREE.Vector3(-7,.015,-5),new THREE.Vector3(-4,.015,-3),new THREE.Vector3(-3,.015,0),new THREE.Vector3(-.5,.015,1),new THREE.Vector3(2,.015,.4),new THREE.Vector3(5,.015,-3),new THREE.Vector3(7,.015,-5)]);
for(let i=0;i<65;i++){const point=laneCurve.getPoint(i/64);const o=ball(world,i%3===0?'#dec99b':'#e4d1a5',[point.x,.005,point.z],[.57,.032,.5]);o.rotation.y=rand(0,1);}
const stepping=[[-2,2.2],[-1.8,3.1],[-1.6,4],[-.8,4.6],[.1,4.9],[1.1,5.2]];
for(const [x,z] of stepping){const o=cylinder(world,'#dcdbc2',[x,.035,z],[rand(.2,.32),.08,rand(.17,.29)]);o.rotation.y=rand(0,TAU);}

function fence(points){
  for(let i=0;i<points.length;i++){const [x,z]=points[i];const tilt=rand(-.05,.05);const post=box(world,woodPaint,[x,.62,z],[.15,1.3,.15]);post.rotation.z=tilt;const cap=mesh(world,geo.cone,palette.woodLight,[x,1.34,z],[.12,.15,.12]);cap.rotation.y=Math.PI/4;
    if(i){const [px,pz]=points[i-1];beam(world,palette.woodLight,[px,.55,pz],[x,.55,z],.055);beam(world,palette.woodLight,[px,1,pz],[x,1,z],.055);}
  }
}
fence([[-11,-5.6],[-9.5,-6.6],[-7.8,-7.3],[-6,-7.6],[-4.2,-7.7],[-2.5,-7.8],[-.8,-7.7]]);
fence([[8.7,-6.8],[10.3,-5.7],[11.5,-4],[12,-2.3],[12.2,-.6],[12,1.1],[11.5,2.8]]);
fence([[9.5,6.1],[7.8,7.1],[6,7.4],[4.3,7.7]]);
fence([[-10.3,5.6],[-8.8,6.5],[-7.1,7],[-5.4,7.3]]);
function roof(parent,width,depth,y,color){
  const slope=.55,half=width/2;for(const side of [-1,1]){const panel=box(parent,color,[side*half/2,y+.45,0],[half+ .32,.2,depth+.4]);panel.rotation.z=-side*slope;for(let i=0;i<8;i++){const stripe=box(parent,color,[side*half/2,y+.56,-depth/2+(i+.5)*depth/8],[half+.38,.06,.035]);stripe.rotation.z=-side*slope;}}
  beam(parent,palette.cream,[0,y+half*Math.sin(slope)/2+.56,-depth/2-.25],[0,y+half*Math.sin(slope)/2+.56,depth/2+.25],.065);
}
function barn(x,z){const g=group(world,x,0,z,-.12);box(g,barnPaint,[0,1.3,0],[4.7,2.6,3.3]);
  for(let i=0;i<13;i++)box(g,'#c77264',[-2.3+i*.38,1.3,1.665],[.022,2.55,.027]);
  for(const px of [-2.34,2.34])box(g,palette.cream,[px,1.3,1.71],[.14,2.7,.15]);box(g,palette.cream,[0,.1,1.73],[4.75,.17,.15]);box(g,palette.cream,[0,2.6,1.73],[4.85,.18,.16]);
  const front=box(g,'#a15c4f',[0,1,1.76],[1.9,2,.08]);
  for(const px of [-.94,0,.94])box(g,palette.cream,[px,1,1.83],[.12,2,.1]);box(g,palette.cream,[0,2,1.83],[2.04,.13,.1]);beam(g,palette.cream,[-.9,.1,1.9],[.9,1.95,1.9],.048);beam(g,palette.cream,[.9,.1,1.9],[-.9,1.95,1.9],.048);
  const tri=new THREE.Shape();tri.moveTo(-2.35,0);tri.lineTo(2.35,0);tri.lineTo(0,1.35);tri.closePath();mesh(g,new THREE.ShapeGeometry(tri),palette.red,[0,2.6,1.68]);
  box(g,palette.cream,[0,3.1,1.72],[.73,.62,.07]);box(g,'#77929a',[0,3.1,1.78],[.51,.4,.07]);box(g,palette.cream,[0,3.1,1.83],[.05,.41,.03]);box(g,palette.cream,[0,3.1,1.83],[.52,.04,.03]);
  roof(g,4.7,3.5,2.95,'#788f86');
  for(const side of [-1,1]){box(g,palette.cream,[side*2.41,1.5,0],[.08,1.0,1.1]);box(g,'#8ea6a2',[side*2.46,1.5,0],[.08,.77,.88]);}
  // Open lean-to with feed sacks and hay.
  const awning=box(g,palette.yellow,[3.15,1.9,.4],[1.7,.12,3]);awning.rotation.z=-.13;for(const zz of [-.85,1.7])box(g,palette.wood,[3.8,.9,zz],[.13,1.8,.13]);
  for(let i=0;i<3;i++)ball(g,'#e9d5a5',[2.9+i*.3,.35,.7+i*.35],[.38,.46,.37]);
  return g;
}
barn(-6.1,-4.4);
function cottage(){const g=group(world,4.3,0,-5.2,.12);box(g,'#f7dd9c',[0,1.15,0],[3.3,2.3,2.7]);roof(g,3.5,2.85,2.55,'#c58167');
  box(g,'#8caa90',[.63,.77,1.39],[.72,1.55,.08]);box(g,palette.cream,[.63,1.52,1.43],[.9,.12,.1]);ball(g,'#cba467',[.85,.75,1.46],[.04,.04,.04]);
  box(g,palette.cream,[-.8,1.35,1.42],[.92,.92,.1]);box(g,'#91a9a0',[-.8,1.35,1.48],[.7,.7,.08]);box(g,palette.cream,[-.8,1.35,1.53],[.04,.7,.03]);box(g,palette.cream,[-.8,1.35,1.53],[.7,.04,.03]);
  box(g,'#b07961',[-.8,.83,1.55],[1.1,.16,.45]);for(let i=0;i<5;i++)flower(g,-1.2+i*.2,1.01,1.54,i%2?'#fff0ae':'#ef9690',.23);
  box(g,'#c19679',[1,3.2,-.4],[.43,1.0,.5]);box(g,palette.cream,[1,3.7,-.4],[.55,.1,.6]);
  const canopy=box(g,'#a4b58a',[.5,2.05,2.05],[2.75,.1,1.6]);canopy.rotation.x=.12;for(const x of [-.75,1.65])cylinder(g,palette.cream,[x,.95,2.65],[.055,1.9,.055]);
  for(let i=0;i<3;i++)box(g,'#d8c29a',[.5,.08+i*.06,1.45+i*.28],[1.3,.16,.6]);
  return g;
}
function flower(parent,x,y,z,color='#f3d470',size=.25){const g=group(parent,x,y,z);cylinder(g,'#75954b',[0,size*.5,0],[.02,size,.02]);const leaf=ball(g,'#87aa56',[size*.2,size*.35,0],[size*.35,.025,size*.12]);leaf.rotation.z=.3;for(let i=0;i<5;i++){const a=i*TAU/5;ball(g,color,[Math.cos(a)*size*.3,size,Math.sin(a)*size*.3],[size*.26,size*.12,size*.26]);}ball(g,'#b59544',[0,size+.04,0],[size*.15,size*.12,size*.15]);}
cottage();
// Whimsical windmill, with animated wooden sails.
const mill=group(world,9.3,0,-3.0,-.14);mesh(mill,new THREE.CylinderGeometry(.64,1.12,3.2,10),'#f4e5be',[0,1.6,0]);mesh(mill,geo.cone,'#bd8871',[0,3.75,0],[1.04,1.1,1.04]);box(mill,'#8b9c82',[0,.7,1.0],[.5,1.35,.12]);
const blades=group(dynamic,9.3,2.8,-1.84);blades.rotation.y=-.14;const spin=group(blades);for(let i=0;i<4;i++){const blade=group(spin,0,0,0,i*Math.PI/2);blade.rotation.y=0;blade.rotation.z=i*Math.PI/2;box(blade,palette.wood,[0,1.05,0],[.12,2.1,.12]);box(blade,palette.cream,[.25,1.16,.02],[.48,1.2,.065]);for(let j=0;j<5;j++)box(blade,'#cfb996',[.25,.65+j*.23,.07],[.5,.035,.035]);}ball(spin,palette.woodDark,[0,0,.12],[.18,.18,.12]);animators.push(t=>{spin.rotation.z=-t*.35;});

function tree(x,z,size=1,type='round'){
  const g=group(world,x,0,z,rand(0,TAU));beam(g,palette.wood,[0,0,0],[.1,2.2*size,0],.17*size);beam(g,palette.wood,[0,1.2*size,0],[.6*size,2*size,.12],.08*size);
  if(type==='pine'){for(let i=0;i<3;i++)mesh(g,geo.cone,i%2?'#719e62':'#83ac69',[0,(1.7+i*.7)*size,0],[(1.25-i*.2)*size,1.6*size,(1.25-i*.2)*size]);}
  else {for(const [dx,dy,dz,s] of [[0,2.8,0,1.2],[-.7,2.45,.15,.92],[.65,2.5,.1,.95],[.1,2.4,-.7,.8]])ball(g,['#98b964','#a6c979','#85ae5f'][Math.floor(rand(0,3))],[dx*size,dy*size,dz*size],[s*size,s*.92*size,s*size]);
    if(type==='apple')for(let i=0;i<8;i++){const a=i*2.4;ball(g,'#e98973',[Math.cos(a)*1.0*size,(2.4+rand(-.3,.6))*size,Math.sin(a)*.9*size],[.14*size,.16*size,.14*size]);}
  }
  for(let i=0;i<3;i++)ball(g,'#8bac57',[rand(-.8,.8),.15,rand(-.6,.6)],[.25,.2,.24]);
}
tree(-11.1,-3.3,1.1);tree(-10.9,-.3,.85,'apple');tree(-2.4,-7.2,1.15,'apple');tree(1,-7.5,.82);tree(7.5,-7,1.05);tree(11.2,.9,.86,'pine');tree(10.4,4.7,1.05);tree(-10.5,5.5,.68);tree(-4.7,7.2,.67,'apple');
// Pond with an uneven bank, lilies, and a tiny footbridge.
const pondX=-8,pondZ=2.8;
const pondPoints=[[-2.3,-.9],[-1.6,-1.8],[-.2,-2.1],[1.5,-1.4],[2.5,-.3],[2.2,1.2],[1.1,1.8],[-.4,1.6],[-2,1],[-2.3,-.9]];
const pondShape=smoothShape(pondPoints);const pondGeo=new THREE.ShapeGeometry(pondShape,25);pondGeo.rotateX(-Math.PI/2);mesh(world,pondGeo,'#76bfc2',[pondX,.046,pondZ]);
const bankCurve=new THREE.SplineCurve(pondPoints.map(p=>new THREE.Vector2(...p)));for(let i=0;i<38;i++){const p=bankCurve.getPoint(i/38);ball(world,i%4?'#d8d8b0':'#e5dfbd',[p.x+pondX,.055,p.y+pondZ],[rand(.18,.3),rand(.12,.2),rand(.17,.3)]);}
for(const [x,z] of [[-8.9,2.8],[-7.8,1.8],[-6.9,3.6]]){const pad=mesh(world,new THREE.CircleGeometry(.3,18),'#6eaa6c',[x,.058,z]);pad.rotation.x=-Math.PI/2;flower(world,x,.045,z,'#f2b1b5',.15);}
for(let i=0;i<5;i++){const line=mesh(dynamic,new THREE.RingGeometry(.5+i*.15,.513+i*.15,36),new THREE.MeshBasicMaterial({color:'#c4e5d7',transparent:true,opacity:.3,side:THREE.DoubleSide}),[pondX+.4,.06,pondZ+.2]);line.rotation.x=-Math.PI/2;animators.push(t=>{line.scale.setScalar(.8+Math.sin(t*.8+i)*.12);});}
for(let i=0;i<9;i++){const board=box(world,woodPaint,[-8.1+i*.22,.27,4.1],[.2,.13,1.05]);board.rotation.y=.08;}
for(const side of [-1,1]){beam(world,palette.wood,[-8.3,.6,4.1+side*.5],[-6.25,.6,4.1+side*.5],.05);for(let i=0;i<3;i++)box(world,palette.wood,[-8.25+i, .42,4.1+side*.5],[.075,.5,.075]);}
for(const [x,z] of [[-9.6,1.5],[-6.1,3.2],[-9.2,4.1]])for(let i=0;i<4;i++){cylinder(world,'#83a36e',[x+rand(-.15,.15),.38,z+rand(-.12,.12)],[.018,.75,.018]);cylinder(world,'#8d694c',[x+rand(-.12,.12),.72,z+rand(-.12,.12)],[.04,.25,.04]);}
// Three irregular vegetable gardens, not a repetitive all-over grid.
function garden(x,z,w,d,rotation,crop){const g=group(world,x,.025,z,rotation);box(g,palette.soil,[0,.025,0],[w,.14,d]);
  for(const side of [-1,1])box(g,woodPaint,[0,.15,side*d/2],[w+.2,.2,.11]);for(const side of [-1,1])box(g,woodPaint,[side*w/2,.15,0],[.11,.2,d]);
  for(let i=0;i<4;i++){const xx=-w*.38+i*w*.25;box(g,'#96754f',[xx,.1,0],[.07,.015,d*.92]);for(let j=0;j<4;j++){const zz=-d*.35+j*d*.23+rand(-.09,.09);const cx=xx+rand(-.06,.06);if(crop==='carrot'){mesh(g,geo.cone,'#eda252',[cx,.2,zz],[.12,.28,.12]);for(let k=0;k<3;k++){const leaf=ball(g,'#7b9b43',[cx+(k-1)*.07,.37,zz],[.035,.23,.085]);leaf.rotation.z=(k-1)*.4;}}
    else if(crop==='cabbage'){ball(g,'#91b65e',[cx,.28,zz],[.25,.22,.25]);for(let k=0;k<4;k++){const a=k*1.57;ball(g,k%2?'#bad27d':'#a6c66f',[cx+Math.cos(a)*.12,.3,zz+Math.sin(a)*.12],[.18,.15,.18]);}}
    else {beam(g,'#a7905a',[cx,.05,zz],[cx,.85,zz],.025);for(let k=0;k<3;k++){const a=k*2.1;ball(g,'#81a356',[cx+Math.cos(a)*.12,.45+k*.12,zz+Math.sin(a)*.12],[.16,.09,.14]);ball(g,'#e88764',[cx+Math.cos(a)*.12,.35+k*.17,zz+Math.sin(a)*.12],[.1,.1,.1]);}}
  }}
  box(g,'#ebd9ae',[w/2+.35,.67,-d/2],[.58,.38,.05]);beam(g,palette.wood,[w/2+.35,.1,-d/2],[w/2+.35,.65,-d/2],.025);
}
garden(4.2,-.1,3.0,2.8,-.16,'carrot');garden(7.8,1.25,2.8,2.3,.06,'cabbage');garden(3,-2.5,2.4,1.7,.12,'tomato');
// Pumpkins, sunflowers, a scarecrow, crates, barrels, hay, and a well.
function pumpkin(x,z,size=.4){const g=group(world,x,.22*size/.4,z,rand(0,TAU));for(let k=0;k<7;k++){const a=k*TAU/7;ball(g,k%2?'#e8a358':'#eab063',[Math.cos(a)*size*.35,0,Math.sin(a)*size*.35],[size*.67,size*.7,size*.67]);}cylinder(g,'#78914d',[0,size*.75,0],[.045,size*.35,.045]);}
for(const [x,z,s] of [[7.3,3.2,.43],[8.1,3.5,.36],[7.6,4,.55],[8.7,3.3,.28]])pumpkin(x,z,s);
function sunflower(x,z,height=1.4){const g=group(world,x,0,z,rand(-.2,.2));beam(g,'#78964d',[0,0,0],[0,height,0],.04);for(let k=0;k<9;k++){const a=k*TAU/9;const petal=ball(g,'#f7cf68',[Math.cos(a)*.23,height+Math.sin(a)*.23,.03],[.14,.18,.05]);petal.rotation.z=-a;}ball(g,'#926f42',[0,height,.08],[.2,.2,.07]);for(const side of [-1,1]){const leaf=ball(g,'#91ac50',[side*.16,height*.46,0],[.25,.07,.1]);leaf.rotation.z=side*.45;}}
for(const [x,z] of [[-9,-5.6],[-9.4,-5],[-8.8,-5],[-8.3,-5.3],[9.5,2.2],[9.8,2.6],[9.4,3.1]])sunflower(x,z,rand(1.1,1.7));
const scarecrow=group(world,5.8,0,-1.8,-.1);beam(scarecrow,palette.wood,[0,0,0],[0,1.9,0],.045);beam(scarecrow,palette.wood,[-.6,1.25,0],[.6,1.25,0],.05);ball(scarecrow,'#ebcd9c',[0,1.72,0],[.24,.27,.23]);box(scarecrow,'#8fa99a',[0,1.18,0],[.45,.55,.24]);for(const side of [-1,1]){const arm=box(scarecrow,'#8fa99a',[side*.38,1.27,0],[.38,.2,.23]);arm.rotation.z=side*.2;}cylinder(scarecrow,'#c4a065',[0,1.99,0],[.4,.055,.4]);mesh(scarecrow,geo.cone,'#d7b779',[0,2.13,0],[.24,.27,.24]);ball(scarecrow,palette.eye,[-.08,1.77,.21],[.022,.022,.022]);ball(scarecrow,palette.eye,[.08,1.77,.21],[.022,.022,.022]);
function hay(x,z,scale=1){const g=group(world,x,0,z,rand(-.3,.3));box(g,'#edc976',[0,.34*scale,0],[1.0*scale,.64*scale,.7*scale]);for(const side of [-1,1])box(g,'#b3985b',[side*.27*scale,.34*scale,0],[.045,.68*scale,.73*scale]);for(let i=0;i<6;i++)box(g,'#e6bc68',[0,.68*scale,-.31*scale+i*.12*scale],[1.02*scale,.025,.025]);}
hay(-4.4,-2.15);hay(-3.6,-2.6,.85);hay(-10.1,-4.7,.7);hay(9.8,-5.2,.75);
function crate(x,z,contents='apple'){const g=group(world,x,.15,z,rand(-.18,.18));box(g,palette.woodDark,[0,.03,0],[.86,.06,.6]);for(let i=0;i<3;i++){for(const side of [-1,1])box(g,woodPaint,[0,.14+i*.13,side*.32],[.9,.08,.055]);for(const side of [-1,1])box(g,woodPaint,[side*.46,.14+i*.13,0],[.055,.08,.65]);}for(let i=0;i<7;i++)ball(g,contents==='apple'?'#df8f65':'#dbba68',[rand(-.3,.3),.35,rand(-.2,.2)],[.12,.12,.12]);}
crate(-3.4,-4);crate(6.5,-3.9);crate(6.7,-4.7,'corn');crate(-5.3,-2.05,'corn');
function barrel(x,z){const g=group(world,x,0,z);cylinder(g,woodPaint,[0,.42,0],[.36,.84,.36]);for(const y of [.12,.7])mesh(g,new THREE.TorusGeometry(.362,.026,6,16),'#7f8571',[0,y,0]).rotation.x=Math.PI/2;cylinder(g,'#b98a5c',[0,.85,0],[.35,.05,.35]);}
barrel(-8.8,-2.3);barrel(6.3,-6.7);
const well=group(world,-.3,0,-4.8);for(let i=0;i<12;i++){const a=i*TAU/12;const block=box(well,'#c8c6a6',[Math.cos(a)*.63,.35,Math.sin(a)*.63],[.34,.55,.3]);block.rotation.y=-a;}cylinder(well,'#80a6a1',[0,.17,0],[.52,.05,.52]);for(const side of [-1,1])box(well,palette.wood,[side*.8,1,0],[.13,2,.13]);roof(well,2,1.7,1.9,'#cc9c78');beam(well,'#93825b',[-.8,1.5,0],[.8,1.5,0],.07);beam(well,palette.woodDark,[0,1.5,0],[0,.55,0],.018);cylinder(well,'#b9bdad',[0,.6,0],[.22,.3,.22]);
// Farm gate, miniature wagon and a welcome sign.
const cart=group(world,-3.5,0,5.8,.6);box(cart,woodPaint,[0,.57,0],[1.5,.13,.9]);for(const side of [-1,1]){box(cart,woodPaint,[0,.85,side*.46],[1.55,.45,.07]);for(const xx of [-.55,.55]){const wheel=cylinder(cart,'#665d49',[xx,.3,side*.53],[.32,.11,.32]);wheel.rotation.x=Math.PI/2;const hub=cylinder(cart,palette.woodLight,[xx,.3,side*.6],[.18,.03,.18]);hub.rotation.x=Math.PI/2;}}beam(cart,palette.wood,[0,.5,.4],[0,.22,1.8],.045);for(let i=0;i<4;i++)ball(cart,'#f0cd77',[rand(-.5,.5),.8,rand(-.3,.3)],[.25,.2,.23]);
const welcome=group(world,.6,0,7.6,-.15);for(const side of [-1,1])box(welcome,palette.wood,[side*.55,.6,0],[.09,1.25,.1]);box(welcome,palette.cream,[0,1.1,0],[1.65,.55,.08]);
function textPlane(parent,text,x,y,z,width=1.5,color='#7c8b57',background='#fff1d0'){
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=100;const ctx=canvas.getContext('2d');ctx.fillStyle=background;ctx.fillRect(0,0,256,100);ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 35px sans-serif';ctx.fillText(text,128,51);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;const o=new THREE.Mesh(new THREE.PlaneGeometry(width,width/2.56),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));o.position.set(x,y,z);parent.add(o);return o;
}
textPlane(welcome,'HAPPY FARM',0,1.1,.047,1.6);
// Pennant string beside the barn.
beam(world,'#998d66',[-4.1,2.3,-2.3],[1.0,1.9,-3.3],.013);for(let i=0;i<9;i++){const x=-3.8+i*.53,z=-2.36-i*.1;const s=new THREE.Shape();s.moveTo(-.13,0);s.lineTo(.13,0);s.lineTo(0,-.28);s.closePath();mesh(world,new THREE.ShapeGeometry(s),['#efb393','#ebd888','#a8bdb0'][i%3],[x,2.27-i*.043,z], [1,1,1],{side:THREE.DoubleSide});}
// Natural scatter respects buildings, vegetables and the pond.
function occupied(x,z){return(x<-3&&z<-2)||(x>2&&z<-3)||(x>2&&x<10&&z>-3&&z<3)||(Math.hypot((x+8)/1.2,z-2.8)<2.6);}
for(let i=0;i<190;i++){
  const x=rand(-11.7,11.7),z=rand(-7.5,7.5);if(x*x/150+z*z/67>1||occupied(x,z))continue;
  const type=rand();if(type<.25){flower(world,x,0,z,['#fff2cd','#eeb8b3','#c2b8d6'][Math.floor(rand(0,3))],rand(.12,.25));}
  else if(type<.37)ball(world,'#b5ba95',[x,.07,z],[rand(.1,.2),.1,rand(.1,.17)]);
  else {for(let j=0;j<3;j++){const blade=mesh(world,geo.cone,rand()>.5?'#80a74e':'#a6c263',[x+j*.055,.09,z],[.025,rand(.12,.25),.02]);blade.rotation.z=rand(-.35,.35);}}
}
for(const [x,z] of [[-2,7.5],[6.8,5.8],[-11.2,-1.5]]){for(let i=0;i<3;i++){cylinder(world,'#efdcc4',[x+i*.15,.16,z+i*.1],[.025,.27,.025]);ball(world,'#cf8d70',[x+i*.15,.3,z+i*.1],[.12,.07,.12]);}}

// Bake static meshes by material to keep the rich scene inexpensive to render.
function bakeStatic(root){root.updateMatrixWorld(true);const batches=new Map();root.traverse(o=>{if(!o.isMesh)return;const geometry=(o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone());geometry.applyMatrix4(o.matrixWorld);const key=o.material.uuid;if(!batches.has(key))batches.set(key,{mat:o.material,geos:[]});batches.get(key).geos.push(geometry);});root.clear();for(const {mat,geos} of batches.values()){const merged=mergeGeometries(geos,false);if(merged){const o=new THREE.Mesh(merged,mat);o.castShadow=true;o.receiveShadow=true;root.add(o);}for(const g of geos)g.dispose();}}
bakeStatic(world);

// Animal construction uses rounded shapes, rosy cheeks and tiny sparkly eyes.
const animals=[];
const pickables=[];
let selectedFood=null,hovered=null,drag=null;
function eye(parent,x,y,z,scale=.065){ball(parent,palette.eye,[x,y,z],[scale,scale*1.1,scale*.7]);ball(parent,'#fffbe9',[x-scale*.24,y+scale*.33,z+scale*.6],[scale*.27,scale*.27,scale*.22]);}
function cheeks(parent,x,y,z,size=.085){for(const side of [-1,1])ball(parent,'#efb0a1',[side*x,y,z],[size,size*.6,size*.32]);}
function makeAnimal(record,index){
  const spec=TYPES[record.type],root=group(dynamic,record.x,0,record.z,rand(-.5,.5));root.scale.setScalar(spec.scale);
  const body=group(root),head=group(body,0,0,0),legs=[],ears=[];
  const color=spec.color;
  let tail;
  const bird=record.type==='chicken'||record.type==='duck';
  if(record.type==='rabbit'){
    ball(body,color,[0,.62,0],[.5,.55,.56]);ball(body,color,[0,.78,.42],[.4,.39,.38]);
    for(const side of [-1,1]){const ear=group(body,side*.19,1.02,.38);ear.rotation.z=-side*.15;ball(ear,color,[0,.38,0],[.13,.48,.11]);ball(ear,'#efb7b3',[0,.4,.09],[.065,.31,.025]);ears.push(ear);ball(body,color,[side*.29,.18,.23],[.19,.13,.29]);ball(body,color,[side*.23,.43,.51],[.13,.22,.14]);eye(body,side*.17,.86,.75,.065);}
    ball(body,'#e39793',[0,.73,.803],[.055,.04,.035]);cheeks(body,.26,.72,.73,.09);ball(body,'#ffffff',[0,.53,-.49],[.19,.19,.18]);
  }else if(bird){
    ball(body,color,[0,.57,0],[.44,.47,.53]);ball(body,color,[0,.96,.32],[.31,.31,.3]);
    for(const side of [-1,1]){ball(body,record.type==='duck'?'#f1ddb0':'#f2bf56',[side*.35,.6,0],[.16,.27,.34]);eye(body,side*.13,1.04,.576,.048);const foot=ball(body,'#e7a455',[side*.14,.12,.18],[.13,.05,.2]);legs.push(foot);beam(body,'#e7a455',[side*.14,.1,.12],[side*.14,.35,.12],.028);}
    ball(body,'#eeb266',[0,.89,.66],record.type==='duck'?[.24,.065,.17]:[.1,.075,.13]);
    ball(body,color,[0,.57,-.47],[.2,.22,.24]);cheeks(body,.22,.9,.55,.064);
    if(record.type==='chicken'){for(let i=0;i<3;i++)ball(body,'#dd8a74',[(i-1)*.085,1.25, .33],[.07,.105,.07]);}
  }else{
    const cow=record.type==='cow',pig=record.type==='pig',sheep=record.type==='sheep';
    ball(body,color,[0,.81,-.15],cow?[.67,.56,.88]:[.58,.49,.7]);
    if(sheep){for(let i=0;i<22;i++){const a=i*2.4;const y=.65+((i%4)/3)*.55;const r=Math.sqrt(Math.max(.15,1-((y-.8)/.55)**2));ball(body,i%3?'#fff0d0':'#f8e2b8',[Math.cos(a)*.51*r,y,Math.sin(a)*.64*r-.16],[.22,.23,.22]);}}
    head.position.set(0,.98,.62);ball(head,sheep?'#bba487':color,[0,0,0],cow?[.43,.43,.4]:[.4,.36,.38]);
    for(const side of [-1,1]){
      const ear=group(head,side*.37,.2,0);ear.rotation.z=-side*.65;ball(ear,color,[0,.08,0],[.18,.23,.075]);if(pig)ball(ear,'#e48e91',[0,.09,.06],[.1,.13,.015]);ears.push(ear);eye(head,side*.16,.09,.348,.06);
      for(const z of [-.62,.4]){const l=group(body,side*.36,.3,z);cylinder(l,pig?'#e9a39c':sheep?'#a18b70':palette.cream,[0,0,0],[.11,.42,.11]);ball(l,sheep?'#746958':cow?'#6c6b5d':'#d68b85',[0,-.18,.04],[.125,.1,.14]);legs.push(l);}
    }
    if(pig){ball(head,'#ec9697',[0,-.08,.39],[.23,.15,.11]);for(const side of [-1,1])ball(head,'#bd6c73',[side*.08,-.065,.49],[.022,.039,.014]);cheeks(head,.28,-.065,.31,.078);}
    if(cow){ball(head,'#f2c1ac',[0,-.15,.33],[.36,.21,.2]);for(const side of [-1,1])ball(head,'#c99486',[side*.15,-.16,.515],[.03,.045,.013]);
      for(const side of [-1,1]){mesh(head,geo.cone,'#ddc6a0',[side*.24,.43,-.06],[.08,.27,.08]).rotation.z=side*.2;}
      for(const [x,y,z,s] of [[-.5,.9,-.35,.24],[.5,1,-.5,.24],[.28,1.23,.01,.23],[-.24,1.3,-.45,.27]])ball(body,'#6b7166',[x,y,z],[s,.13,s*1.3]);ball(head,'#6b7166',[-.19,.25,.23],[.13,.12,.095]);
      cylinder(body,'#a7b0a1',[0,.55,.99],[.075,.13,.075]);const collar=mesh(body,new THREE.TorusGeometry(.33,.035,5,16),'#cc9b61',[0,.69,.67]);collar.rotation.x=Math.PI/2;
    }
    if(sheep){for(let i=0;i<6;i++)ball(head,'#fff1d0',[(i%3-1)*.16,.28+Math.floor(i/3)*.12,.04],[.16,.16,.16]);ball(head,'#8d7b68',[0,-.1,.355],[.065,.04,.027]);}
    tail=group(body,0,.8,-.77);if(pig){const t=mesh(tail,new THREE.TorusGeometry(.09,.025,6,14,Math.PI*1.8),'#de9390',[0,0,0]);t.rotation.y=.7;}else{beam(tail,palette.woodDark,[0,0,0],[0,-.33,-.1],.025);ball(tail,cow?'#6b7166':color,[0,-.33,-.1],[.055,.09,.05]);}
  }
  const animal={id:index,record,type:record.type,root,body,head,legs,ears,tail,name:spec.nickname+(index>=8?String(index-7):''),phase:rand(0,TAU),mood:0,happyUntil:0,danceUntil:0,lastFed:-Infinity,baseRotation:root.rotation.y,swimming:record.type==='duck'&&record.x<-6};
  const ring=mesh(root,new THREE.RingGeometry(.72,.79,36),new THREE.MeshBasicMaterial({color:'#fff3b3',transparent:true,opacity:0,side:THREE.DoubleSide}),[0,.035,0]);ring.rotation.x=-Math.PI/2;ring.castShadow=ring.receiveShadow=false;animal.ring=ring;
  root.traverse(o=>{if(o.isMesh&&o!==ring){o.userData.animal=animal;pickables.push(o);}});
  animals.push(animal);return animal;
}
state.animals.forEach(makeAnimal);
const butterflies=[];
for(let i=0;i<7;i++){const g=group(dynamic,rand(-8,8),rand(1,2.5),rand(-6,6));const left=ball(g,i%2?'#f4d584':'#eab2c7',[-.11,0,0],[.13,.025,.16]);const right=ball(g,i%2?'#f4d584':'#eab2c7',[.11,0,0],[.13,.025,.16]);ball(g,'#8a8663',[0,0,0],[.024,.03,.12]);butterflies.push({g,left,right,x:g.position.x,z:g.position.z,phase:rand(0,TAU)});}
const rainCount=260,rainPositions=new Float32Array(rainCount*3);for(let i=0;i<rainCount;i++){rainPositions[i*3]=rand(-13,13);rainPositions[i*3+1]=rand(0,12);rainPositions[i*3+2]=rand(-9,9);}
const rainGeo=new THREE.BufferGeometry();rainGeo.setAttribute('position',new THREE.BufferAttribute(rainPositions,3));const rain=new THREE.Points(rainGeo,new THREE.PointsMaterial({color:'#a5c7c5',size:.085,transparent:true,opacity:.6,depthWrite:false}));rain.visible=false;effects.add(rain);let rainUntil=0;
const timer=new THREE.Timer();timer.connect(document);let elapsed=0,ready=false,lastRain=false;
function resize(){const width=container.clientWidth,height=container.clientHeight;if(!width||!height)return;renderer.setSize(width,height,false);const aspect=width/height;const halfHeight=aspect<1?20.5:11.6;camera.left=-halfHeight*aspect;camera.right=halfHeight*aspect;camera.top=halfHeight;camera.bottom=-halfHeight;camera.updateProjectionMatrix();}
new ResizeObserver(resize).observe(container);resize();
function animate(timestamp){timer.update(timestamp);const dt=Math.min(timer.getDelta(),.06);elapsed+=dt;const t=elapsed;
  controls.update(dt);
  if(!reducedMotion.matches){
    for(const update of animators)update(t);
    for(const a of animals){const p=t+a.phase,happy=t<a.happyUntil,dance=t<a.danceUntil;const hop=(a.type==='rabbit'&&Math.sin(p*.75)>.94)||happy||dance;
      a.body.position.y=hop?Math.abs(Math.sin(p*(dance?7:5)))*.21:Math.sin(p*1.7)*.017;
      a.body.rotation.z=dance?Math.sin(p*6)*.16:0;a.body.rotation.x=happy?Math.sin(p*5)*.055:0;
      if(a.tail)a.tail.rotation.z=Math.sin(p*3)*.32;for(let i=0;i<a.ears.length;i++)a.ears[i].rotation.x=Math.sin(p*2+i)*.06;
      if(a.type==='chicken')a.body.rotation.x=happy?0:Math.max(0,Math.sin(p*1.4))*.12;
      if(a.swimming){a.root.position.x=a.record.x+Math.sin(p*.4)*.27;a.root.position.z=a.record.z+Math.cos(p*.4)*.2;a.root.rotation.y=a.baseRotation+Math.sin(p*.4)*.18;}
      if(dance){a.root.rotation.y=a.baseRotation+Math.sin(p*2)*.48;for(let i=0;i<a.legs.length;i++)a.legs[i].rotation.x=Math.sin(p*6+i*Math.PI)*.24;}else{a.root.rotation.y=a.swimming?a.root.rotation.y:a.baseRotation;for(const leg of a.legs)leg.rotation.x=0;}
    }
    for(const b of butterflies){b.g.position.set(b.x+Math.sin(t*.4+b.phase)*.8,1.6+Math.sin(t*.9+b.phase)*.3,b.z+Math.cos(t*.5+b.phase)*.6);b.left.rotation.z=Math.sin(t*12+b.phase)*.7;b.right.rotation.z=-b.left.rotation.z;}
  }
  for(const a of animals)a.ring.material.opacity=(a===hovered||selectedFood&&TYPES[a.type].food===selectedFood)?(reducedMotion.matches?.7:.65+Math.sin(t*3)*.2):0;
  rain.visible=t<rainUntil;
  if(rain.visible!==lastRain){lastRain=rain.visible;document.querySelector('.weather').textContent=rain.visible?'☂  小雨 · 24°':'☀  晴天 · 24°';}
  if(rain.visible&&!reducedMotion.matches){for(let i=0;i<rainCount;i++){rainPositions[i*3+1]-=dt*5;if(rainPositions[i*3+1]<0)rainPositions[i*3+1]=rand(9,12);}rainGeo.attributes.position.needsUpdate=true;}
  renderer.render(scene,camera);if(!ready){ready=true;$('loading').hidden=true;}
}
renderer.setAnimationLoop(animate);

function toast(text,error=false){const el=document.createElement('div');el.className='toast'+(error?' error':'');el.textContent=text;$('toast-container').append(el);setTimeout(()=>el.remove(),3400);while($('toast-container').children.length>3)$('toast-container').firstElementChild.remove();}
function screenPoint(a){const p=new THREE.Vector3(0,a.type==='rabbit'?1.45:1.7,0);a.root.localToWorld(p);p.project(camera);return {x:(p.x*.5+.5)*container.clientWidth,y:(-.5*p.y+.5)*container.clientHeight};}
function floatText(a,text,heart=false){const pos=screenPoint(a),el=document.createElement('span');el.className='float-text'+(heart?' heart':'');el.textContent=text;el.style.left=pos.x+'px';el.style.top=pos.y+'px';el.style.color=heart?'#f09291':'#8ca65a';$('float-layer').append(el);setTimeout(()=>el.remove(),1800);}
function refreshUI(){
  $('coins').textContent=state.coins.toLocaleString('en-US');$('market-coins').textContent=state.coins.toLocaleString('en-US');$('animal-count').textContent=animals.length;$('feed-count').textContent=state.feeds;
  $('happy-score').innerHTML=Math.min(100,86+Math.min(14,state.feeds))+'<span>%</span>';$('xp-text').textContent=(state.xp%300)+' / 300';$('xp-bar').style.width=(state.xp%300)/3+'%';document.querySelector('.level-badge').textContent='Lv. '+(3+Math.floor(state.xp/300));
  $('mission-count').textContent=Math.min(5,state.feeds)+'/5';$('mission-bar').style.width=Math.min(100,state.feeds*20)+'%';$('mission-state').textContent=state.missionDone?'已领取':'进行中';
  for(const key of Object.keys(FOODS)){const stock=document.querySelector(`[data-stock="${key}"]`);if(stock)stock.textContent=state.stock[key];}
  document.querySelectorAll('.buy-button').forEach(button=>{button.disabled=state.coins<TYPES[button.dataset.type].price||animals.length>=24;});
}
let audioContext=null,sound=false;
function chime(){if(!sound)return;try{audioContext??=new(window.AudioContext||window.webkitAudioContext)();audioContext.resume();for(let i=0;i<3;i++){const osc=audioContext.createOscillator(),gain=audioContext.createGain();osc.type='sine';osc.frequency.value=[523,659,784][i];gain.gain.setValueAtTime(0,audioContext.currentTime+i*.07);gain.gain.linearRampToValueAtTime(.035,audioContext.currentTime+i*.07+.012);gain.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+i*.07+.22);osc.connect(gain);gain.connect(audioContext.destination);osc.start(audioContext.currentTime+i*.07);osc.stop(audioContext.currentTime+i*.07+.23);}}catch{/* Audio is optional. */}}
function feedAnimal(a,food,source='player'){
  if(!a)return false;const spec=TYPES[a.type];if(spec.food!==food){toast(`${a.name}更喜欢${FOODS[spec.food].name}哦 ${FOODS[spec.food].emoji}`,true);floatText(a,'换个口味吧');return false;}
  if(performance.now()-a.lastFed<2000){toast(`${a.name}还在慢慢嚼，等一小会儿吧`);return false;}
  if(state.stock[food]<=0){toast('食物用完啦，花 20 农场币补充 10 份吧',true);return false;}
  state.stock[food]--;state.feeds++;state.coins+=15;state.xp+=12;a.lastFed=performance.now();a.happyUntil=elapsed+3.2;floatText(a,'♡ 好吃！ +15');chime();
  if(state.feeds>=5&&!state.missionDone){state.missionDone=true;state.coins+=150;toast('今日小目标达成！领取 150 农场币 ✦');}
  refreshUI();save();if(source==='player')addChat('农场小助手',`${a.name}吃到了${FOODS[food].name}，开心值 +1`,'🌱');return true;
}
function replenish(food){if(state.coins<20){toast('农场币不足，先参加弹幕互动赚一点吧',true);return false;}state.coins-=20;state.stock[food]+=10;refreshUI();save();toast(`${FOODS[food].name}补充了 10 份，花费 20 农场币`);return true;}
function setFood(food){selectedFood=food;document.querySelectorAll('.food-card').forEach(el=>el.classList.toggle('selected',el.dataset.food===food));$('drop-hint').hidden=!food;if(food)$('drop-hint').textContent=`${FOODS[food].emoji} 点击或拖到亮起的伙伴身上`;}
for(const [key,food] of Object.entries(FOODS)){
  const button=document.createElement('button');button.className='food-card';button.dataset.food=key;button.setAttribute('aria-label',`${food.name}，拖动到动物身上或点击选择`);button.innerHTML=`<span class="food-stock" data-stock="${key}">${state.stock[key]}</span><span class="food-emoji">${food.emoji}</span><span class="food-name">${food.name}</span>`;
  button.addEventListener('pointerdown',event=>{if(event.button!==0)return;if(!state.stock[key]){replenish(key);return;}event.preventDefault();setFood(key);drag={food:key,startX:event.clientX,startY:event.clientY,moved:false,pointerId:event.pointerId};button.setPointerCapture(event.pointerId);controls.enabled=false;$('drag-food').textContent=food.emoji;$('drag-food').style.left=event.clientX+'px';$('drag-food').style.top=event.clientY+'px';});
  button.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();if(!state.stock[key])replenish(key);else setFood(selectedFood===key?null:key);}});
  $('food-list').append(button);
}
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
function pickAnimal(clientX,clientY){const rect=renderer.domElement.getBoundingClientRect();if(clientX<rect.left||clientX>rect.right||clientY<rect.top||clientY>rect.bottom)return null;pointer.set((clientX-rect.left)/rect.width*2-1,-(clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);return raycaster.intersectObjects(pickables,false)[0]?.object.userData.animal||null;}
function showTooltip(a){const tooltip=$('animal-tooltip');if(!a){tooltip.hidden=true;return;}const pos=screenPoint(a);tooltip.style.left=Math.max(65,Math.min(container.clientWidth-65,pos.x))+'px';tooltip.style.top=Math.max(66,pos.y-10)+'px';tooltip.replaceChildren();const title=document.createElement('strong');title.textContent=`${TYPES[a.type].emoji} ${a.name}`;const small=document.createElement('small');small.textContent=`喜欢${FOODS[TYPES[a.type].food].name} · 点我打招呼`;tooltip.append(title,small);tooltip.hidden=false;}
document.addEventListener('pointermove',event=>{if(drag){drag.moved ||= Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY)>6;$('drag-food').hidden=!drag.moved;$('drag-food').style.left=event.clientX+'px';$('drag-food').style.top=event.clientY+'px';hovered=pickAnimal(event.clientX,event.clientY);showTooltip(hovered);}});
function endDrag(event,cancelled=false){if(!drag)return;const {food,moved}=drag;if(moved&&!cancelled){const animal=pickAnimal(event.clientX,event.clientY);if(animal){feedAnimal(animal,food);setFood(null);}else toast('把食物放到小动物身上，再试一次吧');}drag=null;controls.enabled=true;$('drag-food').hidden=true;hovered=null;showTooltip(null);}
document.addEventListener('pointerup',event=>endDrag(event));document.addEventListener('pointercancel',event=>endDrag(event,true));window.addEventListener('blur',()=>{if(drag)endDrag({},true);});
let canvasDown=null;
renderer.domElement.addEventListener('pointerdown',event=>{canvasDown={x:event.clientX,y:event.clientY};});
renderer.domElement.addEventListener('pointermove',event=>{if(drag)return;hovered=pickAnimal(event.clientX,event.clientY);showTooltip(hovered);renderer.domElement.style.cursor=hovered?'pointer':'grab';});
renderer.domElement.addEventListener('pointerleave',()=>{if(!drag){hovered=null;showTooltip(null);}});
renderer.domElement.addEventListener('pointerup',event=>{if(!canvasDown||Math.hypot(event.clientX-canvasDown.x,event.clientY-canvasDown.y)>6)return;canvasDown=null;const a=pickAnimal(event.clientX,event.clientY);if(!a){setFood(null);return;}if(selectedFood){feedAnimal(a,selectedFood);setFood(null);}else {a.happyUntil=elapsed+2;floatText(a,'♡',true);toast(`${a.name}：今天也要开心呀！`);chime();}});

function shopIllustration(type){const color=TYPES[type].color;let details='';if(type==='rabbit')details='<ellipse cx="45" cy="21" rx="8" ry="20" fill="#fff4e2" transform="rotate(-9 45 21)"/><ellipse cx="67" cy="21" rx="8" ry="20" fill="#fff4e2" transform="rotate(9 67 21)"/><ellipse cx="45" cy="21" rx="4" ry="14" fill="#efb7b3"/><ellipse cx="67" cy="21" rx="4" ry="14" fill="#efb7b3"/>';
  else if(type==='cow')details='<path d="M36 31 30 18 40 25M71 30 80 18 68 25" fill="#d4bb91"/><ellipse cx="32" cy="47" rx="10" ry="7" fill="#727567"/>';
  else if(type==='sheep')details=Array.from({length:10},(_,i)=>`<circle cx="${35+(i%5)*11}" cy="${40+Math.floor(i/5)*13}" r="12" fill="#fff0d0"/>`).join('');
  else if(type==='chicken')details='<path d="M49 27q-7-13 1-13 5-9 10 0 10 0 4 13" fill="#e69779"/>';
  const snout=type==='pig'?'<ellipse cx="59" cy="57" rx="13" ry="8" fill="#e99092"/><circle cx="54" cy="57" r="2" fill="#b26d71"/><circle cx="64" cy="57" r="2" fill="#b26d71"/>':type==='duck'||type==='chicken'?'<ellipse cx="59" cy="57" rx="12" ry="5" fill="#e7aa54"/>':type==='cow'?'<ellipse cx="59" cy="59" rx="18" ry="10" fill="#efc0ad"/>':'<path d="m56 57 3 4 3-4" fill="#c78d8b"/>';
  return `<svg viewBox="0 0 120 90" aria-hidden="true"><ellipse cx="61" cy="79" rx="32" ry="4" fill="#abbb8925"/><ellipse cx="60" cy="61" rx="27" ry="18" fill="${color}"/><ellipse cx="43" cy="76" rx="10" ry="5" fill="${color}"/><ellipse cx="73" cy="76" rx="10" ry="5" fill="${color}"/>${details}<ellipse cx="58" cy="46" rx="25" ry="23" fill="${type==='sheep'?'#bba58b':color}"/><ellipse cx="34" cy="39" rx="10" ry="6" fill="${color}"/><ellipse cx="82" cy="39" rx="10" ry="6" fill="${color}"/><circle cx="49" cy="46" r="3" fill="#4b5148"/><circle cx="68" cy="46" r="3" fill="#4b5148"/><circle cx="50" cy="45" r="1" fill="white"/><circle cx="69" cy="45" r="1" fill="white"/><ellipse cx="41" cy="55" rx="5" ry="3" fill="#e6a29a"/><ellipse cx="76" cy="55" rx="5" ry="3" fill="#e6a29a"/>${snout}</svg>`;
}
for(const [type,spec] of Object.entries(TYPES)){const card=document.createElement('article');card.className='animal-shop-card';card.innerHTML=`<div class="animal-shop-image" style="--animal-bg:${spec.bg}">${shopIllustration(type)}</div><div class="animal-shop-title"><h3>${spec.name}</h3><span>${spec.tag}</span></div><p>${spec.description}</p><button class="buy-button" data-type="${type}"><span>带回农场 ＋</span><strong>✦ ${spec.price}</strong></button>`;card.querySelector('button').addEventListener('click',()=>buyAnimal(type));$('market-grid').append(card);}
function newPosition(){for(let i=0;i<90;i++){const x=rand(-2.5,6),z=rand(2.7,6.8);if(animals.every(a=>Math.hypot(a.record.x-x,a.record.z-z)>1.0))return {x,z};}return {x:rand(-4,6),z:rand(2.5,6.8)};}
function buyAnimal(type){const spec=TYPES[type];if(!spec)return false;if(animals.length>=24){toast('农场有 24 位伙伴啦，先陪陪它们吧',true);return false;}if(state.coins<spec.price){toast('农场币还不够，喂食伙伴能赚取奖励哦',true);return false;}const p=newPosition(),record={type,...p};state.coins-=spec.price;state.animals.push(record);const a=makeAnimal(record,animals.length);a.happyUntil=elapsed+4;state.xp+=20;refreshUI();save();toast(`${spec.emoji} ${a.name}加入农场啦！欢迎新伙伴`);floatText(a,'新伙伴 ♡');chime();addChat('农场小助手',`欢迎${a.name}！它最喜欢${FOODS[spec.food].name}`,'🌱');return true;}
function openMarket(){refreshUI();if(!$('market-dialog').open)$('market-dialog').showModal();}
$('market-tab').addEventListener('click',openMarket);$('market-shortcut').addEventListener('click',openMarket);$('guide-tab').addEventListener('click',()=>$('guide-dialog').showModal());$('farm-tab').addEventListener('click',()=>{for(const d of document.querySelectorAll('dialog'))d.close();resetView();});document.querySelectorAll('.close-modal').forEach(button=>button.addEventListener('click',()=>button.closest('dialog').close()));document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}}));
function resetView(){camera.position.set(25,30,32);camera.zoom=1;controls.target.set(0,.6,0);camera.updateProjectionMatrix();controls.update();}
$('reset-view').addEventListener('click',resetView);$('zoom-in').addEventListener('click',()=>{camera.zoom=Math.min(2.5,camera.zoom*1.16);camera.updateProjectionMatrix();});$('zoom-out').addEventListener('click',()=>{camera.zoom=Math.max(.75,camera.zoom/1.16);camera.updateProjectionMatrix();});
$('photo-button').addEventListener('click',()=>{renderer.render(scene,camera);const link=document.createElement('a');link.download='开心农场.png';link.href=renderer.domElement.toDataURL('image/png');link.click();toast('把这份春日好心情收藏起来 📷');});
$('sound-button').addEventListener('click',()=>{sound=!sound;$('sound-button').setAttribute('aria-pressed',String(sound));$('sound-button').setAttribute('aria-label',sound?'关闭互动音效':'开启互动音效');document.querySelector('.sound-slash').hidden=sound;if(sound)chime();toast(sound?'互动音效已开启 ♫':'互动音效已关闭');});$('profile-button').addEventListener('click',()=>toast(`小满农场 · ${animals.length}位伙伴 · 今日喂食${state.feeds}次`));

// Chat messages are data: use textContent, deduplicate IDs, bound history and rate-limit rewards.
const seenIds=new Set(),rewardCooldown=new Map();let demoInterval=null,socket=null;
function addChat(user,text,emoji='🌷'){const list=$('chat-list');const row=document.createElement('div');row.className='chat-message';const avatar=document.createElement('span');avatar.className='chat-avatar';avatar.textContent=emoji;const content=document.createElement('div'),name=document.createElement('div'),body=document.createElement('div');name.className='name';name.textContent=String(user).slice(0,32);body.className='text';body.textContent=String(text).slice(0,120);content.append(name,body);row.append(avatar,content);list.append(row);while(list.children.length>40)list.firstElementChild.remove();list.scrollTop=list.scrollHeight;}
function receiveDanmaku(message){if(!message||typeof message.text!=='string')return {ok:false,reason:'invalid_message'};const text=message.text.trim().slice(0,120),user=String(message.user||'田园来客').slice(0,32);if(!text)return {ok:false,reason:'empty_message'};
  if(message.id){const id=String(message.id);if(seenIds.has(id))return {ok:false,reason:'duplicate'};seenIds.add(id);if(seenIds.size>500)seenIds.delete(seenIds.values().next().value);}
  addChat(user,text,['🌷','🍃','🌻','🍑'][Math.floor(rand(0,4))]);
  const now=performance.now(),last=rewardCooldown.get(user)??-Infinity;if(now-last<2500)return {ok:false,reason:'cooldown'};rewardCooldown.set(user,now);if(rewardCooldown.size>500)rewardCooldown.delete(rewardCooldown.keys().next().value);
  let action='chat';
  const type=Object.keys(TYPES).find(key=>text.includes(TYPES[key].name)||text.includes({cow:'牛',sheep:'羊',pig:'猪',chicken:'鸡',duck:'鸭',rabbit:'兔'}[key]));
  if(/^(买|购买|领养)\s*/.test(text)){action='buy';if(!type)return {ok:false,reason:'unknown_animal'};return {ok:buyAnimal(type),action};}
  if(/喂|投喂/.test(text)){action='feed';const candidates=animals.filter(a=>(!type||a.type===type)&&performance.now()-a.lastFed>=2000);if(!candidates.length){toast('伙伴们正在咀嚼，稍等一下吧');return {ok:false,action,reason:'no_target'};}const a=candidates[Math.floor(rand(0,candidates.length))];return {ok:feedAnimal(a,TYPES[a.type].food,'chat'),action};}
  if(/跳舞|蹦迪|派对/.test(text)){action='dance';for(const a of animals)a.danceUntil=elapsed+8;for(const a of animals.slice(0,4))floatText(a,'♫',true);toast('田园小舞会开始啦！ ♫');}
  else if(/下雨|浇水/.test(text)){action='rain';rainUntil=elapsed+12;toast('一场温柔的小雨，菜园喝饱水啦 ☂');}
  else if(/爱心|喜欢|点赞/.test(text)){action='love';for(const a of animals){a.happyUntil=elapsed+3;floatText(a,'♡',true);}toast('收到你的爱心啦，伙伴们超开心 ♡');}
  if(action!=='chat'){state.coins+=8;refreshUI();save();chime();}return {ok:true,action};
}
$('chat-form').addEventListener('submit',event=>{event.preventDefault();const input=$('chat-input');receiveDanmaku({user:'我',text:input.value});input.value='';});document.querySelectorAll('[data-command]').forEach(button=>button.addEventListener('click',()=>receiveDanmaku({user:'我',text:button.dataset.command})));
function toggleDemo(){if(demoInterval){clearInterval(demoInterval);demoInterval=null;}else{const sample=[['向日葵同学','喂食 兔子'],['草莓奶昔','跳舞'],['山里的风','喂食 牛'],['一颗小土豆','爱心'],['橘子汽水','喂食 小鸡'],['小雨点','下雨'],['今天也开心','喂食 小猪']];let i=0;demoInterval=setInterval(()=>{const [user,text]=sample[i++%sample.length];receiveDanmaku({user,text,id:'demo-'+Date.now()});},4200);toast('模拟弹幕已开启，农场要热闹起来啦');}$('demo-toggle').classList.toggle('enabled',!!demoInterval);$('demo-state').textContent=demoInterval?'已开启':'已关闭';}
$('demo-toggle').addEventListener('click',toggleDemo);
$('chat-tab').addEventListener('click',()=>document.querySelector('.sidebar').classList.toggle('mobile-open'));
$('sidebar-close').addEventListener('click',()=>document.querySelector('.sidebar').classList.remove('mobile-open'));
function connectDanmaku(url){const parsed=new URL(url,location.href);if(!['ws:','wss:'].includes(parsed.protocol))throw new Error('弹幕服务需使用 ws:// 或 wss://');if(location.protocol==='https:'&&parsed.protocol!=='wss:')throw new Error('HTTPS 页面需要 wss:// 弹幕服务');socket?.close();socket=new WebSocket(parsed.href);const current=socket;current.addEventListener('open',()=>{if(socket!==current)return;$('chat-mode').textContent='服务已连接';toast('弹幕服务已连接');});current.addEventListener('message',event=>{if(socket!==current||typeof event.data!=='string'||event.data.length>4096)return;try{receiveDanmaku(JSON.parse(event.data));}catch{/* Ignore malformed frames. */}});current.addEventListener('error',()=>{if(socket===current)toast('弹幕服务连接失败，请检查地址和授权',true);});current.addEventListener('close',()=>{if(socket===current){$('chat-mode').textContent='本地互动';socket=null;}});return current;}
window.HappyFarm={receiveDanmaku,connectDanmaku,disconnectDanmaku(){socket?.close();socket=null;$('chat-mode').textContent='本地互动';},getState:()=>structuredClone(state),getAnimalScreenPositions:()=>animals.map(a=>({id:a.id,type:a.type,name:a.name,...screenPoint(a)}))};
addChat('农场小助手','欢迎回家！给小伙伴们喂点好吃的吧','🌱');addChat('草莓奶昔','这个农场也太可爱了吧 ♡','🍓');addChat('向日葵同学','小兔子蹦蹦跳跳的，好治愈','🌻');addChat('农场小助手','试试发送「跳舞」，一起开个小舞会','🌱');refreshUI();
if(!storageAvailable)toast('浏览器存储不可用，这次农场进度将仅保留在当前页面',true);
window.addEventListener('pagehide',()=>{save();if(demoInterval)clearInterval(demoInterval);socket?.close();});
