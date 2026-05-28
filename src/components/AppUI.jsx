import React from 'react'

export default function AppUI({ 
  score, 
  isJumping, 
  cameraMode, 
  onToggleCamera, 
  isStarted, 
  onStart,
  timeLeft,
  isGameOver,
  onRestart
}) {
  
  // 🛠️ Helper to format seconds into "MM:SS"
  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  // ==========================================
  // 💀 GAME OVER SCREEN
  // ==========================================
  if (isGameOver) {
    return (
      <div style={{
        position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
        backgroundColor: 'rgba(0, 5, 20, 0.85)', zIndex: 30, pointerEvents: 'auto',
        backdropFilter: 'blur(10px)'
      }}>
        <h1 style={{
          color: '#ff0055', fontFamily: 'Arial, sans-serif', fontSize: '80px',
          fontWeight: '900', letterSpacing: '8px',
          textShadow: '0px 0px 25px #ff0055, 5px 5px 0px #000', marginBottom: '20px',
          textAlign: 'center'
        }}>
          TIME'S UP!
        </h1>
        
        <div style={{
          background: 'rgba(0, 255, 204, 0.1)', border: '2px solid #00ffcc',
          padding: '40px 60px', borderRadius: '15px', textAlign: 'center',
          boxShadow: '0 0 30px rgba(0, 255, 204, 0.2)', marginBottom: '40px'
        }}>
          <h2 style={{ color: '#fff', margin: '0 0 15px 0', fontSize: '24px', fontFamily: '"Courier New", Courier, monospace' }}>
            FINAL SCORE
          </h2>
          <div style={{ color: '#00ffcc', fontSize: '64px', fontWeight: 'bold', textShadow: '0 0 20px #00ffcc' }}>
            {score.toLocaleString()}
          </div>
        </div>

        <button
          onClick={onRestart}
          style={{
            background: '#00ffcc', color: '#000', border: 'none',
            borderRadius: '8px', padding: '15px 40px', fontSize: '20px',
            cursor: 'pointer', fontWeight: '900', letterSpacing: '2px',
            boxShadow: '0 0 15px #00ffcc', transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
          onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
        >
          🔄 PLAY AGAIN
        </button>
      </div>
    )
  }

  // ==========================================
  // 🎮 START MENU
  // ==========================================
  if (!isStarted) {
    return (
      <div style={{
        position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
        backgroundColor: 'rgba(0, 5, 20, 0.7)', zIndex: 20, pointerEvents: 'auto',
        backdropFilter: 'blur(6px)' 
      }}>
        <h1 style={{
          color: '#ffcc00', fontFamily: 'Arial, sans-serif', fontSize: '72px',
          fontWeight: '900', letterSpacing: '8px', lineHeight: '1.1',
          textShadow: '0px 0px 25px #ff0000, 5px 5px 0px #000', marginBottom: '50px',
          textAlign: 'center'
        }}>
          POKEMON<br/>PINBALL
        </h1>

        <div style={{
          background: 'rgba(0, 255, 204, 0.1)', border: '2px solid #00ffcc',
          padding: '40px', borderRadius: '15px', textAlign: 'center',
          boxShadow: '0 0 30px rgba(0, 255, 204, 0.2)'
        }}>
          <h2 style={{ color: '#00ffcc', margin: '0 0 30px 0', fontFamily: '"Courier New", Courier, monospace', fontSize: '28px' }}>
            -- GAME SETUP --
          </h2>

          <div style={{ marginBottom: '40px' }}>
            <label style={{ display: 'block', color: '#fff', fontSize: '20px', fontFamily: 'sans-serif', fontWeight: 'bold' }}>
              TOTAL BALLS: <span style={{ color: '#ffaa00', fontSize: '32px', marginLeft: '10px' }}>25</span>
            </label>
          </div>

          <button
            onClick={onStart}
            style={{
              background: '#00ffcc', color: '#000', border: 'none',
              borderRadius: '8px', padding: '15px 40px', fontSize: '20px',
              cursor: 'pointer', fontWeight: '900', letterSpacing: '2px',
              boxShadow: '0 0 15px #00ffcc', transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
            onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
          >
            ▶️ START GAME
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // 🕹️ IN-GAME HUD (Balanced Layout)
  // ==========================================
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 10 }}>
      
      {/* 🛠️ LEFT SIDE: Score & Camera Mode */}
      <div style={{
        position: 'absolute', top: '20px', left: '30px',
        color: '#00ffcc', fontFamily: '"Courier New", Courier, monospace',
        pointerEvents: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-start'
      }}>
        
        <div style={{ fontSize: '28px', fontWeight: 'bold', textShadow: '0px 0px 15px #00ffcc, 0px 0px 5px #ffffff', marginBottom: '15px' }}>
          SCORE: {score.toLocaleString()}
        </div>

        <button 
          onClick={(e) => {
            onToggleCamera();
            e.target.blur(); 
          }}
          style={{
            background: 'rgba(0, 255, 204, 0.1)', border: '2px solid #00ffcc', color: '#00ffcc',
            borderRadius: '6px', padding: '8px 16px', fontSize: '14px', cursor: 'pointer',
            fontWeight: 'bold', textTransform: 'uppercase', boxShadow: '0 0 10px rgba(0, 255, 204, 0.3)',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => e.target.style.background = 'rgba(0, 255, 204, 0.3)'}
          onMouseOut={(e) => e.target.style.background = 'rgba(0, 255, 204, 0.1)'}
        >
          🎥 VIEW: {cameraMode === 'orbit' ? 'Orbiting Sine' : 'Center Nodding Sine'}
        </button>
      </div>

      {/* 🛠️ RIGHT SIDE: Timer & Jump Notification */}
      <div style={{
        position: 'absolute', top: '20px', right: '30px',
        fontFamily: '"Courier New", Courier, monospace',
        pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'flex-end'
      }}>
        
		{/* TIMER */}
        <div style={{
          fontSize: '28px', // 🛠️ CHANGED: Matched to the Score's 28px
          fontWeight: 'bold', // 🛠️ CHANGED: Matched to the Score's bold weight
          color: timeLeft <= 10 ? '#ff0055' : '#ffffff', 
          textShadow: timeLeft <= 10 ? '0px 0px 20px #ff0055' : '0px 0px 10px #ffffff',
          transition: 'color 0.3s ease, text-shadow 0.3s ease',
          marginBottom: '10px'
        }}>
          {formatTime(timeLeft)}
        </div>

        {/* SMALLER JUMP DETECT */}
        <div style={{ height: '40px' }}>
          {isJumping && (
             <div style={{
               color: '#ff0055', fontSize: '20px', fontWeight: '900', // 🛠️ SHRANK FROM 36px to 20px
               textShadow: '0px 0px 15px #ff0055, 0px 0px 5px #ffffff',
               animation: 'pulse 0.1s infinite alternate',
               textAlign: 'right'
             }}>
               🚀 JUMP DETECTED!
             </div>
          )}
        </div>
        
      </div>

    </div>
  )
}