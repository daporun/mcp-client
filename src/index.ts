#!/usr/bin/env node

// src/index.ts
import { MCPProcess } from "./runner.js";
import { createRequest } from "./jsonrpc.js";

type MaybeJSONRPC = {
  id?: number | string;
  jsonrpc?: string;
  method?: string;
  params?: unknown;
};

function printUsage(): void {
  console.error(`
General MCP Client
------------------

Usage:
  mcp run "<serverCommand>"

Examples:
  # Run against any MCP-compliant server
  echo '{"jsonrpc":"2.0","id":1,"method":"providers.list"}' |
    mcp run "node dist/server.js"

Environment Variables:
  MCP_DEBUG=1    Enables verbose debug output (framing, handshake, events)

Debug example:
  MCP_DEBUG=1 mcp run "node dist/server.js"

Compatible with:
  - Any MCP-compliant server implementation
  - The General MCP Server (reference implementation)

More documentation:
  https://dapo.run/mcp
`);
}

async function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => resolve(data));
  });
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    printUsage();
    return;
  }

  if (args[0] !== "run") {

    console.error(`Unknown command: ${args[0]}

  Usage:
    mcp run "<serverCommand>"

  More documentation:
    https://dapo.run/mcp
  `);
    process.exitCode = 1;
    return;
  }

  if (args.length < 2) {
    console.error(`Missing server command.

  Examples:
    mcp run "node dist/server.js"
    mcp run "./my-mcp-server"

  More documentation:
    https://dapo.run/mcp
  `);
    process.exitCode = 1;
    return;
  }

  const cmd = args[1].split(" ");
  const command = cmd[0];
  const cmdArgs = cmd.slice(1);

  const proc = new MCPProcess({
    command,
    args: cmdArgs
  });

  // optional debug logs
  proc.on("stderr", (msg) => process.stderr.write(String(msg)));

  if (process.env.MCP_DEBUG) {
    proc.on("exit", ({ code, signal }) => {
      process.stderr.write(
        `[CLIENT] Child process exit code=${code} signal=${String(signal)}\n`
      );
    });
    proc.on("error", (err) => {
      process.stderr.write(`[CLIENT] Child process error: ${String(err)}\n`);
    });
  }

  // staring server + handshake
  await proc.start();

  const stdinData = await readStdin();

  if (!stdinData.trim()) {
    if (process.env.MCP_DEBUG) {
      process.stderr.write("[CLIENT] No stdin data, nothing to send.\n");
    }
    await proc.close();
    return;
  }

  let payloads: MaybeJSONRPC[];

  // 1) trying by whole JSON
  try {
    const parsed = JSON.parse(stdinData) as MaybeJSONRPC | MaybeJSONRPC[];
    payloads = Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    // 2) trying by lines
    const lines = stdinData
      .split("\n")
      .map((x) => x.trim())
      .filter((x) => x.length > 0);

    payloads = lines.map((line) => JSON.parse(line) as MaybeJSONRPC);
  }

  try {
    for (const payload of payloads) {
      const base = payload;

      const isFullJsonRpc =
        base.id !== undefined &&
        typeof base.jsonrpc === "string" &&
        base.jsonrpc.length > 0;

      const req = isFullJsonRpc
        ? (base as unknown) // JSONRPCRequest match
        : createRequest(base.method ?? "", base.params);

      const response = await proc.send(req as never);

      process.stdout.write(
        JSON.stringify(response, null, 2) + "\n"
      );
    }
  } finally {
    await proc.close();
  }
}

main()
  .then(() => {
    // success here
    if (process.exitCode === undefined) {
      process.exitCode = 0;
    }
  })
  .catch((err) => {
    console.error(
      err instanceof Error ? err.message : String(err)
    );
    process.exitCode = 1;
  });
