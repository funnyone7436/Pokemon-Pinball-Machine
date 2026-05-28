import React, { useRef } from 'react'
import { RigidBody } from '@react-three/rapier'
import { useFrame } from '@react-three/fiber'

export default function CaptiveBall({ position, rotation, color = "#00ffff", addScore }) {
  const targetMatRef = useRef()
  const captiveBallRef = useRef()
  const flashTimer = useRef(0)
  const lastHitTime = useRef(0)

  const handleTargetHit = (payload) => {
    const hitPhysicsBody = payload.other.rigidBody
    // 只有囚禁球撞到底部时才触发
    if (hitPhysicsBody && hitPhysicsBody.bodyType() === 0) {
        const now = Date.now()
        if (now - lastHitTime.current > 100) {
          lastHitTime.current = now
          flashTimer.current = 0.2
          if (addScore) addScore(1000) 
        }
    }
  }

  useFrame((state, delta) => {
    if (targetMatRef.current) {
      if (flashTimer.current > 0) {
        flashTimer.current -= delta
        targetMatRef.current.emissiveIntensity = 8
      } else {
        targetMatRef.current.emissiveIntensity = 1
      }
    }
  })

  return (
    <group position={position} rotation={rotation}>
      
      {/* 1. 笼子的墙壁 (🛠️ 修复: 使用 emissive 让它自身发出青蓝色的霓虹光) */}
      <RigidBody type="fixed" colliders="cuboid" friction={0}>
        <mesh position={[-0.7, 0.5, 0]} castShadow>
          <boxGeometry args={[0.2, 1.0, 3.0]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} transparent opacity={0.6} />
        </mesh>
        <mesh position={[0.7, 0.5, 0]} castShadow>
          <boxGeometry args={[0.2, 1.0, 3.0]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} transparent opacity={0.6} />
        </mesh>
        
        {/* 玻璃车顶 */}
        <mesh position={[0, 1.0, 0]}>
          <boxGeometry args={[1.2, 0.1, 3.0]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.2} transparent opacity={0.2} />
        </mesh>

        {/* 🛠️ 修复: 超低的前门槛！
            高度只有 0.2，刚好能卡住球不往下滚，但把球的上面完全暴露出来让你撞击！ */}
        <mesh position={[0, 0.1, 1.4]}>
          <boxGeometry args={[1.2, 0.2, 0.2]} />
          <meshStandardMaterial color="#ff00ff" emissive="#ff00ff" emissiveIntensity={1.0} />
        </mesh>
      </RigidBody>

      {/* 2. 后方的橙色得分目标板 */}
      <RigidBody type="fixed" colliders="cuboid" onCollisionEnter={handleTargetHit} restitution={2.0}>
        <mesh position={[0, 0.5, -1.4]} castShadow>
          <boxGeometry args={[1.2, 1.0, 0.2]} />
          <meshStandardMaterial ref={targetMatRef} color="#ffaa00" emissive="#ffaa00" emissiveIntensity={1} />
        </mesh>
      </RigidBody>

      {/* 3. 被囚禁的弹珠 (🛠️ 修复: 加大尺寸(0.45)，并设置 emissive 发出耀眼的白光！) */}
      <RigidBody 
        ref={captiveBallRef}
        type="dynamic" 
        colliders="ball" 
        position={[0, 0.5, 1.0]} 
        restitution={1.4}    
        friction={0}         
        mass={1.0}           
        ccd={true}
      >
        <mesh castShadow>
          <sphereGeometry args={[0.45, 32, 32]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1.0} />
        </mesh>
      </RigidBody>

    </group>
  )
}