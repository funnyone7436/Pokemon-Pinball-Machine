import React, { useRef, useState } from 'react'
import { RigidBody } from '@react-three/rapier'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function StandupTarget({ position, rotation, color = "#00ff00", addScore }) {
  const targetRef = useRef()
  const meshRef = useRef()
  const timer = useRef(0)
  const [active, setActive] = useState(false)

  const handleHit = (payload) => {
    const hitPhysicsBody = payload.other.rigidBody
    
    if (hitPhysicsBody && hitPhysicsBody.bodyType() === 0) {
      setActive(true)
      timer.current = 0
      // Standup targets usually give a smaller, quick burst of points
      if (addScore) addScore(75) 
    }
  }

  useFrame((state, delta) => {
    if (!active) return
    timer.current += delta

    if (timer.current > 0.2) {
      setActive(false)
    }
  })

  return (
    <RigidBody 
      ref={targetRef} 
      type="fixed" 
      colliders="cuboid" 
      position={position} 
      rotation={rotation}
      restitution={1.2} // A nice, solid bounce
      onCollisionEnter={handleHit}
    >
      <group ref={meshRef}>
        {/* The target face */}
        <mesh castShadow>
          {/* A tall, thin rectangular plate */}
          <boxGeometry args={[1.5, 2.0, 0.4]} />
          <meshStandardMaterial 
            color={color} 
            emissive={color} 
            emissiveIntensity={active ? 10 : 0.5} // Flashes super bright when hit!
          />
        </mesh>
        
        {/* A small black rubber post behind it to anchor it */}
        <mesh position={[0, 0, -0.3]}>
          <boxGeometry args={[0.8, 1.8, 0.4]} />
          <meshStandardMaterial color="#111" roughness={0.9} />
        </mesh>
      </group>
    </RigidBody>
  )
}