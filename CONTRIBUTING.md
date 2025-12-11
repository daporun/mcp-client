# CONTRIBUTING.md

Thank you for your interest in contributing to **mcp-client**!
This project aims to provide a minimal, robust, streaming-friendly MCP (Model Context Protocol) client for Node.js.

---

## How to Contribute

### 1. Reporting Issues
Please open an issue on GitHub if you encounter:
- parsing errors
- compatibility issues with MCP-style servers
- unexpected behavior in CLI or programmatic usage
- documentation mistakes or missing information

Include logs with `MCP_DEBUG=1` whenever possible.

---

## 2. Submitting Pull Requests

### Branching
- Fork the repository
- Create a new branch from `main`:
  - `feature/<name>`
  - `fix/<name>`
  - `docs/<name>`

### Code Style
- Use TypeScript strict mode (`noImplicitAny`).
- Do **not** introduce `any` types.
- Keep comments clear, short, and high-signal.
- Error messages must be actionable.

### Testing
Before submitting a PR, test with:

```
echo '{"jsonrpc":"2.0","id":1,"method":"providers.list"}' |
  mcp run "<your-server>"
```

Test multiple-requests mode:

```
printf '%s
%s
'   '{"jsonrpc":"2.0","id":1,"method":"providers.list"}'   '{"jsonrpc":"2.0","id":2,"method":"steps.list"}' |
  mcp run "<your-server>"
```

If you are adding features:
- provide new examples or test scripts
- ensure backward compatibility with existing behavior

---

## 3. Commit Messages

Follow conventional commits when possible:

- `feat:` new functionality  
- `fix:` bug fix  
- `docs:` documentation  
- `refactor:` internal improvements  
- `test:` test-related changes  
- `chore:` maintenance tasks  

Example:
```
feat: add optional handshake timeout override
```

---

## 4. Code of Conduct

Be respectful, constructive, and collaborative.  
Low-signal or hostile communication is not acceptable.

---

## 5. License

All contributions are licensed under **MIT**.

Thank you for making the MCP ecosystem better!