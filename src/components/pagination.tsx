"use client";

export default function Pagination({
  page,
  pageCount,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}) {
  if (pageCount <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-between">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-40"
      >
        ← Previous
      </button>
      <span className="text-sm text-gray-500">
        Page {page} of {pageCount}
      </span>
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= pageCount}
        className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-40"
      >
        Next →
      </button>
    </div>
  );
}
