import { describe, expect, it } from "vitest";
import { newAgentHint } from "./new-agent-hint";

describe("newAgentHint", () => {
  it("shows the keyboard shortcut for both Mac and other systems on web and desktop", () => {
    expect(newAgentHint("web")).toBe(
      'The workspace opens without an agent. Press Cmd/Ctrl+Shift+A, or choose "New agent", to start one.',
    );
  });

  it("does not show a keyboard shortcut on phones and tablets", () => {
    const hint = 'The workspace opens without an agent. Choose "New agent" to start one.';
    expect(newAgentHint("ios")).toBe(hint);
    expect(newAgentHint("android")).toBe(hint);
  });
});
