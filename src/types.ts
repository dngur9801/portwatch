export interface PortEntry {
  port: number;
  pid: number;
  process: string;
  user: string;
  protocol: string;
  address: string;
  ipVersion: string;
  isSystem: boolean;
}

export type SortKey = "port" | "process" | "pid";
export type SortDir = "asc" | "desc";

export interface Settings {
  pollIntervalMs: number;
}
