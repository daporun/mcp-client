import { describe, it, expect, vi, beforeEach } from "vitest";
import { MCPProcess } from "../src/runner";
import { EventEmitter } from "node:events";

// mockProc must exist BEFORE the mock factory runs
let mockProc: any;

vi.mock("node:child_process", () => ({
  spawn: () => mockProc
}));

describe("MCPProcess - handshake", () => {
  beforeEach(() => {
    // Reset mockProc for each test
    mockProc = {
      stdout: new EventEmitter(),
      stderr: new EventEmitter(),
      stdin: { write: vi.fn() },
      pid: 123,
      kill: vi.fn(),
      on: vi.fn()
    };
  });

  it("detects handshake from first JSON object", async () => {
    const proc = new MCPProcess({
      command: "node",
      args: ["fakeServer.js"],
      startupTimeoutMs: 2000
    });

    const startPromise = proc.start();

    const handshake = {
      name: "Test Server",
      version: "0.1",
      capabilities: {},
      metadata: {}
    };

    const body = JSON.stringify(handshake);

    // Emit frame
    mockProc.stdout.emit("data", `Content-Length: ${body.length}\r\n\r\n${body}`);

    await expect(startPromise).resolves.toEqual({ pid: 123 });
  });
});
