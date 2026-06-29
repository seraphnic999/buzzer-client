import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3002';

// ── Socket ────────────────────────────────────────────────────────────────────
function useSocket(url) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    const s = io(url, { reconnection: true, reconnectionAttempts: Infinity,
      reconnectionDelay: 1000, reconnectionDelayMax: 5000 });
    s.on('connect',    () => setConnected(true));
    s.on('disconnect', () => setConnected(false));
    setSocket(s);
    const onVis = () => { if (document.visibilityState === 'visible' && !s.connected) s.connect(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { document.removeEventListener('visibilitychange', onVis); s.disconnect(); };
  }, [url]);
  return { socket, connected };
}

// ── Buzz sound (plays on the pressing player's phone) ─────────────────────────
function useSounds() {
  const ctxRef = useRef(null);
  const getCtx = useCallback(() => {
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    return ctxRef.current;
  }, []);
  const resume = useCallback(() => {
    try { const c = getCtx(); if (c.state === 'suspended') c.resume(); } catch(e) {}
  }, [getCtx]);

  // ── Buzz: use the real TV-show MP3 ──────────────────────────────────────────
  const playBuzz = useCallback(() => {
    try {
      const a = new Audio('/sounds/buzz.mp3');
      a.volume = 1.0;
      a.play().catch(() => {});
    } catch(e) {}
  }, []);

  // ── Success: ascending D-major arpeggio + chord ──────────────────────────────
  const playSuccess = useCallback(() => {
    try {
      const ctx = getCtx();
      if (ctx.state === 'suspended') ctx.resume();
      const now = ctx.currentTime;
      // Four rising notes: D4 F#4 A4 D5
      [[294,0],[370,0.09],[440,0.18],[587,0.29]].forEach(([freq, t]) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = freq;
        g.gain.setValueAtTime(0, now+t);
        g.gain.linearRampToValueAtTime(0.55, now+t+0.02);
        g.gain.exponentialRampToValueAtTime(0.001, now+t+0.22);
        o.connect(g); g.connect(ctx.destination);
        o.start(now+t); o.stop(now+t+0.25);
      });
      // Final chord sustain
      [587,740,880].forEach(freq => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = freq;
        g.gain.setValueAtTime(0, now+0.29);
        g.gain.linearRampToValueAtTime(0.22, now+0.33);
        g.gain.exponentialRampToValueAtTime(0.001, now+0.75);
        o.connect(g); g.connect(ctx.destination);
        o.start(now+0.29); o.stop(now+0.8);
      });
    } catch(e) {}
  }, [getCtx]);

  // ── Failure: descending minor 3-note drop ────────────────────────────────────
  const playFailure = useCallback(() => {
    try {
      const ctx = getCtx();
      if (ctx.state === 'suspended') ctx.resume();
      const now = ctx.currentTime;
      // Three descending notes: A3 F#3 D3
      [[220,0],[185,0.13],[147,0.27]].forEach(([freq, t]) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'triangle'; o.frequency.value = freq;
        g.gain.setValueAtTime(0, now+t);
        g.gain.linearRampToValueAtTime(0.45, now+t+0.02);
        g.gain.exponentialRampToValueAtTime(0.001, now+t+0.2);
        o.connect(g); g.connect(ctx.destination);
        o.start(now+t); o.stop(now+t+0.23);
      });
    } catch(e) {}
  }, [getCtx]);

  return { resume, playBuzz, playSuccess, playFailure };
}

// ── Constants ─────────────────────────────────────────────────────────────────
const MODE_LABELS = { easy: '🟢 קל', hard: '🔴 קשה', chaos: '🟣 כאוס' };
const MODE_DESCS  = {
  easy:  'טעות לא מוציאה — אפשר לבזז שוב',
  hard:  'טעות מוציאה מהסיבוב',
  chaos: 'כולם יכולים לבזז בו-זמנית',
};

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = `
@import url('https://fonts.googleapis.com/css2?family=Heebo:wght@400;700;900&family=Secular+One&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Heebo',sans-serif;background:#0a0a0a;color:#fff;direction:rtl;height:100dvh;overflow:hidden;}
.app{max-width:480px;margin:0 auto;height:100dvh;display:flex;flex-direction:column;background:#0a0a0a;}

/* Header */
.hdr{padding:10px 16px 8px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #1a1a1a;flex-shrink:0;}
.logo{font-family:'Secular One','Heebo',sans-serif;font-size:30px;letter-spacing:1px;color:#ff2222;text-shadow:0 0 28px rgba(255,34,34,0.7),0 2px 0 #550000;}
.conn{display:flex;align-items:center;gap:5px;background:#1a1a1a;border-radius:20px;padding:3px 10px;font-size:11px;color:#888;}
.dot{width:7px;height:7px;border-radius:50%;background:#333;transition:all .3s;}
.dot.on{background:#44ff44;box-shadow:0 0 6px #44ff44;}

/* Screens (lobby/setup) */
.screen{flex:1;display:flex;flex-direction:column;padding:16px 16px 20px;gap:14px;overflow-y:auto;}
.stitle{font-size:20px;font-weight:900;text-align:center;}
.card{background:#141414;border:1px solid #2a2a2a;border-radius:16px;padding:14px 16px;}
.lbl{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#555;margin-bottom:10px;}
input{width:100%;background:#0f0f0f;border:2px solid #2a2a2a;border-radius:12px;padding:12px 14px;color:#fff;font-size:16px;font-family:'Heebo',sans-serif;direction:rtl;outline:none;transition:border-color .2s;}
input:focus{border-color:#cc0000;}
input::placeholder{color:#444;}
.btn{width:100%;padding:14px;border-radius:12px;border:none;font-size:16px;font-weight:900;font-family:'Heebo',sans-serif;cursor:pointer;transition:transform .1s,opacity .1s;}
.btn:active{transform:scale(0.97);}
.btn:disabled{opacity:.35;cursor:not-allowed;}
.btn-red{background:#cc0000;color:#fff;box-shadow:0 4px 0 #880000;}
.btn-dark{background:#1e1e1e;color:#ccc;border:1px solid #333;}
.btn-ghost{background:transparent;color:#666;border:1px solid #2a2a2a;}
.seg{display:flex;background:#0f0f0f;border-radius:12px;padding:4px;gap:4px;}
.sbtn{flex:1;padding:9px 6px;border:none;border-radius:9px;background:transparent;color:#555;font-family:'Heebo',sans-serif;font-size:13px;font-weight:900;cursor:pointer;transition:all .18s;text-align:center;line-height:1.3;}
.sbtn.on{background:#cc0000;color:#fff;}
.sbtn.on-g{background:#226600;color:#88ff44;}
.sbtn.on-c{background:#440066;color:#cc88ff;}
.mode-desc{font-size:12px;color:#555;margin-top:7px;text-align:center;min-height:28px;}
.room-code{font-size:46px;font-weight:900;letter-spacing:10px;color:#ff2222;text-align:center;padding:6px 0;}
.p-row{display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid #1e1e1e;font-size:14px;}
.p-row:last-child{border:none;}
.p-name{font-weight:700;}
.p-score{font-weight:900;font-size:18px;color:#ff2222;}
.spacer{flex:1;}
.err{color:#ff6666;font-size:13px;font-weight:700;text-align:center;background:#1a0000;border-radius:8px;padding:8px 12px;}
.wait{text-align:center;color:#555;font-size:14px;font-weight:700;padding:14px;}
.mode-badge{font-size:11px;padding:2px 9px;border-radius:20px;font-weight:700;}
.mode-badge.easy{background:#0a1a00;color:#88ff44;border:1px solid #224400;}
.mode-badge.hard{background:#1a0000;color:#ff4444;border:1px solid #440000;}
.mode-badge.chaos{background:#14001a;color:#cc88ff;border:1px solid #440066;}
.host-badge{font-size:11px;padding:2px 8px;border-radius:20px;background:#1a1000;color:#ffaa44;border:1px solid #443300;}

/* Game screen */
.game-screen{flex:1;display:flex;flex-direction:column;overflow:hidden;}
.game-bar{display:flex;align-items:center;justify-content:space-between;padding:8px 14px 6px;flex-shrink:0;border-bottom:1px solid #111;}
.round-lbl{font-size:12px;font-weight:900;color:#884444;background:#1a0000;border:1px solid #440000;border-radius:20px;padding:3px 12px;}
.clue-count{font-size:12px;color:#444;}

/* Clues */
.clues-wrap{flex:0 1 auto;max-height:42vh;overflow-y:auto;padding:8px 12px 4px;display:flex;flex-direction:column;gap:0;}
.clue-row{display:flex;gap:8px;padding:7px 0;border-bottom:1px solid #111;font-size:13px;line-height:1.45;color:#777;animation:cin .35s ease;}
.clue-row:last-child{border:none;color:#fff;font-weight:700;font-size:14px;}
.clue-row:first-child{margin-top:auto;} /* push newest to bottom */
.clue-num{font-size:11px;font-weight:900;color:#ff2222;min-width:20px;margin-top:2px;flex-shrink:0;}
@keyframes cin{from{opacity:0;transform:translateY(-4px);}to{opacity:1;transform:translateY(0);}}
.clue-empty{color:#333;font-size:13px;padding:12px;text-align:center;}
.clue-compact{display:flex;gap:8px;padding:8px 14px 4px;font-size:13px;color:#ccc;line-height:1.4;flex-shrink:0;}

/* Action area */
.action-area{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:8px 14px 14px;min-height:0;}

/* Answering banner */
.ans-banner{background:#1a1500;border:1px solid #554400;border-radius:12px;padding:9px 14px;text-align:center;color:#ffcc00;font-weight:700;font-size:13px;animation:pulse 1.4s infinite;width:100%;}
.chaos-banner{background:#14001a;border:1px solid #440066;border-radius:12px;padding:9px 14px;text-align:center;color:#cc88ff;font-weight:700;font-size:13px;width:100%;}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.55}}

/* Buzzer */
.buzzer-btn{
  width:min(230px,68vw);height:min(230px,68vw);border-radius:50%;border:none;
  background:radial-gradient(circle at 35% 35%,#ff4444,#cc0000 50%,#880000);
  box-shadow:0 0 0 5px #550000,0 0 0 9px #330000,0 9px 0 #550000,0 13px 32px rgba(200,0,0,.6);
  cursor:pointer;transition:transform .08s,box-shadow .08s;
  font-size:24px;font-weight:900;font-family:'Heebo',sans-serif;color:#fff;
  text-shadow:0 2px 4px rgba(0,0,0,.5);letter-spacing:2px;
  display:flex;align-items:center;justify-content:center;flex-direction:column;gap:3px;
  -webkit-tap-highlight-color:transparent;
}
.buzzer-btn:active:not(:disabled){
  transform:scale(0.94) translateY(4px);
  box-shadow:0 0 0 5px #550000,0 0 0 9px #330000,0 3px 0 #550000,0 5px 14px rgba(200,0,0,.4);
}
.buzzer-btn:disabled{
  background:radial-gradient(circle at 35% 35%,#2a2a2a,#1a1a1a 50%,#111);
  box-shadow:0 0 0 5px #1a1a1a,0 0 0 9px #111,0 9px 0 #1a1a1a;
  color:#444;cursor:not-allowed;
}
.bzr-sub{font-size:11px;font-weight:400;opacity:.7;letter-spacing:1px;}
.my-score{font-size:13px;color:#555;}
.my-score strong{color:#ff2222;font-size:17px;}

/* Eliminated */
.elim-msg{display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center;padding:16px;}
.elim-icon{font-size:48px;}
.elim-text{font-size:18px;font-weight:900;color:#444;}
.elim-sub{font-size:12px;color:#333;}

/* Grid */
.grid-timer-bar{display:flex;align-items:center;gap:8px;width:100%;}
.gtt{flex:1;height:5px;background:#1a1a1a;border-radius:3px;overflow:hidden;}
.gtf{height:100%;border-radius:3px;transition:width 1s linear,background .3s;}
.gtn{font-size:13px;font-weight:900;min-width:26px;text-align:left;}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;width:100%;}
.gc{background:#141414;border:1px solid #2a2a2a;border-radius:9px;padding:8px 3px;font-size:13px;font-weight:700;font-family:'Heebo',sans-serif;color:#ccc;cursor:pointer;text-align:center;min-height:40px;display:flex;align-items:center;justify-content:center;-webkit-tap-highlight-color:transparent;transition:background .12s,border-color .12s;}
.gc:active{transform:scale(0.95);}
.gc:hover{background:#1e1e1e;border-color:#444;color:#fff;}
.gc.sel{background:#220000;border-color:#cc0000;color:#ff4444;}

/* Result overlay */
.rov{position:fixed;inset:0;background:rgba(0,0,0,.9);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;z-index:100;animation:cin .2s ease;}
.rov-icon{font-size:64px;}
.rov-ok{font-size:24px;font-weight:900;color:#44ff44;}
.rov-no{font-size:24px;font-weight:900;color:#ff4444;}

/* Round over */
.word-reveal{text-align:center;padding:18px 16px 10px;}
.wr-lbl{font-size:11px;color:#555;letter-spacing:2px;text-transform:uppercase;margin-bottom:5px;}
.wr-word{font-size:40px;font-weight:900;color:#ff2222;line-height:1.1;}
.winner-box{text-align:center;background:#0a1a00;border:1px solid #224400;border-radius:12px;padding:12px;}
.winner-name{font-size:19px;font-weight:900;color:#88ff44;}
.winner-pts{font-size:13px;color:#558822;margin-top:3px;}
.no-winner{font-size:14px;color:#555;font-weight:700;text-align:center;padding:10px;}
.sc-row{display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid #1a1a1a;font-size:14px;}
.sc-row:last-child{border:none;}
.sc-pts{font-weight:900;font-size:19px;color:#ff2222;}

/* Auto-continue */
.ac-wrap{text-align:center;padding:6px 0 2px;}
.ac-lbl{font-size:12px;color:#555;margin-bottom:3px;}
.ac-num{font-size:62px;font-weight:900;color:#ff2222;line-height:1;text-shadow:0 0 28px rgba(255,34,34,.5);}
.ac-sub{font-size:12px;color:#444;margin-top:2px;}
.ac-bar{height:4px;background:#1a1a1a;border-radius:2px;margin:8px 0 0;overflow:hidden;}
.ac-fill{height:100%;background:#cc0000;border-radius:2px;transition:width 1s linear;}
.ac-pause{text-align:center;font-size:14px;color:#666;font-weight:700;padding:6px;}
`;

// ── Main App ──────────────────────────────────────────────────────────────────
export default function BuzzerApp() {
  const { socket, connected } = useSocket(SERVER_URL);
  const sounds = useSounds();

  // Navigation
  const [screen, setScreen] = useState('home'); // home|host-setup|player-setup|lobby|game|round-over

  // Identity
  const [isHost, setIsHost] = useState(false);
  const [myName, setMyName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');

  // Room
  const [roomCode, setRoomCode] = useState('');
  const [roomState, setRoomState] = useState(null);
  const [myId, setMyId] = useState(null);

  // Host settings
  const [settings, setSettings] = useState({
    mode: 'hard', answerTimeout: 10, autoContinue: true, autoContinueDelay: 10,
  });

  // Game state
  const [revealedClues, setRevealedClues] = useState([]);
  const [totalClues, setTotalClues] = useState(0);
  const [grid, setGrid] = useState(null);
  const [gridTimeLeft, setGridTimeLeft] = useState(10);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [answerResult, setAnswerResult] = useState(null);
  const [roundResult, setRoundResult] = useState(null);

  // Auto-continue
  const [acActive, setAcActive] = useState(false);
  const [acPaused, setAcPaused] = useState(false);
  const [acLeft, setAcLeft] = useState(0);
  const acTimerRef  = useRef(null);
  const gridTimerRef = useRef(null);

  // Derived
  const myPlayer = roomState?.players?.find(p => p.id === myId);
  const gamePhase = roomState?.phase;
  const gameMode  = roomState?.settings?.mode;
  const activeAnswererNames = roomState?.activeAnswererNames ?? [];
  const isEliminated = !!myPlayer?.eliminatedThisRound;
  const isMeAnswering = !!grid;
  const isOtherAnswering = !isMeAnswering && activeAnswererNames.length > 0 && gamePhase === 'player_answering';
  const canBuzz = gamePhase === 'clues_running' && !isEliminated && !isMeAnswering;

  // ── Socket listeners ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    socket.on('room_updated', rs => setRoomState(rs));

    socket.on('round_started', ({ totalClues: tc, roomState: rs }) => {
      setRoomState(rs); setRevealedClues([]); setTotalClues(tc);
      setGrid(null); setAnswerResult(null); setSelectedAnswer(null); setRoundResult(null);
      setAcActive(false); setAcPaused(false); clearInterval(acTimerRef.current);
      setScreen('game');
    });

    socket.on('auto_continue_started', ({ delay }) => {
      setAcPaused(false); setAcActive(true); setAcLeft(delay);
      clearInterval(acTimerRef.current);
      acTimerRef.current = setInterval(() => {
        setAcLeft(t => { if (t <= 1) { clearInterval(acTimerRef.current); return 0; } return t - 1; });
      }, 1000);
    });

    socket.on('auto_continue_paused', () => {
      setAcPaused(true); clearInterval(acTimerRef.current);
    });

    socket.on('clue_revealed', ({ revealedClues: rc, totalClues: tc }) => {
      setRevealedClues(rc); setTotalClues(tc);
    });

    socket.on('player_buzzed', ({ roomState: rs }) => setRoomState(rs));

    socket.on('show_grid', ({ grid: g, timeLimit }) => {
      setGrid(g); setSelectedAnswer(null); setGridTimeLeft(timeLimit);
    });

    socket.on('answer_result', ({ correct, timeout }) => {
      if (correct) sounds.playSuccess();
      else sounds.playFailure();
      setAnswerResult({ correct, timeout });
      setTimeout(() => { setAnswerResult(null); setGrid(null); setSelectedAnswer(null); }, correct ? 1400 : 1800);
    });

    socket.on('answer_failed', ({ roomState: rs }) => setRoomState(rs));

    socket.on('round_over', ({ word, winnerName, points, roomState: rs }) => {
      setRoomState(rs); setGrid(null); setSelectedAnswer(null);
      setRoundResult({ word, winnerName, points });
      setTimeout(() => setScreen('round-over'), 600);
    });

    socket.on('game_ended', ({ reason }) => {
      setError(reason || 'המשחק הסתיים'); setScreen('home');
    });

    return () => {
      ['room_updated','round_started','clue_revealed','player_buzzed','show_grid',
       'answer_result','answer_failed','round_over','game_ended',
       'auto_continue_started','auto_continue_paused'].forEach(e => socket.off(e));
    };
  }, [socket, sounds]);

  // Grid countdown
  useEffect(() => {
    if (!grid) { clearInterval(gridTimerRef.current); return; }
    clearInterval(gridTimerRef.current);
    gridTimerRef.current = setInterval(() => {
      setGridTimeLeft(t => { if (t <= 1) { clearInterval(gridTimerRef.current); return 0; } return t - 1; });
    }, 1000);
    return () => clearInterval(gridTimerRef.current);
  }, [grid]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleCreateRoom = () => {
    if (!myName.trim()) { setError('נא להזין שם'); return; }
    sounds.resume();
    socket.emit('create_room', { playerName: myName.trim(), settings }, ({ code, roomState: rs }) => {
      setRoomCode(code); setRoomState(rs); setMyId(socket.id);
      setIsHost(true); setScreen('lobby'); setError('');
    });
  };

  const handleJoinRoom = () => {
    if (!myName.trim()) { setError('נא להזין שם'); return; }
    if (!joinCode.trim()) { setError('נא להזין קוד'); return; }
    sounds.resume();
    socket.emit('join_room', { code: joinCode.trim().toUpperCase(), playerName: myName.trim() }, res => {
      if (res.error) { setError(res.error); return; }
      setRoomCode(joinCode.trim().toUpperCase()); setRoomState(res.roomState);
      setMyId(socket.id); setIsHost(false); setScreen('lobby'); setError('');
    });
  };

  const handleStartRound = () => {
    socket.emit('start_round', {}, res => { if (res?.error) setError(res.error); });
  };

  const handlePressBuzzer = () => {
    sounds.playBuzz(); // TV-show buzz on THIS player's phone immediately
    socket.emit('press_buzzer', {}, res => { if (res?.error) setError(res.error); });
  };

  const handleSubmitAnswer = (answer) => {
    if (selectedAnswer) return;
    setSelectedAnswer(answer);
    socket.emit('submit_answer', { answer });
  };

  const handlePauseAC  = () => socket.emit('pause_auto_continue');
  const handleResumeAC = () => socket.emit('resume_auto_continue');

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{styles}</style>
      <div className="app" dir="rtl">

        {/* Header */}
        <div className="hdr">
          <div className="logo">הבאזזר</div>
          <div className="conn">
            <div className={`dot ${connected ? 'on' : ''}`} />
            {connected ? 'מחובר' : 'מתחבר...'}
          </div>
        </div>

        {/* HOME */}
        {screen === 'home' && (
          <div className="screen">
            <div style={{ flex: 1 }} />
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <div style={{ fontSize: 56, marginBottom: 6 }}>🔴</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#888', letterSpacing: 2 }}>לחץ לפני כולם</div>
            </div>
            <div style={{ flex: 1 }} />
            {error && <div className="err">{error}</div>}
            <button className="btn btn-red" disabled={!connected}
              onClick={() => { setScreen('host-setup'); setError(''); }}>
              👑 צור חדר
            </button>
            <button className="btn btn-dark" disabled={!connected}
              onClick={() => { setScreen('player-setup'); setError(''); }}>
              🎯 הצטרף לחדר
            </button>
          </div>
        )}

        {/* HOST SETUP — name + settings */}
        {screen === 'host-setup' && (
          <div className="screen">
            <div className="stitle">צור חדר חדש</div>

            <div className="card">
              <div className="lbl">השם שלך</div>
              <input placeholder="שמך במשחק..." value={myName} onChange={e => setMyName(e.target.value)} autoFocus />
            </div>

            <div className="card">
              <div className="lbl">מצב משחק</div>
              <div className="seg">
                {['easy','hard','chaos'].map(m => (
                  <button key={m}
                    className={`sbtn ${settings.mode === m ? (m === 'easy' ? 'on-g' : m === 'chaos' ? 'on-c' : 'on') : ''}`}
                    onClick={() => setSettings(s => ({ ...s, mode: m }))}>
                    {MODE_LABELS[m]}
                  </button>
                ))}
              </div>
              <div className="mode-desc">{MODE_DESCS[settings.mode]}</div>
            </div>

            <div className="card">
              <div className="lbl">זמן לבחירה מהגריד</div>
              <div className="seg">
                {[5, 10, 15, 20].map(t => (
                  <button key={t} className={`sbtn ${settings.answerTimeout === t ? 'on' : ''}`}
                    onClick={() => setSettings(s => ({ ...s, answerTimeout: t }))}>
                    {t}ש׳
                  </button>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="lbl">מעבר אוטומטי לתור הבא</div>
              <div className="seg">
                <button className={`sbtn ${settings.autoContinue ? 'on-g' : ''}`}
                  onClick={() => setSettings(s => ({ ...s, autoContinue: true }))}>✓ כן</button>
                <button className={`sbtn ${!settings.autoContinue ? 'on' : ''}`}
                  onClick={() => setSettings(s => ({ ...s, autoContinue: false }))}>✗ לא</button>
              </div>
              {settings.autoContinue && (
                <>
                  <div className="lbl" style={{ marginTop: 12 }}>עיכוב לפני תור הבא</div>
                  <div className="seg">
                    {[5, 10, 15].map(t => (
                      <button key={t} className={`sbtn ${settings.autoContinueDelay === t ? 'on' : ''}`}
                        onClick={() => setSettings(s => ({ ...s, autoContinueDelay: t }))}>
                        {t}ש׳
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {error && <div className="err">{error}</div>}
            <div className="spacer" />
            <button className="btn btn-red" disabled={!connected || !myName.trim()} onClick={handleCreateRoom}>
              צור חדר
            </button>
            <button className="btn btn-ghost" onClick={() => setScreen('home')}>חזרה</button>
          </div>
        )}

        {/* PLAYER SETUP */}
        {screen === 'player-setup' && (
          <div className="screen">
            <div className="stitle">הצטרף למשחק</div>
            <div className="card">
              <div className="lbl">השם שלך</div>
              <input placeholder="שמך במשחק..." value={myName} onChange={e => setMyName(e.target.value)} autoFocus />
            </div>
            <div className="card">
              <div className="lbl">קוד חדר</div>
              <input placeholder="קוד..." value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6} style={{ fontSize: 24, letterSpacing: 8, textAlign: 'center' }}
                onKeyDown={e => e.key === 'Enter' && handleJoinRoom()} />
            </div>
            {error && <div className="err">{error}</div>}
            <div className="spacer" />
            <button className="btn btn-red" disabled={!connected || !myName.trim() || !joinCode.trim()} onClick={handleJoinRoom}>
              הצטרף
            </button>
            <button className="btn btn-ghost" onClick={() => setScreen('home')}>חזרה</button>
          </div>
        )}

        {/* LOBBY */}
        {screen === 'lobby' && roomState && (
          <div className="screen">
            <div className="card" style={{ textAlign: 'center' }}>
              <div className="lbl">קוד החדר — שתפו עם כולם</div>
              <div className="room-code">{roomCode}</div>
              {roomState.settings && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 8 }}>
                  <span className={`mode-badge ${roomState.settings.mode}`}>{MODE_LABELS[roomState.settings.mode]}</span>
                  <span style={{ fontSize: 11, color: '#555', alignSelf: 'center' }}>{roomState.settings.answerTimeout}ש׳ לתשובה</span>
                </div>
              )}
            </div>
            <div className="card">
              <div className="lbl">שחקנים ({roomState.players.length})</div>
              {roomState.players.length === 0
                ? <div style={{ color: '#333', fontSize: 13, padding: '6px 0' }}>ממתינים...</div>
                : roomState.players.map(p => (
                  <div className="p-row" key={p.id}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="p-name">{p.name}</span>
                      {p.id === roomState.hostSocketId && <span className="host-badge">👑 מארח</span>}
                    </div>
                    <span style={{ color: '#444', fontSize: 11 }}>✓</span>
                  </div>
                ))
              }
            </div>
            {error && <div className="err">{error}</div>}
            <div className="spacer" />
            {isHost
              ? <button className="btn btn-red" onClick={handleStartRound}>🎮 התחל!</button>
              : <div className="wait">ממתינים למארח שיתחיל...</div>
            }
          </div>
        )}

        {/* GAME */}
        {screen === 'game' && roomState && (
          <GameScreen
            roomState={roomState} myPlayer={myPlayer}
            isHost={isHost}
            isEliminated={isEliminated} isMeAnswering={isMeAnswering}
            isOtherAnswering={isOtherAnswering} canBuzz={canBuzz}
            activeAnswererNames={activeAnswererNames}
            revealedClues={revealedClues} totalClues={totalClues}
            grid={grid} gridTimeLeft={gridTimeLeft} selectedAnswer={selectedAnswer}
            answerResult={answerResult}
            onPressBuzzer={handlePressBuzzer} onSubmitAnswer={handleSubmitAnswer}
          />
        )}

        {/* ROUND OVER */}
        {screen === 'round-over' && roundResult && roomState && (
          <RoundOverScreen
            roundResult={roundResult} roomState={roomState} isHost={isHost}
            acActive={acActive} acPaused={acPaused} acLeft={acLeft}
            onNextRound={handleStartRound} onPause={handlePauseAC} onResume={handleResumeAC}
            onHome={() => setScreen('home')}
          />
        )}
      </div>
    </>
  );
}

// ── Game Screen — unified for all players ─────────────────────────────────────
function GameScreen({
  roomState, myPlayer, isHost,
  isEliminated, isMeAnswering, isOtherAnswering, canBuzz,
  activeAnswererNames, revealedClues, totalClues,
  grid, gridTimeLeft, selectedAnswer, answerResult,
  onPressBuzzer, onSubmitAnswer,
}) {
  const gameMode    = roomState.settings?.mode;
  const ansTimeout  = roomState.settings?.answerTimeout || 10;
  const timerPct    = (gridTimeLeft / ansTimeout) * 100;
  const timerColor  = gridTimeLeft <= 3 ? '#ff2222' : gridTimeLeft <= 5 ? '#ffaa00' : '#cc0000';
  const latestClue  = revealedClues[revealedClues.length - 1];
  const cluesEndRef = useRef(null);

  useEffect(() => {
    cluesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [revealedClues.length]);

  return (
    <div className="game-screen">
      {/* Top bar */}
      <div className="game-bar">
        <span className="round-lbl">סיבוב {roomState.roundNumber}</span>
        <span className="clue-count">{revealedClues.length}/{totalClues} רמזים</span>
        <span className={`mode-badge ${gameMode}`}>{MODE_LABELS[gameMode]}</span>
      </div>

      {/* Clues — always visible except when I'm in grid mode */}
      {!isMeAnswering && (
        <div className="clues-wrap">
          {revealedClues.length === 0
            ? <div className="clue-empty">הרמזים יופיעו כאן...</div>
            : revealedClues.map((c, i) => (
              <div className="clue-row" key={c.index}>
                <span className="clue-num">#{c.index + 1}</span>
                <span>{c.text}</span>
              </div>
            ))
          }
          <div ref={cluesEndRef} />
        </div>
      )}

      {/* Compact latest clue when in grid */}
      {isMeAnswering && latestClue && (
        <div className="clue-compact">
          <span className="clue-num">#{latestClue.index + 1}</span>
          <span>{latestClue.text}</span>
        </div>
      )}

      {/* Answering banners (when not me) */}
      {isOtherAnswering && activeAnswererNames.length > 0 && (
        <div style={{ padding: '0 12px' }}>
          <div className="ans-banner">⚡ {activeAnswererNames[0]} בוחר תשובה...</div>
        </div>
      )}
      {!isMeAnswering && !isOtherAnswering && gameMode === 'chaos' && activeAnswererNames.length > 0 && (
        <div style={{ padding: '0 12px' }}>
          <div className="chaos-banner">⚡ {activeAnswererNames.join(', ')} בוחרים...</div>
        </div>
      )}

      {/* Action area */}
      <div className="action-area">

        {isMeAnswering ? (
          /* Grid */
          <>
            <div className="grid-timer-bar">
              <div className="gtt"><div className="gtf" style={{ width: `${timerPct}%`, background: timerColor }} /></div>
              <div className="gtn" style={{ color: timerColor }}>{gridTimeLeft}ש׳</div>
            </div>
            <div className="grid">
              {grid.map((word, i) => (
                <button key={i} className={`gc ${selectedAnswer === word ? 'sel' : ''}`}
                  onClick={() => !selectedAnswer && onSubmitAnswer(word)}
                  disabled={!!selectedAnswer}>
                  {word}
                </button>
              ))}
            </div>
          </>
        ) : isEliminated ? (
          /* Eliminated (hard mode) */
          <div className="elim-msg">
            <div className="elim-icon">💀</div>
            <div className="elim-text">יצאת מהסיבוב</div>
            <div className="elim-sub">נסה בסיבוב הבא</div>
            <div className="my-score" style={{ marginTop: 8 }}>ניקוד: <strong>{myPlayer?.score ?? 0}</strong></div>
          </div>
        ) : (
          /* Buzzer */
          <>
            <button className="buzzer-btn" onClick={onPressBuzzer}
              disabled={!canBuzz || isOtherAnswering}>
              <span>BUZZ</span>
              <span className="bzr-sub">
                {isOtherAnswering ? 'ממתין...' : !canBuzz ? 'ממתין...' : 'לחץ!'}
              </span>
            </button>
            <div className="my-score">ניקוד: <strong>{myPlayer?.score ?? 0}</strong></div>
          </>
        )}
      </div>

      {/* Answer result overlay */}
      {answerResult && (
        <div className="rov">
          <div className="rov-icon">{answerResult.correct ? '✅' : answerResult.timeout ? '⏰' : '❌'}</div>
          <div className={answerResult.correct ? 'rov-ok' : 'rov-no'}>
            {answerResult.correct ? 'נכון!' : answerResult.timeout ? 'אזל הזמן!' : 'לא נכון!'}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Round Over Screen ─────────────────────────────────────────────────────────
function RoundOverScreen({ roundResult, roomState, isHost,
  acActive, acPaused, acLeft, onNextRound, onPause, onResume, onHome }) {
  const sorted = [...(roomState.players ?? [])].sort((a, b) => b.score - a.score);
  const delay  = roomState.settings?.autoContinueDelay || 10;
  const pct    = acActive ? (acLeft / delay) * 100 : 100;

  return (
    <div className="screen">
      {/* Word reveal */}
      <div className="word-reveal">
        <div className="wr-lbl">המילה הנסתרת הייתה</div>
        <div className="wr-word">{roundResult.word}</div>
      </div>

      {/* Winner */}
      {roundResult.winnerName
        ? <div className="winner-box">
            <div className="winner-name">🏆 {roundResult.winnerName}</div>
            <div className="winner-pts">+{roundResult.points} נקודות</div>
          </div>
        : <div className="no-winner">😔 אף אחד לא ניחש את המילה</div>
      }

      {/* Scores */}
      <div className="card">
        <div className="lbl">ניקוד</div>
        {sorted.map((p, i) => (
          <div className="sc-row" key={p.id}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, minWidth: 22 }}>{i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}.`}</span>
              <span style={{ fontWeight: 700, color: '#ccc' }}>{p.name}</span>
              {p.id === roomState.hostSocketId && <span className="host-badge">👑</span>}
            </div>
            <span className="sc-pts">{p.score}</span>
          </div>
        ))}
      </div>

      <div className="spacer" />

      {/* Auto-continue countdown */}
      {acActive && !acPaused && (
        <div className="ac-wrap">
          <div className="ac-lbl">התור הבא מתחיל בעוד</div>
          <div className="ac-num">{acLeft}</div>
          <div className="ac-sub">שניות</div>
          <div className="ac-bar"><div className="ac-fill" style={{ width: `${pct}%` }} /></div>
        </div>
      )}
      {acActive && acPaused && <div className="ac-pause">⏸ מושהה</div>}

      {/* Host controls */}
      {isHost && acActive && (
        <>
          {!acPaused
            ? <button className="btn btn-dark" onClick={onPause}>⏸ השהה</button>
            : <button className="btn btn-dark" onClick={onResume}>▶ המשך ספירה</button>
          }
          <button className="btn btn-red" onClick={onNextRound}>⏩ התחל עכשיו</button>
        </>
      )}
      {isHost && !acActive && (
        <button className="btn btn-red" onClick={onNextRound}>▶ סיבוב הבא</button>
      )}
      {!isHost && !acActive && (
        <div className="wait">ממתינים למארח לסיבוב הבא...</div>
      )}

      <button className="btn btn-ghost" onClick={onHome}>🏠 חזרה לתפריט</button>
    </div>
  );
}
