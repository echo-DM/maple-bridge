import * as THREE from 'three';
import { Blocks, makeMaterials, randomSource } from './voxel';
import type { MaterialName, Materials } from './voxel';

export interface PoemWorld {
  scene: THREE.Scene;
  update: (time: number, delta: number, chapter: number, reducedMotion: boolean) => void;
  voxelCount: number;
  bellPosition: THREE.Vector3;
}

export const riverCenter = (z: number) => Math.sin(z * .015) * 11 + Math.sin(z * .033) * 3;
const riverWidth = (z: number) => 22 + Math.sin(z * .017) * 3;
export function groundHeight(x: number, z: number) {
  const bank = Math.abs(x - riverCenter(z)) - riverWidth(z);
  if (bank < 0) return -1.2;
  const slope = Math.min(bank * .08, 4.2);
  const hill = Math.max(0, Math.sin(x * .041) * Math.cos(z * .024)) * Math.min(bank * .07, 5);
  return Math.floor((1.5 + slope + hill) / .75) * .75;
}

function tree(b: Blocks, x: number, y: number, z: number, scale: number, random: () => number, pine = false) {
  const trunk = scale * .8;
  b.box(x, y + 4 * scale, z, trunk, 8 * scale, trunk, 'wood', .8);
  b.box(x - 1.3 * scale, y + 6 * scale, z, 2.7 * scale, .7 * scale, .7 * scale, 'wood');
  b.box(x + 1.4 * scale, y + 7 * scale, z + 1.1 * scale, 3 * scale, .8 * scale, .8 * scale, 'wood');
  if (pine) {
    for (let i = 0; i < 5; i++) {
      const size = (8 - i * 1.35) * scale;
      b.box(x, y + (5 + i * 1.4) * scale, z, size, 1.6 * scale, size, 'pine', .82 + random() * .22);
    }
    return;
  }
  const main: MaterialName = random() < .45 ? 'mapleRed' : random() < .6 ? 'mapleOrange' : 'mapleGold';
  const unit = 1.75 * scale;
  for (let ix = -3; ix <= 3; ix++) for (let iy = -2; iy <= 2; iy++) for (let iz = -3; iz <= 3; iz++) {
    if (ix * ix / 10 + iy * iy / 5 + iz * iz / 10 > 1.22 || random() < .16) continue;
    const material: MaterialName = random() < .17 ? 'mapleOrange' : main;
    b.box(x + ix * unit, y + 9 * scale + iy * unit, z + iz * unit, unit * .98, unit * .98, unit * .98, material, .72 + random() * .42);
  }
  for (let i = 0; i < 8; i++) {
    const lx = x + (random() - .5) * scale * 11;
    const lz = z + (random() - .5) * scale * 11;
    const ly = groundHeight(lx, lz);
    if (ly >= 0) b.box(lx, ly + .1, lz, .55, .12, .7, main);
  }
}

function tiledRoof(b: Blocks, x: number, baseY: number, z: number, width: number, depth: number, levels = 6) {
  for (let layer = 0; layer < levels; layer++) {
    const inset = layer * 1.25;
    b.box(x, baseY + layer * .65, z, width - inset * 2, .65, depth - inset * 1.75, layer === 0 ? 'roofEdge' : 'roof');
  }
  b.box(x, baseY + levels * .65, z, Math.max(3, width - levels * 2.5), .6, 1.1, 'roofEdge');
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      b.box(x + sx * (width / 2 - .7 + i * .55), baseY + .5 + i * .55, z + sz * (depth / 2 - .7), 1.2, .6, 1.2, 'roofEdge');
    }
  }
}

function lantern(b: Blocks, x: number, y: number, z: number, scale = 1) {
  b.box(x, y + 1.15 * scale, z, .12 * scale, .9 * scale, .12 * scale, 'darkWood');
  b.box(x, y, z, .95 * scale, 1.2 * scale, .95 * scale, 'lantern');
  b.box(x, y + .65 * scale, z, 1.1 * scale, .16 * scale, 1.1 * scale, 'redWood');
  b.box(x, y - .65 * scale, z, 1.1 * scale, .16 * scale, 1.1 * scale, 'redWood');
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(x + sx * .43 * scale, y, z + sz * .43 * scale, .1 * scale, 1.2 * scale, .1 * scale, 'darkWood');
  b.box(x, y - .95 * scale, z, .1 * scale, .5 * scale, .1 * scale, 'redWood');
}

function hall(b: Blocks, x: number, y: number, z: number, width: number, depth: number, height: number) {
  b.box(x, y + .7, z, width + 3, 1.4, depth + 3, 'stone');
  b.box(x, y + 1.5, z, width + 1, .3, depth + 1, 'darkWood');
  b.box(x, y + height / 2 + 1.5, z, width - 1, height, depth - 1, 'wall');
  b.box(x, y + height / 2 + 1.5, z + depth / 2, width - 2, height - 1, .5, 'darkWood');
  const n = Math.floor(width / 4);
  for (let i = 0; i <= n; i++) {
    const px = x - width / 2 + i * width / n;
    b.box(px, y + height / 2 + 1.7, z + depth / 2 + .5, .65, height + .4, .65, 'redWood');
    if (i < n) {
      const wx = px + width / n / 2;
      b.box(wx, y + 4.8, z + depth / 2 + .3, width / n - 1.1, 3.2, .25, 'window');
      for (let k = -1; k <= 1; k++) b.box(wx + k * .55, y + 4.8, z + depth / 2 + .55, .13, 3.3, .2, 'darkWood');
      b.box(wx, y + 4.8, z + depth / 2 + .6, width / n - .9, .13, .2, 'darkWood');
    }
  }
  b.box(x, y + height + 1.5, z, width + 2, .6, depth + 2, 'redWood');
  tiledRoof(b, x, y + height + 2, z, width + 8, depth + 7);
  for (let i = 0; i < 4; i++) b.box(x, y + .2 + i * .3, z + depth / 2 + 3.8 - i * .8, width * .45, .4, 1, 'stone');
  for (const sx of [-1, 1]) lantern(b, x + sx * (width / 2 - 1.5), y + height - .8, z + depth / 2 + 1.2);
}

function bridge(b: Blocks) {
  const z = 32, center = riverCenter(z), half = 33;
  for (let i = 0; i <= 32; i++) {
    const x = center - half + i * 2;
    const t = (i - 16) / 16;
    const top = 3 + Math.round(Math.cos(t * Math.PI / 2) * 8) * .85;
    // The stepped masonry forms a single open arch over the navigable river.
    const archBottom = Math.abs(t) < .82 ? Math.max(1, top - 2.1) : -.4;
    b.box(x, (top + archBottom) / 2, z, 2, top - archBottom, 7, 'stone', .83 + i % 3 * .05);
    b.box(x, top + .2, z, 2.05, .4, 7.3, 'bank');
    for (const side of [-1, 1]) {
      b.box(x, top + 1.7, z + side * 3.3, 2, .45, .6, 'stone');
      if (i % 2 === 0) {
        b.box(x, top + 1, z + side * 3.3, .65, 2, .65, 'stone');
        b.box(x, top + 2.1, z + side * 3.3, .85, .3, .85, 'frost');
      }
    }
  }
  for (const side of [-1, 1]) {
    const x = center + side * 28;
    b.box(x, 5, z + 4.3, .45, 8, .45, 'darkWood');
    b.box(x - side, 8.8, z + 4.3, 2.4, .25, .25, 'darkWood');
    lantern(b, x - side * 1.8, 7.8, z + 4.3, 1.25);
  }
}

function buildTemple(scene: THREE.Scene, b: Blocks, materials: Materials) {
  const y = 4.5;
  b.box(-59, 2.5, -63, 61, 5, 72, 'darkStone');
  b.box(-59, y + .2, -63, 59, .5, 70, 'stone');
  // An enclosed courtyard, with the gate facing the river and approaching path.
  for (const x of [-88, -30]) {
    b.box(x, y + 2.8, -63, 1.1, 5.6, 70, 'wall');
    b.box(x, y + 5.8, -63, 2, .7, 72, 'roof');
  }
  for (const x of [-79, -39]) {
    b.box(x, y + 2.7, -29, 18, 5.4, 1, 'wall');
    b.box(x, y + 5.7, -29, 19, .7, 2.2, 'roof');
  }
  b.box(-59, y + 2.8, -98, 59, 5.6, 1, 'wall');
  b.box(-59, y + 5.8, -98, 61, .7, 2, 'roof');
  hall(b, -58, y, -80, 27, 17, 8.5);
  hall(b, -58, y, -29, 15, 7, 6.4);
  hall(b, -35, y, -60, 7, 24, 5);
  // Gate sign, pixel-drawn text rather than a remote font or asset.
  const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 64;
  const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#352d27'; ctx.fillRect(0, 0, 256, 64);
  ctx.fillStyle = '#dfbe77'; ctx.textAlign = 'center'; ctx.font = '40px "Songti SC", serif'; ctx.fillText('寒 山 寺', 128, 47);
  const signTexture = new THREE.CanvasTexture(canvas); signTexture.colorSpace = THREE.SRGBColorSpace;
  signTexture.magFilter = THREE.NearestFilter;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(5.8, 1.45), new THREE.MeshBasicMaterial({ map: signTexture }));
  sign.position.set(-58, y + 6.4, -24.9); scene.add(sign);
  // Stone courtyard paving, incense burner, a stair path to the river.
  for (let x = -68; x <= -48; x += 2) for (let z = -69; z <= -38; z += 2) b.box(x, y + .55, z, 1.88, .2, 1.88, 'bank', .87 + ((x + z) % 5) * .02);
  b.box(-58, y + 2.1, -60, 3.2, 2.2, 2.4, 'gold');
  for (const x of [-59.2, -56.8]) b.box(x, y + .9, -60, .5, 1.5, 1.3, 'darkStone');
  b.box(-58, y + 3.3, -60, 3.8, .35, 3, 'gold');
  for (let i = 0; i < 10; i++) b.box(-58, y - .23 * i, -22 + i * 1.3, 9, .5, 1.5, 'stone');
  for (let i = 0; i < 28; i++) {
    const t = i / 27;
    const x = -58 + t * 32, z = -7 + t * 33;
    b.box(x, groundHeight(x, z) + .15, z, 3.4, .22, 3.2, 'bank');
  }
  const bx = -78, bz = -49;
  b.box(bx, y + .8, bz, 12, 1.6, 12, 'stone');
  for (const dx of [-4.2, 4.2]) for (const dz of [-4.2, 4.2]) b.box(bx + dx, y + 6.6, bz + dz, .8, 12, .8, 'redWood');
  b.box(bx, y + 11.8, bz, 10, .8, 10, 'redWood');
  tiledRoof(b, bx, y + 12.2, bz, 15, 15, 5);
  for (const side of [-1, 1]) lantern(b, bx + side * 4, y + 9.2, bz + 4.4, .8);
  // The upper bell chamber rises above the maple canopy, linking distant views.
  b.box(bx, y + 14.8, bz, 10.5, .65, 10.5, 'darkWood');
  for (const dx of [-4.2, 4.2]) for (const dz of [-4.2, 4.2]) b.box(bx + dx, y + 19.5, bz + dz, .75, 10, .75, 'redWood');
  for (const side of [-1, 1]) {
    b.box(bx + side * 4.5, y + 15.9, bz, .4, 1.5, 9, 'redWood');
    b.box(bx, y + 15.9, bz + side * 4.5, 9, 1.5, .4, 'redWood');
    lantern(b, bx + side * 4, y + 20.3, bz + 4.4, .8);
  }
  b.box(bx, y + 24.2, bz, 10, .8, 10, 'redWood');
  tiledRoof(b, bx, y + 24.7, bz, 15, 15, 5);
  const bell = new THREE.Group(); bell.position.set(bx, y + 20, bz);
  const bellBlocks = new Blocks(materials);
  bellBlocks.box(0, -.3, 0, 2.4, 3, 2.4, 'gold');
  bellBlocks.box(0, -1.9, 0, 3.2, .45, 3.2, 'gold');
  bellBlocks.box(0, 1.4, 0, .5, .7, .5, 'gold'); bellBlocks.finish(bell); scene.add(bell);
  for (const [x, z] of [[-45, -43], [-73, -67], [-47, -91]]) {
    b.box(x, y + 1, z, 1.8, 2, 1.8, 'stone');
    b.box(x, y + 2.7, z, 2.3, 1.4, 2.3, 'darkWood');
    b.box(x, y + 2.7, z + 1.2, 1.5, .8, .1, 'lantern');
    b.box(x, y + 3.7, z, 3.2, .6, 3.2, 'roof');
  }
  return bell;
}

function buildBoat(materials: Materials, guest: boolean) {
  const boat = new THREE.Group();
  const b = new Blocks(materials);
  const length = guest ? 16 : 10, width = guest ? 4.9 : 3.2;
  for (let i = 0; i < length; i++) {
    const z = -length / 2 + i;
    const taper = 1 - Math.pow(Math.abs(z) / (length / 2), 3) * .6;
    b.box(0, .5, z, width * taper, .7, 1.05, 'darkWood');
    b.box(0, .94, z, (width - .6) * taper, .2, 1.03, 'wood');
    for (const sx of [-1, 1]) b.box(sx * (width / 2 - .3) * taper, 1.4, z, .35, .9, 1.05, 'wood');
  }
  if (guest) {
    b.box(0, 2.5, -2, 3.7, 2.8, 7, 'darkWood');
    b.box(0, 3.6, -2, 3.9, .5, 7.6, 'paper');
    b.box(0, 4.1, -2, 3.1, .5, 7.6, 'paper');
    b.box(0, 4.55, -2, 1.9, .4, 7.6, 'paper');
    for (const x of [-2, 2]) {
      b.box(x, 2.5, -2, .1, 1.3, 4, 'window');
      for (let z = -4; z <= 0; z++) b.box(x * 1.01, 2.5, z, .13, 1.5, .13, 'darkWood');
    }
    b.box(0, 2.2, 4.8, 1.15, 1.65, .95, 'robe');
    b.box(0, 3.5, 4.9, .75, .85, .75, 'skin');
    b.box(0, 3.95, 4.9, .9, .35, .9, 'black');
    b.box(-.75, 2.2, 5.1, .4, .5, 1.3, 'robe');
    b.box(.75, 2.2, 5.1, .4, .5, 1.3, 'robe');
    b.box(-.45, 1.3, 5.3, .5, .45, 1.7, 'black');
    b.box(.45, 1.3, 5.3, .5, .45, 1.7, 'black');
    b.box(-1.5, 3.5, 1.5, .14, 5.4, .14, 'darkWood');
    b.box(-.6, 5.9, 1.5, 1.8, .18, .18, 'darkWood');
    lantern(b, .15, 4.8, 1.5, .85);
    b.box(-.9, 1.3, 6.3, 1.1, .5, .75, 'paper');
  } else {
    lantern(b, 0, 2.6, 1.4, .8);
    b.box(0, 2.2, 1.4, .14, 2.8, .14, 'darkWood');
    b.box(0, 1.5, -2, 2.2, .35, 2.2, 'paper');
    b.box(1.7, 1.6, -1.5, .16, .16, 7.5, 'wood', 1, .35);
  }
  b.finish(boat); return boat;
}

function city(b: Blocks, random: () => number) {
  for (let x = -140; x < 124; x += 4) {
    b.box(x, 9, -164, 4, 12, 3, 'darkStone', .62);
    b.box(x, 15.5, -164, 2.2, 1.5, 3.5, 'stone', .65);
  }
  for (const x of [-111, -38, 45, 112]) {
    b.box(x, 13, -164, 11, 19, 9, 'darkStone', .7);
    tiledRoof(b, x, 23, -164, 17, 14, 5);
    b.box(x, 20, -159.4, 1, 2.2, .2, 'window');
  }
  for (let i = 0; i < 52; i++) {
    const x = -150 + random() * 300, z = -178 - random() * 62;
    const y = 6 + random() * 5, w = 6 + random() * 10, d = 7 + random() * 8;
    b.box(x, y, z, w, 8 + random() * 6, d, 'wall', .52);
    tiledRoof(b, x, y + 5, z, w + 3, d + 3, 3);
    if (random() < .38) b.box(x, y, z + d / 2 + .2, .7, 1, .15, 'window', .65);
  }
  for (let i = 0; i < 5; i++) {
    const width = 14 - i * 2;
    b.box(31, 16 + i * 6.5, -210, width - 2, 6, width - 2, 'redWood', .55);
    tiledRoof(b, 31, 19 + i * 6.5, -210, width + 3, width + 3, 3);
  }
}

function createSky(scene: THREE.Scene, random: () => number, materials: Materials) {
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1600, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { upper: { value: new THREE.Color('#071321') }, lower: { value: new THREE.Color('#344955') } },
    vertexShader: 'varying vec3 vPosition; void main(){vPosition=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `uniform vec3 upper;uniform vec3 lower;varying vec3 vPosition;void main(){float h=normalize(vPosition).y;vec3 c=mix(lower,upper,smoothstep(-.08,.65,h));gl_FragColor=vec4(c,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
  })); sky.renderOrder = -2; scene.add(sky);
  const starBlocks = new Blocks({ ...materials, frost: new THREE.MeshBasicMaterial({ color: '#b6c8d2', toneMapped: false, fog: false }) }, false);
  for (let i = 0; i < 280; i++) {
    const angle = random() * Math.PI * 2, altitude = .09 + random() * 1.28, distance = 850;
    const size = .4 + random() * 1.1;
    starBlocks.box(Math.cos(angle) * Math.cos(altitude) * distance, Math.sin(altitude) * distance, Math.sin(angle) * Math.cos(altitude) * distance, size, size, size, 'frost', .35 + random() * .7);
  }
  const stars = new THREE.Group(); starBlocks.finish(stars);
  stars.traverse(o => { if (o instanceof THREE.Mesh) { o.castShadow = false; o.receiveShadow = false; }});
  scene.add(stars);
  const moon = new THREE.Group(); moon.position.set(-131, 64, -355);
  const moonMat = new THREE.MeshBasicMaterial({ color: '#eee5b8', toneMapped: false, fog: false });
  const moonBlocks = new Blocks({ ...materials, frost: moonMat }, false);
  for (let x = -7; x <= 7; x++) for (let y = -7; y <= 7; y++) {
    if (x * x + y * y > 53) continue;
    const shade = (x * x + y * y > 43 ? .79 : .96) - (random() < .16 ? .17 : 0);
    moonBlocks.box(x * 1.8, y * 1.8, 0, 1.8, 1.8, .8, 'frost', shade);
  }
  moonBlocks.finish(moon); scene.add(moon);
  const glowTexture = document.createElement('canvas'); glowTexture.width = glowTexture.height = 128;
  const ctx = glowTexture.getContext('2d')!; const gradient = ctx.createRadialGradient(64, 64, 8, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(237,224,171,.14)'); gradient.addColorStop(.25, 'rgba(237,224,171,.06)'); gradient.addColorStop(1, 'rgba(237,224,171,0)');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 128, 128);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(glowTexture), transparent: true, depthWrite: false, fog: false, toneMapped: false }));
  halo.scale.set(76, 76, 1); halo.position.copy(moon.position); halo.position.z -= 2; scene.add(halo);
}

function createWater(scene: THREE.Scene) {
  const material = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, fogColor: { value: new THREE.Color('#344955') } },
    transparent: false,
    vertexShader: `varying vec3 vWorld;varying float vDistance;void main(){vec4 p=modelMatrix*vec4(position,1.);vWorld=p.xyz;vec4 mv=viewMatrix*p;vDistance=-mv.z;gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `uniform float time;uniform vec3 fogColor;varying vec3 vWorld;varying float vDistance;
      void main(){vec2 p=floor(vWorld.xz*2.)*.5;
      float w=sin(p.x*.62+p.y*.24+time*.55)*sin(p.y*1.42-time*.3);
      float lines=step(.83,sin(p.y*3.+time*.3))*step(.3,sin(p.x*.5+p.y));
      vec3 c=mix(vec3(.048,.115,.145),vec3(.093,.191,.22),w*.5+.5);
      c+=vec3(.063,.089,.099)*lines;
      float moon=exp(-pow((p.x+12.)/7.,2.))*(1.-smoothstep(-120.,90.,p.y));
      c+=vec3(.11,.135,.14)*moon*step(.4,w)*.55;
      c*=.77;
      float fog=1.-exp(-pow(vDistance*.004,2.));gl_FragColor=vec4(mix(c,fogColor,fog),1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`,
  });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(5000, 5000), material); water.rotation.x = -Math.PI / 2; water.position.y = .08; water.name = 'shared-river'; scene.add(water);
  return material;
}

export function createWorld(): PoemWorld {
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#172936'); scene.fog = new THREE.FogExp2('#344955', .004);
  const materials = makeMaterials();
  const random = randomSource(83124);
  createSky(scene, random, materials);
  scene.add(new THREE.HemisphereLight('#b7d1e4', '#303c3c', 1.7));
  const moonLight = new THREE.DirectionalLight('#c6dceb', 2.1); moonLight.position.set(-90, 150, -130);
  moonLight.castShadow = true; moonLight.shadow.mapSize.set(2048, 2048);
  Object.assign(moonLight.shadow.camera, { left: -150, right: 150, top: 150, bottom: -150, near: 1, far: 440 });
  moonLight.shadow.bias = -.0004; moonLight.shadow.normalBias = .15; moonLight.shadow.radius = 2;
  moonLight.shadow.autoUpdate = false; moonLight.shadow.needsUpdate = true;
  scene.add(moonLight); scene.add(moonLight.target);
  const water = createWater(scene);
  const b = new Blocks(materials);
  b.box(0, 1, -520, 1800, 12, 520, 'darkStone', .45);
  for (const side of [-1, 1]) b.box(side * 665, 1, -30, 970, 12, 1200, 'darkStone', .5);
  // Continuous stepped earth: only exposed columns, never a cube for buried soil.
  for (let z = -256; z <= 185; z += 3) for (let x = -180; x <= 180; x += 3) {
    const h = groundHeight(x, z);
    if (h < 0) continue;
    const distance = Math.abs(x - riverCenter(z)) - riverWidth(z);
    b.box(x, (h - 5) / 2, z, 3.03, h + 5, 3.03, distance < 5 ? 'bank' : 'earth', .76 + random() * .3);
    b.box(x, h + .08, z, 3.03, .16, 3.03, distance < 3 ? 'frost' : distance < 10 ? 'moss' : 'grass', .7 + random() * .32);
    if (distance < 10 && random() < .35) b.box(x + random() - .5, h + .2, z + random() - .5, 1.3 + random(), .2, 1.3 + random(), 'frost', .8);
  }
  // Stair-stepped distant hills conceal the edge of the world.
  for (let i = 0; i < 16; i++) {
    const x = -330 + i * 45, z = -295 - random() * 65;
    const peak = i >= 3 && i <= 6 ? 26 + random() * 20 : 38 + random() * 65;
    for (let layer = 0; layer < 9; layer++) {
      const width = 75 - layer * 7;
      b.box(x, layer * peak / 10, z, width, peak / 10 + 1, width * .75, 'darkStone', .42 + random() * .1);
    }
  }
  city(b, random);
  bridge(b);
  const bell = buildTemple(scene, b, materials);
  const occupied = (x: number, z: number) => (x > -101 && x < -23 && z > -107 && z < -19) || Math.abs(z - 32) < 10 || (x > 19 && x < 50 && z > 49 && z < 92);
  const templeSightline = (x: number, z: number) => z > -49 && z < 151 && Math.abs(x - (58 + .68 * (z - 151))) < 10;
  for (let i = 0; i < 174; i++) {
    const z = -139 + random() * 310;
    const side = random() < .5 ? -1 : 1;
    const x = riverCenter(z) + side * (riverWidth(z) + 7 + random() * 30);
    if (occupied(x, z) || templeSightline(x, z)) continue;
    tree(b, x, groundHeight(x, z), z, .75 + random() * .6, random, z < -110 || Math.abs(x) > 66);
  }
  // Frame the guest boat with a few individual maple silhouettes.
  for (const [x, z, scale] of [[39, 97, 1.15], [46, 47, 1.18], [-35, 78, 1.2], [-49, 15, .92]]) tree(b, x, groundHeight(x, z), z, scale, random);
  for (let i = 0; i < 700; i++) {
    const z = -140 + random() * 305, side = random() < .5 ? -1 : 1;
    const x = riverCenter(z) + side * (riverWidth(z) + random() * 13);
    if (occupied(x, z)) continue;
    const y = groundHeight(x, z);
    if (y < 0) continue;
    if (random() < .3) {
      const s = .6 + random() * 1.5;
      b.box(x, y + s * .4, z, s * 1.2, s * .8, s, 'bank');
      b.box(x, y + s * .85, z, s * 1.1, .12, s * .9, 'frost');
    } else {
      const h = .7 + random() * 1.9;
      for (let k = 0; k < 3; k++) b.box(x + k * .25, y + h / 2, z + k * .1, .12, h + k * .17, .15, 'reed', .8);
    }
  }
  // A modest wooden landing and mooring rope beside the same guest boat.
  for (let x = 19; x <= 36; x += 1.2) b.box(x, 1.6, 68, 1.17, .3, 5.5, 'wood');
  for (const x of [20, 27, 35]) for (const z of [65.5, 70.5]) b.box(x, .9, z, .45, 3.3, .45, 'darkWood');
  lantern(b, 31, 4, 66, 1.1);
  b.box(23, 2.5, 68, .13, .13, 8.8, 'reed', .7, Math.PI / 2);
  const voxelCount = b.finish(scene);
  const guestBoat = buildBoat(materials, true); guestBoat.position.set(14, .24, 75); guestBoat.rotation.y = -.18; guestBoat.name = 'guest-boat'; scene.add(guestBoat);
  const fishingBoats: THREE.Group[] = [];
  for (const [x, z, rotation] of [[-3, -12, .5], [4, 5, -.35], [-9, -79, .2], [5, 116, .6]]) {
    const boat = buildBoat(materials, false); boat.position.set(x, .25, z); boat.rotation.y = rotation; scene.add(boat); fishingBoats.push(boat);
  }
  for (const [x, y, z, intensity, distance] of [[15, 4, 73, 14, 18], [-58, 11, -25, 30, 34], [-58, 13, -70, 38, 35], [-78, 14, -49, 18, 17], [30, 5, 65, 10, 15], [-3, 3, -12, 10, 13]]) {
    const light = new THREE.PointLight('#ffa954', intensity, distance, 1.6); light.position.set(x, y, z); scene.add(light);
  }
  const glowCanvas = document.createElement('canvas'); glowCanvas.width = glowCanvas.height = 64;
  const glowContext = glowCanvas.getContext('2d')!;
  const glowGradient = glowContext.createRadialGradient(32, 32, 0, 32, 32, 32);
  glowGradient.addColorStop(0, 'rgba(255,183,91,.6)'); glowGradient.addColorStop(.18, 'rgba(255,170,76,.22)'); glowGradient.addColorStop(1, 'rgba(255,164,70,0)');
  glowContext.fillStyle = glowGradient; glowContext.fillRect(0, 0, 64, 64);
  const glowMap = new THREE.CanvasTexture(glowCanvas);
  for (const [x, y, z, scale] of [[13.3, 5, 73.5, 6], [31, 4, 66, 5], [-3, 2.6, -10.6, 5], [4, 2.6, 6.4, 5], [-9, 2.6, -77.6, 4], [-64, 10, -24.3, 5], [-52, 10, -24.3, 5], [-82, 13.7, -44.6, 5], [-74, 13.7, -44.6, 5], [-82, 24.8, -44.6, 6], [-74, 24.8, -44.6, 6], [-70, 13, -70.3, 6], [-46, 13, -70.3, 6]]) {
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowMap, transparent: true, depthWrite: false, toneMapped: false }));
    glow.position.set(x, y, z); glow.scale.set(scale, scale, 1); scene.add(glow);
  }
  // Sparse pixel reflections under warm sources, avoiding a glossy mirror surface.
  const reflectionMaterial = new THREE.MeshBasicMaterial({ color: '#c38b51', transparent: true, opacity: .4, depthWrite: false, toneMapped: false });
  const reflectionGeometry = new THREE.PlaneGeometry(1, 1);
  const reflections = new THREE.InstancedMesh(reflectionGeometry, reflectionMaterial, 112);
  const dummy = new THREE.Object3D(); let ridx = 0;
  for (const [x, z] of [[14, 76], [-3, -12], [4, 5], [-9, -79]]) for (let i = 0; i < 28; i++) {
    dummy.position.set(x + (random() - .5) * (1.2 + i * .1), .17, z + i * .42 + random() * .2);
    dummy.rotation.set(-Math.PI / 2, 0, 0); dummy.scale.set(.45 + random() * 1.6, .09 + random() * .18, 1); dummy.updateMatrix(); reflections.setMatrixAt(ridx++, dummy.matrix);
  }
  scene.add(reflections);
  // The crow is a voxel silhouette perched by the frosted riverbank.
  const crow = new THREE.Group(); crow.position.set(-18, 13.4, 22); crow.scale.setScalar(1.5);
  const cb = new Blocks(materials); cb.box(0, 0, 0, .8, .7, 1.3, 'black'); cb.box(0, .45, -.5, .65, .65, .65, 'black'); cb.box(0, .42, -.98, .32, .17, .4, 'gold'); cb.box(0, -.5, .1, .12, .6, .12, 'black'); cb.finish(crow);
  const wings: THREE.Mesh[] = [];
  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(1.3, .18, 1), materials.black); wing.position.x = side * .7; crow.add(wing); wings.push(wing);
  }
  scene.add(crow);
  const perch = new Blocks(materials); perch.box(-18, 6.3, 22, 1.2, 12.6, 1.2, 'darkWood'); perch.box(-19.8, 12.6, 22, 4.5, .65, .65, 'darkWood');
  perch.box(-19.3, 8.7, 22, 3, .8, .8, 'darkWood'); perch.box(-20.4, 9.4, 22, .8, 1.8, .8, 'darkWood');
  perch.box(-16.7, 10.5, 22.7, 3, .7, .7, 'darkWood'); perch.finish(scene);
  const mistCanvas = document.createElement('canvas'); mistCanvas.width = 128; mistCanvas.height = 64;
  const mistContext = mistCanvas.getContext('2d')!;
  const mistGradient = mistContext.createRadialGradient(64, 32, 1, 64, 32, 60);
  mistGradient.addColorStop(0, 'rgba(180,205,211,.24)'); mistGradient.addColorStop(.55, 'rgba(180,205,211,.1)'); mistGradient.addColorStop(1, 'rgba(180,205,211,0)');
  mistContext.fillStyle = mistGradient; mistContext.fillRect(0, 0, 128, 64);
  const mistMap = new THREE.CanvasTexture(mistCanvas);
  const mist = new THREE.Group();
  for (let z = -105; z <= 138; z += 27) {
    const veil = new THREE.Mesh(new THREE.PlaneGeometry(48, 34), new THREE.MeshBasicMaterial({ map: mistMap, transparent: true, opacity: .36, depthWrite: false, side: THREE.DoubleSide }));
    veil.rotation.x = -Math.PI / 2; veil.position.set(riverCenter(z), 1.8 + random() * .6, z); mist.add(veil);
  }
  scene.add(mist);
  // Falling maple leaves are tiny square sprites in the same world.
  const leafGeometry = new THREE.BoxGeometry(.26, .08, .34);
  const leaves = new THREE.InstancedMesh(leafGeometry, materials.mapleOrange, 68);
  const leafData = Array.from({ length: 68 }, () => ({ x: (random() < .5 ? -31 : 38) + (random() - .5) * 13, z: 34 + random() * 60, phase: random() * 12, speed: .24 + random() * .45 }));
  leaves.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(leaves);
  // A few illuminated motes in the temple courtyard, not snowfall.
  const moteGeometry = new THREE.BufferGeometry(); const positions: number[] = [];
  for (let i = 0; i < 35; i++) positions.push(-86 + random() * 56, 6 + random() * 8, -90 + random() * 60);
  moteGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const motes = new THREE.Points(moteGeometry, new THREE.PointsMaterial({ color: '#d9ae74', size: .12, transparent: true, opacity: .38, depthWrite: false })); scene.add(motes);
  const bellPosition = new THREE.Vector3(-78, 24.5, -49);
  const signalDestination = new THREE.Vector3(14, 2.7, 75);
  const ripples: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const geometry = new THREE.RingGeometry(.96, 1, 64);
    const material = new THREE.MeshBasicMaterial({ color: '#e6bd80', transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, toneMapped: false });
    const ring = new THREE.Mesh(geometry, material); ring.position.copy(bellPosition); ring.lookAt(signalDestination); scene.add(ring); ripples.push(ring);
  }
  let bellTime = 0, previousChapter = -1;
  const update = (time: number, delta: number, chapter: number, reducedMotion: boolean) => {
    const t = reducedMotion ? 0 : time;
    water.uniforms.time.value = t;
    guestBoat.position.y = .24 + Math.sin(t * .7) * .09;
    guestBoat.rotation.z = Math.sin(t * .45) * .007;
    fishingBoats.forEach((boat, i) => { boat.position.y = .25 + Math.sin(t * .65 + i) * .07; });
    reflections.material.opacity = .3 + Math.sin(t * 1.2) * .06;
    const flap = reducedMotion ? 0 : Math.max(0, Math.sin(t * .37) - .7) / .3;
    wings.forEach((wing, i) => { wing.rotation.z = (i === 0 ? 1 : -1) * Math.sin(t * 8) * flap * .55; });
    leafData.forEach((leaf, i) => {
      const progress = (t * leaf.speed + leaf.phase) % 12;
      dummy.position.set(leaf.x + Math.sin(progress * .7 + i) * 1.8, 14 - progress, leaf.z + Math.cos(progress + i) * 1.2);
      dummy.rotation.set(progress * .3, progress + i, progress * .2); dummy.scale.setScalar(1); dummy.updateMatrix(); leaves.setMatrixAt(i, dummy.matrix);
    }); leaves.instanceMatrix.needsUpdate = true;
    motes.material.opacity = .3 + Math.sin(t * .5) * .09;
    mist.position.x = Math.sin(t * .08) * 1.2;
    if (chapter !== previousChapter) { bellTime = 0; previousChapter = chapter; }
    if (chapter === 3 && !reducedMotion) bellTime += delta;
    bell.rotation.z = chapter === 3 && !reducedMotion ? Math.sin(bellTime * 2.6) * .09 * Math.exp(-(bellTime % 9) * .32) : 0;
    ripples.forEach((ring, i) => {
      const phase = (bellTime - i * .65) % 9;
      const visible = chapter === 3 && phase > 0 && phase < 6 && !reducedMotion;
      const p = Math.max(0, phase) / 6;
      ring.scale.setScalar(2 + p * 16);
      ring.position.lerpVectors(bellPosition, signalDestination, p);
      (ring.material as THREE.MeshBasicMaterial).opacity = visible ? Math.sin(p * Math.PI) * .055 : 0;
    });
  };
  return { scene, update, voxelCount, bellPosition };
}
