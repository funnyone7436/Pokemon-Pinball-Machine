import React, { useRef } from 'react'
import { RigidBody } from '@react-three/rapier'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function Saucer({ position, rotation, color = "#ff00ff", addScore }) {
  const saucerRef = useRef()
  const matRef = useRef()
  
  // Safe physics references
  const trappedBody = useRef(null)
  
  // 状态说明:
  //   0: 准备就绪，可以抓取弹珠
  // > 0: 弹珠被困住，正在倒计时弹出
  // < 0: 冷却中 (Cooldown)，拒绝抓取弹珠！
  const kickTimer = useRef(0)
  const flashTimer = useRef(0)

  const handleHit = (payload) => {
    const body = payload.other.rigidBody
    
    // 🛠️ THE FIX 1: 这里改为 kickTimer.current === 0
    // 只有当计时器精确为 0 (准备就绪状态) 时，才会抓取弹珠。如果在冷却中 (<0) 则直接无视！
    if (body && body.bodyType() === 0 && kickTimer.current === 0) {
      trappedBody.current = body
      kickTimer.current = 1.0 // 冻结弹珠 1 秒
      flashTimer.current = 0.2 // 霓虹灯闪烁
      if (addScore) addScore(500)
    }
  }

  useFrame((state, delta) => {
    // 1. 处理视觉闪烁
    if (matRef.current) {
      if (flashTimer.current > 0) {
        flashTimer.current -= delta
        matRef.current.emissiveIntensity = 8
      } else {
        matRef.current.emissiveIntensity = 0.5
      }
    }

    // 2. 🛠️ THE FIX 2: 处理冷却时间的恢复
    if (kickTimer.current < 0) {
      kickTimer.current += delta // 冷却时间慢慢回升向 0
      if (kickTimer.current >= 0) {
        kickTimer.current = 0 // 一旦超过 0，精准归零，此时可以再次抓取弹珠
      }
      return // 如果还在冷却中，直接跳过下面的抓取逻辑
    }

    // 3. 处理弹珠被困和弹出逻辑
    if (kickTimer.current > 0 && trappedBody.current) {
      kickTimer.current -= delta
      
      // 强行把弹珠死死按在孔的中心点
      if (saucerRef.current) {
        const pos = saucerRef.current.translation()
        trappedBody.current.setTranslation({ x: pos.x, y: pos.y + 0.6, z: pos.z }, true)
        trappedBody.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
        trappedBody.current.setAngvel({ x: 0, y: 0, z: 0 }, true)
      }

      // 时间到了！把弹珠踢出去！
      if (kickTimer.current <= 0) {
        const pos = saucerRef.current.translation()
        // 计算一个指向地图中心的向量
        const dir = new THREE.Vector3(-pos.x, 0, -pos.z).normalize()
        
        // 施加巨大的爆发力
        trappedBody.current.applyImpulse({ x: dir.x * 6, y: 18, z: dir.z * 6 }, true)
        
        trappedBody.current = null // 松开对弹珠的控制
        
        // 🛠️ THE FIX 3: 启动冷却！
        // 把计时器设置为 -0.5 秒。这给了弹珠 0.5 秒的时间彻底飞离发射孔！
        kickTimer.current = -0.5 
      }
    }
  })

  return (
    <group position={position} rotation={rotation}>
      <RigidBody ref={saucerRef} type="fixed" colliders="hull" onCollisionEnter={handleHit}>
        {/* 深色底座 */}
        <mesh position={[0, 0.1, 0]} castShadow>
          <cylinderGeometry args={[1.6, 1.8, 0.2, 32]} />
          <meshStandardMaterial color="#222" metalness={0.8} />
        </mesh>
        {/* 发光的内孔 */}
        <mesh ref={matRef} position={[0, 0.21, 0]}>
          <cylinderGeometry args={[0.8, 0.8, 0.05, 32]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
        </mesh>
      </RigidBody>
    </group>
  )
}