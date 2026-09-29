export default function Pagination({
  page, totalPages, onChange,
}: { page: number; totalPages: number; onChange: (page: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 16, alignItems: "center" }}>
      <button className="btn" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Prev
      </button>
      <span style={{ fontSize: 13, color: "var(--color-text-muted)", fontWeight: 500 }}>
        Page {page} of {totalPages}
      </span>
      <button className="btn" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        Next
      </button>
    </div>
  );
}
