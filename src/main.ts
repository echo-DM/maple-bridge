import * as THREE from 'three';
import './style.css';
import { chapters, overview } from './chapters';
import { CameraGuide } from './camera';
import { createWorld } from './world';

const element = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const worldElement = element('world');
const loading = element('loading');
const fallback = element('fallback');
let failed = false;
element('retry').addEventListener('click', () => window.location.reload());

function showFailure(error: unknown) {
  if (failed) return;
  failed = true;
  console.error('The poem world could not start:', error);
  loading.hidden = true; loading.style.display = 'none'; fallback.hidden = false;
  document.body.classList.remove('immersed');
  document.querySelectorAll<HTMLElement>('.interface').forEach(el => { el.inert = true; });
  worldElement.style.visibility = 'hidden';
  element('status').textContent = '三维景观无法加载，请检查浏览器是否支持 WebGL 2。';
  element('retry').focus();
}

function start() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 700 ? 1.35 : 1.5));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.domElement.setAttribute('aria-label', '拖动旋转景观，滚轮或双指缩放');
  worldElement.appendChild(renderer.domElement);
  const world = createWorld();
  const camera = new THREE.PerspectiveCamera(innerWidth < 700 ? 62 : 49, innerWidth / innerHeight, .5, 1800);
  const guide = new CameraGuide(camera, renderer.domElement, overview);
  let selected = -1;
  const navigation = element('poem-navigation');
  chapters.forEach((chapter, index) => {
    const button = document.createElement('button');
    button.className = 'poem-button'; button.dataset.chapter = chapter.id;
    button.setAttribute('aria-pressed', 'false'); button.setAttribute('aria-label', `${index + 1}. ${chapter.line}`);
    button.innerHTML = `<span class="poem-number">0${index + 1}</span><span><span class="poem-line">${chapter.line}</span><span class="poem-subtitle">${chapter.subtitle}</span></span>`;
    button.addEventListener('click', () => select(index)); navigation.appendChild(button);
  });
  const buttons = Array.from(navigation.querySelectorAll('button'));
  function select(index: number) {
    if (selected === index && guide.flying) return;
    selected = index;
    buttons.forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
    const chapter = chapters[index];
    element('chapter-kicker').textContent = chapter ? `0${index + 1} / 04 · ${chapter.subtitle}` : 'THE POEM, IN ONE WORLD';
    element('chapter-title').textContent = chapter?.title ?? '一江秋夜，四处诗境。';
    element('chapter-description').replaceChildren(...(chapter?.description ?? '月落、枫红、古寺、孤舟。\n循着诗句，走进张继的夜泊之境。').split('\n').flatMap((line, i) => i === 0 ? [document.createTextNode(line)] : [document.createElement('br'), document.createTextNode(line)]));
    element('chapter-detail').textContent = chapter?.detail ?? '点击下方诗句，沿江寻境';
    element('step-count').textContent = chapter ? `0${index + 1} / 04` : '序 · 全景';
    element('status').textContent = chapter ? `前往第${index + 1}处诗境：${chapter.line}` : '返回沿江全景';
    guide.goTo(chapter ?? overview);
  }
  guide.onArrive = () => { element('status').textContent = selected < 0 ? '已抵达全景，可拖动环看' : `已抵达：${chapters[selected].line}，可拖动环看`; };
  guide.onInterrupt = () => { element('status').textContent = '已停止导览，可自由环看；点击诗句重新前往'; };
  element('overview').addEventListener('click', () => select(-1));
  element('previous').addEventListener('click', () => select(selected < 0 ? 3 : selected - 1));
  element('next').addEventListener('click', () => select(selected >= 3 ? -1 : selected + 1));
  function immersive(value: boolean) {
    document.body.classList.toggle('immersed', value);
    document.querySelectorAll<HTMLElement>('.interface').forEach(el => { el.inert = value; });
    if (value) element('restore-interface').focus(); else element('immersive').focus();
  }
  element('immersive').addEventListener('click', () => immersive(true));
  element('restore-interface').addEventListener('click', () => immersive(false));
  window.addEventListener('keydown', event => {
    if (event.repeat || !fallback.hidden) return;
    if (event.key === 'Escape') { immersive(false); return; }
    if (event.altKey || event.ctrlKey || event.metaKey || document.body.classList.contains('immersed')) return;
    if (event.key >= '1' && event.key <= '4') select(Number(event.key) - 1);
    if (event.key === '0') select(-1);
    if (event.key === 'ArrowRight') { event.preventDefault(); select(selected >= 3 ? -1 : selected + 1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); select(selected < 0 ? 3 : selected - 1); }
  });
  window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight; camera.fov = innerWidth < 700 ? 62 : 49; camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 700 ? 1.35 : 1.5)); renderer.setSize(innerWidth, innerHeight);
  });
  renderer.domElement.addEventListener('webglcontextlost', event => { event.preventDefault(); showFailure('WebGL context lost'); renderer.setAnimationLoop(null); });
  const metrics = { frames: 0, fps: 0, calls: 0, triangles: 0, voxelCount: world.voxelCount };
  let last = performance.now(), elapsed = 0, measurement = 0, frameCount = 0, started = false;
  // Read-only diagnostics for reproducible browser acceptance.
  const diagnostics = {
    get ready() { return started && !failed; },
    get selected() { return selected; },
    get flying() { return guide.flying; },
    get reducedMotion() { return guide.reducedMotion; },
    get position() { return camera.position.toArray(); },
    get target() { return guide.controls.target.toArray(); },
    get metrics() { return { ...metrics }; },
  };
  Object.assign(window, { __poemWorld: diagnostics });
  const context = renderer.getContext();
  renderer.setAnimationLoop(now => {
    // Some drivers lose the context without delivering the expected DOM event.
    if (context.isContextLost()) { showFailure('WebGL context lost'); renderer.setAnimationLoop(null); return; }
    if (document.hidden) { last = now; return; }
    const actualDelta = (now - last) / 1000;
    const delta = Math.min(actualDelta, .08); last = now; elapsed += delta;
    guide.update(delta); world.update(elapsed, delta, guide.flying && selected === 3 ? -1 : selected, guide.reducedMotion);
    renderer.render(world.scene, camera);
    metrics.frames++; frameCount++; measurement += actualDelta;
    if (measurement > 2) { metrics.fps = Math.round(frameCount / measurement); frameCount = 0; measurement = 0; }
    metrics.calls = renderer.info.render.calls; metrics.triangles = renderer.info.render.triangles;
    if (!started) { started = true; loading.classList.add('loaded'); setTimeout(() => { loading.style.display = 'none'; }, 650); }
  });
}

try { start(); } catch (error) { showFailure(error); }
