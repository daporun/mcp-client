import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";

describe("CLI integration", () => {
  it("runs providers.list successfully", () => {
    const cmd = `
      echo '{"jsonrpc":"2.0","id":1,"method":"providers.list"}' |
      MCP_DEBUG=0 node dist/index.js run "node ../dapo-mcp-server/dist/server.js"
    `;

    const output = execSync(cmd, { encoding: "utf8" });

    expect(output).toMatch(/"result"/);
    expect(output).toMatch(/"providers"/);
  });
});
