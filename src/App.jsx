import { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';

import { PALETTES, applyPalette } from './game/constants.js';
import { ensureAudio, startBgMusic } from './game/audio.js';
import { createEngine } from './game/engine.js';
import { renderGame } from './game/renderer.js';
import { useLeaderboard } from './hooks/useLeaderboard.js';

import GameCanvas from './components/GameCanvas.jsx';
import SetupScreen from './components/SetupScreen.jsx';
import MenuScreen from './components/MenuScreen.jsx';
import DeadScreen from './components/DeadScreen.jsx';
import PaletteEditor from './components/PaletteEditor.jsx';
import HelpScreen from './components/HelpScreen.jsx';
import SideIndicators from './components/SideIndicators.jsx';
import TouchControls from './components/TouchControls.jsx';

const S = { SETUP: 0, MENU: 1, PLAY: 2, DEAD: 3 };

function genUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function initPlayer() {
  let id = localStorage.getItem('sn_id');
  if (!id) { id = genUUID(); localStorage.setItem('sn_id', id); }
  return {
    name: localStorage.getItem('sn_name') || '',
    best: parseInt(localStorage.getItem('sn_best') || '0'),
  };
}

export default function App() {
  const player = useRef(initPlayer());
  const [state, setState] = useState(player.current.name ? S.MENU : S.SETUP);
  const [palIdx, setPalIdx] = useState(0);
  const [showPalette, setShowPalette] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [, tick] = useState(0); // force re-render for HUD updates

  const engineRef = useRef(createEngine());
  const leaderboard = useLeaderboard();

  const [playerName, setPlayerName] = useState(player.current.name);
  const [personalBest, setPersonalBest] = useState(player.current.best);
  const [deathScore, setDeathScore] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);
  const [submitFeedback, setSubmitFeedback] = useState(false);
  const [boardLayout, setBoardLayout] = useState(null);
  const [multShake, setMultShake] = useState(false);
  const prevMultRef = useRef(1);

  // HUD polling — re-render periodically during play for score updates
  useEffect(() => {
    if (state !== S.PLAY) return;
    const id = setInterval(() => {
      tick(n => n + 1);
      const m = 1 + (engineRef.current.stepCount / 240 | 0) + (engineRef.current.snake.length / 10 | 0);
      if (m > prevMultRef.current) {
        prevMultRef.current = m;
        setMultShake(true);
        setTimeout(() => setMultShake(false), 400);
      }
    }, 100);
    return () => clearInterval(id);
  }, [state]);

  // Check for death each frame via polling
  // Wait for death explosion animation + 2s delay before showing death screen
  const deathDetectedRef = useRef(false);
  useEffect(() => {
    if (state !== S.PLAY) { deathDetectedRef.current = false; return; }
    const id = setInterval(() => {
      const e = engineRef.current;
      if (!e.died) return;
      // Latch score/best on first detection
      if (!deathDetectedRef.current) {
        deathDetectedRef.current = true;
        const sc = e.score;
        const newBest = e.newBest;
        setDeathScore(sc);
        setIsNewBest(newBest);
        if (newBest) {
          setPersonalBest(sc);
          localStorage.setItem('sn_best', sc);
          leaderboard.submit(playerName, sc);
          setSubmitFeedback(true);
          setTimeout(() => setSubmitFeedback(false), 2500);
        }
      }
      // Wait until engine signals death screen is ready
      if (e.deathScreenReady > 0 && e.gTime >= e.deathScreenReady) {
        e.startReplay();
        setState(S.DEAD);
      }
    }, 50);
    return () => clearInterval(id);
  }, [state, playerName, leaderboard]);

  // Keyboard input
  useEffect(() => {
    const DIRS = {
      ArrowUp: { x: 0, y: -1 }, KeyW: { x: 0, y: -1 },
      ArrowDown: { x: 0, y: 1 }, KeyS: { x: 0, y: 1 },
      ArrowLeft: { x: -1, y: 0 }, KeyA: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 }, KeyD: { x: 1, y: 0 },
    };

    function onKeyDown(e) {
      // Don't handle keys when an input is focused
      if (e.target.tagName === 'INPUT') return;

      const engine = engineRef.current;

      if (state === S.PLAY) {
        if (DIRS[e.code]) {
          engine.queueDirection(DIRS[e.code]);
          e.preventDefault();
        }
        if (e.code === 'Space') {
          engine.activateTunnel();
          e.preventDefault();
        }
        if (e.code === 'Escape') {
          setState(S.MENU);
          e.preventDefault();
        }
      }

      if (state === S.MENU || state === S.DEAD) {
        if (e.code === 'Enter' || e.code === 'NumpadEnter') {
          startGame();
          e.preventDefault();
        }
        if (e.code === 'KeyP') {
          setShowPalette(v => !v);
          e.preventDefault();
        }
        if (e.code === 'ArrowUp') {
          changePalette(-1);
          e.preventDefault();
        }
        if (e.code === 'ArrowDown') {
          changePalette(1);
          e.preventDefault();
        }
        if (state === S.DEAD && e.code === 'Escape') {
          setState(S.MENU);
          leaderboard.refresh();
          e.preventDefault();
        }
      }

      if (e.code === 'ArrowUp' || e.code === 'ArrowDown' || e.code === 'Space') {
        e.preventDefault();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [state]);

  const startGame = useCallback(() => {
    ensureAudio();
    engineRef.current.reset();
    setState(S.PLAY);
    startBgMusic();
    // Mobile: enter fullscreen so the browser chrome doesn't eat screen space
    const isMobile = window.matchMedia('(pointer: coarse)').matches;
    if (isMobile && !document.fullscreenElement) {
      const el = document.documentElement;
      const req = el.requestFullscreen || el.webkitRequestFullscreen;
      if (req) Promise.resolve(req.call(el)).catch(() => {});
    }
  }, []);

  const changePalette = useCallback((dir) => {
    setPalIdx(prev => {
      const next = ((prev + dir) % PALETTES.length + PALETTES.length) % PALETTES.length;
      applyPalette(next);
      return next;
    });
  }, []);

  const handleSetupContinue = useCallback((name) => {
    setPlayerName(name);
    localStorage.setItem('sn_name', name);
    setState(S.MENU);
    ensureAudio();
    startBgMusic();
  }, []);

  const handleRename = useCallback((name) => {
    setPlayerName(name);
    localStorage.setItem('sn_name', name);
  }, []);

  const handleSwipe = useCallback((d) => {
    engineRef.current.queueDirection(d);
  }, []);

  const handleTunnel = useCallback(() => {
    engineRef.current.activateTunnel();
  }, []);

  const engine = engineRef.current;
  const playing = state === S.PLAY;

  return (
    <div className="app">
      <div className="game-area">
        <GameCanvas
          engine={engine}
          renderer={renderGame}
          playing={state === S.PLAY || state === S.DEAD}
          onSwipe={handleSwipe}
          onLayout={setBoardLayout}
        />

        {/* Side indicators during play */}
        {(state === S.PLAY || state === S.DEAD) && (
          <SideIndicators
            tunnelCharges={engine.tunnelCharges}
            haloCharges={engine.haloCharges}
            phaseTicks={engine.phaseTicks}
            layout={boardLayout}
          />
        )}

        {/* Mobile touch controls */}
        {state === S.PLAY && (
          <TouchControls onDirection={handleSwipe} onTunnel={handleTunnel} tunnelCharges={engine.tunnelCharges} />
        )}

        {/* Screen overlays */}
        {state === S.SETUP && (
          <SetupScreen onContinue={handleSetupContinue} />
        )}

        {state === S.MENU && !showPalette && !showHelp && (
          <MenuScreen
            playerName={playerName}
            personalBest={personalBest}
            palIdx={palIdx}
            leaderboard={leaderboard}
            onPlay={startGame}
            onRename={handleRename}
            onPaletteChange={changePalette}
            onHelp={() => setShowHelp(true)}
          />
        )}

        {showHelp && (
          <HelpScreen onBack={() => setShowHelp(false)} />
        )}

        {state === S.DEAD && (
          <DeadScreen
            score={deathScore}
            personalBest={personalBest}
            isNewBest={isNewBest}
            playerName={playerName}
            leaderboard={leaderboard}
            submitFeedback={submitFeedback}
            onPlayAgain={startGame}
            onMenu={() => { setState(S.MENU); leaderboard.refresh(); }}
            onRename={handleRename}
          />
        )}

        {showPalette && (
          <PaletteEditor onClose={() => setShowPalette(false)} />
        )}

        {/* Score labels outside grid */}
        {(state === S.PLAY || state === S.DEAD) && boardLayout && (
          <>
            <div
              className="grid-score grid-score--left"
              style={{ right: `calc(100% - ${boardLayout.boardX - 6}px)`, top: boardLayout.boardY }}
            >
              <div className={`grid-score__mult${multShake ? ' grid-score__mult--shake' : ''}`}>x{1 + (engine.stepCount / 240 | 0) + (engine.snake.length / 10 | 0)}</div>
              <div className="grid-score__val">{engine.score}</div>
            </div>
            <div
              className="grid-score grid-score--right"
              style={{ left: boardLayout.boardX + boardLayout.boardW + 6, top: boardLayout.boardY }}
            >
              <div className="grid-score__val">Best: {personalBest}</div>
            </div>
          </>
        )}
      </div>

    </div>
  );
}
