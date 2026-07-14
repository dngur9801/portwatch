import { useState } from "react";
import type { PortEntry } from "../types";

interface Props {
  entry: PortEntry;
  killing: boolean;
  onKill: (force: boolean) => void;
}

export function PortRow({ entry, killing, onKill }: Props) {
  const [hover, setHover] = useState(false);

  return (
    <div
      className="group flex items-center gap-2 border-b border-neutral-100 px-3 py-1.5 text-xs hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800/60"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="w-14 shrink-0 font-mono font-semibold text-blue-600 dark:text-blue-400">
        {entry.port}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate font-medium text-neutral-800 dark:text-neutral-100">
            {entry.process}
          </span>
          {entry.isSystem && (
            <span className="shrink-0 rounded bg-amber-100 px-1 py-px text-[9px] font-semibold text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
              SYS
            </span>
          )}
        </div>
        <div className="truncate font-mono text-[10px] text-neutral-400">
          PID {entry.pid} · {entry.user} · {entry.address}
        </div>
      </div>

      <div className="flex w-[76px] shrink-0 justify-end gap-1">
        {hover && !killing && (
          <>
            <button
              title="SIGTERM (정상 종료)"
              className="rounded bg-neutral-200 px-2 py-0.5 text-[10px] font-semibold text-neutral-700 hover:bg-red-500 hover:text-white dark:bg-neutral-700 dark:text-neutral-200"
              onClick={() => onKill(false)}
            >
              kill
            </button>
            <button
              title="SIGKILL (강제 종료)"
              className="rounded bg-neutral-200 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-700 hover:bg-red-700 hover:text-white dark:bg-neutral-700 dark:text-neutral-200"
              onClick={() => onKill(true)}
            >
              -9
            </button>
          </>
        )}
        {killing && (
          <span className="text-[10px] text-neutral-400">종료 중…</span>
        )}
      </div>
    </div>
  );
}
