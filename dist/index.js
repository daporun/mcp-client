#!/usr/bin/env node
// src/index.ts
import { MCPProcess } from "./runner.js";
import { createRequest } from "./jsonrpc.js";
import { getProfile } from "./profiles/index.js";
function printUsage() {
    console.error(`
General MCP Client
------------------

Usage:
  mcp run "<serverCommand>"
  mcp run --profile web-dev

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
async function readStdin() {
    return new Promise((resolve) => {
        let data = "";
        process.stdin.setEncoding("utf8");
        process.stdin.on("data", (chunk) => {
            data += chunk;
        });
        process.stdin.on("end", () => resolve(data));
    });
}
async function main() {
    const args = process.argv.slice(2);
    if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
        printUsage();
        return;
    }
    let profileId;
    // very simple flag parsing (no dependency)
    for (let i = 0; i < args.length; i++) {
        if (args[i] === "--profile") {
            if (!args[i + 1]) {
                console.error("--profile requires a value");
                process.exitCode = 1;
                return;
            }
            profileId = args[i + 1];
            args.splice(i, 2);
            break;
        }
    }
    if (args[0] !== "run") {
        console.error(`Unknown command: ${args[0]}

  Usage:
    mcp run "node dist/server.js"
    mcp run --profile web-dev

  More documentation:
    https://dapo.run/mcp
  `);
        process.exitCode = 1;
        return;
    }
    let serverCommand;
    if (args.length >= 2) {
        serverCommand = args[1];
    }
    else if (profileId) {
        const profile = getProfile(profileId);
        if (!profile) {
            console.error(`Unknown profile: ${profileId}`);
            process.exitCode = 1;
            return;
        }
        serverCommand =
            process.env.MCP_PROFILE_SERVER ??
                profile.defaultCommand;
    }
    else {
        console.error(`Missing server command.

  Examples:
    mcp run "node dist/server.js"
    mcp run --profile web-dev

  More documentation:
    https://dapo.run/mcp    
  `);
        process.exitCode = 1;
        return;
    }
    const cmd = serverCommand.split(" ");
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
            process.stderr.write(`[CLIENT] Child process exit code=${code} signal=${String(signal)}\n`);
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
    let payloads;
    // 1) trying by whole JSON
    try {
        const parsed = JSON.parse(stdinData);
        payloads = Array.isArray(parsed) ? parsed : [parsed];
    }
    catch {
        // 2) trying by lines
        const lines = stdinData
            .split("\n")
            .map((x) => x.trim())
            .filter((x) => x.length > 0);
        payloads = lines.map((line) => JSON.parse(line));
    }
    try {
        for (const payload of payloads) {
            const base = payload;
            const isFullJsonRpc = base.id !== undefined &&
                typeof base.jsonrpc === "string" &&
                base.jsonrpc.length > 0;
            const req = isFullJsonRpc
                ? base // JSONRPCRequest match
                : createRequest(base.method ?? "", base.params);
            const response = await proc.send(req);
            process.stdout.write(JSON.stringify(response, null, 2) + "\n");
        }
    }
    finally {
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
    console.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
});
