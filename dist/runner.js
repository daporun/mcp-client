// src/runner.ts
import { spawn } from "node:child_process";
import { EventEmitter, once } from "node:events";
/**
 * MCPProcess
 * - Spawns the provider server
 * - Handles Content-Length framed JSON RPC
 * - Waits for handshake before allowing requests
 */
export class MCPProcess extends EventEmitter {
    proc = null;
    opts;
    startupTimeout;
    shutdownTimeout;
    closed = false;
    pending = new Map();
    handshakeEmitted = false;
    constructor(opts) {
        super();
        this.opts = opts;
        this.startupTimeout = opts.startupTimeoutMs ?? 4000;
        this.shutdownTimeout = opts.shutdownTimeoutMs ?? 3000;
    }
    // ---------------------------------------------------------------------
    // START
    // ---------------------------------------------------------------------
    async start() {
        if (this.proc) {
            throw new Error("Process already running.");
        }
        const { command, args = [], cwd, env } = this.opts;
        this.proc = spawn(command, args, {
            cwd,
            env,
            stdio: ["pipe", "pipe", "pipe"]
        });
        const spawned = this.proc;
        this.closed = false;
        this.attachRouter();
        spawned.stderr.on("data", (chunk) => {
            this.emit("stderr", chunk.toString());
        });
        spawned.on("exit", (code, signal) => {
            this.closed = true;
            this.emit("exit", { code, signal });
            for (const [id, entry] of this.pending.entries()) {
                clearTimeout(entry.timer);
                entry.reject(new Error(`Process exited before response ${id}`));
            }
            this.pending.clear();
        });
        spawned.on("error", (err) => this.emit("error", err));
        // waiting for handshake but handling the timeout
        try {
            await Promise.race([
                this.waitForHandshake(),
                this.timeout(this.startupTimeout, "Handshake timeout")
            ]);
        }
        catch (err) {
            if (process.env.MCP_DEBUG) {
                this.emit("stderr", `[CLIENT] Handshake wait failed (continuing anyway): ${err instanceof Error ? err.message : String(err)}\n`);
            }
        }
        return { pid: spawned.pid };
    }
    // ---------------------------------------------------------------------
    // SEND REQUEST
    // ---------------------------------------------------------------------
    send(req, timeoutMs = 5000) {
        const proc = this.proc;
        if (!proc || this.closed) {
            return Promise.reject(new Error("Process not running."));
        }
        const id = req.id;
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pending.delete(id);
                reject(new Error(`Request ${id} timed out after ${timeoutMs}ms`));
            }, timeoutMs);
            this.pending.set(id, { resolve, reject, timer });
            try {
                const body = JSON.stringify(req);
                const header = `Content-Length: ${Buffer.byteLength(body, "utf8")}\r\n\r\n`;
                proc.stdin.write(header + body, "utf8");
            }
            catch (err) {
                clearTimeout(timer);
                this.pending.delete(id);
                reject(new Error(`Failed to write request ${id}: ${err.message}`));
            }
        });
    }
    // ---------------------------------------------------------------------
    // CLOSE
    // ---------------------------------------------------------------------
    async close() {
        if (this.closed || !this.proc)
            return;
        this.closed = true;
        // Reject all pending
        for (const [id, entry] of this.pending.entries()) {
            clearTimeout(entry.timer);
            entry.reject(new Error(`Process closed before response ${id}`));
        }
        this.pending.clear();
        const p = this.proc;
        try {
            p.kill("SIGTERM");
        }
        catch {
            // ignore
        }
        try {
            await Promise.race([
                once(p, "exit"),
                this.timeout(this.shutdownTimeout, "Shutdown timeout")
            ]);
        }
        catch {
            try {
                p.kill("SIGKILL");
            }
            catch {
                // ignore
            }
            await once(p, "exit");
        }
    }
    // ---------------------------------------------------------------------
    // ROUTER – streaming JSON object scanner (ignores Content-Length)
    // ---------------------------------------------------------------------
    attachRouter() {
        if (!this.proc)
            return;
        let buffer = "";
        this.proc.stdout.on("data", (chunk) => {
            buffer += chunk.toString("utf8");
            parseLoop: while (true) {
                // Find first '{' – skip logs, headers, etc.
                const start = buffer.indexOf("{");
                if (start === -1) {
                    // no JSON start yet, wait for more data
                    return;
                }
                let depth = 0;
                let inString = false;
                let escape = false;
                let end = -1;
                // Scan forward and find matching '}' that closes the outermost object
                for (let i = start; i < buffer.length; i++) {
                    const ch = buffer[i];
                    if (escape) {
                        // current char is escaped, just skip
                        escape = false;
                        continue;
                    }
                    if (ch === "\\") {
                        if (inString) {
                            escape = true;
                        }
                        continue;
                    }
                    if (ch === "\"") {
                        inString = !inString;
                        continue;
                    }
                    if (!inString) {
                        if (ch === "{") {
                            depth++;
                        }
                        else if (ch === "}") {
                            depth--;
                            if (depth === 0) {
                                end = i;
                                break;
                            }
                        }
                    }
                }
                // If depth != 0, JSON is incomplete; wait for more data
                if (depth !== 0 || end === -1) {
                    return;
                }
                const jsonStr = buffer.slice(start, end + 1);
                // Drop everything up to the end of this JSON object
                buffer = buffer.slice(end + 1);
                let msg;
                try {
                    msg = JSON.parse(jsonStr);
                }
                catch (err) {
                    this.emit("stderr", `Invalid JSON from server (scanner): ${err.message}\n`);
                    // Try to continue from the next possible JSON in the buffer
                    continue parseLoop;
                }
                // First successfully parsed JSON -> treat as handshake
                if (!this.handshakeEmitted) {
                    this.handshakeEmitted = true;
                    if (process.env.MCP_DEBUG) {
                        this.emit("stderr", "[CLIENT] First JSON object parsed, treating as handshake\n");
                    }
                    this.emit("handshake", msg);
                    // Do not treat this as a normal RPC response
                    continue parseLoop;
                }
                // Normal RPC response from here on
                this.emit("rpc-response", msg);
                const maybeId = msg.id;
                if (maybeId != null && this.pending.has(Number(maybeId))) {
                    const entry = this.pending.get(Number(maybeId));
                    clearTimeout(entry.timer);
                    this.pending.delete(Number(maybeId));
                    entry.resolve(msg);
                }
                // loop to see if another JSON object is already in buffer
            }
        });
    }
    // ---------------------------------------------------------------------
    // WAIT FOR HANDSHAKE EVENT
    // ---------------------------------------------------------------------
    waitForHandshake() {
        return new Promise((resolve) => this.once("handshake", () => resolve()));
    }
    timeout(ms, message) {
        return new Promise((_resolve, reject) => {
            const t = setTimeout(() => {
                clearTimeout(t);
                reject(new Error(message));
            }, ms);
        });
    }
}
