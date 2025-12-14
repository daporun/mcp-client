import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
import path from "node:path";

describe("CLI profile support", () => {
  it("runs with web-dev profile (mock server)", () => {
    const mockServer = path.resolve(
      __dirname,
      "fixtures/mock-mcp-server.js"
    );

    const cmd = `
      echo '{"jsonrpc":"2.0","id":1,"method":"providers.list"}' |
      MCP_PROFILE_SERVER="node ${mockServer}" node dist/index.js run --profile web-dev
    `;

    const output = execSync(cmd, { encoding: "utf8" });

    expect(output).toMatch(/"jsonrpc"/);
    expect(output).toMatch(/mock/);
  });
});
