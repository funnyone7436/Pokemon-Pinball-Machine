import React from 'react'

export default function PoseMotionValueDetector() {
  const videoRef = React.useRef(null)
  const prevLmRef = React.useRef(null) 
  const mpRef = React.useRef(null)
  const rafRef = React.useRef(0)
  const waitingGesture = React.useRef(false)
  const startedRef = React.useRef(false)

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
      selfieMode: true, 
      modelComplexity: 0, 
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
      } catch (e) { lastErr = e; }
    }
    throw lastErr || new Error('All pose bases failed')
  }

  const onResults = React.useCallback((res) => {
    const lm = res.poseLandmarks;
    if (!lm || !lm[0]) return;

    const noseY = lm[0].y; 

    let st = prevLmRef.current;
    if (!st || st.__v !== 'history_array') {
      st = prevLmRef.current = { __v: 'history_array', history: [], isJumping: false };
    }

    st.history.push(noseY);
    if (st.history.length > 15) st.history.shift(); 

    const oldestY = st.history[0];
    const upwardPower = oldestY - noseY;

    // 🚀 NEW: ULTRA-FAST PHYSICS FEED! 
    // This talks directly to the Pinball machine 60 times a second without lagging React.
    window.dispatchEvent(new CustomEvent('physics-power', { detail: { power: upwardPower } }));

    // 🛠️ We still send the True/False jump to React so the UI can flash the red text!
    const JUMP_THRESHOLD = 0.020; 
    const LAND_THRESHOLD = 0.005; 

    if (!st.isJumping && upwardPower > JUMP_THRESHOLD) {
      st.isJumping = true;
      window.dispatchEvent(new CustomEvent('player-jump', { detail: { active: true } }));
    }
    else if (st.isJumping && upwardPower < LAND_THRESHOLD) {
      st.isJumping = false;
      window.dispatchEvent(new CustomEvent('player-jump', { detail: { active: false } }));
    }
  }, []);

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
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, 
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
      autoPlay
      playsInline
      muted
      style={{
        position:'absolute', top: 0, left: 0, zIndex: -10,
        width: '640px', height: '480px', 
        opacity: 0.001, pointerEvents: 'none',
      }}
    />
  )
}