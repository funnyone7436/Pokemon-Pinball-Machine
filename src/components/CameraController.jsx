// src/components/CameraController.jsx
import React, { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'

export default function CameraController({ mode }) {
  const { camera, gl } = useThree()
  const controlsRef = useRef()
  const frameCount = useRef(0)

  // 🛠️ TWEAK THESE PARAMETERS FOR THE CENTER SINE WAVE!
  const NOD_SPEED = 0.02;       // How fast it spins in a circle
  const NOD_AMPLITUDE = 0.6;    // How high/low the camera nods
  const NOD_FREQUENCY = 0.8;     // How fast it nods up and down

  useEffect(() => {
    if (!controlsRef.current) return;

    if (mode === 'orbit') {
      // 🎥 MODE 1: Sweeping Orbit (Outside) - UNTOUCHED
      camera.position.set(0, 15, 35);
      controlsRef.current.target.set(0, 2, 0);
    } else {
      // 🎯 MODE 2: Center Sine Wave (Inside)
      // The camera sits in the dead center. 
      // Z is 0.1 so it has a tiny pivot point to spin perfectly around!
      camera.position.set(0, 2, 0.1);
      controlsRef.current.target.set(0, 2, 0);
    }
    
    controlsRef.current.update();
    frameCount.current = 0; // Reset timer on mode switch
  }, [mode, camera]);

  useFrame((state) => {
    if (!controlsRef.current) return;
    const t = state.clock.elapsedTime;

    if (mode === 'orbit') {
      // MODE 1: Orbit auto-rotates automatically, we just bounce the target
      controlsRef.current.target.y = 2 + Math.sin(0.5 * t) * 6.0;
      controlsRef.current.update();
    } else {
      // MODE 2: Center Nodding Sine (Based on your uploaded file!)
      if (frameCount.current > 10) {
        
        // 1. Circle horizontally around the whole scene
        const angle = controlsRef.current.getAzimuthalAngle() + NOD_SPEED;
        controlsRef.current.setAzimuthalAngle(angle);

        // 2. Nod up and down with the Sine Wave
        // Math.PI/2 is straight ahead. We add the sine wave to tilt it up and down!
        const polarAngle = (Math.PI / 2) + Math.sin(t * NOD_FREQUENCY) * NOD_AMPLITUDE;
        controlsRef.current.setPolarAngle(polarAngle);

        controlsRef.current.update();
      } else {
        frameCount.current += 1;
      }
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      args={[camera, gl.domElement]}
      makeDefault
      // Only use built-in autoRotate for Orbit mode. Center mode does it manually!
      autoRotate={mode === 'orbit'}
      autoRotateSpeed={2.0}
      
      // Disable zoom and pan in the center so the player stays perfectly anchored
      enableZoom={mode === 'orbit'}
      enablePan={mode === 'orbit'}
      
      // Stop the camera from clipping through the floor in Orbit mode, but allow full look-around in Center
      maxPolarAngle={mode === 'orbit' ? Math.PI / 2 : Math.PI} 
      minPolarAngle={0}
    />
  )
}