import { invoke } from "@tauri-apps/api/core";
import type { PortEntry } from "./types";

export async function getListeningPorts(): Promise<PortEntry[]> {
  return invoke<PortEntry[]>("get_listening_ports");
}

export async function killProcess(pid: number, force: boolean): Promise<void> {
  return invoke("kill_process", { pid, force });
}

export function hidePopover(): Promise<void> {
  return invoke("hide_popover");
}
