import type { PortEntry } from "../types";

interface Props {
  entry: PortEntry;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ entry, onConfirm, onCancel }: Props) {
  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-[1px]"
      onClick={onCancel}
    >
      <div
        className="mx-4 w-full max-w-[300px] rounded-xl bg-white p-4 shadow-xl dark:bg-neutral-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center gap-2 text-amber-600 dark:text-amber-400">
          <span className="text-lg">⚠️</span>
          <h2 className="text-sm font-semibold">시스템 프로세스일 수 있습니다</h2>
        </div>
        <p className="mb-3 text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">
          <span className="font-mono font-medium">{entry.process}</span> (PID{" "}
          {entry.pid}, {entry.user})를 종료하면 시스템 동작에 영향을 줄 수
          있습니다. 계속하시겠습니까?
        </p>
        <div className="flex justify-end gap-2">
          <button
            className="rounded-md px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700"
            onClick={onCancel}
          >
            취소
          </button>
          <button
            className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
            onClick={onConfirm}
          >
            종료
          </button>
        </div>
      </div>
    </div>
  );
}
