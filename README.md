# mcp-client-general

A general-purpose, streaming-friendly MCP (Model Context Protocol) client for Node.js.

[![npm version](https://img.shields.io/npm/v/mcp-client-general.svg)](https://npmjs.com/package/mcp-client-general)
![npm downloads](https://img.shields.io/npm/dm/mcp-client-general.svg)
![license](https://img.shields.io/badge/license-MIT-blue.svg)
![node version](https://img.shields.io/node/v/mcp-client-general.svg)

- Spawns an MCP-compatible server as a child process  
- Speaks JSON-RPC 2.0 over stdin / stdout  
- Ignores fragile `Content-Length` headers and uses a robust JSON object scanner  
- Supports multiple requests per process (piped line-by-line)  
- CLI + programmatic TypeScript API  

> This package is designed to be a generic, open-source MCP client.  
> It works with any MCP-compliant server implementation, including  
> **mcp-server-general** – a production-ready, plugin-driven MCP server:  
> https://github.com/daporun/mcp-server-general

---

## Features

- **Zero-config profiles** – run built-in MCP stacks without manual wiring
- **Child process orchestration** – monitors stderr, exit, error
- **Handshake detection** – first valid JSON object = handshake
- **Framing-agnostic parsing** – safely ignores `Content-Length`
- **JSON-RPC 2.0 support** – id-based pending map, timeouts
- **CLI & Library** – usable from terminal or TypeScript

---

## Installation

```bash
npm install -g mcp-client-general
# or
npm install mcp-client-general --save-dev
```

---

## CLI Usage

### Run an MCP server
```bash
mcp run "node dist/server.js"
```

### Send a single JSON-RPC request
```bash
echo '{"jsonrpc":"2.0","id":1,"method":"providers.list"}' \
  | mcp run "node ../mcp-server-general/dist/server.js"
```

### Example output
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "providers": [
      {
        "provider": "openai",
        "model": "gpt-4o-mini"
      }
    ]
  }
}
```

---

### Multiple requests in a single run
```bash
printf '%s\n%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"providers.list"}' \
  '{"jsonrpc":"2.0","id":2,"method":"steps.list"}' \
  | mcp run "node ../mcp-server-general/dist/server.js"
```

### Example output
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": { "providers": [ /* ... */ ] }
}
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": { "steps": [ /* ... */ ] }
}
```

---

### Error handling (JSON-RPC native)

```bash
echo '{"jsonrpc":"2.0","id":3,"method":"scoring.schema"}' \
  | mcp run "node ../mcp-server-general/dist/server.js"
```

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "error": {
    "code": -32601,
    "message": "Method not found: scoring.schema"
  }
}
```

---

## Programmatic Usage (TypeScript)

This example shows how to launch and interact with an MCP server programmatically.

```ts
import { MCPProcess } from "mcp-client-general";
import type { JSONRPCRequest } from "mcp-client-general/jsonrpc";

async function main() {
  const proc = new MCPProcess({
    command: "node",
    args: ["../mcp-server-general/dist/server.js"],
    startupTimeoutMs: 4000,
    shutdownTimeoutMs: 3000
  });

  proc.on("stderr", (msg) => process.stderr.write(String(msg)));

  await proc.start();

  const req: JSONRPCRequest = {
    jsonrpc: "2.0",
    id: 1,
    method: "providers.list",
    params: {}
  };

  const response = await proc.send(req);
  console.log(JSON.stringify(response, null, 2));

  await proc.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

---

## Getting Started with a General MCP Server

To quickly try this client with a production-ready MCP server, see:

- **mcp-server-general**  
  A general-purpose, plugin-driven MCP server  
  https://github.com/daporun/mcp-server-general

## Design Notes

### Handshake detection
The first valid JSON object received from stdout is treated as the handshake.  
If the server delays or prints logs first, the client still proceeds safely.

### Framing strategy
Many servers emit:

```
Content-Length: 2888\r\n\r\n{ ... JSON ... }
```

But `Content-Length` is often wrong or mixed with logs.

This client instead:

- **ignores Content-Length**
- uses a **streaming JSON scanner**:
  - finds `{`
  - tracks nested `{` / `}`
  - handles JSON strings & escapes
  - extracts full JSON frames

Works even with imperfect/experimental MCP servers.

### Pending RPC requests
- Requests stored in `Map<id, PendingEntry>`
- Responses resolve Promises  
- Timeouts reject automatically  

---

## Environment Variables

Enable verbose debugging:

```bash
MCP_DEBUG=1 mcp run "node dist/server.js"
```

Shows:
- handshake detection  
- scan events  
- JSON parse errors  
- child process exits  
- forwarded stderr  

---

## Limitations

- Server must output valid JSON frames  
- First JSON object is always treated as handshake  
- JSON-like logs printed before handshake may be misinterpreted  

---

## License

MIT – see LICENSE.
