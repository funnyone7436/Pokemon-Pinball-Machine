import React, { useRef } from 'react'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'

export default function Spinner({ position, angle = 0, tilt = 0, textureUrl, addScore }) {
  const BASE = import.meta.env.BASE_URL;
  const plateRef = useRef()
  const matRef1 = useRef()
  const matRef2 = useRef()
  
  // 🛠️ THE FIX 1: A new ref specifically to make the thick glass glow!
  const glassMatRef = useRef() 

  const rotState = useRef(0)
  const speed = useRef(0)
  const isSpinning = useRef(false)

  const texture = useTexture(textureUrl || `${BASE}r3f/images/edges/f0.png`)
  texture.colorSpace = THREE.SRGBColorSpace

  const handleHit = () => {
    if (!isSpinning.current || speed.current < 10) {
      if (addScore) addScore(50)
      speed.current = 25
      isSpinning.current = true

      // 💥 TRIGGER EXPLOSION: Flashy cyan burst!
      window.dispatchEvent(new CustomEvent('spawn-effect', {
        detail: { type: 'explosion', position: position, color: '#00ffff' }
      }))
	  window.dispatchEvent(new CustomEvent('play-sound', { detail: { type: 'spinner' } }));
    }
  }

  useFrame((state, delta) => {
    if (isSpinning.current) {
      rotState.current += speed.current * delta;
      speed.current -= delta * 12;

      if (speed.current <= 0) {
        isSpinning.current = false;
        rotState.current = rotState.current % (Math.PI * 2);
        if (rotState.current > Math.PI) rotState.current -= Math.PI * 2;
      }
    } else {
      rotState.current = THREE.MathUtils.lerp(rotState.current, 0, delta * 10);
    }

    if (plateRef.current) {
      plateRef.current.rotation.x = rotState.current;
    }

    // Flash the Pokemon Images
    const flashColor = isSpinning.current ? 1 + (speed.current / 25) * 2.5 : 1;
    if (matRef1.current) matRef1.current.color.setRGB(flashColor, flashColor, flashColor);
    if (matRef2.current) matRef2.current.color.setRGB(flashColor, flashColor, flashColor);

    // 🛠️ THE FIX 2: Flash the thick glass block!
    if (glassMatRef.current) {
      glassMatRef.current.emissiveIntensity = isSpinning.current ? (speed.current / 25) * 3.0 : 0;
    }
  })

  return (
    <group position={position} rotation={[0, -angle + Math.PI / 2, 0]}>
      <group rotation={[tilt, 0, 0]}>

        <RigidBody type="fixed" position={[0, 1.1, 0]}>
          {/* Increased depth of collider to match new thicker visual glass */}
          <CuboidCollider args={[1.0, 1.0, 0.3]} sensor onIntersectionEnter={handleHit} />
        </RigidBody>

        <mesh position={[-1.2, 1.1, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 2.2]} />
          <meshStandardMaterial color="#222222" metalness={0.5} />
        </mesh>
        <mesh position={[1.2, 1.1, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 2.2]} />
          <meshStandardMaterial color="#222222" metalness={0.5} />
        </mesh>

        <group ref={plateRef} position={[0, 1.1, 0]}>
          
          {/* 🛠️ THE FIX 3: Thick Clear Arcade Glass Block! */}
          {/* Thickness is set to 0.4 units, making it very chunky! */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[1.9, 1.9, 0.4]} />
            <meshStandardMaterial 
              ref={glassMatRef}
              color="#ffffff" 
              emissive="#00ffff"
              emissiveIntensity={0}
              transparent 
              opacity={0.25} 
              metalness={0.9} 
              roughness={0.1} 
            />
          </mesh>

          {/* Front Image (Pushed outwards to Z: 0.21 to sit perfectly on the glass surface) */}
          <mesh position={[0, 0, 0.21]}>
             <planeGeometry args={[3., 3.0]} />
             <meshBasicMaterial ref={matRef1} map={texture} transparent alphaTest={0.5} toneMapped={false} />
          </mesh>

          {/* Back Image (Pushed outwards to Z: -0.21 to sit on the back surface) */}
          <mesh position={[0, 0, -0.21]} rotation={[0, Math.PI, 0]}>
             <planeGeometry args={[3., 3.0]} />
             <meshBasicMaterial ref={matRef2} map={texture} transparent alphaTest={0.5} toneMapped={false} />
          </mesh>

        </group>

      </group>
    </group>
  )
}