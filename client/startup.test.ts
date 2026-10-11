import { describe, expect, it, vi } from "vitest";
import { STARTUP_FAILURE_MESSAGE, startScratchProjectSetup } from "./startup";

function deferred() {
  let reject!: (error: unknown) => void;
  let resolve!: (value: unknown) => void;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("startScratchProjectSetup", () => {
  it("calls ensure once at start", () => {
    const ensure = vi.fn(() => new Promise(() => {}));
    startScratchProjectSetup({ ensure, reportError: vi.fn() });
    expect(ensure).toHaveBeenCalledTimes(1);
  });

  it("reports a failure", async () => {
    const pending = deferred();
    const reportError = vi.fn();
    startScratchProjectSetup({ ensure: () => pending.promise, reportError });

    const failure = new Error("root is inside a git repository");
    pending.reject(failure);
    await vi.waitFor(() => expect(reportError).toHaveBeenCalledWith(STARTUP_FAILURE_MESSAGE, failure));
  });

  it("reports nothing on success", async () => {
    const reportError = vi.fn();
    startScratchProjectSetup({ ensure: async () => ({ projectId: "prj_1" }), reportError });
    await Promise.resolve();
    await Promise.resolve();
    expect(reportError).not.toHaveBeenCalled();
  });

  it("does not report the rejection that plugin teardown causes", async () => {
    const pending = deferred();
    const reportError = vi.fn();
    const stop = startScratchProjectSetup({ ensure: () => pending.promise, reportError });

    stop();
    pending.reject(new Error("plugin stopped"));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(reportError).not.toHaveBeenCalled();
  });
});
