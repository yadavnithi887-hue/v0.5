import React, { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

function RobotModel() {
  const { scene } = useGLTF('/models/flying_robot.glb');

  const normalizedModel = useMemo(() => {
    const clone = scene.clone(true);
    const bounds = new THREE.Box3().setFromObject(clone);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const maxDimension = Math.max(size.x, size.y, size.z) || 1;
    const scale = 1.25 / maxDimension;

    clone.position.sub(center);
    clone.position.y -= size.y * 0.04;

    return { clone, scale };
  }, [scene]);

  const eyeTargets = useMemo(() => {
    const matches = [];
    normalizedModel.clone.traverse((node) => {
      if (!node.isMesh) return;
      const meshName = String(node.name || '').toLowerCase();
      const materialName = String(node.material?.name || '').toLowerCase();
      const tag = `${meshName} ${materialName}`;
      if (tag.includes('eye') || tag.includes('pupil') || tag.includes('iris')) {
        matches.push({
          mesh: node,
          baseScaleY: node.scale.y || 1,
        });
      }
    });
    return matches;
  }, [normalizedModel]);

  const blinkRef = useRef({
    nextBlinkAt: THREE.MathUtils.randFloat(1.3, 3.4),
    progress: 0,
    speed: 12,
    closing: true,
    active: false,
  });

  useFrame((state, delta) => {
    if (eyeTargets.length === 0) return;

    const blink = blinkRef.current;
    const elapsed = state.clock.elapsedTime;
    if (!blink.active && elapsed >= blink.nextBlinkAt) {
      blink.active = true;
      blink.progress = 0;
      blink.closing = true;
      blink.speed = THREE.MathUtils.randFloat(10, 15);
    }

    if (!blink.active) return;

    if (blink.closing) {
      blink.progress = Math.min(1, blink.progress + delta * blink.speed);
      if (blink.progress >= 1) blink.closing = false;
    } else {
      blink.progress = Math.max(0, blink.progress - delta * blink.speed * 0.9);
      if (blink.progress <= 0) {
        blink.active = false;
        blink.nextBlinkAt = elapsed + THREE.MathUtils.randFloat(2.4, 5.2);
      }
    }

    const openFactor = 1 - blink.progress;
    const eyelidScale = THREE.MathUtils.clamp(openFactor, 0.03, 1);
    for (const target of eyeTargets) {
      target.mesh.scale.y = target.baseScaleY * eyelidScale;
    }
  });

  return (
    <group position={[0, 0.02, 0]} rotation={[0, 0.4, 0]}>
      <primitive object={normalizedModel.clone} scale={normalizedModel.scale} />
    </group>
  );
}

function Scene() {
  return (
    <>
      <ambientLight intensity={1.45} />
      <directionalLight position={[3, 4, 3]} intensity={2.4} />
      <pointLight position={[-2, 2, -1]} intensity={1.2} color="#8ad4ff" />
      <RobotModel />
    </>
  );
}

export default function RobotCompanion({ className = 'robot-companion-icon' }) {
  return (
    <div className={className} aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0.18, 2.7], fov: 28 }}
        gl={{ alpha: true, antialias: true }}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
    </div>
  );
}

useGLTF.preload('/models/flying_robot.glb');
