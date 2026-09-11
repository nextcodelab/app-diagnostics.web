import type { info } from "node:console";

// --- Types ---
export interface RawLog {
  id: string;
  timestamp: string;
  app_name: string;
  app_name_log: string;
  platform: string;
  level: string;
  type: string;
  message: string;
  stack_trace: string;
  device: string;
  os_version: string;
  app_version: string;
  user: string;
  session_id: string;
  tag: string;
  duration: number;
  info: string;
}





