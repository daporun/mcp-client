#!/usr/bin/env sh
cd ../mcp-server-general || exit 1
exec node dist/server.js
