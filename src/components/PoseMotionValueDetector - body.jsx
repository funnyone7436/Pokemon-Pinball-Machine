import React from 'react'
// 1. Import Kalidokit to handle the complex bone math
import * as Kalidokit from 'kalidokit' 

// 2. Instead of 'onMotionValue', we accept a shared 'poseRef' 
// This allows React Three Fiber to read the data instantly without re-rendering
export default function PoseMotionValueDetector({ onPoseUpdate, debug = false }) {
  const videoRef = React.useRef(null)
  const mpRef = React.useRef(null)
  const rafRef = React.useRef(0)
  const waitingGesture = React.useRef(false)
  const startedRef = React.useRef(false)

  // --- Asset Loading Configuration (Kept exactly as your original) ---
  const PUBLIC_BASE = import.meta.env.BASE_URL; 
  const LOCAL_BASE = new URL(`${PUBLIC_BASE}vendor/mediapipe/`, window.location.href).href
  const CDN_UNPKG = 'https://unpkg.com/@mediapipe/pose@0.5.167/'
  const CDN_JSD   = 'https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.167/'
  const BASES = [LOCAL_BASE, CDN_UNPKG, CDN_JSD]

  const loadTag = (src) => new Promise((res, rej) => {
    const s = document.createElement('script')
    s.src = src; s.async = true
    s.onload = () => res(src)
    s.onerror = () => rej(new Error(`Failed to load <script> ${src}`))
    document.head.appendChild(s)
  })

  async function probeBase(base) {
    try {
      const checks = await Promise.all([
        fetch(base + 'pose.js', { cache: 'no-store' }),
        fetch(base + 'pose_solution_packed_assets_loader.js', { cache: 'no-store' }),
        fetch(base + 'pose_solution_packed_assets.data', { cache: 'no-store' }),
      ])
      return checks.every(r => r.ok)
    } catch { return false }
  }

  async function loadPoseFrom(baseHref) {
    if (baseHref === LOCAL_BASE) {
      const ok = await probeBase(baseHref)
      if (!ok) throw new Error(`Local assets missing at ${baseHref}`)
    }
    await loadTag(`${baseHref}pose.js`)
    const PoseNS = window.Pose || window.pose
    const PoseCtor = PoseNS?.Pose || PoseNS
    if (typeof PoseCtor !== 'function') throw new Error('Pose constructor not found')

    const pose = new PoseCtor({ locateFile: (f) => baseHref + f })
    pose.onResults(onResults) 
    if (typeof pose.initialize === 'function') await pose.initialize()
    pose.setOptions({
      selfieMode: true, // Crucial for a mirror-like experience!
      modelComplexity: 1, // Increased to 1 for better joint accuracy
      smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.5, 
      minTrackingConfidence: 0.5,
    })
    return pose
  }

  async function loadPose() {
    let lastErr = null
    for (const base of BASES) {
      try {
        const p = await loadPoseFrom(base)
        return p
      } catch (e) { lastErr = e; console.warn('[PoseDetector] failed from base:', base, e) }
    }
    throw lastErr || new Error('All pose bases failed')
  }

const onResults = React.useCallback((res) => {
    const lm3D = res.poseWorldLandmarks 
    const lm2D = res.poseLandmarks

    if (!lm3D || !lm2D) return;

    const riggedPose = Kalidokit.Pose.solve(lm3D, lm2D, {
      runtime: "three", 
      video: videoRef.current
    });

    if (riggedPose && onPoseUpdate) {
      // 🚨 ADD THIS: Attach the raw webcam pixel data so the game knows when you jump!
      riggedPose.raw2DLandmarks = lm2D;
      
      onPoseUpdate(riggedPose);
    }
  }, [onPoseUpdate, debug])

  // --- Main Loop & Initialization (Kept exactly as your original) ---
  const loop = React.useCallback(async () => {
    const v = videoRef.current
    if (mpRef.current && v && v.readyState >= 2) {
      try { await mpRef.current.send({ image: v }) } catch {}
    }
    rafRef.current = requestAnimationFrame(loop)
  }, [])

  const start = React.useCallback(async () => {
    if (startedRef.current) return
    startedRef.current = true
    try {
      mpRef.current = await loadPose()
      const v = videoRef.current
      v.playsInline = true; v.muted = true; v.autoplay = true
      const stream = await navigator.mediaDevices.getUserMedia({ 
	  video: { 
		facingMode: 'user', 
		width: { ideal: 1920 }, 
		height: { ideal: 1080 } 
	  }, 
	  audio: false 
	})
      v.srcObject = stream
      await v.play().catch(()=>{})
      for (let i=0;i<2;i++) if (mpRef.current && v.readyState>=2) await mpRef.current.send({ image:v })
      
      rafRef.current = requestAnimationFrame(loop)
    } catch (e) {
      waitingGesture.current = true
      startedRef.current = false
    }
  }, [loop])

  React.useEffect(() => {
    start()
    const retry = () => { if (waitingGesture.current) start() }
    window.addEventListener('pointerdown', retry)
    window.addEventListener('keydown', retry)
    
    return () => {
      window.removeEventListener('pointerdown', retry)
      window.removeEventListener('keydown', retry)
      cancelAnimationFrame(rafRef.current)
      try { mpRef.current?.close() } catch {}
      const s = videoRef.current?.srcObject; if (s) s.getTracks().forEach(t => t.stop())
    }
  }, [start])

  return (
    <video
      ref={videoRef}
      style={{
        position:'fixed', width: debug ? 240 : 1, height: debug ? 180 : 1,
        bottom: debug ? 12 : 'auto', right: debug ? 12 : 'auto',
        border: debug ? '1px solid #0f0' : 'none', opacity: debug ? 0.85 : 0,
        zIndex: 99999, pointerEvents: 'none',
      }}
    />
  )
}