import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  viewChild,
} from '@angular/core';
import {
  ACESFilmicToneMapping,
  Clock,
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

interface FloatingBox {
  readonly mesh: Mesh;
  readonly baseY: number;
  readonly speed: number;
  readonly phase: number;
}

const CAMERA = { x: 9.4, y: 7.6, z: 12.6 } as const;
const TARGET = { x: 0, y: 0.1, z: 0 } as const;

/**
 * Escena decorativa del hero: un almacén isométrico de cajas que respira.
 *
 * Es puramente ambiental: `aria-hidden`, sin interacción, se pausa cuando la
 * pestaña está oculta, respeta `prefers-reduced-motion` y no bloquea nada si
 * WebGL no está disponible (queda el degradado CSS).
 */
@Component({
  selector: 'app-catalog-scene',
  template: '<canvas #canvas class="block size-full" aria-hidden="true"></canvas>',
  host: { class: 'block size-full' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogScene {
  private readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => this.start());
  }

  private start(): void {
    const canvas = this.canvasRef().nativeElement;
    const host = canvas.parentElement;
    if (!host) {
      return;
    }

    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: 'low-power',
      });
    } catch {
      // Sin WebGL queda el degradado CSS del hero: la página sigue intacta.
      return;
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const scene = new Scene();
    const camera = new PerspectiveCamera(32, 1, 0.1, 120);

    const fog = new Fog(0x08241c, 16, 34);
    scene.fog = fog;
    scene.add(new HemisphereLight(0xcaf0e0, 0x061c16, 1.45));

    const key = new DirectionalLight(0xffffff, 2.6);
    key.position.set(6, 10, 6);
    scene.add(key);

    const rim = new DirectionalLight(0x7fd4b0, 1.3);
    rim.position.set(-7, 4, -6);
    scene.add(rim);

    const group = new Group();
    group.rotation.y = -0.42;
    group.position.set(1.4, -0.15, 0);
    scene.add(group);

    const geometry = new RoundedBoxGeometry(0.92, 1, 0.92, 3, 0.13);
    const materials = [0x1d6b52, 0x2f8a6b, 0x123a2e, 0x174d3a, 0x266b53, 0xd9ede2, 0xdfae64].map(
      (color) =>
        new MeshStandardMaterial({
          color,
          roughness: 0.45,
          metalness: 0.06,
        }),
    );

    const compact = window.innerWidth < 640;
    const columns = compact ? 5 : 6;
    const rows = compact ? 5 : 6;
    const spacing = compact ? 1.5 : 1.55;
    const boxes: FloatingBox[] = [];

    for (let column = 0; column < columns; column += 1) {
      for (let row = 0; row < rows; row += 1) {
        const height = 0.35 + Math.random() * 1.5;
        const material = materials[Math.floor(Math.random() * materials.length)];
        if (!material) {
          continue;
        }

        const mesh = new Mesh(geometry, material);
        mesh.position.set(
          (column - (columns - 1) / 2) * spacing,
          height / 2 - 1.05,
          (row - (rows - 1) / 2) * spacing,
        );
        mesh.scale.y = height;
        group.add(mesh);

        boxes.push({
          mesh,
          baseY: mesh.position.y,
          speed: 0.35 + Math.random() * 0.4,
          phase: Math.random() * Math.PI * 2,
        });
      }
    }

    const pointer = { x: 0, y: 0 };

    // En un hero vertical la cámara retrocede para que el almacén entre completo;
    // si no, la composición se ve como un primer plano de bloques.
    const base: { x: number; y: number; z: number } = { ...CAMERA };

    const frame = (): void => {
      const width = host.clientWidth;
      const height = Math.max(host.clientHeight, 1);
      const aspect = width / height;
      // En una columna vertical la cámara retrocede para que el almacén entre
      // completo; en un hero ancho y bajo se queda cerca.
      const pullback = aspect < 1.25 ? 1 + (1.25 - aspect) * 1.6 : 1;

      fog.near = 15 * pullback;
      fog.far = 33 * pullback;

      base.x = CAMERA.x * pullback;
      base.y = CAMERA.y * pullback;
      base.z = CAMERA.z * pullback;

      camera.aspect = aspect;
      camera.position.set(base.x, base.y, base.z);
      camera.lookAt(TARGET.x, TARGET.y, TARGET.z);
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      renderer.render(scene, camera);
    };

    const resize = new ResizeObserver(() => frame());
    resize.observe(host);

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.22;
    frame();

    const clock = new Clock();
    let frameId = 0;

    const tick = (): void => {
      const time = clock.getElapsedTime();

      group.rotation.y = -0.42 + Math.sin(time * 0.12) * 0.16 + pointer.x * 0.16;
      group.position.y = Math.sin(time * 0.4) * 0.07;

      for (const box of boxes) {
        box.mesh.position.y = box.baseY + Math.sin(time * box.speed + box.phase) * 0.07;
      }

      camera.position.x = MathUtils.lerp(camera.position.x, base.x + pointer.x * 0.8, 0.04);
      camera.position.y = MathUtils.lerp(camera.position.y, base.y - pointer.y * 0.5, 0.04);
      camera.lookAt(TARGET.x, TARGET.y, TARGET.z);

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(tick);
    };

    const play = (): void => {
      if (frameId !== 0) {
        return;
      }
      clock.start();
      frameId = requestAnimationFrame(tick);
    };

    const pause = (): void => {
      cancelAnimationFrame(frameId);
      frameId = 0;
    };

    const onPointerMove = (event: PointerEvent): void => {
      pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (event.clientY / window.innerHeight) * 2 - 1;
    };

    const onVisibilityChange = (): void => {
      if (document.hidden || reduceMotion) {
        pause();
      } else {
        play();
      }
    };

    if (!reduceMotion) {
      window.addEventListener('pointermove', onPointerMove, { passive: true });
      document.addEventListener('visibilitychange', onVisibilityChange);
      play();
    }

    this.destroyRef.onDestroy(() => {
      pause();
      resize.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      geometry.dispose();
      for (const material of materials) {
        material.dispose();
      }
      renderer.dispose();
    });
  }
}
