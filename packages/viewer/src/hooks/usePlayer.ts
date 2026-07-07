/**
 * usePlayer — autoplay + keyboard control layered on useRecording.
 *
 * Play/pause advances the cursor at the recording's original wall-clock pace
 * (so you can watch the agent "think" in real time), or at a chosen speed.
 * Keyboard: space=play/pause, ←/→=step, Home/End=seek ends, +/-=speed.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { RecordingState } from "./useRecording.js";

export interface PlayerState {
  isPlaying: boolean;
  /** Playback speed multiplier (1 = real time). */
  speed: number;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  setSpeed: (s: number) => void;
}

const MIN_SPEED = 0.25;
const MAX_SPEED = 8;
const SPEED_STEPS = [0.25, 0.5, 1, 2, 4, 8];

export function usePlayer(rec: RecordingState): PlayerState {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeedState] = useState(1);
  const rafRef = useRef<number | null>(null);
  const startWallRef = useRef<number>(0);
  const startCursorTsRef = useRef<number>(0);

  const stop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  // Drive the cursor forward at real-time pace using wall clock vs event ts.
  const tick = useCallback(() => {
    if (rec.events.length === 0) {
      stop();
      return;
    }
    const now = performance.now();
    const elapsedWall = now - startWallRef.current;
    const targetTs = startCursorTsRef.current + elapsedWall * speed;
    // Find the event index whose ts is the latest <= targetTs.
    let next = rec.cursor;
    while (next < rec.events.length && rec.events[next].ts <= targetTs) {
      next++;
    }
    if (next !== rec.cursor) rec.seek(next);
    if (next >= rec.events.length) {
      stop();
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [rec, speed, stop]);

  const play = useCallback(() => {
    if (rec.events.length === 0) return;
    if (rec.isAtEnd) rec.seekStart();
    const current = rec.events[rec.cursor] ?? rec.events[0];
    startWallRef.current = performance.now();
    startCursorTsRef.current = current?.ts ?? 0;
    setIsPlaying(true);
  }, [rec]);

  const pause = useCallback(() => stop(), [stop]);
  const toggle = useCallback(() => (isPlaying ? pause() : play()), [isPlaying, play, pause]);

  const setSpeed = useCallback((s: number) => {
    setSpeedState(Math.max(MIN_SPEED, Math.min(MAX_SPEED, s)));
  }, []);

  // Run the animation loop while playing.
  useEffect(() => {
    if (!isPlaying) return;
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [isPlaying, tick]);

  // Stop when the source changes.
  useEffect(() => stop, [stop]);

  // Keyboard shortcuts (global). Ignored when focus is in an input/textarea.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      switch (e.key) {
        case " ":
          e.preventDefault();
          toggle();
          break;
        case "ArrowRight":
          e.preventDefault();
          pause();
          rec.step(1);
          break;
        case "ArrowLeft":
          e.preventDefault();
          pause();
          rec.step(-1);
          break;
        case "Home":
          e.preventDefault();
          pause();
          rec.seekStart();
          break;
        case "End":
          e.preventDefault();
          pause();
          rec.seekEnd();
          break;
        case "+":
        case "=":
          setSpeed(nextSpeed(speed, 1));
          break;
        case "-":
        case "_":
          setSpeed(nextSpeed(speed, -1));
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rec, toggle, pause, speed, setSpeed]);

  return { isPlaying, speed, play, pause, toggle, setSpeed };
}

function nextSpeed(current: number, dir: 1 | -1): number {
  const idx = SPEED_STEPS.indexOf(current);
  if (idx === -1) return dir > 0 ? Math.min(MAX_SPEED, current * 2) : Math.max(MIN_SPEED, current / 2);
  const next = idx + dir;
  return SPEED_STEPS[Math.max(0, Math.min(SPEED_STEPS.length - 1, next))];
}
