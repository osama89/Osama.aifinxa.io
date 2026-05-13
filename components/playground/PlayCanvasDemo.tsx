'use client';

/**
 * PlayCanvasDemo — a small showcase of the PlayCanvas engine running
 * inside the Playground window, alongside (not on top of) the R3F demos.
 *
 * Scene: a 3×3 grid of hovering cubes, each with its own material.
 * Click a cube → it cycles through a palette and flashes scale 1.3 → 1.0.
 * Manual ray-vs-AABB picking (no physics dep) keeps the bundle lean.
 *
 * The whole component is dynamic-imported by PlaygroundCanvas so the
 * ~400KB playcanvas runtime only loads when the user opens this tab.
 */

import { useEffect, useRef } from 'react';
import * as pc from 'playcanvas';

const PALETTE = ['#c9a96e', '#e8d5b0', '#b8a4e8', '#64dfdf', '#7fd9a3', '#ff7eb3', '#7faad4', '#d9a26f', '#fbbf24'];

const GOLD = '#c9a96e';

export default function PlayCanvasDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;

    // ─── application setup ─────────────────────────────────────────────────
    const app = new pc.Application(canvas, {
      mouse: new pc.Mouse(canvas),
      touch: new pc.TouchDevice(canvas),
      graphicsDeviceOptions: { antialias: true, alpha: true },
    });
    app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
    app.setCanvasResolution(pc.RESOLUTION_AUTO);

    const onResize = () => app.resizeCanvas();
    window.addEventListener('resize', onResize);

    // transparent clear so the dark background of the wrapper shows through
    app.scene.ambientLight = new pc.Color(0.18, 0.18, 0.22);

    // ─── camera ────────────────────────────────────────────────────────────
    const cameraEntity = new pc.Entity('camera');
    cameraEntity.addComponent('camera', {
      clearColor: new pc.Color(0.027, 0.027, 0.043, 1.0), // #07070b
      fov: 45,
      nearClip: 0.1,
      farClip: 100,
    });
    cameraEntity.setPosition(5, 4, 7);
    cameraEntity.lookAt(0, 1.5, 0);
    app.root.addChild(cameraEntity);

    // ─── lighting (3-point) ───────────────────────────────────────────────
    const key = new pc.Entity('keyLight');
    key.addComponent('light', { type: pc.LIGHTTYPE_DIRECTIONAL, color: new pc.Color(1, 0.95, 0.78), intensity: 1.1 });
    key.setEulerAngles(45, 30, 0);
    app.root.addChild(key);

    const fill = new pc.Entity('fillLight');
    fill.addComponent('light', { type: pc.LIGHTTYPE_DIRECTIONAL, color: new pc.Color(0.4, 0.65, 0.92), intensity: 0.45 });
    fill.setEulerAngles(20, -120, 0);
    app.root.addChild(fill);

    const rim = new pc.Entity('rimLight');
    rim.addComponent('light', { type: pc.LIGHTTYPE_DIRECTIONAL, color: new pc.Color(0.95, 0.7, 0.4), intensity: 0.5 });
    rim.setEulerAngles(-30, 180, 0);
    app.root.addChild(rim);

    // ─── floor — receives subtle reflections ──────────────────────────────
    const floor = new pc.Entity('floor');
    floor.addComponent('model', { type: 'plane' });
    floor.setLocalScale(20, 1, 20);
    const floorMat = new pc.StandardMaterial();
    floorMat.diffuse = new pc.Color(0.04, 0.05, 0.08);
    floorMat.metalness = 0.4;
    floorMat.useMetalness = true;
    floorMat.gloss = 0.6;
    floorMat.update();
    if (floor.model) floor.model.material = floorMat;
    app.root.addChild(floor);

    // ─── 3×3 grid of cubes — each its own material ────────────────────────
    interface Cube {
      entity: pc.Entity;
      material: pc.StandardMaterial;
      paletteIdx: number;
      baseY: number;
      phase: number;
      flashScale: number;
    }
    const cubes: Cube[] = [];
    let paletteOffset = 0;

    for (let gx = -1; gx <= 1; gx++) {
      for (let gz = -1; gz <= 1; gz++) {
        const e = new pc.Entity(`cube-${gx}-${gz}`);
        e.addComponent('model', { type: 'box' });
        const idx = (paletteOffset++) % PALETTE.length;
        const mat = new pc.StandardMaterial();
        const c = hexToColor(PALETTE[idx]);
        mat.diffuse = c;
        mat.emissive = new pc.Color(c.r * 0.25, c.g * 0.25, c.b * 0.25);
        mat.metalness = 0.4;
        mat.useMetalness = true;
        mat.gloss = 0.7;
        mat.update();
        if (e.model) e.model.material = mat;

        const baseY = 1.5 + Math.random() * 0.2;
        e.setPosition(gx * 1.6, baseY, gz * 1.6);
        e.setLocalScale(0.85, 0.85, 0.85);
        app.root.addChild(e);
        cubes.push({ entity: e, material: mat, paletteIdx: idx, baseY, phase: Math.random() * Math.PI * 2, flashScale: 1.0 });
      }
    }

    // ─── update loop — bob, rotate, decay scale flash, orbit camera ──────
    let cameraT = 0;
    app.on('update', (dt: number) => {
      const time = Date.now() * 0.001;
      for (const c of cubes) {
        c.entity.setLocalPosition(
          c.entity.getLocalPosition().x,
          c.baseY + Math.sin(time + c.phase) * 0.18,
          c.entity.getLocalPosition().z,
        );
        c.entity.rotate(10 * dt, 14 * dt, 0);
        // ease scale flash back to 1
        c.flashScale = pc.math.lerp(c.flashScale, 1.0, dt * 6);
        const s = 0.85 * c.flashScale;
        c.entity.setLocalScale(s, s, s);
      }
      cameraT += dt * 0.18;
      const r = 7;
      cameraEntity.setPosition(Math.cos(cameraT) * r, 4, Math.sin(cameraT) * r);
      cameraEntity.lookAt(0, 1.5, 0);
    });

    // ─── click picking — ray vs AABB, no physics ─────────────────────────
    const fromVec = new pc.Vec3();
    const toVec = new pc.Vec3();
    const rayDir = new pc.Vec3();
    const onPointerDown = (e: pc.MouseEvent) => {
      const cam = cameraEntity.camera; if (!cam) return;
      cam.screenToWorld(e.x, e.y, cam.nearClip, fromVec);
      cam.screenToWorld(e.x, e.y, cam.farClip, toVec);
      rayDir.copy(toVec).sub(fromVec).normalize();
      const ray = new pc.Ray(fromVec, rayDir);

      let best: { c: Cube; tHit: number } | null = null;
      const half = new pc.Vec3(0.5, 0.5, 0.5);
      for (const c of cubes) {
        const p = c.entity.getPosition();
        const bbox = new pc.BoundingBox();
        bbox.center.copy(p);
        bbox.halfExtents.copy(half).mulScalar(0.85 * c.flashScale);
        if (bbox.intersectsRay(ray, fromVec.clone())) {
          const tHit = p.clone().sub(cameraEntity.getPosition()).length();
          if (!best || tHit < best.tHit) best = { c, tHit };
        }
      }
      if (best) {
        const cube = best.c;
        cube.paletteIdx = (cube.paletteIdx + 1) % PALETTE.length;
        const col = hexToColor(PALETTE[cube.paletteIdx]);
        cube.material.diffuse = col;
        cube.material.emissive = new pc.Color(col.r * 0.4, col.g * 0.4, col.b * 0.4);
        cube.material.update();
        cube.flashScale = 1.45;
      }
    };
    app.mouse?.on(pc.EVENT_MOUSEDOWN, onPointerDown);

    // ─── go ───────────────────────────────────────────────────────────────
    app.start();

    // ─── cleanup ──────────────────────────────────────────────────────────
    return () => {
      window.removeEventListener('resize', onResize);
      app.mouse?.off(pc.EVENT_MOUSEDOWN, onPointerDown);
      app.destroy();
    };
  }, []);

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{ background: '#07070b' }}
      />
      <div
        className="absolute top-3 right-3 text-[9px] tracking-[0.3em] uppercase pointer-events-none"
        style={{ color: GOLD, fontFamily: 'var(--font-mono)' }}
      >
        ◆ playcanvas · ecs
      </div>
      <div
        className="absolute bottom-3 left-3 right-3 text-[10px] tracking-[0.22em] uppercase pointer-events-none flex items-center gap-3"
        style={{ color: 'rgba(255,255,255,0.55)', fontFamily: 'var(--font-mono)' }}
      >
        <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: GOLD }} />
        <span>click a cube to cycle its colour · 3×3 grid · ray-vs-AABB picking, no physics</span>
      </div>
    </div>
  );
}

// ─── helpers ────────────────────────────────────────────────────────────────

function hexToColor(hex: string): pc.Color {
  const c = new pc.Color();
  const m = hex.replace('#', '');
  c.r = parseInt(m.slice(0, 2), 16) / 255;
  c.g = parseInt(m.slice(2, 4), 16) / 255;
  c.b = parseInt(m.slice(4, 6), 16) / 255;
  c.a = 1;
  return c;
}
