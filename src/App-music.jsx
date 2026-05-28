import React, { useRef, useState, useMemo, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Text } from '@react-three/drei'
import * as Tone from 'tone'

const BDAY_SONG = ["G4", "G4", "A4", "G4", "C5", "B4", "G4", "G4", "A4", "G4", "D5", "C5"];

function ReggaeBox() {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  // 🛠️ THE REGGAE BAND SETUP
  const { melodySynth, backingSynth, bassSynth } = useMemo(() => {
    const reverb = new Tone.Reverb(2).toDestination();
    
    const melody = new Tone.PolySynth(Tone.Synth).connect(reverb);
    const backing = new Tone.PolySynth(Tone.Synth).connect(reverb);
    const bass = new Tone.MonoSynth({
      oscillator: { type: "triangle" },
      envelope: { attack: 0.1, release: 1 }
    }).connect(reverb);

    backing.volume.value = -15;
    bass.volume.value = -10;

    return { melodySynth: melody, backingSynth: backing, bassSynth: bass };
  }, []);

  useEffect(() => {
    // 🥁 Create the "Skank" (The Reggae Rhythm)
    const rhythmLoop = new Tone.Loop((time) => {
      // Piano skank on the "off-beats" (2 and 4)
      backingSynth.triggerAttackRelease(["C3", "E3", "G3"], "16n", time + Tone.Time("4n"));
      backingSynth.triggerAttackRelease(["C3", "E3", "G3"], "16n", time + Tone.Time("2n") + Tone.Time("4n"));
      
      // Simple Reggae Bassline
      bassSynth.triggerAttackRelease("C2", "8n", time);
      bassSynth.triggerAttackRelease("G1", "8n", time + Tone.Time("4n."));
    }, "1m");

    rhythmLoop.start(0);
    Tone.Transport.bpm.value = 85; // Slow Reggae tempo
  }, [backingSynth, bassSynth]);

  const handleInteraction = async () => {
    if (!playing) {
      await Tone.start();
      Tone.Transport.start();
      setPlaying(true);
    }

    // Trigger your melody note!
    melodySynth.triggerAttackRelease(BDAY_SONG[index], "4n");
    setIndex((prev) => (prev + 1) % BDAY_SONG.length);
  };

  return (
    <mesh onClick={handleInteraction}>
      <boxGeometry args={[2, 2, 2]} />
      <meshStandardMaterial color={playing ? "#ffcc00" : "#444"} />
      <Text position={[0, -2.5, 0]} fontSize={0.3} color="white">
        {playing ? "Click for Melody!" : "Click to Start Reggae Beat"}
      </Text>
    </mesh>
  );
}

export default function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#111' }}>
      <Canvas camera={{ position: [0, 0, 8] }}>
        <pointLight position={[10, 10, 10]} />
        <ReggaeBox />
        <OrbitControls enableZoom={false} />
      </Canvas>
    </div>
  );
}