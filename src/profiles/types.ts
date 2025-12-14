export interface MCPClientProfile {
  id: string;
  description: string;

  /**
   * Default server command to run if the user does not provide one.
   * Example: "node ./node_modules/@mcp/server-web/dist/server.js"
   */
  defaultCommand: string;

  /**
   * Plugins to activate for this profile.
   * (forwarded to the server via config / env later)
   */
  plugins: MCPProfilePlugin[];
}

export interface MCPProfilePlugin {
  name: string;
  entry: string;
}
