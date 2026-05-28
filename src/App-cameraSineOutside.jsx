import React, { useRef, useEffect, useState, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
// 🛠️ REMOVED OrbitControls from the import, we are flying manual now!
import { useGLTF } from '@react-three/drei' 
import { Physics, RigidBody, BallCollider } from '@react-three/rapier'
import PinballMachine from './components/PinballMachine'
import PoseMotionValueDetector from './components/PoseMotionValueDetector'
import * as THREE from 'three'
import * as Tone from 'tone' 

const BALL_MODELS = [
  '/glb/PokeBall_Body.glb',
  '/glb/GreatBall.glb',
  '/glb/UltraBall.glb',
  '/glb/MasterBall.glb',
  '/glb/PremierBall.glb',
  '/glb/LuxuryBall.glb'
];

const BDAY_SONG = [
  "G4", "G4", "A4", "G4", "C5", "B4",
  "G4", "G4", "A4", "G4", "D5", "C5",
  "G4", "G4", "G5", "E5", "C5", "B4", "A4",
  "F5", "F5", "E5", "C5", "D5", "C5"
];

// ==========================================
// 🎥 THE CINEMATIC CAMERA CONTROLLER
// ==========================================
function CameraController() {
  // 🛠️ TWEAK THESE SINE WAVE VARIABLES!
  const AMPLITUDE = 10.0;  // How high and low the camera bobs (Y-axis stretch)
  const FREQUENCY = 0.5;   // How fast it bobs up and down (Speed of the wave)
  const PHASE = 0;         // Offset for the wave's starting position

  // Orbit Variables
  const ORBIT_RADIUS = 35; // How far back the camera sits from the machine
  const ORBIT_SPEED = 0.2; // How fast it rotates around the machine
  const BASE_HEIGHT = 15;  // The center horizontal line of the sine wave

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    // 1. Calculate the Circular Orbit (X and Z axes)
    const x = ORBIT_RADIUS * Math.sin(t * ORBIT_SPEED);
    const z = ORBIT_RADIUS * Math.cos(t * ORBIT_SPEED);

    // 2. Calculate the Sine Wave Bobbing (Y axis)
    const y = BASE_HEIGHT + AMPLITUDE * Math.sin((FREQUENCY * t) + PHASE);

    // 3. Apply the positions and force the camera to look at the center
    state.camera.position.set(x, y, z);
    state.camera.lookAt(0, 2, 0); // Always stare at the center of the pinball machine
  });

  return null;
}

function AudioManager() {
  const synths = useRef({});
  const bumperNoteIndex = useRef(0); 
  
  useEffect(() => {
    const initAudio = async () => {
      await Tone.start();
      
      const masterVol = new Tone.Volume(-8).toDestination();

      synths.current.ball = new Tone.MetalSynth({
        frequency: 400, envelope: { attack: 0.001, decay: 0.1, release: 0.01 },
        harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5
      }).connect(masterVol);

      synths.current.bumper = new Tone.FMSynth({
        harmonicity: 2, modulationIndex: 3, 
        oscillator: { type: "square" },
        envelope: { attack: 0.01, decay: 0.3, sustain: 0 },
        modulation: { type: "sawtooth" },
        modulationEnvelope: { attack: 0.01, decay: 0.3, sustain: 0 }
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

      if (type === 'ball') synths.current.ball.triggerAttackRelease("32n");
      
      if (type === 'bumper') {
        const noteToPlay = BDAY_SONG[bumperNoteIndex.current];
        synths.current.bumper.triggerAttackRelease(noteToPlay, "8n"); 
        
        bumperNoteIndex.current = (bumperNoteIndex.current + 1) % BDAY_SONG.length;
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

    const handleKeyDown = (e) => { if (e.code === 'Space') triggerJump(); }; 
    const handleCameraJump = (e) => { if (e.detail.active) triggerJump(); };

    window.addEventListener('keydown', handleKeyDown); 
    window.addEventListener('player-jump', handleCameraJump);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('player-jump', handleCameraJump);
    } 
  }, []); 

  const handleBallCollision = (e) => {
    if (e.other.rigidBodyObject && e.other.rigidBodyObject.name === 'player-ball') {
      const pos = ballRef.current.translation();
      
      window.dispatchEvent(new CustomEvent('spawn-effect', {
        detail: { type: 'explosion', position: [pos.x, pos.y, pos.z], color: '#ffffff' }
      }))
      
      window.dispatchEvent(new CustomEvent('play-sound', {
        detail: { type: 'ball' }
      }));

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
  const [score, setScore] = useState(0)
  const [isJumping, setIsJumping] = useState(false)

  const MAX_BALLS = 16;
  
  const [balls, setBalls] = useState(() => {
    const initialPositions = [
      [0, 10, -18], [15, 10, -10], [-15, 10, -10], [12, 10, 15],
      [-12, 10, 15], [5, 12, -15], [-5, 12, -15], [10, 12, 5],
      [-10, 12, 5], [0, 12, 10], [8, 14, -8], [-8, 14, -8],
      [14, 14, 0], [-14, 14, 0], [8, 14, 8], [-8, 14, 8]
    ];

    return initialPositions.map((pos, i) => ({
      id: `start-${i + 1}`,
      pos: pos,
      modelPath: BALL_MODELS[i % BALL_MODELS.length]
    }));
  });

  const addScore = (points) => {
    setScore(prevScore => prevScore + points)
  }

  useEffect(() => {
    const handleKeyDown = (e) => { if (e.code === 'Space') setIsJumping(true) };
    const handleKeyUp = (e) => { if (e.code === 'Space') setIsJumping(false) };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      
      <PoseMotionValueDetector debug={true} />
      
      <div style={{
        position: 'absolute', top: '20px', left: '30px', zIndex: 10, pointerEvents: 'none',
        color: '#00ffcc', fontFamily: '"Courier New", Courier, monospace', fontSize: '24px',
        fontWeight: 'bold', textShadow: '0px 0px 15px #00ffcc, 0px 0px 5px #ffffff'
      }}>
        SCORE: {score.toLocaleString()} <br/>
        <span style={{ fontSize: '16px', color: '#aaaaaa' }}>
          BALLS: {balls.length} / {MAX_BALLS}
        </span>

        <div style={{ height: '60px', marginTop: '20px' }}>
          {isJumping && (
             <div style={{
               color: '#ff0055', 
               fontSize: '36px', 
               fontWeight: '900',
               textShadow: '0px 0px 20px #ff0055, 0px 0px 10px #ffffff',
               animation: 'pulse 0.2s infinite alternate'
             }}>
               🚀 JUMP DETECTED!
             </div>
          )}
        </div>

      </div>

      <Canvas shadows camera={{ fov: 65 }}>
        <ambientLight intensity={0.1} />
        <pointLight position={[0, 8, 0]} intensity={2.0} distance={50} castShadow />

        {/* 🎥 THE NEW CINEMATIC CAMERA */}
        <CameraController />

        <AudioManager />
        <EffectsManager />

        <Physics gravity={[0, -12, 0]}>
          <PinballMachine addScore={addScore} />
          
          {balls.map(ball => (
            <PlayerBall key={ball.id} startPosition={ball.pos} modelPath={ball.modelPath} addScore={addScore} />
          ))}
        </Physics>
      </Canvas>
    </div>
  )
}

BALL_MODELS.forEach(url => useGLTF.preload(url));