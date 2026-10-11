import { describe, expect, it, vi } from "vitest";
import { type FocusScheduler, type FocusTarget, holdInitialFocus } from "./hold-initial-focus";

function fakeTarget({ focusableAfterAttempts = 1 } = {}) {
  let attempts = 0;
  let displayed = true;
  const target: FocusTarget = {
    isDisplayed: vi.fn(() => displayed),
    tryFocus: vi.fn(() => {
      attempts += 1;
      return attempts >= focusableAfterAttempts;
    }),
  };
  return {
    target,
    hide() {
      displayed = false;
    },
  };
}

function fakeScheduler() {
  let pendingFrame: (() => void) | null = null;
  let focusLostListener: (() => void) | null = null;
  let focusTakenListener: (() => void) | null = null;
  const cancelFrame = vi.fn(() => {
    pendingFrame = null;
  });
  const scheduler: FocusScheduler = {
    nextFrame: vi.fn((callback: () => void) => {
      pendingFrame = callback;
      return cancelFrame;
    }),
    onFocusLost: vi.fn((callback: () => void) => {
      focusLostListener = callback;
      return () => {
        focusLostListener = null;
      };
    }),
    onFocusTaken: vi.fn((callback: () => void) => {
      focusTakenListener = callback;
      return () => {
        focusTakenListener = null;
      };
    }),
  };
  return {
    scheduler,
    cancelFrame,
    hasPendingFrame: () => pendingFrame !== null,
    isListening: () => focusLostListener !== null || focusTakenListener !== null,
    runFrame() {
      const frame = pendingFrame;
      pendingFrame = null;
      frame?.();
    },
    loseFocus() {
      focusLostListener?.();
    },
    takeFocus() {
      focusTakenListener?.();
    },
  };
}

describe("holdInitialFocus", () => {
  it("focuses at once when the target can take focus", () => {
    const { target } = fakeTarget();
    const fake = fakeScheduler();

    holdInitialFocus(target, fake.scheduler);

    expect(target.tryFocus).toHaveBeenCalledTimes(1);
    expect(fake.hasPendingFrame()).toBe(false);
  });

  it("tries again on each frame until the target takes focus", () => {
    const { target } = fakeTarget({ focusableAfterAttempts: 3 });
    const fake = fakeScheduler();

    holdInitialFocus(target, fake.scheduler);
    expect(fake.hasPendingFrame()).toBe(true);

    fake.runFrame();
    expect(fake.hasPendingFrame()).toBe(true);

    fake.runFrame();
    expect(target.tryFocus).toHaveBeenCalledTimes(3);
    expect(fake.hasPendingFrame()).toBe(false);
  });

  it("focuses again on the next frame when focus is lost to nothing", () => {
    const { target } = fakeTarget();
    const fake = fakeScheduler();

    holdInitialFocus(target, fake.scheduler);
    fake.loseFocus();
    expect(target.tryFocus).toHaveBeenCalledTimes(1);
    expect(fake.hasPendingFrame()).toBe(true);

    fake.runFrame();
    expect(target.tryFocus).toHaveBeenCalledTimes(2);
    expect(fake.hasPendingFrame()).toBe(false);
    expect(fake.isListening()).toBe(true);
  });

  it("does not plan a second attempt when focus is lost while one is pending", () => {
    const { target } = fakeTarget({ focusableAfterAttempts: 2 });
    const fake = fakeScheduler();

    holdInitialFocus(target, fake.scheduler);
    fake.loseFocus();

    expect(fake.scheduler.nextFrame).toHaveBeenCalledTimes(1);
  });

  it("gives up when the target is not displayed", () => {
    const { target, hide } = fakeTarget();
    hide();
    const fake = fakeScheduler();

    holdInitialFocus(target, fake.scheduler);

    expect(target.tryFocus).not.toHaveBeenCalled();
    expect(fake.hasPendingFrame()).toBe(false);
    expect(fake.isListening()).toBe(false);
  });

  it("gives up when focus is lost because the target was hidden", () => {
    const { target, hide } = fakeTarget();
    const fake = fakeScheduler();

    holdInitialFocus(target, fake.scheduler);
    hide();
    fake.loseFocus();
    fake.runFrame();

    expect(target.tryFocus).toHaveBeenCalledTimes(1);
    expect(fake.isListening()).toBe(false);
  });

  it("stops when the user or another element takes focus", () => {
    const { target } = fakeTarget({ focusableAfterAttempts: Number.POSITIVE_INFINITY });
    const fake = fakeScheduler();

    holdInitialFocus(target, fake.scheduler);
    fake.takeFocus();

    expect(fake.cancelFrame).toHaveBeenCalledTimes(1);
    expect(fake.hasPendingFrame()).toBe(false);
    expect(fake.isListening()).toBe(false);
  });

  it("does not take focus back after the user or another element took it", () => {
    const { target } = fakeTarget();
    const fake = fakeScheduler();

    holdInitialFocus(target, fake.scheduler);
    fake.takeFocus();
    fake.loseFocus();

    expect(fake.hasPendingFrame()).toBe(false);
    expect(target.tryFocus).toHaveBeenCalledTimes(1);
  });

  it("stops when the returned function is called", () => {
    const { target } = fakeTarget({ focusableAfterAttempts: Number.POSITIVE_INFINITY });
    const fake = fakeScheduler();

    const stop = holdInitialFocus(target, fake.scheduler);
    stop();

    expect(fake.hasPendingFrame()).toBe(false);
    expect(fake.isListening()).toBe(false);
  });

  it("does nothing when stopped twice", () => {
    const { target } = fakeTarget({ focusableAfterAttempts: Number.POSITIVE_INFINITY });
    const fake = fakeScheduler();

    const stop = holdInitialFocus(target, fake.scheduler);
    stop();
    stop();

    expect(fake.cancelFrame).toHaveBeenCalledTimes(1);
  });
});
