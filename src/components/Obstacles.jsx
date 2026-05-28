import React, { useMemo } from 'react'
import { RigidBody } from '@react-three/rapier'

// ==========================================
// The Glowing Pinball Obstacles
// ==========================================
export default function Obstacles() {
  const bumpers = useMemo(() => {
    const items = []
    
    for (let i = 0; i < 30; i++) {
      // Generate between the floor (Y=1) and the ceiling (Y=9)
      const y = 1 + Math.random() * 8 
      const angle = Math.random() * Math.PI * 2
      
      // Math matched to the flatter cone (Height 10, Top Radius 24)
      const radiusAtHeight = 1.5 + (y / 10) * (24 - 1.5)
      const r = radiusAtHeight - 0.6 
      
      items.push({
        position: [Math.cos(angle) * r, y, Math.sin(angle) * r],
        rotation: [Math.random() * Math.PI, Math.random() * Math.PI, 0],
        scale: 0.5 + Math.random() * 0.8
      })
    }
    return items
  }, [])

  return (
    <group>
      {bumpers.map((b, i) => (
        <RigidBody key={i} type="fixed" colliders="hull" position={b.position} rotation={b.rotation} restitution={1.5}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[b.scale, b.scale, b.scale]} />
            <meshStandardMaterial color="#e94560" emissive="#e94560" emissiveIntensity={0.8} />
          </mesh>
        </RigidBody>
      ))}
    </group>
  )
}