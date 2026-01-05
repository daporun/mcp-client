import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import path from "node:path";

describe("CLI integration", () => {
  it("runs providers.list successfully", () => {
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
      [cli, "run", `node ${server}`],
      {
        encoding: "utf8",
        input, // ✅ sends stdin content reliably on Windows/Linux
      }
    );

    expect(output).toMatch(/"result"/);
    expect(output).toMatch(/"provider": "mock"/);
  });
});
