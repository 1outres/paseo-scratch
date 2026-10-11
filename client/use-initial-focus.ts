import type { PluginHostProps } from "@getpaseo/plugin/client";
import { type RefObject, useEffect, useRef } from "react";
import type { TextInput } from "react-native";
import { type FocusScheduler, type FocusTarget, holdInitialFocus } from "./hold-initial-focus";

export interface InitialFocusProps {
  ref: RefObject<TextInput | null>;
  autoFocus: boolean;
}

/**
 * Gives a text input focus when its form opens. Spread the result into the input's props.
 *
 * On web, autoFocus is not enough: Paseo first renders a popover off screen to measure it,
 * then renders it again hidden (CSS `visibility: hidden`) until its open animation starts.
 * A hidden input can not take focus, so the input keeps trying until it is shown.
 *
 * Paseo's menu also calls Keyboard.dismiss() when it opens, on the next frame, and again
 * 150 ms later (useDismissKeyboardOnOpen). On web that blurs the focused input, so the
 * input takes focus back when focus is dropped to nothing.
 */
export function useInitialFocus(platform: PluginHostProps["layout"]["platform"]): InitialFocusProps {
  const ref = useRef<TextInput>(null);
  const isWeb = platform === "web";

  useEffect(() => {
    if (!isWeb) return;
    const input = ref.current;
    if (!(input instanceof HTMLElement)) {
      throw new Error("useInitialFocus: on web the input ref must be a DOM element.");
    }
    return holdInitialFocus(domFocusTarget(input), domFocusScheduler(input));
  }, [isWeb]);

  return { ref, autoFocus: !isWeb };
}

function domFocusTarget(element: HTMLElement): FocusTarget {
  return {
    // Paseo's overlay uses the same test when it looks for an element to focus.
    isDisplayed: () => element.getClientRects().length > 0,
    tryFocus: () => {
      element.focus();
      return element.ownerDocument.activeElement === element;
    },
  };
}

function domFocusScheduler(element: HTMLElement): FocusScheduler {
  const document = element.ownerDocument;
  return {
    nextFrame: (callback) => {
      const frame = requestAnimationFrame(callback);
      return () => cancelAnimationFrame(frame);
    },
    onFocusLost: (callback) => {
      const listener = (event: FocusEvent) => {
        if (event.relatedTarget === null) callback();
      };
      element.addEventListener("focusout", listener);
      return () => element.removeEventListener("focusout", listener);
    },
    onFocusTaken: (callback) => {
      const onFocusIn = (event: FocusEvent) => {
        if (event.target !== element) callback();
      };
      document.addEventListener("focusin", onFocusIn, true);
      document.addEventListener("pointerdown", callback, true);
      return () => {
        document.removeEventListener("focusin", onFocusIn, true);
        document.removeEventListener("pointerdown", callback, true);
      };
    },
  };
}
