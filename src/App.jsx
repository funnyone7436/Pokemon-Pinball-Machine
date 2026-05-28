import React, { useRef, useEffect, useState, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei' 
import { Physics, RigidBody, BallCollider } from '@react-three/rapier'
import PinballMachine from './components/PinballMachine'
import PoseMotionValueDetector from './components/PoseMotionValueDetector'
import AppUI from './components/AppUI'
import CameraController from './components/CameraController' 
import * as THREE from 'three'
import * as Tone from 'tone' 

const BALL_MODELS = [
  '/glb/PokeBall_Body.glb', '/glb/GreatBall.glb', '/glb/UltraBall.glb',
  '/glb/MasterBall.glb', '/glb/PremierBall.glb', '/glb/LuxuryBall.glb'
];

const BDAY_SONG = [
  "G4", "G4", "A4", "G4", "C5", "B4",
  "G4", "G4", "A4", "G4", "D5", "C5",
  "G4", "G4", "G5", "E5", "C5", "B4", "A4",
  "F5", "F5", "E5", "C5", "D5", "C5"
];

function AudioManager() {
  const synths = useRef({});
  const bumperNoteIndex = useRef(0); 
  const lastPlay = useRef({ ball: 0, bumper: 0 }); 
  
  useEffect(() => {
    const initAudio = async () => {
      await Tone.start();
      const masterVol = new Tone.Volume(-8).toDestination();

      synths.current.ball = new Tone.PolySynth(Tone.MetalSynth, {
        frequency: 400, envelope: { attack: 0.001, decay: 0.1, release: 0.01 },
        harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5
      }).connect(masterVol);

      synths.current.bumper = new Tone.PolySynth(Tone.FMSynth, {
        harmonicity: 2, modulationIndex: 3, 
        oscillator: { type: "square" },
        envelope: { attack: 0.01, decay: 0.3, sustain: 0 },
        modulation: { type: "sawtooth" }
      }).connect(masterVol);

      synths.current.spinner = new Tone.Synth({
        oscillator: { type: "triangle" },
        envelope: { attack: 0.005, decay: 0.1, sustain: 0 }
      }).connect(masterVol);

      synths.current.vacuum = new Tone.NoiseSynth({
        noise: { type: "pink" },
        envelope: { attack: 0.2, decay: 1.5, sustain: 0 }
      }).connect(masterVol);

      window.removeEventListener('keydown', initAudio);
      window.removeEventListener('pointerdown', initAudio);
    };

    window.addEventListener('keydown', initAudio);
    window.addEventListener('pointerdown', initAudio);

    const handlePlaySound = (e) => {
      const type = e.detail.type;
      if (!synths.current[type]) return;

      const now = Date.now();

      try {
        if (Tone.context.state !== 'running') return;

        if (type === 'ball') {
          if (now - lastPlay.current.ball < 30) return; 
          lastPlay.current.ball = now;
          synths.current.ball.triggerAttackRelease("32n");
        }
        
        if (type === 'bumper') {
          if (now - lastPlay.current.bumper < 50) return;
          lastPlay.current.bumper = now;
          const noteToPlay = BDAY_SONG[bumperNoteIndex.current];
          synths.current.bumper.triggerAttackRelease(noteToPlay, "8n"); 
          bumperNoteIndex.current = (bumperNoteIndex.current + 1) % BDAY_SONG.length;
        }
        
        if (type === 'spinner') synths.current.spinner.triggerAttackRelease("A6", "32n");
        if (type === 'vacuum') synths.current.vacuum.triggerAttackRelease("2n");
        
      } catch (error) {
        console.warn("⚠️ Audio Engine Skipped a Beat:", error.message);
      }
    };

    window.addEventListener('play-sound', handlePlaySound);
    return () => {
      window.removeEventListener('play-sound', handlePlaySound);
    };
  }, []);

  return null;
}

function EffectsManager() {
  const [effects, setEffects] = useState([]);

  useEffect(() => {
    const handleSpawn = (e) => {
      const uniqueId = Math.random().toString(36).substr(2, 9);
      const newEffect = { id: uniqueId, ...e.detail };
      
      setEffects(prev => [...prev, newEffect]);
      setTimeout(() => setEffects(prev => prev.filter(ef => ef.id !== newEffect.id)), 1000);
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

function PlayerBall({ startPosition, addScore, modelPath }) { 
  const ballRef = useRef(); 
  const { scene } = useGLTF(modelPath);
  const ballModel = useMemo(() => scene.clone(), [scene]);
  
  useEffect(() => { 
    const triggerJump = () => {
      if (ballRef.current) { 
        ballRef.current.applyImpulse({ 
          x: (Math.random() - 0.5) * 8, 
          y: 15, 
          z: (Math.random() - 0.5) * 8 
        }, true) 
      }
    };

    const handleCameraJump = (e) => { if (e.detail.active) triggerJump(); };
    window.addEventListener('player-jump', handleCameraJump);

    return () => {
      window.removeEventListener('player-jump', handleCameraJump);
    } 
  }, []);

  const handleBallCollision = (e) => {
    if (e.other.rigidBodyObject && e.other.rigidBodyObject.name === 'player-ball') {
      window.dispatchEvent(new CustomEvent('spawn-effect', {
        detail: { type: 'explosion', position: [ballRef.current.translation().x, ballRef.current.translation().y, ballRef.current.translation().z], color: '#ffffff' }
      }))
      window.dispatchEvent(new CustomEvent('play-sound', { detail: { type: 'ball' } }));
      if (addScore) addScore(50);
    }
  }

  return (
    <RigidBody ref={ballRef} name="player-ball" type="dynamic" colliders={false} position={startPosition} restitution={0.6} friction={0.1} ccd={true} onCollisionEnter={handleBallCollision}>
      <BallCollider args={[0.4]} />
      <primitive object={ballModel} scale={[0.4, 0.4, 0.4]} />
    </RigidBody>
  ) 
}

export default function SphereGame() {
  const [score, setScore] = useState(0);
  const [isJumping, setIsJumping] = useState(false);
  const [cameraMode, setCameraMode] = useState('orbit'); 
  const [isStarted, setIsStarted] = useState(false);
  const [balls, setBalls] = useState([]);
  
  // 🛠️ NEW: Timer & Game Over States
  const [timeLeft, setTimeLeft] = useState(120); 
  const [isGameOver, setIsGameOver] = useState(false);

  const TOTAL_BALLS = 25; 

  const addScore = (points) => setScore(prev => prev + points);

  useEffect(() => {
    const handleCameraJump = (e) => setIsJumping(e.detail.active);
    window.addEventListener('player-jump', handleCameraJump);
    
    return () => {
      window.removeEventListener('player-jump', handleCameraJump);
    };
  }, []);

// 🛠️ THE FIX 1: The Countdown Clock Logic
  useEffect(() => {
    let timer = null;
    if (isStarted && !isGameOver && timeLeft > 0) {
      // Tick down 1 second at a time
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } 
    // 🛠️ Added "isStarted" check here! Now it won't instantly kill the Main Menu.
    else if (isStarted && timeLeft === 0 && !isGameOver) { 
      setIsGameOver(true);
      window.dispatchEvent(new CustomEvent('play-sound', { detail: { type: 'vacuum' } }));
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isStarted, isGameOver, timeLeft]);


  const handleStartGame = async () => {
    await Tone.start();
    const generatedBalls = [];
    
    for (let i = 0; i < TOTAL_BALLS; i++) {
      const angle = (i / TOTAL_BALLS) * Math.PI * 2 * 5; 
      const radius = 2 + (Math.random() * 16); 
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      
      const y = 8 + (i * (7 / TOTAL_BALLS)); 

      generatedBalls.push({
        id: `ball-${Date.now()}-${i}`,
        pos: [x, y, z],
        modelPath: BALL_MODELS[i % BALL_MODELS.length]
      });
    }
    
    setBalls(generatedBalls);
    setIsStarted(true);
    setIsGameOver(false);
    setTimeLeft(120); 
    setScore(0);      
    setCameraMode('center'); 
    
    window.dispatchEvent(new CustomEvent('play-sound', { detail: { type: 'vacuum' } }));
  };


  // 🛠️ THE FIX 2: Play Again Button Logic
  const handleRestart = () => {
    setBalls([]);         
    setIsStarted(false);  
    setIsGameOver(false); 
    setTimeLeft(120);     // 🛠️ We must reset the clock here so it doesn't instantly game-over!
    setCameraMode('orbit'); 
  };

  const handleToggleCamera = () => {
    setCameraMode(prev => prev === 'orbit' ? 'center' : 'orbit');
  };

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      
      <PoseMotionValueDetector />
      
      {/* 🛠️ Passed the new Timer & Restart props to UI */}
      <AppUI 
        score={score} 
        isJumping={isJumping} 
        cameraMode={cameraMode} 
        onToggleCamera={handleToggleCamera} 
        isStarted={isStarted}
        onStart={handleStartGame}
        timeLeft={timeLeft}
        isGameOver={isGameOver}
        onRestart={handleRestart}
      />

      <Canvas shadows camera={{ fov: 65 }}>
        <ambientLight intensity={0.1} />
        <pointLight position={[0, 8, 0]} intensity={2.0} distance={50} castShadow />

        <CameraController mode={cameraMode} />
        <AudioManager />
        <EffectsManager />

        <Physics gravity={[0, -12, 0]}>
          <PinballMachine addScore={addScore} />
          {/* Balls despawn instantly when Game Over is triggered! */}
          {isStarted && !isGameOver && balls.map(ball => (
            <PlayerBall key={ball.id} startPosition={ball.pos} modelPath={ball.modelPath} addScore={addScore} />
          ))}
        </Physics>
      </Canvas>
    </div>
  )
}

BALL_MODELS.forEach(url => useGLTF.preload(url));