import React, { useRef, useState } from 'react'
import { RigidBody } from '@react-three/rapier'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function DropTarget({ position, rotation, color = "#ff2222", addScore }) {
  const targetRef = useRef()
  const [isDropped, setIsDropped] = useState(false)

  const handleHit = (payload) => {
    const hitPhysicsBody = payload.other.rigidBody
    
    // Only drop if it's hit by a ball AND it isn't already dropped
    if (hitPhysicsBody && hitPhysicsBody.bodyType() === 0 && !isDropped) {
      setIsDropped(true)
      
      // Drop targets usually grant big points!
      if (addScore) addScore(250)

      // Auto-reset the target after 4 seconds so you can hit it again
      setTimeout(() => {
        setIsDropped(false)
      }, 4000)
    }
  }

  useFrame((state, delta) => {
    if (!targetRef.current) return

    // Get the current position of the physics body
    const currentPos = targetRef.current.translation()
    
    // If dropped, move it 2 units downwards into the floor. Otherwise, return to normal position.
    const targetY = isDropped ? position[1] - 2.0 : position[1]
    
    // Smoothly Lerp the Y position
    const newY = THREE.MathUtils.lerp(currentPos.y, targetY, 15 * delta)

    // Apply the new position to the physical body!
    targetRef.current.setNextKinematicTranslation({ 
      x: position[0], 
      y: newY, 
      z: position[2] 
    })
  })

  return (
    // 🛠️ Note the type change: kinematicPosition lets us move a solid wall via code!
    <RigidBody 
      ref={targetRef} 
      type="kinematicPosition" 
      colliders="cuboid" 
      position={position} 
      rotation={rotation}
      restitution={0.5} // Drop targets usually absorb the ball's momentum
      onCollisionEnter={handleHit}
    >
      <mesh castShadow>
        <boxGeometry args={[1.6, 2.2, 0.2]} />
        {/* We use a white core with a colored glow so it looks like illuminated plastic */}
        <meshStandardMaterial color="#ffffff" emissive={color} emissiveIntensity={isDropped ? 0 : 2} />
      </mesh>
    </RigidBody>
  )
}