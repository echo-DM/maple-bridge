import * as THREE from 'three';

export function randomSource(seed: number) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

type TextureKind = 'stone' | 'wood' | 'roof' | 'earth' | 'leaf' | 'frost';
function pixelTexture(kind: TextureKind, base: string, seed: number) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 16;
  const ctx = canvas.getContext('2d')!;
  const random = randomSource(seed);
  const color = new THREE.Color(base);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      let shade = .82 + random() * .35;
      if (kind === 'stone' && (y % 8 === 0 || (x + (y < 8 ? 0 : 8)) % 16 === 0)) shade *= .68;
      if (kind === 'wood' && (x % 5 === 0 || (y === 8 && x > 9))) shade *= .64;
      if (kind === 'roof' && (x % 4 === 0 || y % 8 === 0)) shade *= .65;
      if (kind === 'leaf' && random() < .14) shade *= .65;
      const c = color.clone().multiplyScalar(shade);
      ctx.fillStyle = '#' + c.getHexString();
      ctx.fillRect(x, y, 1, 1);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestMipmapNearestFilter;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export function makeMaterials() {
  let seed = 13;
  const textured = (kind: TextureKind, color: string) => new THREE.MeshLambertMaterial({ map: pixelTexture(kind, color, seed++) });
  return {
    earth: textured('earth', '#535c48'),
    bank: textured('stone', '#78877e'),
    grass: textured('earth', '#516653'),
    moss: textured('earth', '#59644e'),
    frost: textured('frost', '#b9cfca'),
    stone: textured('stone', '#88908a'),
    darkStone: textured('stone', '#626e70'),
    wall: textured('stone', '#b4b3a0'),
    wood: textured('wood', '#705344'),
    darkWood: textured('wood', '#443a35'),
    redWood: textured('wood', '#a55038'),
    roof: textured('roof', '#536c70'),
    roofEdge: textured('stone', '#72877e'),
    mapleRed: textured('leaf', '#b45032'),
    mapleOrange: textured('leaf', '#c78643'),
    mapleGold: textured('leaf', '#d0a359'),
    pine: textured('leaf', '#34554d'),
    reed: textured('leaf', '#9c9b70'),
    paper: textured('earth', '#c0b68c'),
    robe: textured('wood', '#6d8a8c'),
    skin: textured('earth', '#cba67c'),
    black: new THREE.MeshLambertMaterial({ color: '#202d36' }),
    lantern: new THREE.MeshBasicMaterial({ color: '#ffba65', toneMapped: false }),
    lanternRed: new THREE.MeshBasicMaterial({ color: '#e8914d', toneMapped: false }),
    window: new THREE.MeshBasicMaterial({ color: '#cda36c', toneMapped: false }),
    gold: new THREE.MeshLambertMaterial({ color: '#ba9759' }),
  };
}
export type Materials = ReturnType<typeof makeMaterials>;
export type MaterialName = keyof Materials;
interface Block { position: THREE.Vector3; scale: THREE.Vector3; rotation: number; color: THREE.Color }

/** Collect voxel cuboids by material, then upload each batch once. */
export class Blocks {
  private batches = new Map<MaterialName, Block[]>();
  private geometry = new THREE.BoxGeometry(1, 1, 1);
  constructor(private materials: Record<MaterialName, THREE.Material>, private shadows = true) {}
  box(x: number, y: number, z: number, sx: number, sy: number, sz: number, material: MaterialName, tint = 1, rotation = 0) {
    let batch = this.batches.get(material);
    if (!batch) { batch = []; this.batches.set(material, batch); }
    batch.push({ position: new THREE.Vector3(x, y, z), scale: new THREE.Vector3(sx, sy, sz), rotation, color: new THREE.Color().setScalar(tint) });
  }
  finish(parent: THREE.Object3D) {
    const dummy = new THREE.Object3D();
    let count = 0;
    for (const [key, blocks] of this.batches) {
      const mesh = new THREE.InstancedMesh(this.geometry, this.materials[key], blocks.length);
      for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        dummy.position.copy(block.position); dummy.scale.copy(block.scale); dummy.rotation.set(0, block.rotation, 0); dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix); mesh.setColorAt(i, block.color);
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.castShadow = this.shadows && !['earth', 'grass', 'bank', 'frost', 'moss', 'lantern', 'window'].includes(key);
      mesh.receiveShadow = true;
      mesh.computeBoundingSphere();
      mesh.name = 'voxels:' + key;
      parent.add(mesh); count += blocks.length;
    }
    return count;
  }
}
