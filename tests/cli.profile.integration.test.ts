import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import path from "node:path";

describe("CLI profile support", () => {
  it("runs with web-dev profile (mock server)", () => {
    const cli = path.resolve("dist/index.js");
    const server = path.resolve("tests/fixtures/mock-mcp-server.js");

    const input = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "providers.list",
      params: {},
    });

    const output = execFileSync(
      "node",
      [cli, "run", "--profile", "web-dev"],
      {
        encoding: "utf8",
        input,
        env: {
          ...process.env,
          // ✅ works cross-platform
          MCP_PROFILE_SERVER: `node ${server}`,
        },
      }
    );

    expect(output).toMatch(/"jsonrpc"/);
    expect(output).toMatch(/mock/);
  });
});
