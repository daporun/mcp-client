import type { MCPClientProfile } from "./types.js";

export const webDevProfile: MCPClientProfile = {
  id: "web-dev",
  description: "Web development profile (HTTP, fetch, browser-like tools)",

  defaultCommand: "node ./node_modules/@mcp/server-web/dist/server.js",

  plugins: [
    {
      name: "web-tools",
      entry: "@mcp/plugin-web-tools",
    },
  ],
};
