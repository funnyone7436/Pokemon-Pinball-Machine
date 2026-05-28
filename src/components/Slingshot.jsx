import React, { useRef, useState } from 'react'
import { RigidBody } from '@react-three/rapier'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function Slingshot({ position, rotation, color = "#ffaa00", addScore }) {
  const slingshotRef = useRef()
  const rubberRef = useRef() // We will animate just the rubber band part!
  
  const [active, setActive] = useState(false)
  const timer = useRef(0)

  const handleHit = (payload) => {
    const hitPhysicsBody = payload.other.rigidBody
    
    if (hitPhysicsBody && hitPhysicsBody.bodyType() === 0) {
      
      const ballPos = hitPhysicsBody.translation()
      const slingPos = slingshotRef.current.translation()

      const dir = new THREE.Vector3(
        ballPos.x - slingPos.x,
        ballPos.y - slingPos.y,
        ballPos.z - slingPos.z
      ).normalize()

      // Slingshots kick extremely hard!
      const strength = 16 
      hitPhysicsBody.applyImpulse({ 
        x: dir.x * strength, 
        y: dir.y * strength + 0.5, 
        z: dir.z * strength 
      }, true)

      setActive(true)
      timer.current = 0

      if (addScore) addScore(50)
    }
  }

  useFrame((state, delta) => {
    if (!active) return
    timer.current += delta
    
    // Instead of scaling the whole object, we make the "rubber wall" snap back and forth
    const stretch = 1 + Math.sin(timer.current * 50) * 0.4
    rubberRef.current.scale.set(1, 1, stretch)

    if (timer.current > 0.15) {
      setActive(false)
      rubberRef.current.scale.set(1, 1, 1)
    }
  })

  return (
    <RigidBody 
      ref={slingshotRef} 
      type="fixed" 
      colliders="cuboid" // 🛠️ Changed to 'cuboid' because it is now a flat wall!
      position={position} 
      rotation={rotation}
      restitution={2.0} 
      onCollisionEnter={handleHit}
    >
      <group>
        {/* 1. The Glowing Rubber Wall (This is what animates on hit) */}
        <mesh ref={rubberRef} position={[0, 0, 0]} castShadow>
          {/* A long, flat box */}
          <boxGeometry args={[2.8, 0.8, 0.3]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={active ? 8 : 1.5} />
        </mesh>
        
        {/* 2. Left Silver Metal Post */}
        <mesh position={[-1.4, 0.1, 0]}>
          <cylinderGeometry args={[0.25, 0.25, 1.2, 16]} />
          <meshStandardMaterial color="#ffffff" metalness={0.9} roughness={0.1} />
        </mesh>

        {/* 3. Right Silver Metal Post */}
        <mesh position={[1.4, 0.1, 0]}>
          <cylinderGeometry args={[0.25, 0.25, 1.2, 16]} />
          <meshStandardMaterial color="#ffffff" metalness={0.9} roughness={0.1} />
        </mesh>
      </group>
    </RigidBody>
  )
}