import React, { useRef, useEffect, useState, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, useGLTF } from '@react-three/drei' 
import { Physics, RigidBody, BallCollider } from '@react-three/rapier'
import PinballMachine from './components/PinballMachine'
import PoseMotionValueDetector from './components/PoseMotionValueDetector' 
import * as THREE from 'three'
import * as Tone from 'tone' // 🎵 Added Tone.js

// ==========================================
// 🎵 THE MASTER AUDIO MANAGER (NEW!)
// ==========================================
function AudioManager() {
  const synths = useRef({});
  
  useEffect(() => {
    // Browsers require a user interaction before audio can play
    const initAudio = async () => {
      await Tone.start();
      
      const masterVol = new Tone.Volume(-8).toDestination();

      // 1. BALL COLLISION: Metallic, bell-like clank
      synths.current.ball = new Tone.MetalSynth({
        frequency: 400, envelope: { attack: 0.001, decay: 0.1, release: 0.01 },
        harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5
      }).connect(masterVol);

      // 2. BUMPER HIT: Classic Arcade FM "Boing"
      synths.current.bumper = new Tone.FMSynth({
        harmonicity: 2, modulationIndex: 10,
        oscillator: { type: "square" },
        envelope: { attack: 0.01, decay: 0.2, sustain: 0 },
        modulation: { type: "sawtooth" },
        modulationEnvelope: { attack: 0.01, decay: 0.2, sustain: 0 }
      }).connect(masterVol);

      // 3. SPINNER HIT: Fast laser / coin tick
      synths.current.spinner = new Tone.Synth({
        oscillator: { type: "triangle" },
        envelope: { attack: 0.005, decay: 0.1, sustain: 0 }
      }).connect(masterVol);

      // 4. VACUUM WARP: Deep air whoosh
      synths.current.vacuum = new Tone.NoiseSynth({
        noise: { type: "pink" },
        envelope: { attack: 0.2, decay: 1.5, sustain: 0 }
      }).connect(masterVol);

      // Remove listeners once initialized
      window.removeEventListener('keydown', initAudio);
      window.removeEventListener('pointerdown', initAudio);
    };

    window.addEventListener('keydown', initAudio);
    window.addEventListener('pointerdown', initAudio);

    // Listen for physics events and trigger the right synth
    const handlePlaySound = (e) => {
      const type = e.detail.type;
      if (!synths.current[type]) return;

      if (type === 'ball') synths.current.ball.triggerAttackRelease("32n");
      if (type === 'bumper') {
        const notes = ["C5", "E5", "G5", "C6"]; // Randomize pitch slightly
        synths.current.bumper.triggerAttackRelease(notes[Math.floor(Math.random() * notes.length)], "16n");
      }
      if (type === 'spinner') synths.current.spinner.triggerAttackRelease("A6", "32n");
      if (type === 'vacuum') synths.current.vacuum.triggerAttackRelease("2n");
    };

    window.addEventListener('play-sound', handlePlaySound);
    return () => {
      window.removeEventListener('play-sound', handlePlaySound);
      window.removeEventListener('keydown', initAudio);
      window.removeEventListener('pointerdown', initAudio);
    };
  }, []);

  return null;
}

// ==========================================
// 💥 THE MASTER EFFECTS MANAGER
// ==========================================
function EffectsManager() {
  const [effects, setEffects] = useState([]);

  useEffect(() => {
    const handleSpawn = (e) => {
      const newEffect = { id: Date.now() + Math.random(), ...e.detail };
      setEffects(prev => [...prev, newEffect]);
      setTimeout(() => {
        setEffects(prev => prev.filter(ef => ef.id !== newEffect.id));
      }, 1000);
    };
    window.addEventListener('spawn-effect', handleSpawn);
    return () => window.removeEventListener('spawn-effect', handleSpawn);
  }, []);

  return (
    <group>
      {effects.map(ef => {
        if (ef.type === 'explosion') return <ExplosionBurst key={ef.id} position={ef.position} color={ef.color} />;
        if (ef.type === 'vacuum') return <VacuumWarp key={ef.id} position={ef.position} color={ef.color} />;
        return null;
      })}
    </group>
  )
}

function ExplosionBurst({ position, color }) {
  const PARTICLE_COUNT = 40;
  const meshRef = useRef();
  const age = useRef(0);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 15 + Math.random() * 25; 
      const vx = Math.sin(phi) * Math.cos(theta) * speed;
      const vy = Math.sin(phi) * Math.sin(theta) * speed;
      const vz = Math.cos(phi) * speed;
      temp.push({ position: new THREE.Vector3(0, 0, 0), velocity: new THREE.Vector3(vx, vy, vz) });
    }
    return temp;
  }, []);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    age.current += delta;
    particles.forEach((p, i) => {
      p.position.addScaledVector(p.velocity, delta);
      p.velocity.y -= 30 * delta; 
      p.velocity.multiplyScalar(0.92);
      dummy.position.copy(p.position);
      const scale = Math.max(0, 1 - age.current);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
    meshRef.current.material.opacity = Math.max(0, 1 - age.current * 1.5);
  });

  return (
    <group position={position}>
      <instancedMesh ref={meshRef} args={[null, null, PARTICLE_COUNT]}>
        <sphereGeometry args={[0.25, 8, 8]} />
        <meshBasicMaterial color={color} transparent opacity={1} depthTest={false} toneMapped={false} />
      </instancedMesh>
      <FlashCore />
    </group>
  );
}

function FlashCore() {
  const ref = useRef();
  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.scale.addScalar(delta * 20); 
      ref.current.material.opacity -= delta * 8.0; 
    }
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.5, 16, 16]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={1} depthTest={false} toneMapped={false} />
    </mesh>
  );
}

function VacuumWarp({ position, color }) {
  const ring1Ref = useRef();
  const ring2Ref = useRef();
  useFrame((_, delta) => {
    if (ring1Ref.current) {
      ring1Ref.current.scale.addScalar(delta * 30);
      ring1Ref.current.rotation.z += delta * 15;
      ring1Ref.current.material.opacity = Math.max(0, ring1Ref.current.material.opacity - delta * 1.5);
    }
    if (ring2Ref.current) {
      ring2Ref.current.scale.addScalar(delta * 15); 
      ring2Ref.current.rotation.z -= delta * 10; 
      ring2Ref.current.material.opacity = Math.max(0, ring2Ref.current.material.opacity - delta * 1.5);
    }
  });
  return (
    <group position={position} rotation={[Math.PI/2, 0, 0]}>
      <mesh ref={ring1Ref}>
        <torusGeometry args={[2.0, 0.2, 16, 32]} />
        <meshBasicMaterial color={color} transparent opacity={1} depthTest={false} toneMapped={false} />
      </mesh>
      <mesh ref={ring2Ref}>
        <torusGeometry args={[1.0, 0.4, 16, 32]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={1} depthTest={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

// ==========================================
// 1. The Custom GLB Player Ball
// ==========================================
function PlayerBall({ startPosition, addScore }) { 
  const ballRef = useRef(); 
  const { scene } = useGLTF('/glb/PokeBall_Body.glb');
  const pokeballModel = useMemo(() => scene.clone(), [scene]);
  
  useEffect(() => { 
    const handleKeyDown = (e) => { 
      if (e.code === 'Space' && ballRef.current) { 
        const pos = ballRef.current.translation(); 
        const distance = Math.sqrt(pos.x * pos.x + pos.z * pos.z); 
        if (distance < 6.0) { 
          const force = (6.0 - distance) * 8; 
          ballRef.current.applyImpulse({ 
            x: (pos.x / distance) * force, 
            y: force + 5, 
            z: (pos.z / distance) * force 
          }, true) 
        } 
      } 
    }; 
    window.addEventListener('keydown', handleKeyDown); 
    return () => window.removeEventListener('keydown', handleKeyDown) 
  }, []); 

  const handleBallCollision = (e) => {
    if (e.other.rigidBodyObject && e.other.rigidBodyObject.name === 'player-ball') {
      const pos = ballRef.current.translation();
      
      // Visual Explosion
      window.dispatchEvent(new CustomEvent('spawn-effect', {
        detail: { type: 'explosion', position: [pos.x, pos.y, pos.z], color: '#ffffff' }
      }))
      
      // 🎵 AUDIO EXPLOSION: Trigger the metallic clank!
      window.dispatchEvent(new CustomEvent('play-sound', {
        detail: { type: 'ball' }
      }));

      if (addScore) addScore(50);
    }
  }

  return (
    <RigidBody ref={ballRef} name="player-ball" type="dynamic" colliders={false} position={startPosition} restitution={0.6} friction={0.1} ccd={true} onCollisionEnter={handleBallCollision}>
      <BallCollider args={[0.4]} />
      <primitive object={pokeballModel} scale={[0.4, 0.4, 0.4]} />
    </RigidBody>
  ) 
}

function Avatar({ poseRef, ...props }) {
  const { scene, nodes } = useGLTF('/glb/body.glb');
  const currentPos = useRef(new THREE.Vector3(0, -0.5, 0));

  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        child.material = new THREE.MeshStandardMaterial({
          color: '#ffffff',
          emissive: '#ffffff',
          emissiveIntensity: 0.8, 
          toneMapped: false
        });
      }
    });
  }, [scene]);

  useFrame(() => {
    const pose = poseRef.current;
    if (!pose) return;

    if (nodes.Hips && pose.raw2DLandmarks) {
      const leftShoulderY = pose.raw2DLandmarks[11].y;
      const rightShoulderY = pose.raw2DLandmarks[12].y;
      const avgShoulderY = (leftShoulderY + rightShoulderY) / 2;

      const leftShoulderX = pose.raw2DLandmarks[11].x;
      const rightShoulderX = pose.raw2DLandmarks[12].x;
      const avgShoulderX = (leftShoulderX + rightShoulderX) / 2;

      let targetJumpY = (0.45 - avgShoulderY) * 12;
      if (targetJumpY < -0.5) targetJumpY = -0.5; 

      let targetMoveX = (0.5 - avgShoulderX) * 12;

      currentPos.current.x = THREE.MathUtils.lerp(currentPos.current.x, targetMoveX, 0.15);
      currentPos.current.y = THREE.MathUtils.lerp(currentPos.current.y, targetJumpY, 0.15);

      nodes.Hips.position.set(currentPos.current.x, currentPos.current.y, 0);
    }

    const PI = Math.PI;
    const PI_HALF = Math.PI / 2; 

    if (nodes.Spine && pose.Spine) nodes.Spine.rotation.set(pose.Spine.x, pose.Spine.y, pose.Spine.z);
    if (nodes.Neck && pose.Neck) nodes.Neck.rotation.set(pose.Neck.x, pose.Neck.y, pose.Neck.z);
    if (nodes.Head && pose.Head) nodes.Head.rotation.set(pose.Head.x, pose.Head.y, pose.Head.z);

    if (nodes.LeftUpperArm && pose.LeftUpperArm) nodes.LeftUpperArm.rotation.set(pose.LeftUpperArm.x, pose.LeftUpperArm.y, -pose.LeftUpperArm.z - PI_HALF);
    if (nodes.LeftLowerArm && pose.LeftLowerArm) nodes.LeftLowerArm.rotation.set(pose.LeftLowerArm.x, pose.LeftLowerArm.y, -pose.LeftLowerArm.z);
    if (nodes.LeftHand && pose.LeftHand) nodes.LeftHand.rotation.set(pose.LeftHand.x, pose.LeftHand.y, -pose.LeftHand.z);

    if (nodes.RightUpperArm && pose.RightUpperArm) nodes.RightUpperArm.rotation.set(pose.RightUpperArm.x, pose.RightUpperArm.y, -pose.RightUpperArm.z + PI_HALF);
    if (nodes.RightLowerArm && pose.RightLowerArm) nodes.RightLowerArm.rotation.set(pose.RightLowerArm.x, pose.RightLowerArm.y, -pose.RightLowerArm.z);
    if (nodes.RightHand && pose.RightHand) nodes.RightHand.rotation.set(pose.RightHand.x, pose.RightHand.y, -pose.RightHand.z);

    if (nodes.LeftUpperLeg && pose.LeftUpperLeg) nodes.LeftUpperLeg.rotation.set(pose.LeftUpperLeg.x + PI, pose.LeftUpperLeg.y, pose.LeftUpperLeg.z);
    if (nodes.LeftLowerLeg && pose.LeftLowerLeg) nodes.LeftLowerLeg.rotation.set(pose.LeftLowerLeg.x, pose.LeftLowerLeg.y, pose.LeftLowerLeg.z);
    
    if (nodes.RightUpperLeg && pose.RightUpperLeg) nodes.RightUpperLeg.rotation.set(pose.RightUpperLeg.x + PI, pose.RightUpperLeg.y, pose.RightUpperLeg.z);
    if (nodes.RightLowerLeg && pose.RightLowerLeg) nodes.RightLowerLeg.rotation.set(pose.RightLowerLeg.x, pose.RightLowerLeg.y, pose.RightLowerLeg.z);
  });

  return (
    <group {...props}>
      <primitive object={scene} />
    </group>
  );
}

// ==========================================
// 3. The Main Scene
// ==========================================
export default function SphereGame() {
  const [score, setScore] = useState(0)
  const latestPoseData = useRef(null);

  const MAX_BALLS = 10;
  const [balls, setBalls] = useState([
    { id: 'start-1', pos: [0, 10, -18] },
    { id: 'start-2', pos: [15, 10, -10] },
    { id: 'start-3', pos: [-15, 10, -10] },
    { id: 'start-4', pos: [12, 10, 15] },
    { id: 'start-5', pos: [-12, 10, 15] }
  ])

  const addScore = (points) => {
    setScore(prevScore => prevScore + points)
  }

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'KeyB') {
        setBalls(prev => {
          if (prev.length >= MAX_BALLS) return prev; 
          return [ ...prev, { id: `spawned-${Date.now()}`, pos: [0, 15, 0] } ]
        })
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      
      <PoseMotionValueDetector 
        debug={true}
        onPoseUpdate={(pose) => {
          latestPoseData.current = pose;
        }} 
      />

      <div style={{
        position: 'absolute', top: '20px', left: '30px', zIndex: 10, pointerEvents: 'none',
        color: '#00ffcc', fontFamily: '"Courier New", Courier, monospace', fontSize: '24px',
        fontWeight: 'bold', textShadow: '0px 0px 15px #00ffcc, 0px 0px 5px #ffffff'
      }}>
        SCORE: {score.toLocaleString()} <br/>
        <span style={{ fontSize: '16px', color: '#aaaaaa' }}>
          BALLS: {balls.length} / {MAX_BALLS}
        </span>
      </div>

      <Canvas shadows camera={{ position: [0, 2, 1], fov: 65 }}>
        <ambientLight intensity={0.1} />
        <pointLight position={[0, 8, 0]} intensity={2.0} distance={50} castShadow />

        {/* 🎵 Mount the Audio Manager so it can listen for events */}
        <AudioManager />
        <EffectsManager />

        <Physics gravity={[0, -12, 0]}>
          <PinballMachine addScore={addScore} />
          
          <Avatar poseRef={latestPoseData} position={[0, 4, 10]} scale={[2, 2, 2]} />
          
          {balls.map(ball => (
            <PlayerBall key={ball.id} startPosition={ball.pos} addScore={addScore} />
          ))}
        </Physics>

        <OrbitControls target={[0, 2, 0]} enablePan={false} enableZoom={false} makeDefault />
      </Canvas>
    </div>
  )
}

useGLTF.preload('/glb/PokeBall_Body.glb');
useGLTF.preload('/glb/body.glb');