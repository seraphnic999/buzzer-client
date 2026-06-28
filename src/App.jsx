import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3002';

// ── Socket hook ───────────────────────────────────────────────────────────────
function useSocket(url) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    const s = io(url, { reconnection: true, reconnectionAttempts: Infinity, reconnectionDelay: 1000, reconnectionDelayMax: 5000 });
    s.on('connect', () => setConnected(true));
    s.on('disconnect', () => setConnected(false));
    setSocket(s);
    const onVisible = () => { if (document.visibilityState === 'visible' && !s.connected) s.connect(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { document.removeEventListener('visibilitychange', onVisible); s.disconnect(); };
  }, [url]);
  return { socket, connected };
}

// ── Buzz sound (for host) ─────────────────────────────────────────────────────
function useBuzzSound() {
  const ctxRef = useRef(null);
  const getCtx = useCallback(() => {
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    return ctxRef.current;
  }, []);
  const resume = useCallback(() => {
    const ctx = getCtx();
    if (ctx.state === 'suspended') ctx.resume();
  }, [getCtx]);
  const playBuzz = useCallback(() => {
    try {
      const ctx = getCtx();
      if (ctx.state === 'suspended') ctx.resume();
      // Deep sawtooth buzz
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(55, ctx.currentTime + 0.45);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(1.0, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.45);
      // Second layer for body
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2); gain2.connect(ctx.destination);
      osc2.type = 'square';
      osc2.frequency.setValueAtTime(80, ctx.currentTime);
      gain2.gain.setValueAtTime(0, ctx.currentTime);
      gain2.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.02);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc2.start(ctx.currentTime);
      osc2.stop(ctx.currentTime + 0.35);
    } catch (e) {}
  }, [getCtx]);
  return { resume, playBuzz };
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@400;700;900&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Heebo', sans-serif; background: #0a0a0a; color: #fff; direction: rtl; min-height: 100dvh; overflow-x: hidden; }
  .app { max-width: 480px; margin: 0 auto; min-height: 100dvh; display: flex; flex-direction: column; background: #0a0a0a; }
  .header { padding: 12px 20px 10px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #1a1a1a; flex-shrink: 0; }
  .logo { font-size: 26px; font-weight: 900; letter-spacing: 4px; color: #ff2222; text-shadow: 0 0 20px rgba(255,34,34,0.5); }
  .conn-pill { display: flex; align-items: center; gap: 6px; background: #1a1a1a; border-radius: 20px; padding: 4px 12px; font-size: 12px; color: #888; }
  .conn-dot { width: 8px; height: 8px; border-radius: 50%; background: #333; transition: all 0.3s; }
  .conn-dot.on { background: #44ff44; box-shadow: 0 0 6px #44ff44; }
  .screen { flex: 1; display: flex; flex-direction: column; padding: 16px 16px 24px; gap: 14px; overflow-y: auto; }
  .screen-title { font-size: 20px; font-weight: 900; color: #fff; text-align: center; }
  .card { background: #141414; border: 1px solid #2a2a2a; border-radius: 16px; padding: 14px 16px; }
  .card-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #555; margin-bottom: 10px; }
  input { width: 100%; background: #0f0f0f; border: 2px solid #2a2a2a; border-radius: 12px; padding: 13px 16px; color: #fff; font-size: 16px; font-family: 'Heebo', sans-serif; direction: rtl; outline: none; transition: border-color 0.2s; }
  input:focus { border-color: #cc0000; }
  input::placeholder { color: #444; }
  .btn { width: 100%; padding: 14px; border-radius: 12px; border: none; font-size: 16px; font-weight: 900; font-family: 'Heebo', sans-serif; cursor: pointer; transition: transform 0.1s, opacity 0.1s; }
  .btn:active { transform: scale(0.97); }
  .btn:disabled { opacity: 0.35; cursor: not-allowed; }
  .btn-red  { background: #cc0000; color: #fff; box-shadow: 0 4px 0 #880000; }
  .btn-dark { background: #1e1e1e; color: #ccc; border: 1px solid #333; }
  .btn-ghost { background: transparent; color: #666; border: 1px solid #2a2a2a; }
  .seg { display: flex; background: #0f0f0f; border-radius: 12px; padding: 4px; gap: 4px; }
  .seg-btn { flex: 1; padding: 10px 6px; border: none; border-radius: 9px; background: transparent; color: #555; font-family: 'Heebo', sans-serif; font-size: 13px; font-weight: 900; cursor: pointer; transition: all 0.18s; text-align: center; line-height: 1.3; }
  .seg-btn.active { background: #cc0000; color: #fff; }
  .seg-btn.active-green { background: #226600; color: #88ff44; }
  .seg-btn.active-orange { background: #664400; color: #ffaa44; }
  .seg-btn.active-chaos { background: #440066; color: #cc88ff; }
  .mode-desc { font-size: 12px; color: #555; margin-top: 8px; text-align: center; min-height: 32px; line-height: 1.5; }
  .room-code { font-size: 46px; font-weight: 900; letter-spacing: 10px; color: #ff2222; text-align: center; text-shadow: 0 0 30px rgba(255,34,34,0.3); padding: 6px 0; }
  .player-row { display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #1e1e1e; font-size: 15px; }
  .player-row:last-child { border: none; }
  .player-name { font-weight: 700; color: #fff; }
  .clue-item { display: flex; gap: 10px; padding: 9px 0; border-bottom: 1px solid #1a1a1a; font-size: 14px; line-height: 1.45; color: #bbb; animation: fadeIn 0.35s ease; }
  .clue-item:last-child { border: none; }
  .clue-item.latest { color: #fff; font-weight: 700; }
  .clue-num { font-size: 11px; font-weight: 900; color: #ff2222; min-width: 22px; margin-top: 2px; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
  .hidden-word { display: flex; align-items: center; justify-content: center; gap: 8px; background: #1a0000; border: 1px solid #440000; border-radius: 12px; padding: 12px 16px; font-size: 14px; color: #884444; font-weight: 700; }
  .answering-banner { background: #1a1500; border: 1px solid #554400; border-radius: 12px; padding: 10px 14px; text-align: center; color: #ffcc00; font-weight: 700; font-size: 14px; animation: pulse 1.4s infinite; }
  .chaos-banner { background: #14001a; border: 1px solid #440066; border-radius: 12px; padding: 10px 14px; text-align: center; color: #cc88ff; font-weight: 700; font-size: 14px; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.55} }
  .clue-progress { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #555; }
  .clue-bar { flex: 1; height: 3px; background: #1a1a1a; border-radius: 2px; overflow: hidden; }
  .clue-bar-fill { height: 100%; background: #cc0000; border-radius: 2px; transition: width 0.4s ease; }
  .round-badge { display: inline-flex; align-items: center; gap: 6px; background: #1a0000; border: 1px solid #440000; border-radius: 20px; padding: 4px 14px; font-size: 12px; color: #884444; font-weight: 700; align-self: center; }
  .mode-badge { font-size: 11px; padding: 2px 10px; border-radius: 20px; font-weight: 700; }
  .mode-badge.easy   { background: #0a1a00; color: #88ff44; border: 1px solid #224400; }
  .mode-badge.hard   { background: #1a0000; color: #ff4444; border: 1px solid #440000; }
  .mode-badge.chaos  { background: #14001a; color: #cc88ff; border: 1px solid #440066; }
  .buzzer-wrap { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; padding: 16px; }
  .buzzer-btn { width: min(260px, 75vw); height: min(260px, 75vw); border-radius: 50%; border: none;
    background: radial-gradient(circle at 35% 35%, #ff4444, #cc0000 50%, #880000);
    box-shadow: 0 0 0 6px #550000, 0 0 0 10px #330000, 0 10px 0 #550000, 0 14px 36px rgba(200,0,0,0.6);
    cursor: pointer; transition: transform 0.08s, box-shadow 0.08s;
    font-size: 26px; font-weight: 900; font-family: 'Heebo', sans-serif; color: #fff;
    text-shadow: 0 2px 4px rgba(0,0,0,0.5); letter-spacing: 2px;
    display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 4px;
    -webkit-tap-highlight-color: transparent; }
  .buzzer-btn:active:not(:disabled) { transform: scale(0.94) translateY(4px); box-shadow: 0 0 0 6px #550000, 0 0 0 10px #330000, 0 3px 0 #550000, 0 5px 16px rgba(200,0,0,0.4); }
  .buzzer-btn:disabled { background: radial-gradient(circle at 35% 35%, #2a2a2a, #1a1a1a 50%, #111); box-shadow: 0 0 0 6px #1a1a1a, 0 0 0 10px #111, 0 10px 0 #1a1a1a; color: #444; cursor: not-allowed; }
  .buzzer-sub { font-size: 11px; font-weight: 400; opacity: 0.7; letter-spacing: 1px; }
  .grid-header { text-align: center; font-weight: 900; font-size: 17px; }
  .grid-timer-bar { display: flex; align-items: center; gap: 10px; }
  .grid-timer-track { flex: 1; height: 6px; background: #1a1a1a; border-radius: 3px; overflow: hidden; }
  .grid-timer-fill { height: 100%; border-radius: 3px; transition: width 1s linear, background 0.3s; }
  .grid-timer-num { font-size: 14px; font-weight: 900; min-width: 28px; text-align: left; }
  .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 7px; }
  .grid-cell { background: #141414; border: 1px solid #2a2a2a; border-radius: 10px; padding: 9px 4px; font-size: 13px; font-weight: 700; font-family: 'Heebo', sans-serif; color: #ccc; cursor: pointer; text-align: center; transition: background 0.12s, border-color 0.12s; min-height: 42px; display: flex; align-items: center; justify-content: center; -webkit-tap-highlight-color: transparent; }
  .grid-cell:active { transform: scale(0.95); }
  .grid-cell:hover { background: #1e1e1e; border-color: #444; color: #fff; }
  .grid-cell.selected { background: #220000; border-color: #cc0000; color: #ff4444; }
  .grid-cell:disabled { opacity: 0.5; cursor: not-allowed; }
  .result-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.88); display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 14px; z-index: 100; animation: fadeIn 0.2s ease; }
  .result-icon { font-size: 68px; }
  .result-text { font-size: 26px; font-weight: 900; }
  .result-correct { color: #44ff44; }
  .result-wrong   { color: #ff4444; }
  .eliminated-msg { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; text-align: center; padding: 20px; }
  .eliminated-icon { font-size: 52px; }
  .eliminated-text { font-size: 20px; font-weight: 900; color: #555; }
  .eliminated-sub  { font-size: 13px; color: #444; }
  .scores-row { display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #1a1a1a; font-size: 15px; }
  .scores-row:last-child { border: none; }
  .word-reveal { text-align: center; padding: 20px 16px 12px; }
  .word-reveal-label { font-size: 11px; color: #555; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 6px; }
  .word-reveal-word  { font-size: 42px; font-weight: 900; color: #ff2222; line-height: 1.1; }
  .winner-banner { text-align: center; background: #0a1a00; border: 1px solid #224400; border-radius: 12px; padding: 12px; }
  .winner-name   { font-size: 20px; font-weight: 900; color: #88ff44; }
  .winner-points { font-size: 13px; color: #558822; margin-top: 3px; }
  .no-winner { font-size: 15px; color: #555; font-weight: 700; text-align: center; padding: 10px; }
  .spacer { flex: 1; }
  .error-msg { color: #ff6666; font-size: 13px; font-weight: 700; text-align: center; background: #1a0000; border-radius: 8px; padding: 8px 12px; }
  .waiting-msg { text-align: center; color: #555; font-size: 14px; font-weight: 700; padding: 16px; }
`;

// ── Mode descriptions ──────────────────────────────────────────────────────────
const MODE_DESCS = {
  easy:  'טעות לא מוציאה מהסיבוב — אפשר לבזז שוב',
  hard:  'טעות מוציאה מהסיבוב — חשוב לוודא לפני שמבזזים',
  chaos: 'כולם יכולים לבזז בו זמנית — הראשון שצודק מנצח',
};
const MODE_LABELS = { easy: '🟢 קל', hard: '🔴 קשה', chaos: '🟣 כאוס' };

// ── Main App ──────────────────────────────────────────────────────────────────
export default function BuzzerApp() {
  const { socket, connected } = useSocket(SERVER_URL);
  const { resume: resumeAudio, playBuzz } = useBuzzSound();

  const [screen, setScreen] = useState('home');
  const [isHost, setIsHost] = useState(false);
  const [myName, setMyName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [roomState, setRoomState] = useState(null);
  const [myId, setMyId] = useState(null);

  // Settings (host only)
  const [settings, setSettings] = useState({ mode: 'hard', answerTimeout: 10, autoContinue: true, autoContinueDelay: 10 });

  // Game state
  const [revealedClues, setRevealedClues] = useState([]);
  const [totalClues, setTotalClues] = useState(0);
  const [grid, setGrid] = useState(null);
  const [gridTimeLeft, setGridTimeLeft] = useState(10);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [answerResult, setAnswerResult] = useState(null);
  const [roundResult, setRoundResult] = useState(null);

  // Auto-continue state
  const [acActive, setAcActive] = useState(false);   // countdown running
  const [acPaused, setAcPaused] = useState(false);   // countdown paused
  const [acLeft,   setAcLeft]   = useState(0);        // seconds left
  const acTimerRef = useRef(null);

  const gridTimerRef = useRef(null);
  const cluesEndRef  = useRef(null);

  // ── Derived ──────────────────────────────────────────────────────────────────
  const myPlayer = roomState?.players?.find(p => p.id === myId);
  const gamePhase = roomState?.phase;
  const gameMode  = roomState?.settings?.mode;
  const isEliminated = !!myPlayer?.eliminatedThisRound;
  const activeAnswererNames = roomState?.activeAnswererNames ?? [];

  // ── Socket listeners ──────────────────────────────────────────────────────────
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
      setAcPaused(false);
      setAcActive(true);
      setAcLeft(delay);
      clearInterval(acTimerRef.current);
      acTimerRef.current = setInterval(() => {
        setAcLeft(t => {
          if (t <= 1) { clearInterval(acTimerRef.current); return 0; }
          return t - 1;
        });
      }, 1000);
    });
    socket.on('auto_continue_paused', () => {
      setAcPaused(true);
      clearInterval(acTimerRef.current);
    });
    socket.on('clue_revealed', ({ revealedClues: rc, totalClues: tc }) => {
      setRevealedClues(rc); setTotalClues(tc);
    });
    socket.on('player_buzzed', ({ playerName, roomState: rs }) => {
      setRoomState(rs);
      if (isHost) playBuzz(); // 🔊 Buzz sound on host
    });
    socket.on('show_grid', ({ grid: g, timeLimit }) => {
      setGrid(g); setSelectedAnswer(null); setGridTimeLeft(timeLimit);
    });
    socket.on('answer_result', ({ correct, word, timeout }) => {
      setAnswerResult({ correct, word, timeout });
      setTimeout(() => {
        setAnswerResult(null);
        setGrid(null);
        setSelectedAnswer(null);
      }, correct ? 1400 : 1800);
    });
    socket.on('answer_failed', ({ roomState: rs }) => {
      setRoomState(rs);
      // grid already cleared by answer_result handler
    });
    socket.on('round_over', ({ word, winnerName, points, roomState: rs }) => {
      setRoomState(rs); setGrid(null); setSelectedAnswer(null);
      setRoundResult({ word, winnerName, points });
      setTimeout(() => setScreen('round-over'), 700);
    });
    socket.on('game_ended', ({ reason }) => {
      setError(reason || 'המשחק הסתיים'); setScreen('home');
    });
    return () => {
      ['room_updated','round_started','clue_revealed','player_buzzed',
       'show_grid','answer_result','answer_failed','round_over','game_ended',
       'auto_continue_started','auto_continue_paused'].forEach(e => socket.off(e));
    };
  }, [socket, isHost, playBuzz]);

  // ── Grid countdown ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!grid) { clearInterval(gridTimerRef.current); return; }
    clearInterval(gridTimerRef.current);
    gridTimerRef.current = setInterval(() => {
      setGridTimeLeft(t => { if (t <= 1) { clearInterval(gridTimerRef.current); return 0; } return t - 1; });
    }, 1000);
    return () => clearInterval(gridTimerRef.current);
  }, [grid]);

  // Auto-scroll clues
  useEffect(() => { cluesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [revealedClues.length]);

  // ── Actions ───────────────────────────────────────────────────────────────────
  const handleCreateRoom = () => {
    resumeAudio(); // unlock AudioContext on first interaction
    socket.emit('create_room', { settings }, ({ code, roomState: rs }) => {
      setRoomCode(code); setRoomState(rs); setMyId(socket.id);
      setIsHost(true); setScreen('lobby'); setError('');
    });
  };

  const handleJoinRoom = () => {
    if (!myName.trim()) { setError('נא להזין שם'); return; }
    if (!joinCode.trim()) { setError('נא להזין קוד'); return; }
    socket.emit('join_room', { code: joinCode.trim().toUpperCase(), playerName: myName.trim() }, res => {
      if (res.error) { setError(res.error); return; }
      setRoomCode(joinCode.trim().toUpperCase()); setRoomState(res.roomState);
      setMyId(socket.id); setIsHost(false); setScreen('lobby'); setError('');
    });
  };

  const handleStartRound = () => {
    socket.emit('start_round', {}, res => { if (res?.error) setError(res.error); });
  };
  const handlePauseAC  = () => socket.emit('pause_auto_continue');
  const handleResumeAC = () => socket.emit('resume_auto_continue');

  const handlePressBuzzer = () => {
    socket.emit('press_buzzer', {}, res => { if (res?.error) setError(res.error); });
  };

  const handleSubmitAnswer = (answer) => {
    if (selectedAnswer) return;
    setSelectedAnswer(answer);
    socket.emit('submit_answer', { answer });
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{styles}</style>
      <div className="app" dir="rtl">
        <div className="header">
          <div className="logo">BUZZER</div>
          <div className="conn-pill">
            <div className={`conn-dot ${connected ? 'on' : ''}`} />
            {connected ? 'מחובר' : 'מתחבר...'}
          </div>
        </div>

        {/* HOME */}
        {screen === 'home' && (
          <div className="screen">
            <div style={{ flex: 1 }} />
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: 60, marginBottom: 8 }}>🔴</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#888', letterSpacing: 2 }}>לחץ לפני כולם</div>
            </div>
            <div style={{ flex: 1 }} />
            {error && <div className="error-msg">{error}</div>}
            <button className="btn btn-red" disabled={!connected} onClick={() => { setIsHost(true); setScreen('host-settings'); setError(''); }}>
              📺 אני המארח
            </button>
            <button className="btn btn-dark" disabled={!connected} onClick={() => { setIsHost(false); setScreen('player-setup'); setError(''); }}>
              🎯 אני שחקן
            </button>
          </div>
        )}

        {/* HOST SETTINGS */}
        {screen === 'host-settings' && (
          <div className="screen">
            <div className="screen-title">הגדרות משחק</div>

            <div className="card">
              <div className="card-label">מצב משחק</div>
              <div className="seg">
                {['easy','hard','chaos'].map(m => (
                  <button key={m}
                    className={`seg-btn ${settings.mode === m ? `active-${m === 'easy' ? 'green' : m === 'hard' ? 'active' : 'chaos'}` : ''}`}
                    style={settings.mode === m && m === 'hard' ? { background: '#cc0000', color: '#fff' } : {}}
                    onClick={() => setSettings(s => ({ ...s, mode: m }))}>
                    {MODE_LABELS[m]}
                  </button>
                ))}
              </div>
              <div className="mode-desc">{MODE_DESCS[settings.mode]}</div>
            </div>

            <div className="card">
              <div className="card-label">זמן לבחירה מהגריד (שניות)</div>
              <div className="seg">
                {[5, 10, 15, 20].map(t => (
                  <button key={t}
                    className={`seg-btn ${settings.answerTimeout === t ? 'active' : ''}`}
                    onClick={() => setSettings(s => ({ ...s, answerTimeout: t }))}>
                    {t}ש׳
                  </button>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="card-label">מעבר אוטומטי לתור הבא</div>
              <div className="seg">
                <button className={`seg-btn ${settings.autoContinue ? 'active' : ''}`}
                  onClick={() => setSettings(s => ({ ...s, autoContinue: true }))}>✓ כן</button>
                <button className={`seg-btn ${!settings.autoContinue ? 'active' : ''}`}
                  onClick={() => setSettings(s => ({ ...s, autoContinue: false }))}>✗ לא</button>
              </div>
              {settings.autoContinue && (
                <>
                  <div className="card-label" style={{ marginTop: 12 }}>עיכוב לפני תור הבא (שניות)</div>
                  <div className="seg">
                    {[5, 10, 15].map(t => (
                      <button key={t} className={`seg-btn ${settings.autoContinueDelay === t ? 'active' : ''}`}
                        onClick={() => setSettings(s => ({ ...s, autoContinueDelay: t }))}>
                        {t}ש׳
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="spacer" />
            <button className="btn btn-red" disabled={!connected} onClick={handleCreateRoom}>
              צור חדר
            </button>
            <button className="btn btn-ghost" onClick={() => setScreen('home')}>חזרה</button>
          </div>
        )}

        {/* PLAYER SETUP */}
        {screen === 'player-setup' && (
          <div className="screen">
            <div className="screen-title">הצטרף למשחק</div>
            <div className="card">
              <div className="card-label">השם שלך</div>
              <input placeholder="שם..." value={myName} onChange={e => setMyName(e.target.value)} autoFocus />
            </div>
            <div className="card">
              <div className="card-label">קוד חדר</div>
              <input placeholder="קוד..." value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6} style={{ fontSize: 24, letterSpacing: 8, textAlign: 'center' }}
                onKeyDown={e => e.key === 'Enter' && handleJoinRoom()} />
            </div>
            {error && <div className="error-msg">{error}</div>}
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
              <div className="card-label">קוד החדר — שתפו עם השחקנים</div>
              <div className="room-code">{roomCode}</div>
              {roomState.settings && (
                <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center', gap: 8 }}>
                  <span className={`mode-badge ${roomState.settings.mode}`}>
                    {MODE_LABELS[roomState.settings.mode]}
                  </span>
                  <span style={{ fontSize: 12, color: '#555', alignSelf: 'center' }}>
                    {roomState.settings.answerTimeout}ש׳ לתשובה
                  </span>
                </div>
              )}
            </div>
            <div className="card">
              <div className="card-label">שחקנים ({roomState.players.length})</div>
              {roomState.players.length === 0
                ? <div style={{ color: '#333', fontSize: 14, padding: '6px 0' }}>ממתינים לשחקנים...</div>
                : roomState.players.map(p => (
                  <div className="player-row" key={p.id}>
                    <span className="player-name">{p.name}</span>
                    <span style={{ color: '#444', fontSize: 12 }}>✓</span>
                  </div>
                ))
              }
            </div>
            {error && <div className="error-msg">{error}</div>}
            <div className="spacer" />
            {isHost
              ? <button className="btn btn-red" disabled={roomState.players.length === 0} onClick={handleStartRound}>
                  🎮 התחל סיבוב 1
                </button>
              : <div className="waiting-msg">ממתינים למארח שיתחיל...</div>
            }
          </div>
        )}

        {/* GAME */}
        {screen === 'game' && roomState && (
          <>
            {isHost
              ? <HostGameScreen
                  roomState={roomState} revealedClues={revealedClues}
                  totalClues={totalClues} cluesEndRef={cluesEndRef} />
              : <PlayerGameScreen
                  roomState={roomState} myPlayer={myPlayer}
                  isEliminated={isEliminated} gamePhase={gamePhase} gameMode={gameMode}
                  activeAnswererNames={activeAnswererNames}
                  grid={grid} gridTimeLeft={gridTimeLeft} selectedAnswer={selectedAnswer}
                  revealedClues={revealedClues} totalClues={totalClues}
                  onPressBuzzer={handlePressBuzzer} onSubmitAnswer={handleSubmitAnswer} />
            }
            {answerResult && (
              <div className="result-overlay">
                <div className="result-icon">{answerResult.correct ? '✅' : answerResult.timeout ? '⏰' : '❌'}</div>
                <div className={`result-text ${answerResult.correct ? 'result-correct' : 'result-wrong'}`}>
                  {answerResult.correct ? 'נכון!' : answerResult.timeout ? 'אזל הזמן!' : 'לא נכון!'}
                </div>

              </div>
            )}
          </>
        )}

        {/* ROUND OVER */}
        {screen === 'round-over' && roundResult && roomState && (
          <RoundOverScreen roundResult={roundResult} roomState={roomState}
            isHost={isHost} onNextRound={handleStartRound} onHome={() => setScreen('home')}
            acActive={acActive} acPaused={acPaused} acLeft={acLeft}
            onPause={handlePauseAC} onResume={handleResumeAC} />
        )}
      </div>
    </>
  );
}

// ── Host Game Screen ───────────────────────────────────────────────────────────
function HostGameScreen({ roomState, revealedClues, totalClues, cluesEndRef }) {
  const pct = totalClues > 0 ? (revealedClues.length / totalClues) * 100 : 0;
  const mode = roomState.settings?.mode;
  const activeNames = roomState.activeAnswererNames ?? [];

  return (
    <div className="screen">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="round-badge">🎯 סיבוב {roomState.roundNumber}</div>
        <span className={`mode-badge ${mode}`}>{MODE_LABELS[mode]}</span>
      </div>

      <div className="hidden-word">🔒 המילה הנסתרת — לא גלויה למארח</div>

      <div className="clue-progress">
        <span>{revealedClues.length}/{totalClues}</span>
        <div className="clue-bar"><div className="clue-bar-fill" style={{ width: `${pct}%` }} /></div>
      </div>

      {activeNames.length > 0 && (
        mode === 'chaos'
          ? <div className="chaos-banner">⚡ {activeNames.join(', ')} {activeNames.length === 1 ? 'בוחר' : 'בוחרים'} תשובה...</div>
          : <div className="answering-banner">⚡ {activeNames[0]} בוחר תשובה...</div>
      )}

      <div className="card" style={{ flex: 1, overflowY: 'auto' }}>
        <div className="card-label">רמזים</div>
        {revealedClues.length === 0 && <div style={{ color: '#333', fontSize: 13, padding: '6px 0' }}>הרמזים יופיעו כאן...</div>}
        {[...revealedClues].reverse().map((c, i) => (
          <div className={`clue-item ${i === 0 ? 'latest' : ''}`} key={c.index}>
            <span className="clue-num">#{c.index + 1}</span>
            <span>{c.text}</span>
          </div>
        ))}
        <div ref={cluesEndRef} />
      </div>

      <div className="card">
        <div className="card-label">שחקנים</div>
        {roomState.players.map(p => {
          const isAnswering = (roomState.activeAnswererNames ?? []).includes(p.name);
          return (
            <div className="player-row" key={p.id}>
              <span style={{ fontWeight: 700, color: p.eliminatedThisRound ? '#444' : '#fff',
                textDecoration: p.eliminatedThisRound ? 'line-through' : 'none' }}>
                {p.name}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 900, fontSize: 18, color: '#ff2222' }}>{p.score}</span>
                <span>{isAnswering ? '⚡' : p.eliminatedThisRound ? '❌' : '🟢'}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Player Game Screen ─────────────────────────────────────────────────────────
function PlayerGameScreen({
  roomState, myPlayer, isEliminated, gamePhase, gameMode,
  activeAnswererNames, grid, gridTimeLeft, selectedAnswer,
  revealedClues, totalClues, onPressBuzzer, onSubmitAnswer,
}) {
  const timeoutSecs = roomState.settings?.answerTimeout || 10;
  const timerPct    = (gridTimeLeft / timeoutSecs) * 100;
  const timerColor  = gridTimeLeft <= 3 ? '#ff2222' : gridTimeLeft <= 5 ? '#ffaa00' : '#cc0000';

  const isMeAnswering     = !!grid; // I have a grid open
  const isOtherAnswering  = !isMeAnswering && activeAnswererNames.length > 0 && gamePhase === 'player_answering';
  const canBuzz = gamePhase === 'clues_running' && !isEliminated && !isMeAnswering;

  // Eliminated (hard mode only)
  if (isEliminated && !isMeAnswering) {
    return (
      <div className="screen">
        <div className="round-badge">סיבוב {roomState.roundNumber}</div>
        <div className="eliminated-msg">
          <div className="eliminated-icon">💀</div>
          <div className="eliminated-text">יצאת מהסיבוב</div>
          <div className="eliminated-sub">נסה בסיבוב הבא</div>
        </div>
        <div className="card">
          <div className="card-label">הניקוד שלך</div>
          <div style={{ fontSize: 34, fontWeight: 900, color: '#ff2222', textAlign: 'center', padding: '6px 0' }}>
            {myPlayer?.score ?? 0}
          </div>
        </div>
      </div>
    );
  }

  // Grid (I buzzed and am answering)
  if (isMeAnswering) {
    return (
      <div className="screen">
        <div className="grid-header">⚡ בחר את המילה!</div>
        <div className="grid-timer-bar">
          <div className="grid-timer-track">
            <div className="grid-timer-fill" style={{ width: `${timerPct}%`, background: timerColor }} />
          </div>
          <div className="grid-timer-num" style={{ color: timerColor }}>{gridTimeLeft}ש׳</div>
        </div>
        <div className="card" style={{ padding: '10px' }}>
          <div className="grid">
            {grid.map((word, i) => (
              <button key={i} className={`grid-cell ${selectedAnswer === word ? 'selected' : ''}`}
                onClick={() => !selectedAnswer && onSubmitAnswer(word)} disabled={!!selectedAnswer}>
                {word}
              </button>
            ))}
          </div>
        </div>
        <div style={{ color: '#444', fontSize: 12, textAlign: 'center' }}>
          {revealedClues.length}/{totalClues} רמזים ניתנו
        </div>
      </div>
    );
  }

  // Buzzer screen
  return (
    <div className="screen" style={{ padding: 0 }}>
      <div style={{ padding: '12px 16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="round-badge">סיבוב {roomState.roundNumber}</div>
        <span style={{ fontSize: 12, color: '#555' }}>{revealedClues.length}/{totalClues} רמזים</span>
      </div>

      {isOtherAnswering && (
        <div style={{ padding: '8px 16px 0' }}>
          <div className="answering-banner">⚡ {activeAnswererNames[0]} בוחר תשובה...</div>
        </div>
      )}

      <div className="buzzer-wrap">
        <button className="buzzer-btn" onClick={onPressBuzzer} disabled={!canBuzz}>
          <span>BUZZ</span>
          <span className="buzzer-sub">
            {isMeAnswering ? 'בוחר...'
             : isOtherAnswering ? 'ממתין...'
             : !canBuzz ? 'ממתין...'
             : 'לחץ!'}
          </span>
        </button>
        <div style={{ fontSize: 13, color: '#666', textAlign: 'center' }}>
          ניקוד: <strong style={{ color: '#ff2222', fontSize: 18 }}>{myPlayer?.score ?? 0}</strong>
        </div>
      </div>
    </div>
  );
}

// ── Round Over Screen ──────────────────────────────────────────────────────────
function RoundOverScreen({ roundResult, roomState, isHost, onNextRound, onHome,
    acActive, acPaused, acLeft, onPause, onResume }) {
  const sorted = [...(roomState.players ?? [])].sort((a, b) => b.score - a.score);
  const pct = acActive && roomState.settings?.autoContinueDelay
    ? (acLeft / roomState.settings.autoContinueDelay) * 100 : 100;
  return (
    <div className="screen">
      <div className="word-reveal">
        <div className="word-reveal-label">המילה הנסתרת הייתה</div>
        <div className="word-reveal-word">{roundResult.word}</div>
      </div>
      {roundResult.winnerName
        ? <div className="winner-banner">
            <div className="winner-name">🏆 {roundResult.winnerName}</div>
            <div className="winner-points">+{roundResult.points} נקודות</div>
          </div>
        : <div className="no-winner">😔 אף אחד לא ניחש את המילה</div>
      }
      <div className="card">
        <div className="card-label">ניקוד</div>
        {sorted.map((p, i) => (
          <div className="scores-row" key={p.id}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 15, minWidth: 22 }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`}</span>
              <span style={{ fontWeight: 700, color: '#ccc' }}>{p.name}</span>
            </div>
            <span style={{ fontWeight: 900, fontSize: 20, color: '#ff2222' }}>{p.score}</span>
          </div>
        ))}
      </div>
      <div className="spacer" />

      {/* Auto-continue countdown */}
      {acActive && !acPaused && (
        <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
          <div style={{ fontSize: 12, color: '#555', marginBottom: 4 }}>התור הבא מתחיל בעוד</div>
          <div style={{ fontSize: 64, fontWeight: 900, color: '#ff2222', lineHeight: 1,
            textShadow: '0 0 30px rgba(255,34,34,0.5)' }}>{acLeft}</div>
          <div style={{ fontSize: 12, color: '#444', marginTop: 2 }}>שניות</div>
          <div style={{ height: 4, background: '#1a1a1a', borderRadius: 2, margin: '10px 0 0', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: '#cc0000', borderRadius: 2,
              width: `${pct}%`, transition: 'width 1s linear' }} />
          </div>
        </div>
      )}
      {acActive && acPaused && (
        <div style={{ textAlign: 'center', padding: '8px 0', color: '#555', fontWeight: 700, fontSize: 15 }}>
          ⏸ מושהה
        </div>
      )}

      {/* Host controls */}
      {isHost && acActive && !acPaused && (
        <button className="btn btn-dark" onClick={onPause}>⏸ השהה</button>
      )}
      {isHost && acActive && acPaused && (
        <>
          <button className="btn btn-dark" onClick={onResume}>▶ המשך ספירה לאחור</button>
          <button className="btn btn-red"  onClick={onNextRound}>⏩ התחל עכשיו</button>
        </>
      )}
      {isHost && !acActive && (
        <button className="btn btn-red" onClick={onNextRound}>▶ סיבוב הבא</button>
      )}
      {!isHost && !acActive && (
        <div className="waiting-msg">ממתינים למארח לסיבוב הבא...</div>
      )}

      <button className="btn btn-ghost" onClick={onHome}>🏠 חזרה לתפריט</button>
    </div>
  );
}
