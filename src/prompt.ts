import readline from "node:readline";
import { createRequest } from "./jsonrpc.js";
import type { MCPProcess } from "./runner.js";

export function startPrompt(proc: MCPProcess): void {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    historySize: 200
  });

  console.error("MCP Prompt Ready");

  proc.on("rpc-response", (msg) => {
    console.error("RESPONSE:", JSON.stringify(msg, null, 2));
  });

  rl.setPrompt("mcp> ");
  rl.prompt();

  rl.on("line", (line) => {
    const trimmed = line.trim();
    if (trimmed === "exit") {
      rl.close();
      proc.close();
      return;
    }
    try {
      const json = JSON.parse(trimmed);
      const req = createRequest(json.method, json.params);
      proc.send(req);
    } catch {
      console.error("Invalid JSON input");
    }
    rl.prompt();
  });
}
