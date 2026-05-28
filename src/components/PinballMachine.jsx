import React, { useRef, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody } from '@react-three/rapier'
import * as THREE from 'three'

import PopBumper from './PopBumper'
import Slingshot from './Slingshot'
import DropTarget from './DropTarget'
import StandupTarget from './StandupTarget'
import Spinner from './Spinner'
import Saucer from './Saucer'           
import CaptiveBall from './CaptiveBall' 

import RolloverLane from './RolloverLane'
import { Stars } from '@react-three/drei'
import SpiralTube from './SpiralTube'

const TEST_MODE = 'bumpers' 

const F_HEIGHT = 6;         
const F_TOP_RADIUS = 24.0;    
const F_BOT_RADIUS = 1;     

const getRadius = (y) => F_BOT_RADIUS + (y / F_HEIGHT) * (F_TOP_RADIUS - F_BOT_RADIUS);
const SLOPE_TILT = Math.atan2(F_HEIGHT, F_TOP_RADIUS - F_BOT_RADIUS); 


// ==========================================
// 1. THE DIVIDED FUNNEL WALL (Dynamic Slices!)
// ==========================================

// 🛠️ THE FIX: Simply add, remove, or change color codes in this list! 
// The code will automatically divide the cone evenly based on how many colors are here.
const FUNNEL_COLORS = [
  "#ff0055", // Neon Red/Pink
  "#ffaa00", // Orange
  "#ffff00", // Yellow
  "#00ff00", // Green
  "#00ffff", // Cyan
  "#0055ff", // Blue
  "#aa00ff", // Purple
  "#ffffff",  // White
  "#ff0055", // Neon Red/Pink
  "#ffaa00", // Orange
  "#ffff00", // Yellow
  "#00ff00", // Green
  "#00ffff", // Cyan
  "#0055ff", // Blue
  "#aa00ff", // Purple
  "#ffffff"  // White  
];

function FunnelWall() { 
  // Automatically calculate the size of each slice (360 degrees / number of colors)
  const sliceAngle = (Math.PI * 2) / FUNNEL_COLORS.length;

  return (
    <RigidBody type="fixed" colliders="trimesh">
      <group position={[0, F_HEIGHT / 2, 0]}>
        
        {/* We use .map() to loop through your color array and create a slice for each one */}
        {FUNNEL_COLORS.map((colorHex, index) => (
          <mesh key={`funnel-slice-${index}`} receiveShadow>
            
            {/* args: [topRadius, bottomRadius, height, radialSegments, heightSegments, openEnded, thetaStart, thetaLength] */}
            <cylinderGeometry 
              args={[
                F_TOP_RADIUS, 
                F_BOT_RADIUS, 
                F_HEIGHT, 
                32,                 // smoothness of the curve
                1, 
                true, 
                index * sliceAngle, // Where this slice starts
                sliceAngle          // How wide this slice is
              ]} 
            />
            <meshStandardMaterial 
              color={colorHex} 
              emissive={colorHex} 
              emissiveIntensity={.8} 
              side={THREE.DoubleSide} 
              roughness={0.4} 
            />
          </mesh>
        ))}

      </group>
    </RigidBody>
  ) 
}

// 🛠️ ADD THIS LIST: Customize your horizontal stripes here!
// The first color is the bottom stripe, the last color is the top stripe.
const CEILING_COLORS = [
  "#ff0000", // Red (Bottom)
  "#ff7f00", // Orange
  "#ffff00", // Yellow
  "#00ff00", // Green
  "#0000ff", // Blue
  "#4b0082", // Indigo
  "#9400d3"  // Violet (Top)
];


// ==========================================
// 2. THE NIGHT SKY CEILING (Clean Space Edition)
// ==========================================
function GlassCeiling() { 
  const TOTAL_HEIGHT = 20; 

  return (
    <group>
      
      {/* --- 1. THE STARS --- */}
      <group>
        <Stars radius={50} depth={50} count={6000} factor={3} saturation={0} fade speed={1.0} />
        <Stars radius={60} depth={50} count={600} factor={8} saturation={0} fade speed={1.0} />
        <Stars radius={60} depth={50} count={3000} factor={4} saturation={0} fade speed={3.0} />
        <Stars radius={80} depth={50} count={1000} factor={6} saturation={0} fade speed={8.0} />
      </group>

      {/* 🛠️ THE FIX: Completely removed the "Milky Way Nebula Clouds" section! */}
      {/* The sky is now perfectly dark and clear. */}

      {/* --- 2. THE SHOOTING STARS --- */}
      {/* Very slow, casual shooting star */}
      <ShootingStar speed={1.5} offset={2} startPos={[-60, 40, -40]} endPos={[60, 20, 60]} />
      {/* Normal speed star crossing the horizon */}
      <ShootingStar speed={4.0} offset={6} startPos={[-80, 50, 20]} endPos={[20, 10, -80]} />
      {/* Ultra-fast bright flash crashing downward */}
      <ShootingStar speed={12.0} offset={8} startPos={[40, 60, -30]} endPos={[-40, 5, 50]} />

      {/* --- 3. THE PHYSICAL GLASS BOUNDARIES --- */}
      <RigidBody type="fixed" colliders="trimesh" position={[0, F_HEIGHT + (TOTAL_HEIGHT / 2), 0]}>
        <mesh>
          <cylinderGeometry args={[F_TOP_RADIUS, F_TOP_RADIUS, TOTAL_HEIGHT, 64, 1, true]} />
          <meshBasicMaterial color="#050816" transparent opacity={0.4} side={THREE.DoubleSide} />
        </mesh>
      </RigidBody>
      
      <RigidBody type="fixed" colliders="hull" position={[0, F_HEIGHT + TOTAL_HEIGHT, 0]} restitution={0.8}>
        <mesh>
          <cylinderGeometry args={[F_TOP_RADIUS + 0.5, F_TOP_RADIUS + 0.5, 0.5, 64]} />
          <meshBasicMaterial color="#050816" transparent opacity={0.3} side={THREE.DoubleSide} />
        </mesh>
      </RigidBody>

    </group>
  ) 
}

// ==========================================
// 🌠 SUPER BRIGHT: Glowing White Meteors
// ==========================================
function ShootingStar({ speed = 2, offset = 0, startPos, endPos }) {
  const groupRef = useRef();

  useFrame((state) => {
    if (!groupRef.current) return;
    
    // Looping math
    const t = ((state.clock.elapsedTime * speed) + offset) % 10;
    const progress = t / 10; 

    // Move the meteor
    groupRef.current.position.x = THREE.MathUtils.lerp(startPos[0], endPos[0], progress);
    groupRef.current.position.y = THREE.MathUtils.lerp(startPos[1], endPos[1], progress);
    groupRef.current.position.z = THREE.MathUtils.lerp(startPos[2], endPos[2], progress);

    // Make the entire group point exactly where it is flying
    groupRef.current.lookAt(endPos[0], endPos[1], endPos[2]);
  });

  return (
    <group ref={groupRef}>
      {/* THE HEAD: Ultra-Bright White Sphere */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.5, 16, 16]} />
        {/* 🛠️ THE FIX 1: Cranked emissiveIntensity to 10.0 and added toneMapped={false} */}
        <meshStandardMaterial 
          color="#ffffff" 
          emissive="#ffffff" 
          emissiveIntensity={100.0} 
          toneMapped={false} 
        />
      </mesh>
      
      {/* THE TAIL: Glowing, thicker fading trail */}
      <mesh position={[0, 0, -7.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.4, 15, 16]} />
        {/* 🛠️ THE FIX 2: Upgraded the tail to glow as well, and bumped opacity to 0.5! */}
        <meshStandardMaterial 
          color="#ffffff" 
          emissive="#ffffff"
          emissiveIntensity={8.0}
          transparent 
          opacity={0.5} 
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

function StopperFloor() { 
  return (
    // 🛠️ THE FIX: Lowered position from -0.5 down to -1.0!
    // Since it is 2 units tall, its top surface now stops exactly at Y=0.
    <RigidBody type="fixed" position={[0, -1.0, 0]}>
      <mesh receiveShadow>
        <cylinderGeometry args={[4, 4, 2, 32]} />
        <meshStandardMaterial color="#0f3460" emissive="#0f3460" emissiveIntensity={0.5} />
      </mesh>
    </RigidBody>
  ) 
}

function CentralRing() { 
  const ringBodyRef = useRef();
  const meshRef = useRef(); 
  const jumpPower = useRef(0); 
  
  useEffect(() => { 
    const handlePower = (e) => { 
      jumpPower.current = Math.max(0, e.detail.power); 
    };

    window.addEventListener('physics-power', handlePower);

    return () => { 
      window.removeEventListener('physics-power', handlePower);
    } 
  }, []); 
  
  useFrame((state, delta) => { 
    if (!ringBodyRef.current || !meshRef.current) return; 

    const currentPos = ringBodyRef.current.translation();
    if (!currentPos) return;

    const safePower = Math.min(jumpPower.current, 0.04); 
    const targetY = 0.2 + (safePower * 22.0); 
    const targetScale = 1.0 + (safePower * 1.5); 

    // 🛠️ THE FIX: Clamp the animation speed!
    // By forcing it to never go above 1.0, the ring will never mathematically explode
    // if your web browser lags or drops frames.
    const safeSpeed = Math.min(30 * delta, 1.0);

    // Apply the capped speed to the movement and the scale
    const nextY = THREE.MathUtils.lerp(currentPos.y, targetY, safeSpeed);
    ringBodyRef.current.setNextKinematicTranslation({ x: 0, y: nextY, z: 0 });

    meshRef.current.scale.lerp(new THREE.Vector3(targetScale, 1, targetScale), safeSpeed); 
    meshRef.current.material.emissiveIntensity = 1.0 + (safePower * 40.0);
  }); 
  
  return (
    <RigidBody ref={ringBodyRef} type="kinematicPosition" colliders="hull" position={[0, 0.2, 0]} restitution={2.0} canSleep={false}>
      <mesh ref={meshRef} castShadow receiveShadow>
        <cylinderGeometry args={[1.8, 1.8, 0.6, 32]} />
        <meshStandardMaterial color="#00ffcc" emissive="#00ffcc" emissiveIntensity={1.0} toneMapped={false} />
      </mesh>
    </RigidBody>
  ) 
}

// ==========================================
// ⚡ PIKACHU BUMPER GAUNTLET (Lowered Pattern)
// ==========================================
// ==========================================
// ⚡ PIKACHU BUMPER GAUNTLET (Lowered Pattern)
// ==========================================
function BumperGauntlet({ addScore }) { 
  // 1. BASE must be defined here, at the top level of the component!
  const BASE = import.meta.env.BASE_URL;
  
  const targets = useMemo(() => { 
    const items = []; 
    let pikaId = 1; 

    const rings = [
      { y: 1.0, count: 5, angleOffset: 0 },             
      { y: 2.2, count: 6, angleOffset: Math.PI / 6 },   
      { y: 3.4, count: 7, angleOffset: Math.PI / 7 }    
    ];

    rings.forEach(ring => {
      for (let i = 0; i < ring.count; i++) {
        const angle = (i / ring.count) * (Math.PI * 2) + ring.angleOffset;
        const r = getRadius(ring.y);

        // 2. The URL must be built inside the loop where pikaId exists!
        const imgUrl = `${BASE}r3f/images/Pok_${pikaId}.png`;
        pikaId = pikaId >= 22 ? 1 : pikaId + 1;

        items.push({ 
          pos: [Math.cos(angle) * r, ring.y, Math.sin(angle) * r], 
          angle: angle, 
          textureUrl: imgUrl
        }); 
      }
    });

    return items; 
  }, [BASE]); // 3. BASE is passed into the dependencies here safely.

  return (
    <group>
      {targets.map((b, i) => (
        <PopBumper 
          key={`bump-${i}`} 
          position={b.pos} 
          angle={b.angle} 
          textureUrl={b.textureUrl} 
          addScore={addScore} 
        />
      ))}
    </group> 
  )
}

// ==========================================
// 💫 POKEMON SPINNER RING (Giant Edition!)
// ==========================================
// ==========================================
// 💫 POKEMON SPINNER RING (Giant Edition!)
// ==========================================
function PokemonSpinnerGauntlet({ addScore, count = 12 }) {
  // 1. BASE must be defined outside the useMemo!
  const BASE = import.meta.env.BASE_URL;
	
  const targets = useMemo(() => {
    const items = [];
    const y = 5.6; 
    
    // 2. We use BASE here safely.
    const images = [
      `${BASE}r3f/images/edges/f0.png`, 
      `${BASE}r3f/images/edges/f1.png`, 
      `${BASE}r3f/images/edges/f2.png`  
    ];

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const r = getRadius(y);

      const pos = [Math.cos(angle) * (r - 0.4), y, Math.sin(angle) * (r - 0.4)];

      items.push({
        pos: pos,
        angle: angle,           
        tilt: SLOPE_TILT,       
        textureUrl: images[i % 3] 
      });
    }
    return items;
  }, [count, BASE]); // 3. BASE safely goes in the dependency array here.

  return (
    <group>
      {targets.map((t, i) => (
        <Spinner
          key={`pkmn-spin-${i}`}
          position={t.pos}
          angle={t.angle} 
          tilt={t.tilt}   
          textureUrl={t.textureUrl}
          addScore={addScore}
        />
      ))}
    </group>
  )
}


function SlingshotGauntlet({ addScore }) { 
  const targets = useMemo(() => { 
    const items = []; 
    for (let i = 0; i < 10; i++) { 
      const y = 1 + Math.random() * 3.5; 
      const r = getRadius(y); 
      const angle = Math.random() * Math.PI * 2; 
      items.push({ pos: [Math.cos(angle) * r, y, Math.sin(angle) * r], rot: [SLOPE_TILT, -angle - Math.PI/2, 0], color: "#ffaa00" }); 
    } 
    return items; 
  }, []); 
  return <group>{targets.map((s, i) => <Slingshot key={`sling-${i}`} position={s.pos} rotation={s.rot} color={s.color} addScore={addScore} />)}</group> 
}

function DropTargetGauntlet({ addScore }) { 
  const targets = useMemo(() => { 
    const items = []; 
    for (let i = 0; i < 15; i++) { 
      const y = 1.5 + Math.random() * 3.5; 
      const r = getRadius(y); 
      const angle = Math.random() * Math.PI * 2; 
      items.push({ pos: [Math.cos(angle) * r, y, Math.sin(angle) * r], rot: [0, -angle - Math.PI/2, 0] }); 
    } 
    return items; 
  }, []); 
  return <group>{targets.map((t, i) => <DropTarget key={`drop-${i}`} position={t.pos} rotation={t.rot} color="#ff2222" addScore={addScore} />)}</group> 
}

function StandupTargetGauntlet({ addScore }) { 
  const targets = useMemo(() => { 
    const items = []; 
    for (let i = 0; i < 15; i++) { 
      const y = 1.5 + Math.random() * 3.5; 
      const r = getRadius(y); 
      const angle = Math.random() * Math.PI * 2; 
      items.push({ pos: [Math.cos(angle) * r, y, Math.sin(angle) * r], rot: [0, -angle - Math.PI/2, 0] }); 
    } 
    return items; 
  }, []); 
  return <group>{targets.map((t, i) => <StandupTarget key={`stand-${i}`} position={t.pos} rotation={t.rot} color="#00ff00" addScore={addScore} />)}</group> 
}


function SaucerGauntlet({ addScore }) {
  const targets = useMemo(() => {
    const items = []
    const TOTAL = 8 
    for (let i = 0; i < TOTAL; i++) {
      const angle = (i / TOTAL) * Math.PI * 2 
      const y = 1.5 + (i % 2 === 0 ? 0 : 2.0) 
      const r = getRadius(y);
      items.push({ 
        pos: [Math.cos(angle) * r, y + 0.3, Math.sin(angle) * r], 
        rot: [SLOPE_TILT, -angle + Math.PI / 2, 0] 
      })
    }
    return items
  }, [])
  return <group>{targets.map((t, i) => <Saucer key={`saucer-${i}`} position={t.pos} rotation={t.rot} color="#ff00ff" addScore={addScore} />)}</group>
}

function CaptiveBallGauntlet({ addScore }) {
  const targets = useMemo(() => {
    const items = []
    const TOTAL = 6 
    for (let i = 0; i < TOTAL; i++) {
      const angle = (i / TOTAL) * Math.PI * 2 
      const y = 2.0 + (i % 2 === 0 ? 0 : 1.5) 
      const r = getRadius(y);
      items.push({ 
        pos: [Math.cos(angle) * (r - 1.2), y + 0.3, Math.sin(angle) * (r - 1.2)], 
        rot: [SLOPE_TILT, -angle + Math.PI / 2, 0] 
      })
    }
    return items
  }, [])
  return <group>{targets.map((t, i) => <CaptiveBall key={`cap-${i}`} position={t.pos} rotation={t.rot} color="#00ffff" addScore={addScore} />)}</group>
}

function RampGauntlet() {
  const targets = useMemo(() => {
    const items = []
    const TOTAL = 4 
    for (let i = 0; i < TOTAL; i++) {
      const angle = (i / TOTAL) * Math.PI * 2 
      const y = 1.0 
      const r = getRadius(y);
      items.push({ 
        pos: [Math.cos(angle) * r, y + 0.1, Math.sin(angle) * r], 
        rot: [SLOPE_TILT, -angle + Math.PI / 2, 0] 
      })
    }
    return items
  }, [])
  return <group>{targets.map((t, i) => <Ramp key={`ramp-${i}`} position={t.pos} rotation={t.rot} color="#00ffcc" />)}</group>
}

function RolloverGauntlet({ addScore }) {
  const targets = useMemo(() => {
    const items = []
    const TOTAL = 4 
    for (let i = 0; i < TOTAL; i++) {
      const angle = (i / TOTAL) * Math.PI * 2 + (Math.PI / 4)
      const y = 3.5 
      const r = getRadius(y);
      items.push({ 
        pos: [Math.cos(angle) * r, y + 0.1, Math.sin(angle) * r], 
        rot: [SLOPE_TILT, -angle + Math.PI / 2, 0] 
      })
    }
    return items
  }, [])
  return <group>{targets.map((t, i) => <RolloverLane key={`roll-${i}`} position={t.pos} rotation={t.rot} color="#ffff00" addScore={addScore} />)}</group>
}

export default function PinballMachine({ addScore }) {
  return (
    <group>
      <FunnelWall />
      <StopperFloor />
      
      <BumperGauntlet addScore={addScore} /> 
      <PokemonSpinnerGauntlet addScore={addScore} />

      {/* 🛠️ ADD THE NEW SPIRAL CANNON HERE: */}
      <SpiralTube />

      <CentralRing />
      <GlassCeiling /> 
    </group>
  )
}