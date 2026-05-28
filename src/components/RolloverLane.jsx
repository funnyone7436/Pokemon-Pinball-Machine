import React, { useRef } from 'react'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import { useFrame } from '@react-three/fiber'

export default function RolloverLane({ position, rotation, color = "#ffff00", addScore }) {
  const lightRef = useRef()
  const flashTimer = useRef(0)
  const lastHitTime = useRef(0)

  const handleIntersection = (payload) => {
    const hitPhysicsBody = payload.other.rigidBody
    if (hitPhysicsBody && hitPhysicsBody.bodyType() === 0) {
      const now = Date.now()
      if (now - lastHitTime.current > 200) {
        lastHitTime.current = now
        flashTimer.current = 0.5 
        if (addScore) addScore(500) 
      }
    }
  }

  useFrame((state, delta) => {
    if (lightRef.current) {
      if (flashTimer.current > 0) {
        flashTimer.current -= delta
        lightRef.current.emissiveIntensity = 8
      } else {
        lightRef.current.emissiveIntensity = 1
      }
    }
  })

  return (
    <group position={position} rotation={rotation}>
      
      <RigidBody type="fixed" colliders="cuboid" friction={0}>
        {/* 🛠️ THE FIX: Added a solid floor base so it doesn't float! */}
        <mesh position={[0, -0.05, 0]} castShadow>
          <boxGeometry args={[1.8, 0.1, 4.0]} />
          <meshStandardMaterial color="#222222" metalness={0.8} />
        </mesh>

        <mesh position={[-0.8, 0.5, 0]} castShadow>
          <boxGeometry args={[0.2, 1.0, 4.0]} />
          <meshStandardMaterial color="#222222" metalness={0.8} />
        </mesh>
        
        <mesh position={[0.8, 0.5, 0]} castShadow>
          <boxGeometry args={[0.2, 1.0, 4.0]} />
          <meshStandardMaterial color="#222222" metalness={0.8} />
        </mesh>

        <mesh position={[0, 1.0, 0]}>
          <boxGeometry args={[1.4, 0.1, 4.0]} />
          <meshStandardMaterial color="#ffffff" transparent opacity={0.15} emissive="#ffffff" emissiveIntensity={0.2} />
        </mesh>
      </RigidBody>

      <RigidBody type="fixed">
        <mesh position={[0, 0.01, 0]} castShadow>
          <boxGeometry args={[1.4, 0.05, 1.0]} />
          <meshStandardMaterial ref={lightRef} color={color} emissive={color} emissiveIntensity={1} />
        </mesh>

        <CuboidCollider 
          args={[0.7, 0.5, 0.5]} 
          position={[0, 0.5, 0]} 
          sensor={true} 
          onIntersectionEnter={handleIntersection} 
        />
      </RigidBody>

    </group>
  )
}