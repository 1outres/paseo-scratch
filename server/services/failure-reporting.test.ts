import { describe, expect, it } from "vitest";
import type { Logger } from "../ports/logger";
import { logFailures, reportFailures } from "./failure-reporting";

class FakeLogger implements Logger {
  readonly errors: Array<{ message: string; error: unknown }> = [];

  error(message: string, error: unknown): void {
    this.errors.push({ message, error });
  }
}

describe("reportFailures", () => {
  it("returns the result and logs nothing on success", async () => {
    const logger = new FakeLogger();
    await expect(reportFailures(logger, "Set up", async () => 42)).resolves.toBe(42);
    expect(logger.errors).toEqual([]);
  });

  it("logs the error and still returns it to the caller", async () => {
    const logger = new FakeLogger();
    const failure = new Error("archive failed");

    await expect(
      reportFailures(logger, "Set up", async () => {
        throw failure;
      }),
    ).rejects.toBe(failure);
    expect(logger.errors).toEqual([{ message: "Set up", error: failure }]);
  });
});

describe("logFailures", () => {
  it("logs nothing on success", async () => {
    const logger = new FakeLogger();
    await logFailures(logger, "Archive", async () => "moved");
    expect(logger.errors).toEqual([]);
  });

  it("logs the error and resolves, for event handlers that have no caller", async () => {
    const logger = new FakeLogger();
    const failure = new Error("EXDEV");

    await expect(
      logFailures(logger, "Archive", async () => {
        throw failure;
      }),
    ).resolves.toBeUndefined();
    expect(logger.errors).toEqual([{ message: "Archive", error: failure }]);
  });
});
