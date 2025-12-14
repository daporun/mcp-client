import { webDevProfile } from "./web-dev.profile.js";
import { MCPClientProfile } from "./types.js";

const profiles = new Map<string, MCPClientProfile>([
  [webDevProfile.id, webDevProfile],
]);

export function getProfile(id: string): MCPClientProfile | undefined {
  return profiles.get(id);
}

export function listProfiles(): MCPClientProfile[] {
  return [...profiles.values()];
}
