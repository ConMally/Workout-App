"use client";

import { useRef, type TouchEvent } from "react";

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

const MIN_DISTANCE_PX = 60;
// A swipe only counts once its primary axis clearly dominates the other —
// this is what keeps a mostly-vertical scroll gesture from ever being
// misread as a horizontal swipe (and vice versa).
const AXIS_DOMINANCE_RATIO = 1.5;

// Phase 7 PART 3: lightweight, dependency-free swipe detection. Only reads
// touchstart/touchend coordinates and never calls preventDefault, so native
// scrolling and browser gestures are never interrupted — a swipe is
// recognized after the fact, once the gesture has already finished, not by
// intercepting the touchmove stream.
export function useSwipeGesture(handlers: SwipeHandlers) {
  const startRef = useRef<{ x: number; y: number } | null>(null);

  function onTouchStart(e: TouchEvent) {
    const touch = e.touches[0];
    startRef.current = { x: touch.clientX, y: touch.clientY };
  }

  function onTouchEnd(e: TouchEvent) {
    const start = startRef.current;
    startRef.current = null;
    if (!start) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (absX >= MIN_DISTANCE_PX && absX > absY * AXIS_DOMINANCE_RATIO) {
      if (deltaX < 0) handlers.onSwipeLeft?.();
      else handlers.onSwipeRight?.();
      return;
    }

    if (absY >= MIN_DISTANCE_PX && absY > absX * AXIS_DOMINANCE_RATIO) {
      if (deltaY < 0) handlers.onSwipeUp?.();
      else handlers.onSwipeDown?.();
    }
  }

  return { onTouchStart, onTouchEnd };
}
