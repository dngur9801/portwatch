import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getListeningPorts, hidePopover, killProcess } from "./api";
import type { PortEntry, SortDir, SortKey } from "./types";
import { usePollInterval, useWindowActive } from "./hooks";
import { PortRow } from "./components/PortRow";
import { ConfirmDialog } from "./components/ConfirmDialog";

const POLL_OPTIONS = [1000, 2000, 3000, 5000, 10000];

export default function App() {
  const qc = useQueryClient();
  const active = useWindowActive();
  const [pollMs, setPollMs] = usePollInterval();

  const [search, setSearch] = useState("");
  const [rangeMin, setRangeMin] = useState("");
  const [rangeMax, setRangeMax] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("port");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [showSettings, setShowSettings] = useState(false);
  const [pending, setPending] = useState<{ entry: PortEntry; force: boolean } | null>(null);

  const { data, isLoading, isError, error, dataUpdatedAt, refetch, isFetching } =
    useQuery({
      queryKey: ["ports"],
      queryFn: getListeningPorts,
      // Poll only while the popover is visible (battery/CPU saving).
      refetchInterval: active ? pollMs : false,
    });

  const killMut = useMutation({
    mutationFn: ({ pid, force }: { pid: number; force: boolean }) =>
      killProcess(pid, force),
    onSettled: () => qc.invalidateQueries({ queryKey: ["ports"] }),
  });

  const filtered = useMemo(() => {
    let rows = data ?? [];
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (r) =>
          r.process.toLowerCase().includes(q) || String(r.port).includes(q)
      );
    }
    const min = Number(rangeMin);
    const max = Number(rangeMax);
    if (rangeMin && !Number.isNaN(min)) rows = rows.filter((r) => r.port >= min);
    if (rangeMax && !Number.isNaN(max)) rows = rows.filter((r) => r.port <= max);

    const dir = sortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      let cmp: number;
      if (sortKey === "process") cmp = a.process.localeCompare(b.process);
      else cmp = a[sortKey] - b[sortKey];
      return cmp * dir || a.port - b.port;
    });
  }, [data, search, rangeMin, rangeMax, sortKey, sortDir]);

  // Esc closes the confirm dialog if open, otherwise hides the popover.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (pending) setPending(null);
      else hidePopover();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pending]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const requestKill = (entry: PortEntry, force: boolean) => {
    if (entry.isSystem) setPending({ entry, force });
    else killMut.mutate({ pid: entry.pid, force });
  };

  const arrow = (key: SortKey) =>
    sortKey === key ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white/95 text-neutral-800 dark:bg-neutral-900/95 dark:text-neutral-100">
      {/* Header */}
      <header
        className="flex items-center gap-2 border-b border-neutral-200 px-3 py-2 dark:border-neutral-800"
        data-tauri-drag-region
      >
        <span className="text-sm font-semibold">PortWatch</span>
        <span className="rounded-full bg-neutral-100 px-1.5 text-[10px] font-medium text-neutral-500 dark:bg-neutral-800">
          {filtered.length}
        </span>
        <div className="flex-1" />
        <button
          title="새로고침"
          className={`text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 ${
            isFetching ? "animate-spin" : ""
          }`}
          onClick={() => refetch()}
        >
          ↻
        </button>
        <button
          title="설정"
          className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
          onClick={() => setShowSettings((s) => !s)}
        >
          ⚙
        </button>
      </header>

      {/* Filters */}
      <div className="flex items-center gap-1.5 border-b border-neutral-200 px-3 py-1.5 dark:border-neutral-800">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="포트/프로세스 검색"
          className="min-w-0 flex-1 rounded-md bg-neutral-100 px-2 py-1 text-xs outline-none placeholder:text-neutral-400 focus:ring-1 focus:ring-blue-400 dark:bg-neutral-800"
        />
        <input
          value={rangeMin}
          onChange={(e) => setRangeMin(e.target.value.replace(/\D/g, ""))}
          placeholder="min"
          className="w-12 rounded-md bg-neutral-100 px-1.5 py-1 text-center text-xs outline-none placeholder:text-neutral-400 focus:ring-1 focus:ring-blue-400 dark:bg-neutral-800"
        />
        <span className="text-[10px] text-neutral-400">–</span>
        <input
          value={rangeMax}
          onChange={(e) => setRangeMax(e.target.value.replace(/\D/g, ""))}
          placeholder="max"
          className="w-12 rounded-md bg-neutral-100 px-1.5 py-1 text-center text-xs outline-none placeholder:text-neutral-400 focus:ring-1 focus:ring-blue-400 dark:bg-neutral-800"
        />
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="flex items-center gap-2 border-b border-neutral-200 bg-neutral-50 px-3 py-2 text-xs dark:border-neutral-800 dark:bg-neutral-800/50">
          <span className="text-neutral-500">갱신 주기</span>
          <select
            value={pollMs}
            onChange={(e) => setPollMs(Number(e.target.value))}
            className="rounded-md bg-white px-1.5 py-1 text-xs dark:bg-neutral-700"
          >
            {POLL_OPTIONS.map((v) => (
              <option key={v} value={v}>
                {v / 1000}초
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Column header */}
      <div className="flex items-center gap-2 border-b border-neutral-200 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
        <button className="w-14 text-left hover:text-neutral-600" onClick={() => toggleSort("port")}>
          Port{arrow("port")}
        </button>
        <button className="flex-1 text-left hover:text-neutral-600" onClick={() => toggleSort("process")}>
          Process{arrow("process")}
        </button>
        <button className="w-[76px] text-right hover:text-neutral-600" onClick={() => toggleSort("pid")}>
          PID{arrow("pid")}
        </button>
      </div>

      {/* List */}
      <main className="scroll-thin flex-1 overflow-y-auto text-neutral-500">
        {isLoading && (
          <div className="p-6 text-center text-xs text-neutral-400">불러오는 중…</div>
        )}
        {isError && (
          <div className="p-6 text-center text-xs text-red-500">
            조회 실패: {String((error as Error)?.message ?? error)}
          </div>
        )}
        {!isLoading && !isError && filtered.length === 0 && (
          <div className="p-6 text-center text-xs text-neutral-400">
            리스닝 중인 포트가 없습니다
          </div>
        )}
        {filtered.map((entry) => (
          <PortRow
            key={`${entry.pid}-${entry.port}-${entry.address}`}
            entry={entry}
            killing={
              killMut.isPending && killMut.variables?.pid === entry.pid
            }
            onKill={(force) => requestKill(entry, force)}
          />
        ))}
      </main>

      {/* Footer */}
      <footer className="flex items-center justify-between border-t border-neutral-200 px-3 py-1 text-[10px] text-neutral-400 dark:border-neutral-800">
        <span>
          {dataUpdatedAt
            ? `업데이트 ${new Date(dataUpdatedAt).toLocaleTimeString()}`
            : "—"}
        </span>
        <span>{active ? `${pollMs / 1000}s 자동 갱신` : "일시정지"}</span>
      </footer>

      {killMut.isError && (
        <div className="border-t border-red-200 bg-red-50 px-3 py-1 text-[10px] text-red-600 dark:border-red-900 dark:bg-red-950/40">
          종료 실패: {String((killMut.error as Error)?.message)}
        </div>
      )}

      {pending && (
        <ConfirmDialog
          entry={pending.entry}
          onConfirm={() => {
            killMut.mutate({ pid: pending.entry.pid, force: pending.force });
            setPending(null);
          }}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  );
}
