import { describe, it, expect, vi, beforeEach } from "vitest";
import { MCPProcess } from "../src/runner";
import { EventEmitter } from "node:events";

// mockProc must be defined BEFORE mock factory runs
let mockProc: any;

// Mock child_process.spawn BEFORE imports evaluate
vi.mock("node:child_process", () => ({
  spawn: () => mockProc
}));

describe("MCPProcess - request/response", () => {
  beforeEach(() => {
    // Reset mock process for each test
    mockProc = {
      stdout: new EventEmitter(),
      stderr: new EventEmitter(),
      stdin: { write: vi.fn() },
      pid: 456,
      kill: vi.fn(),
      on: vi.fn()
    };
  });

  it("routes response to correct pending promise", async () => {
    const proc = new MCPProcess({
      command: "node",
      args: ["fakeServer.js"],
      startupTimeoutMs: 2000
    });

    const handshake = {
      name: "X",
      version: "1",
      capabilities: {},
      metadata: {}
    };

    // Prepare start() but handshake not sent yet
    const startPromise = proc.start();

    // Emit handshake frame → resolves start()
    const hsBody = JSON.stringify(handshake);
    mockProc.stdout.emit("data", `Content-Length: ${hsBody.length}\r\n\r\n${hsBody}`);

    await startPromise;

    // --- Prepare request ---
    const req = {
      jsonrpc: "2.0",
      id: 99,
      method: "providers.list"
    } as const;

    const responsePromise = proc.send(req);

    // --- Simulate server response ---
    const resBody = JSON.stringify({
      jsonrpc: "2.0",
      id: 99,
      result: { ok: true }
    });
    mockProc.stdout.emit("data", `Content-Length: ${resBody.length}\r\n\r\n${resBody}`);

    // --- Validate response ---
    const response = await responsePromise;

    expect(response).toEqual({
      jsonrpc: "2.0",
      id: 99,
      result: { ok: true }
    });
  });
});
