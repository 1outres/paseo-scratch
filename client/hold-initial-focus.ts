export interface FocusTarget {
  /** True when the target is laid out, even if it can not take focus yet. */
  isDisplayed(): boolean;
  /** Tries to move focus to the target. Returns true when the target has focus afterwards. */
  tryFocus(): boolean;
}

export interface FocusScheduler {
  /** Runs the callback on the next animation frame. Returns a function that cancels it. */
  nextFrame(callback: () => void): () => void;
  /** Calls the callback when the target loses focus and no other element gets it. Returns a function that stops listening. */
  onFocusLost(callback: () => void): () => void;
  /** Calls the callback when the user presses a pointer or another element gets focus. Returns a function that stops listening. */
  onFocusTaken(callback: () => void): () => void;
}

/**
 * Gives the target focus as soon as it can take focus, and takes focus back when it is
 * dropped to nothing. Stops when the user or another element takes focus, or when the
 * target is not displayed. Returns a function that stops it.
 */
export function holdInitialFocus(target: FocusTarget, scheduler: FocusScheduler): () => void {
  let stopped = false;
  let cancelFrame: (() => void) | null = null;
  const stopWatchingLoss = scheduler.onFocusLost(retryNextFrame);
  const stopWatchingTake = scheduler.onFocusTaken(stop);

  function stop() {
    if (stopped) return;
    stopped = true;
    cancelFrame?.();
    cancelFrame = null;
    stopWatchingLoss();
    stopWatchingTake();
  }

  function retryNextFrame() {
    if (stopped || cancelFrame !== null) return;
    cancelFrame = scheduler.nextFrame(attempt);
  }

  function attempt() {
    cancelFrame = null;
    if (!target.isDisplayed()) {
      stop();
      return;
    }
    if (!target.tryFocus()) retryNextFrame();
  }

  attempt();
  return stop;
}
