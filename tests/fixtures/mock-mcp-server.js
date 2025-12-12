#!/usr/bin/env node
// A minimal test MCP server that prints a handshake and replies to one method.

function send(obj) {
  const body = JSON.stringify(obj);
  process.stdout.write(`Content-Length: ${body.length}\r\n\r\n${body}`);
}

// Immediately send handshake
send({
  name: "Mock MCP Server",
  version: "0.1.0",
  capabilities: { providers: true },
  metadata: {}
});

// Listen for incoming JSON-RPC requests
let buffer = "";

process.stdin.on("data", chunk => {
  buffer += chunk.toString();

  const idx = buffer.indexOf("{");
  const end = buffer.lastIndexOf("}");
  if (idx === -1 || end === -1 || end <= idx) return;

  const json = buffer.slice(idx, end + 1);
  buffer = "";

  let req;
  try {
    req = JSON.parse(json);
  } catch {
    return;
  }

  // Only support providers.list
  if (req.method === "providers.list") {
    send({
      jsonrpc: "2.0",
      id: req.id,
      result: {
        providers: [{ provider: "mock", model: "test" }]
      }
    });
  }
});
