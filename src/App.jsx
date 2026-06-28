import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3002';

// ── Socket hook ──────────────────────────────────────────────────────────────
function useSocket(url) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const s = io(url, {
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
    s.on('connect', () => setConnected(true));
    s.on('disconnect', () => setConnected(false));
    setSocket(s);

    const onVisible = () => {
      if (document.visibilityState === 'visible' && !s.connected) s.connect();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      s.disconnect();
    };
  }, [url]);

  return { socket, connected };
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@400;700;900&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Heebo', sans-serif;
    background: #0a0a0a;
    color: #ffffff;
    direction: rtl;
    min-height: 100dvh;
    overflow-x: hidden;
  }

  .app {
    max-width: 480px;
    margin: 0 auto;
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    background: #0a0a0a;
    position: relative;
  }

  /* ── Header ── */
  .header {
    padding: 12px 20px 10px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid #1a1a1a;
    flex-shrink: 0;
  }
  .logo {
    font-size: 28px;
    font-weight: 900;
    letter-spacing: 4px;
    color: #ff2222;
    text-shadow: 0 0 20px rgba(255,34,34,0.5);
  }
  .conn-pill {
    display: flex;
    align-items: center;
    gap: 6px;
    background: #1a1a1a;
    border-radius: 20px;
    padding: 4px 12px;
    font-size: 12px;
    color: #888;
  }
  .conn-dot { width: 8px; height: 8px; border-radius: 50%; background: #333; transition: all 0.3s; }
  .conn-dot.on { background: #44ff44; box-shadow: 0 0 6px #44ff44; }

  /* ── Screen ── */
  .screen {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 20px 16px 24px;
    gap: 16px;
    overflow-y: auto;
  }

  .screen-title {
    font-size: 22px;
    font-weight: 900;
    color: #fff;
    text-align: center;
  }

  /* ── Cards ── */
  .card {
    background: #141414;
    border: 1px solid #2a2a2a;
    border-radius: 16px;
    padding: 16px 18px;
  }
  .card-label {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: #555;
    margin-bottom: 10px;
  }

  /* ── Inputs ── */
  input {
    width: 100%;
    background: #0f0f0f;
    border: 2px solid #2a2a2a;
    border-radius: 12px;
    padding: 13px 16px;
    color: #fff;
    font-size: 16px;
    font-family: 'Heebo', sans-serif;
    direction: rtl;
    outline: none;
    transition: border-color 0.2s;
  }
  input:focus { border-color: #cc0000; }
  input::placeholder { color: #444; }

  /* ── Buttons ── */
  .btn {
    width: 100%;
    padding: 14px;
    border-radius: 12px;
    border: none;
    font-size: 16px;
    font-weight: 900;
    font-family: 'Heebo', sans-serif;
    cursor: pointer;
    transition: transform 0.1s, opacity 0.1s;
    letter-spacing: 0.5px;
  }
  .btn:active { transform: scale(0.97); }
  .btn:disabled { opacity: 0.35; cursor: not-allowed; }

  .btn-red    { background: #cc0000; color: #fff; box-shadow: 0 4px 0 #880000; }
  .btn-dark   { background: #1e1e1e; color: #ccc; border: 1px solid #333; }
  .btn-ghost  { background: transparent; color: #666; border: 1px solid #2a2a2a; }

  /* ── Room code ── */
  .room-code {
    font-size: 48px;
    font-weight: 900;
    letter-spacing: 10px;
    color: #ff2222;
    text-align: center;
    text-shadow: 0 0 30px rgba(255,34,34,0.3);
    padding: 8px 0;
  }

  /* ── Player list ── */
  .player-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid #1e1e1e;
    font-size: 15px;
  }
  .player-row:last-child { border: none; }
  .player-name { font-weight: 700; color: #fff; }
  .player-score { font-weight: 900; font-size: 18px; color: #ff2222; }
  .player-status { font-size: 12px; }
  .status-active { color: #44ff44; }
  .status-eliminated { color: #555; text-decoration: line-through; }
  .status-answering { color: #ffaa00; }

  /* ── Clue list ── */
  .clue-item {
    display: flex;
    gap: 10px;
    padding: 10px 0;
    border-bottom: 1px solid #1a1a1a;
    font-size: 15px;
    line-height: 1.4;
    color: #ddd;
    animation: fadeIn 0.4s ease;
  }
  .clue-item:last-child { border: none; }
  .clue-item.latest { color: #fff; font-weight: 700; }
  .clue-number {
    font-size: 12px;
    font-weight: 900;
    color: #ff2222;
    min-width: 24px;
    margin-top: 2px;
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-6px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* ── Hidden word indicator ── */
  .hidden-word {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    background: #1a0000;
    border: 1px solid #440000;
    border-radius: 12px;
    padding: 14px 20px;
    font-size: 15px;
    color: #884444;
    font-weight: 700;
  }
  .hidden-word .lock { font-size: 20px; }

  /* ── Answering banner ── */
  .answering-banner {
    background: #1a1500;
    border: 1px solid #554400;
    border-radius: 12px;
    padding: 12px 16px;
    text-align: center;
    color: #ffcc00;
    font-weight: 700;
    font-size: 15px;
    animation: pulse 1.5s infinite;
  }
  @keyframes pulse {
    0%,100% { opacity: 1; }
    50% { opacity: 0.65; }
  }

  /* ── THE BUZZER BUTTON ── */
  .buzzer-wrap {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    padding: 20px;
  }
  .buzzer-btn {
    width: min(280px, 80vw);
    height: min(280px, 80vw);
    border-radius: 50%;
    border: none;
    background: radial-gradient(circle at 35% 35%, #ff4444, #cc0000 50%, #880000);
    box-shadow:
      0 0 0 6px #550000,
      0 0 0 10px #330000,
      0 12px 0 #550000,
      0 16px 40px rgba(200,0,0,0.6);
    cursor: pointer;
    transition: transform 0.08s, box-shadow 0.08s;
    font-size: 28px;
    font-weight: 900;
    font-family: 'Heebo', sans-serif;
    color: #fff;
    text-shadow: 0 2px 4px rgba(0,0,0,0.5);
    letter-spacing: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    gap: 4px;
    -webkit-tap-highlight-color: transparent;
  }
  .buzzer-btn:active:not(:disabled) {
    transform: scale(0.95) translateY(4px);
    box-shadow:
      0 0 0 6px #550000,
      0 0 0 10px #330000,
      0 4px 0 #550000,
      0 6px 20px rgba(200,0,0,0.4);
  }
  .buzzer-btn:disabled {
    background: radial-gradient(circle at 35% 35%, #333, #222 50%, #111);
    box-shadow:
      0 0 0 6px #1a1a1a,
      0 0 0 10px #111,
      0 12px 0 #1a1a1a;
    color: #444;
    cursor: not-allowed;
  }
  .buzzer-sub { font-size: 12px; font-weight: 400; opacity: 0.7; letter-spacing: 1px; }
  .buzzer-score {
    font-size: 14px;
    color: #888;
    text-align: center;
  }
  .buzzer-score strong { color: #ff2222; font-size: 18px; }

  /* ── Waiting message ── */
  .waiting-msg {
    text-align: center;
    color: #555;
    font-size: 15px;
    font-weight: 700;
    padding: 20px;
  }

  /* ── Eliminated message ── */
  .eliminated-msg {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 20px;
    text-align: center;
  }
  .eliminated-icon { font-size: 56px; }
  .eliminated-text { font-size: 22px; font-weight: 900; color: #555; }
  .eliminated-sub  { font-size: 14px; color: #444; }

  /* ── Grid ── */
  .grid-header {
    text-align: center;
    font-weight: 900;
    font-size: 18px;
    color: #fff;
  }
  .grid-timer {
    text-align: center;
    font-size: 13px;
    color: #888;
  }
  .grid-timer.urgent { color: #ff4444; font-weight: 700; }
  .grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }
  .grid-cell {
    background: #141414;
    border: 1px solid #2a2a2a;
    border-radius: 10px;
    padding: 10px 4px;
    font-size: 14px;
    font-weight: 700;
    font-family: 'Heebo', sans-serif;
    color: #ccc;
    cursor: pointer;
    text-align: center;
    transition: background 0.12s, border-color 0.12s, transform 0.1s;
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    -webkit-tap-highlight-color: transparent;
  }
  .grid-cell:active { transform: scale(0.95); }
  .grid-cell:hover  { background: #1e1e1e; border-color: #444; color: #fff; }
  .grid-cell.selected {
    background: #220000;
    border-color: #cc0000;
    color: #ff4444;
  }

  /* ── Answer result overlay ── */
  .result-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    gap: 16px;
    z-index: 100;
    animation: fadeIn 0.2s ease;
  }
  .result-icon  { font-size: 72px; }
  .result-text  { font-size: 28px; font-weight: 900; }
  .result-correct { color: #44ff44; }
  .result-wrong   { color: #ff4444; }

  /* ── Round over ── */
  .word-reveal {
    text-align: center;
    padding: 24px 20px 16px;
  }
  .word-reveal-label { font-size: 12px; color: #555; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 8px; }
  .word-reveal-word  { font-size: 44px; font-weight: 900; color: #ff2222; line-height: 1.1; }
  .winner-banner {
    text-align: center;
    background: #0a1a00;
    border: 1px solid #224400;
    border-radius: 12px;
    padding: 14px;
  }
  .winner-name   { font-size: 20px; font-weight: 900; color: #88ff44; }
  .winner-points { font-size: 14px; color: #558822; margin-top: 4px; }
  .no-winner     { font-size: 16px; color: #555; font-weight: 700; text-align: center; padding: 12px; }

  /* ── Scores table ── */
  .scores-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid #1a1a1a;
    font-size: 15px;
  }
  .scores-row:last-child { border: none; }
  .scores-name  { font-weight: 700; color: #ccc; }
  .scores-pts   { font-weight: 900; font-size: 20px; color: #ff2222; }

  /* ── Misc ── */
  .spacer   { flex: 1; }
  .error-msg { color: #ff6666; font-size: 14px; font-weight: 700; text-align: center; background: #1a0000; border-radius: 8px; padding: 8px 12px; }
  .divider  { height: 1px; background: #1a1a1a; margin: 4px 0; }
  .round-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: #1a0000;
    border: 1px solid #440000;
    border-radius: 20px;
    padding: 4px 14px;
    font-size: 13px;
    color: #884444;
    font-weight: 700;
    align-self: center;
  }
  .clue-progress {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: #555;
  }
  .clue-progress-bar {
    flex: 1;
    height: 4px;
    background: #1a1a1a;
    border-radius: 2px;
    overflow: hidden;
  }
  .clue-progress-fill {
    height: 100%;
    background: #cc0000;
    border-radius: 2px;
    transition: width 0.4s ease;
  }
`;

// ── Main App ─────────────────────────────────────────────────────────────────
export default function BuzzerApp() {
  const { socket, connected } = useSocket(SERVER_URL);

  // Navigation
  const [screen, setScreen] = useState('home'); // home|host-setup|player-setup|lobby|game|round-over

  // Role
  const [isHost, setIsHost] = useState(false);

  // Form inputs
  const [myName, setMyName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');

  // Room state (from server)
  const [roomCode, setRoomCode] = useState('');
  const [roomState, setRoomState] = useState(null);
  const [myId, setMyId] = useState(null);

  // Game state
  const [revealedClues, setRevealedClues] = useState([]);
  const [totalClues, setTotalClues] = useState(0);

  // Player-specific
  const [grid, setGrid] = useState(null);           // 32-word array when answering
  const [gridTimeLeft, setGridTimeLeft] = useState(15);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [answerResult, setAnswerResult] = useState(null); // { correct, word, timeout }

  // Round over
  const [roundResult, setRoundResult] = useState(null); // { word, winnerName, points, roomState }

  const gridTimerRef = useRef(null);
  const cluesEndRef = useRef(null);

  // ── Derived state ──────────────────────────────────────────────────────────
  const myPlayer = roomState?.players?.find(p => p.id === myId);
  const answeringPlayerName = roomState?.answeringPlayerName;
  const gamePhase = roomState?.phase;
  const isMyTurnAnswering = gamePhase === 'player_answering' && !!grid;
  const isOtherAnswering  = gamePhase === 'player_answering' && !grid;
  const isEliminated      = !!myPlayer?.eliminatedThisRound;

  // ── Socket listeners ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    socket.on('room_updated', rs => setRoomState(rs));

    socket.on('round_started', ({ roundNumber, totalClues: tc, roomState: rs }) => {
      setRoomState(rs);
      setRevealedClues([]);
      setTotalClues(tc);
      setGrid(null);
      setAnswerResult(null);
      setSelectedAnswer(null);
      setRoundResult(null);
      setScreen('game');
    });

    socket.on('clue_revealed', ({ revealedClues: rc, totalClues: tc }) => {
      setRevealedClues(rc);
      setTotalClues(tc);
    });

    socket.on('player_buzzed', ({ playerName, roomState: rs }) => {
      setRoomState(rs);
    });

    socket.on('show_grid', ({ grid: g, timeLimit }) => {
      setGrid(g);
      setSelectedAnswer(null);
      setGridTimeLeft(timeLimit);
    });

    socket.on('answer_result', ({ correct, word, timeout }) => {
      setAnswerResult({ correct, word, timeout });
      setTimeout(() => {
        setAnswerResult(null);
        setGrid(null);
        setSelectedAnswer(null);
      }, correct ? 1500 : 2000);
    });

    socket.on('player_eliminated', ({ roomState: rs }) => {
      setRoomState(rs);
      setGrid(null);
      setSelectedAnswer(null);
    });

    socket.on('round_over', ({ word, winnerName, points, roomState: rs }) => {
      setRoomState(rs);
      setGrid(null);
      setSelectedAnswer(null);
      setRoundResult({ word, winnerName, points });
      setTimeout(() => setScreen('round-over'), answerResult ? 1800 : 600);
    });

    socket.on('game_ended', ({ reason }) => {
      setError(reason || 'המשחק הסתיים');
      setScreen('home');
    });

    return () => {
      ['room_updated','round_started','clue_revealed','player_buzzed',
       'show_grid','answer_result','player_eliminated','round_over','game_ended'
      ].forEach(e => socket.off(e));
    };
  }, [socket]);

  // ── Grid countdown timer ───────────────────────────────────────────────────
  useEffect(() => {
    if (!grid) { clearInterval(gridTimerRef.current); return; }
    clearInterval(gridTimerRef.current);
    gridTimerRef.current = setInterval(() => {
      setGridTimeLeft(t => {
        if (t <= 1) { clearInterval(gridTimerRef.current); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(gridTimerRef.current);
  }, [grid]);

  // ── Auto-scroll clues ──────────────────────────────────────────────────────
  useEffect(() => {
    cluesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [revealedClues.length]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleCreateRoom = () => {
    if (!myName.trim()) { setError('נא להזין שם'); return; }
    socket.emit('create_room', {}, ({ code, roomState: rs }) => {
      setRoomCode(code);
      setRoomState(rs);
      setMyId(socket.id);
      setIsHost(true);
      setScreen('lobby');
      setError('');
    });
  };

  const handleJoinRoom = () => {
    if (!myName.trim()) { setError('נא להזין שם'); return; }
    if (!joinCode.trim()) { setError('נא להזין קוד חדר'); return; }
    socket.emit('join_room', { code: joinCode.trim().toUpperCase(), playerName: myName.trim() }, res => {
      if (res.error) { setError(res.error); return; }
      setRoomCode(joinCode.trim().toUpperCase());
      setRoomState(res.roomState);
      setMyId(socket.id);
      setIsHost(false);
      setScreen('lobby');
      setError('');
    });
  };

  const handleStartRound = () => {
    socket.emit('start_round', {}, res => {
      if (res?.error) setError(res.error);
    });
  };

  const handlePressBuzzer = () => {
    socket.emit('press_buzzer', {}, res => {
      if (res?.error) setError(res.error);
    });
  };

  const handleSubmitAnswer = (answer) => {
    if (selectedAnswer) return; // already submitted
    setSelectedAnswer(answer);
    socket.emit('submit_answer', { answer });
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{styles}</style>
      <div className="app" dir="rtl">

        {/* Header */}
        <div className="header">
          <div className="logo">BUZZER</div>
          <div className="conn-pill">
            <div className={`conn-dot ${connected ? 'on' : ''}`} />
            {connected ? 'מחובר' : 'מתחבר...'}
          </div>
        </div>

        {/* ── HOME ── */}
        {screen === 'home' && (
          <div className="screen">
            <div style={{ flex: 1 }} />
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 64, marginBottom: 8 }}>🔴</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#888', letterSpacing: 2 }}>
                לחץ לפני כולם
              </div>
            </div>
            <div style={{ flex: 1 }} />
            {error && <div className="error-msg">{error}</div>}
            <button
              className="btn btn-red"
              disabled={!connected}
              onClick={() => { setIsHost(true); setScreen('host-setup'); setError(''); }}
            >
              📺 אני המארח
            </button>
            <button
              className="btn btn-dark"
              disabled={!connected}
              onClick={() => { setIsHost(false); setScreen('player-setup'); setError(''); }}
            >
              🎯 אני שחקן
            </button>
          </div>
        )}

        {/* ── HOST SETUP ── */}
        {screen === 'host-setup' && (
          <div className="screen">
            <div className="screen-title">הגדרות מארח</div>
            <div className="card">
              <div className="card-label">השם שלך</div>
              <input
                placeholder="שם המארח..."
                value={myName}
                onChange={e => setMyName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateRoom()}
                autoFocus
              />
            </div>
            {error && <div className="error-msg">{error}</div>}
            <div className="spacer" />
            <button className="btn btn-red" disabled={!connected || !myName.trim()} onClick={handleCreateRoom}>
              צור חדר
            </button>
            <button className="btn btn-ghost" onClick={() => setScreen('home')}>חזרה</button>
          </div>
        )}

        {/* ── PLAYER SETUP ── */}
        {screen === 'player-setup' && (
          <div className="screen">
            <div className="screen-title">הצטרף למשחק</div>
            <div className="card">
              <div className="card-label">השם שלך</div>
              <input
                placeholder="השם שלך..."
                value={myName}
                onChange={e => setMyName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="card">
              <div className="card-label">קוד חדר</div>
              <input
                placeholder="קוד..."
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
                style={{ fontSize: 24, letterSpacing: 8, textAlign: 'center' }}
                onKeyDown={e => e.key === 'Enter' && handleJoinRoom()}
              />
            </div>
            {error && <div className="error-msg">{error}</div>}
            <div className="spacer" />
            <button
              className="btn btn-red"
              disabled={!connected || !myName.trim() || !joinCode.trim()}
              onClick={handleJoinRoom}
            >
              הצטרף
            </button>
            <button className="btn btn-ghost" onClick={() => setScreen('home')}>חזרה</button>
          </div>
        )}

        {/* ── LOBBY ── */}
        {screen === 'lobby' && roomState && (
          <div className="screen">
            <div className="card" style={{ textAlign: 'center' }}>
              <div className="card-label">קוד החדר — שתפו עם השחקנים</div>
              <div className="room-code">{roomCode}</div>
            </div>

            <div className="card">
              <div className="card-label">שחקנים ({roomState.players.length})</div>
              {roomState.players.length === 0 && (
                <div style={{ color: '#333', fontSize: 14, padding: '8px 0' }}>ממתינים לשחקנים...</div>
              )}
              {roomState.players.map(p => (
                <div className="player-row" key={p.id}>
                  <span className="player-name">{p.name}</span>
                  <span style={{ color: '#444', fontSize: 12 }}>✓ מחובר</span>
                </div>
              ))}
            </div>

            {error && <div className="error-msg">{error}</div>}
            <div className="spacer" />

            {isHost ? (
              <button
                className="btn btn-red"
                disabled={roomState.players.length === 0}
                onClick={handleStartRound}
              >
                🎮 התחל סיבוב 1
              </button>
            ) : (
              <div className="waiting-msg">ממתינים למארח שיתחיל...</div>
            )}
          </div>
        )}

        {/* ── GAME ── */}
        {screen === 'game' && roomState && (
          <>
            {isHost ? (
              <HostGameScreen
                roomState={roomState}
                revealedClues={revealedClues}
                totalClues={totalClues}
                cluesEndRef={cluesEndRef}
              />
            ) : (
              <PlayerGameScreen
                roomState={roomState}
                myPlayer={myPlayer}
                isEliminated={isEliminated}
                isMyTurnAnswering={isMyTurnAnswering}
                isOtherAnswering={isOtherAnswering}
                answeringPlayerName={answeringPlayerName}
                grid={grid}
                gridTimeLeft={gridTimeLeft}
                selectedAnswer={selectedAnswer}
                revealedClues={revealedClues}
                totalClues={totalClues}
                onPressBuzzer={handlePressBuzzer}
                onSubmitAnswer={handleSubmitAnswer}
              />
            )}

            {/* Answer result overlay */}
            {answerResult && (
              <div className="result-overlay">
                <div className="result-icon">
                  {answerResult.correct ? '✅' : answerResult.timeout ? '⏰' : '❌'}
                </div>
                <div className={`result-text ${answerResult.correct ? 'result-correct' : 'result-wrong'}`}>
                  {answerResult.correct
                    ? 'נכון!'
                    : answerResult.timeout
                    ? 'אזל הזמן!'
                    : 'לא נכון!'}
                </div>
                {!answerResult.correct && answerResult.word && (
                  <div style={{ color: '#888', fontSize: 16 }}>
                    המילה הייתה: <strong style={{ color: '#ff2222' }}>{answerResult.word}</strong>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ── ROUND OVER ── */}
        {screen === 'round-over' && roundResult && roomState && (
          <RoundOverScreen
            roundResult={roundResult}
            roomState={roomState}
            isHost={isHost}
            onNextRound={handleStartRound}
            onHome={() => setScreen('home')}
          />
        )}
      </div>
    </>
  );
}

// ── Host Game Screen ──────────────────────────────────────────────────────────
function HostGameScreen({ roomState, revealedClues, totalClues, cluesEndRef }) {
  const pct = totalClues > 0 ? (revealedClues.length / totalClues) * 100 : 0;

  return (
    <div className="screen">
      <div className="round-badge">
        🎯 סיבוב {roomState.roundNumber}
      </div>

      {/* Hidden word indicator */}
      <div className="hidden-word">
        <span className="lock">🔒</span>
        <span>המילה הנסתרת — לא גלויה למארח</span>
      </div>

      {/* Clue progress */}
      <div className="clue-progress">
        <span>{revealedClues.length}/{totalClues} רמזים</span>
        <div className="clue-progress-bar">
          <div className="clue-progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Answering banner */}
      {roomState.phase === 'player_answering' && roomState.answeringPlayerName && (
        <div className="answering-banner">
          ⚡ {roomState.answeringPlayerName} בוחר תשובה...
        </div>
      )}

      {/* Clues */}
      <div className="card" style={{ flex: 1, overflowY: 'auto' }}>
        <div className="card-label">רמזים</div>
        {revealedClues.length === 0 && (
          <div style={{ color: '#333', fontSize: 14, padding: '8px 0' }}>הרמזים יופיעו כאן...</div>
        )}
        {[...revealedClues].reverse().map((c, i) => (
          <div className={`clue-item ${i === 0 ? 'latest' : ''}`} key={c.index}>
            <span className="clue-number">#{c.index + 1}</span>
            <span>{c.text}</span>
          </div>
        ))}
        <div ref={cluesEndRef} />
      </div>

      {/* Players */}
      <div className="card">
        <div className="card-label">שחקנים</div>
        {roomState.players.length === 0 && (
          <div style={{ color: '#333', fontSize: 13 }}>אין שחקנים</div>
        )}
        {roomState.players.map(p => {
          const isAnswering = p.name === roomState.answeringPlayerName;
          return (
            <div className="player-row" key={p.id}>
              <span className={`player-name ${p.eliminatedThisRound ? 'status-eliminated' : ''}`}>
                {p.name}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="player-score">{p.score}</span>
                <span className={`player-status ${
                  isAnswering ? 'status-answering'
                  : p.eliminatedThisRound ? 'status-eliminated'
                  : 'status-active'
                }`}>
                  {isAnswering ? '⚡' : p.eliminatedThisRound ? '❌' : '🟢'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Player Game Screen ────────────────────────────────────────────────────────
function PlayerGameScreen({
  roomState, myPlayer, isEliminated, isMyTurnAnswering, isOtherAnswering,
  answeringPlayerName, grid, gridTimeLeft, selectedAnswer,
  revealedClues, totalClues, onPressBuzzer, onSubmitAnswer,
}) {
  const canBuzz = !isEliminated && roomState.phase === 'clues_running';

  // Eliminated
  if (isEliminated && !isMyTurnAnswering) {
    return (
      <div className="screen">
        <div className="round-badge">סיבוב {roomState.roundNumber}</div>
        <div className="eliminated-msg">
          <div className="eliminated-icon">💀</div>
          <div className="eliminated-text">יצאת מהסיבוב</div>
          <div className="eliminated-sub">נסה בסיבוב הבא</div>
        </div>
        <div className="card" style={{ marginBottom: 8 }}>
          <div className="card-label">הניקוד שלך</div>
          <div style={{ fontSize: 36, fontWeight: 900, color: '#ff2222', textAlign: 'center', padding: '8px 0' }}>
            {myPlayer?.score ?? 0}
          </div>
        </div>
      </div>
    );
  }

  // Answering — show grid
  if (isMyTurnAnswering && grid) {
    return (
      <div className="screen">
        <div className="grid-header">⚡ בחר את המילה!</div>
        <div className={`grid-timer ${gridTimeLeft <= 5 ? 'urgent' : ''}`}>
          נותרו {gridTimeLeft} שניות
        </div>
        <div className="card" style={{ padding: '12px' }}>
          <div className="grid">
            {grid.map((word, i) => (
              <button
                key={i}
                className={`grid-cell ${selectedAnswer === word ? 'selected' : ''}`}
                onClick={() => !selectedAnswer && onSubmitAnswer(word)}
                disabled={!!selectedAnswer}
              >
                {word}
              </button>
            ))}
          </div>
        </div>
        <div style={{ color: '#555', fontSize: 13, textAlign: 'center' }}>
          רמזים שניתנו: {revealedClues.length} / {totalClues}
        </div>
      </div>
    );
  }

  // Buzzer screen
  return (
    <div className="screen" style={{ padding: 0 }}>
      {/* Top info bar */}
      <div style={{ padding: '12px 16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="round-badge">סיבוב {roomState.roundNumber}</div>
        <div style={{ fontSize: 13, color: '#555' }}>
          {revealedClues.length} / {totalClues} רמזים
        </div>
      </div>

      {/* Answering banner when someone else buzzes */}
      {isOtherAnswering && answeringPlayerName && (
        <div style={{ padding: '0 16px', marginTop: 8 }}>
          <div className="answering-banner">
            ⚡ {answeringPlayerName} בוחר תשובה...
          </div>
        </div>
      )}

      {/* THE BUZZER */}
      <div className="buzzer-wrap">
        <button
          className="buzzer-btn"
          onClick={onPressBuzzer}
          disabled={!canBuzz || isOtherAnswering}
        >
          <span>BUZZ</span>
          <span className="buzzer-sub">
            {isOtherAnswering ? 'המתן...' : !canBuzz ? 'ממתין...' : 'לחץ!'}
          </span>
        </button>
        <div className="buzzer-score">
          ניקוד: <strong>{myPlayer?.score ?? 0}</strong>
        </div>
      </div>
    </div>
  );
}

// ── Round Over Screen ─────────────────────────────────────────────────────────
function RoundOverScreen({ roundResult, roomState, isHost, onNextRound, onHome }) {
  const sorted = [...(roomState.players ?? [])].sort((a, b) => b.score - a.score);

  return (
    <div className="screen">
      {/* Word reveal */}
      <div className="word-reveal">
        <div className="word-reveal-label">המילה הנסתרת הייתה</div>
        <div className="word-reveal-word">{roundResult.word}</div>
      </div>

      {/* Winner or no winner */}
      {roundResult.winnerName ? (
        <div className="winner-banner">
          <div className="winner-name">🏆 {roundResult.winnerName}</div>
          <div className="winner-points">+{roundResult.points} נקודות</div>
        </div>
      ) : (
        <div className="no-winner">😔 אף אחד לא ניחש את המילה</div>
      )}

      {/* Scoreboard */}
      <div className="card">
        <div className="card-label">ניקוד</div>
        {sorted.map((p, i) => (
          <div className="scores-row" key={p.id}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 16, width: 24 }}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
              </span>
              <span className="scores-name">{p.name}</span>
            </div>
            <span className="scores-pts">{p.score}</span>
          </div>
        ))}
      </div>

      <div className="spacer" />

      {isHost ? (
        <button className="btn btn-red" onClick={onNextRound}>
          ▶ סיבוב הבא
        </button>
      ) : (
        <div className="waiting-msg">ממתינים למארח שיתחיל את הסיבוב הבא...</div>
      )}
      <button className="btn btn-ghost" onClick={onHome}>🏠 חזרה לתפריט</button>
    </div>
  );
}
