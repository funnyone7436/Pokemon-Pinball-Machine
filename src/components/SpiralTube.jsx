import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'

export default function SpiralTube() {
  const START_Y = 8.5;       
  const START_R = 21.0;      
  const END_Y = 18.0;        
  const END_R = 2.0;         
  const TURNS = 2.8;        
  const TUBE_RADIUS = 1.6;   
  
  const SPEED = 50.0; 

  const tubeMatRef = useRef();
  const effectTimer = useRef(0);

  const { curve, boosters, rings, startDir, endDir, endPos } = useMemo(() => {
    const points = [];
    const boostData = [];
    const ringData = [];
    const segments = 128; 

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const angle = t * TURNS * Math.PI * 2;
      const r = THREE.MathUtils.lerp(START_R, END_R, t); 
      const y = THREE.MathUtils.lerp(START_Y, END_Y, t); 
      points.push(new THREE.Vector3(Math.cos(angle) * r, y, Math.sin(angle) * r));
    }
    const pathCurve = new THREE.CatmullRomCurve3(points);

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const pt = pathCurve.getPoint(t);
      const tangent = pathCurve.getTangent(t); 
      const dir = new THREE.Vector3(tangent.x, tangent.y, tangent.z).normalize().multiplyScalar(SPEED);
      boostData.push({ pos: [pt.x, pt.y, pt.z], dir: dir });
    }

    for (let i = 4; i < segments - 2; i += 8) {
      const t = i / segments;
      const pt = pathCurve.getPoint(t);
      const nextPt = pathCurve.getPoint(Math.min(1.0, t + 0.01));
      ringData.push({ pos: [pt.x, pt.y, pt.z], lookAt: [nextPt.x, nextPt.y, nextPt.z] });
    }

    const startTangent = pathCurve.getTangent(0);
    const startDirection = new THREE.Vector3(startTangent.x, startTangent.y, startTangent.z).multiplyScalar(SPEED);
    
    const finalTangent = pathCurve.getTangent(1);
    const finalDirection = new THREE.Vector3(finalTangent.x, finalTangent.y + 1.0, finalTangent.z).normalize().multiplyScalar(50.0);
    const finalPosition = pathCurve.getPoint(1);

    return { 
      curve: pathCurve, 
      boosters: boostData, 
      rings: ringData, 
      startDir: startDirection,
      endDir: finalDirection,
      endPos: [finalPosition.x, finalPosition.y, finalPosition.z]
    };
  }, []);

  const handleVacuum = (payload) => {
    const rb = payload.other.rigidBody;
    if (rb && rb.bodyType() === 0) {
      const safeStart = curve.getPoint(0.01);
      rb.setTranslation({ x: safeStart.x, y: safeStart.y, z: safeStart.z }, true);
      rb.setLinvel({ x: startDir.x, y: startDir.y, z: startDir.z }, true);
      if (rb.setGravityScale) rb.setGravityScale(0, true); 
      
      // Keep the effect running for 2 seconds (the time it takes to travel the tube)
      effectTimer.current = 2.0; 

      window.dispatchEvent(new CustomEvent('spawn-effect', {
        detail: { type: 'vacuum', position: [START_R, START_Y, 0], color: '#00ffcc' }
      }))
    }
	window.dispatchEvent(new CustomEvent('play-sound', { detail: { type: 'vacuum' } }));
  };

  const handleBoost = (payload, dir) => {
    const rb = payload.other.rigidBody;
    if (rb && rb.bodyType() === 0) {
      rb.setLinvel({ x: dir.x, y: dir.y, z: dir.z }, true);
    }
  };

  const handleExitJump = (payload) => {
    const rb = payload.other.rigidBody;
    if (rb && rb.bodyType() === 0) {
      rb.setLinvel({ x: endDir.x, y: endDir.y, z: endDir.z }, true);
      if (rb.setGravityScale) rb.setGravityScale(1, true); 

      // 💥 🛠️ THE FIX 1: Trigger the massive firework explosion at the exact exit coordinates!
      window.dispatchEvent(new CustomEvent('spawn-effect', {
        detail: { type: 'explosion', position: [endPos[0], endPos[1], endPos[2]], color: '#ffffff' }
      }))
    }
  };

  // ⚡ 🛠️ THE FIX 2: Added the rapid flashing logic for the glass tube!
  useFrame((state, delta) => {
    if (effectTimer.current > 0) {
      effectTimer.current -= delta;
      if (tubeMatRef.current) {
        // Randomly strobe the glass material brightly
        const strobe = Math.random() > 0.5;
        tubeMatRef.current.emissiveIntensity = strobe ? 4.0 : 0.5;
        tubeMatRef.current.emissive.set(strobe ? "#ffffff" : "#00ffff");
      }
    } else {
      // Turn off the glowing effect when empty
      if (tubeMatRef.current && tubeMatRef.current.emissiveIntensity > 0) {
        tubeMatRef.current.emissiveIntensity = 0;
        tubeMatRef.current.emissive.set("#000000"); 
      }
    }
  });

  return (
    <group>
      <group position={[START_R, START_Y, 0]}>
        <RigidBody type="fixed">
          <CuboidCollider args={[3.5, 3.5, 3.5]} sensor onIntersectionEnter={handleVacuum} />
        </RigidBody>
      </group>

      <RigidBody type="fixed" colliders="trimesh" friction={0} restitution={0}>
        <mesh>
          <tubeGeometry args={[curve, 128, TUBE_RADIUS, 16, false]} />
          {/* 🛠️ THE FIX 3: Linked the ref and added emissive defaults so the useFrame can control the light! */}
          <meshPhysicalMaterial 
            ref={tubeMatRef}
            color="#00ffff" 
            emissive="#000000"
            emissiveIntensity={0}
            transparent 
            opacity={0.3} 
            transmission={0.9} 
            roughness={0.1} 
            metalness={0.5} 
            side={THREE.DoubleSide} 
          />
        </mesh>
      </RigidBody>

      {boosters.map((b, i) => (
        <RigidBody key={`booster-${i}`} type="fixed">
          <CuboidCollider position={b.pos} args={[1.0, 1.0, 1.0]} sensor onIntersectionEnter={(e) => handleBoost(e, b.dir)} />
        </RigidBody>
      ))}

      <RigidBody type="fixed">
        <CuboidCollider position={[endPos[0], endPos[1] + 1.0, endPos[2]]} args={[1.5, 0.5, 1.5]} sensor onIntersectionEnter={handleExitJump} />
      </RigidBody>

      {rings.map((r, i) => {
         const colors = ["#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ff00ff", "#00ffff"];
         const color = colors[i % colors.length];
         return (
          <mesh key={`ring-${i}`} position={r.pos} onUpdate={(self) => self.lookAt(r.lookAt[0], r.lookAt[1], r.lookAt[2])}>
            <torusGeometry args={[TUBE_RADIUS + 0.1, 0.05, 8, 32]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={3.0} toneMapped={false} />
          </mesh>
        )
      })}
    </group>
  );
}