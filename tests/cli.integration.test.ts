import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
import path from "node:path";

describe("CLI integration", () => {
  it("runs providers.list successfully", () => {
    const mockServer = path.resolve(__dirname, "fixtures/mock-mcp-server.js");

    const cmd = `
      echo '{"jsonrpc":"2.0","id":1,"method":"providers.list"}' |
      MCP_DEBUG=0 node dist/index.js run "node ${mockServer}"
    `;

    const output = execSync(cmd, { encoding: "utf8" });

    expect(output).toMatch(/"result"/);
    expect(output).toMatch(/"provider": "mock"/);
  });
});
