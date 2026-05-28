import React, { useRef, useState, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CylinderCollider } from '@react-three/rapier'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'

export default function PopBumper({ position, angle, textureUrl, addScore }) {
  const texture = useTexture(textureUrl)
  texture.colorSpace = THREE.SRGBColorSpace 

  const [isHit, setIsHit] = useState(false)
  const scaleRef = useRef(1)
  
  // 🛠️ THE FIX 1: New Refs for the Tumbler effect!
  const tumblerRef = useRef()
  const hitDirection = useRef(0) // Stores a random angle so it tumbles differently every time
  
  const baseMatRef = useRef()

  const tilt = Math.atan2(6, 23); 

  const { baseColor } = useMemo(() => {
    const colors = ["#ff0055", "#00ffcc", "#ffff00", "#aa00ff", "#00aaff", "#ffaa00", "#00ff00"];
    return { baseColor: colors[Math.floor(Math.random() * colors.length)] };
  }, []);

  const handleCollision = () => {
    addScore(100)
    setIsHit(true)
    
    // Give the tumbler lots of energy (2.0) so it rocks for a while!
    scaleRef.current = 2.0 
    
    // Pick a random direction for it to tumble towards
    hitDirection.current = Math.random() * Math.PI * 2;

    window.dispatchEvent(new CustomEvent('spawn-effect', {
      detail: { type: 'explosion', position: position, color: baseColor }
    }))
	window.dispatchEvent(new CustomEvent('play-sound', { detail: { type: 'bumper' } }));
  }

  useFrame((state, delta) => {
    if (scaleRef.current > 1.01) {
      // 🛠️ THE FIX 2: Slower decay so the tumbler rocks back and forth longer
      scaleRef.current = THREE.MathUtils.lerp(scaleRef.current, 1, delta * 1)
      
      if (baseMatRef.current) {
         const flashPalette = ["#ffffff", "#ff00ff", "#00ffff", "#ffff00", baseColor];
         const strobeColor = flashPalette[Math.floor(Math.random() * flashPalette.length)];
         baseMatRef.current.color.set(strobeColor);
         baseMatRef.current.emissive.set(strobeColor);
         baseMatRef.current.emissiveIntensity = Math.random() > 0.5 ? 6.0 : 2.0;
      }
    } else {
      setIsHit(false)
      scaleRef.current = 1.; // Ensure it locks perfectly to 1
      if (baseMatRef.current) {
         baseMatRef.current.color.set(baseColor);
         baseMatRef.current.emissive.set(baseColor);
         baseMatRef.current.emissiveIntensity = 0.8; 
      }
    }

    // 🛠️ THE FIX 3: The Tumbler Math!
    if (tumblerRef.current) {
      const energy = scaleRef.current - 1; // Goes from 1.0 down to 0.0
      
      // Math.cos creates a swinging pendulum effect. 
      // energy * 0.8 limits the maximum tilt to about 45 degrees.
      const wobble = Math.cos(energy * 25) * (energy * 0.8);

      // Apply the wobble along the random hit direction
      tumblerRef.current.rotation.x = Math.sin(hitDirection.current) * wobble;
      tumblerRef.current.rotation.z = Math.cos(hitDirection.current) * wobble;
    }
  })

  return (
    <RigidBody 
      type="fixed" 
      position={position} 
      rotation={[0, -angle - Math.PI / 2, 0]} 
      restitution={2.0} 
      onCollisionEnter={handleCollision}
    >
      <group rotation={[tilt, 0, 0]}>
        
        {/* Invisible Physics Hit-Box stays perfectly still */}
        <CylinderCollider args={[0.25, 0.3]} />
        
        {/* 🛠️ THE FIX 4: The Bottom Pivot Point! */}
        {/* We move the tumbler group down by half the base's height (-0.075) */}
        <group ref={tumblerRef} position={[0, -0.01, 0]}>
          
          {/* We move the meshes UP by 0.075 so they perfectly offset the pivot point! */}
          <group position={[0, 0.075, 0]}>
            <mesh position={[0, 0, 0]}>
              <cylinderGeometry args={[0.3, 0.1, 0.15, 32]} />
              <meshStandardMaterial 
                ref={baseMatRef}
                color={baseColor} 
                emissive={baseColor} 
                emissiveIntensity={0.8} 
                toneMapped={false}
              />
            </mesh>

            <mesh position={[0, 0.75, 0]} rotation={[-tilt, 0, 0]}>
              <planeGeometry args={[1.2, 1.2]} />
              <meshBasicMaterial 
                map={texture} 
                transparent={true} 
                side={THREE.DoubleSide} 
              />
            </mesh>
          </group>

        </group>

      </group>
    </RigidBody>
  )
}