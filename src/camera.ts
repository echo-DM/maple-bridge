import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Viewpoint } from './chapters';

interface Flight {
  path: THREE.CubicBezierCurve3;
  fromTarget: THREE.Vector3;
  toTarget: THREE.Vector3;
  elapsed: number;
  duration: number;
}

export class CameraGuide {
  readonly controls: OrbitControls;
  private flight: Flight | null = null;
  private motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  onArrive = () => {};
  onInterrupt = () => {};

  constructor(readonly camera: THREE.PerspectiveCamera, canvas: HTMLCanvasElement, initial: Viewpoint) {
    camera.position.fromArray(initial.position);
    this.controls = new OrbitControls(camera, canvas);
    this.controls.target.fromArray(initial.target);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = .065;
    this.controls.enablePan = false;
    this.controls.minDistance = 18;
    this.controls.maxDistance = 330;
    this.controls.minPolarAngle = .12;
    this.controls.maxPolarAngle = Math.PI * .48;
    this.controls.rotateSpeed = .55;
    this.controls.zoomSpeed = .7;
    this.controls.update();
    // Stop before OrbitControls handles an input, retaining the current camera.
    canvas.addEventListener('pointerdown', () => this.interrupt(), { capture: true });
    canvas.addEventListener('wheel', () => this.interrupt(), { capture: true, passive: true });
    this.motionPreference.addEventListener('change', () => {
      if (this.reducedMotion && this.flight) {
        this.camera.position.copy(this.flight.path.v3);
        this.controls.target.copy(this.flight.toTarget);
        this.flight = null; this.controls.update(); this.onArrive();
      }
    });
  }
  get reducedMotion() { return this.motionPreference.matches; }
  get flying() { return this.flight !== null; }
  interrupt() {
    if (!this.flight) return;
    this.flight = null; this.controls.update(); this.onInterrupt();
  }
  goTo(view: Viewpoint) {
    const end = new THREE.Vector3().fromArray(view.position);
    const target = new THREE.Vector3().fromArray(view.target);
    if (this.flight && this.flight.path.v3.distanceToSquared(end) < .001 && this.flight.toTarget.distanceToSquared(target) < .001) return;
    // Drain any remaining orbit damping before constructing the new flight.
    this.controls.enableDamping = false; this.controls.update(); this.controls.enableDamping = true;
    if (this.reducedMotion || this.camera.position.distanceTo(end) < .5) {
      this.flight = null; this.camera.position.copy(end); this.controls.target.copy(target); this.controls.update(); this.onArrive(); return;
    }
    const start = this.camera.position.clone();
    const lift = Math.max(17, Math.min(44, start.distanceTo(end) * .35));
    const c1 = start.clone().lerp(end, .23); c1.y = Math.max(start.y, end.y) + lift;
    const c2 = start.clone().lerp(end, .77); c2.y = Math.max(start.y, end.y) + lift;
    this.flight = {
      path: new THREE.CubicBezierCurve3(start, c1, c2, end),
      fromTarget: this.controls.target.clone(), toTarget: target,
      elapsed: 0, duration: Math.min(4.2, Math.max(2.7, start.distanceTo(end) / 40)),
    };
  }
  update(delta: number) {
    if (!this.flight) { this.controls.update(); return; }
    const flight = this.flight;
    flight.elapsed += delta;
    const raw = Math.min(1, flight.elapsed / flight.duration);
    const t = raw * raw * (3 - 2 * raw);
    this.camera.position.copy(flight.path.getPoint(t));
    this.controls.target.lerpVectors(flight.fromTarget, flight.toTarget, t);
    this.camera.lookAt(this.controls.target);
    if (raw === 1) { this.flight = null; this.controls.update(); this.onArrive(); }
  }
}
