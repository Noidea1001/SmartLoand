import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { History } from "lucide-react";
import { listActivity } from "../../api/activityLog";
import type { ActivityLogEntry } from "../../api/types";
import { formatDateTime } from "../../utils/format";
import Pagination from "../../components/ui/Pagination";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";

export default function ActivityLog() {
  useDocumentTitle("Activity Log");
  const { t } = useTranslation();
  const [entries, setEntries] = useState<ActivityLogEntry[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(30);
  const [loading, setLoading] = useState(true);

  function load(p: number) {
    setLoading(true);
    listActivity(p).then((res) => {
      setEntries(res.items);
      setTotal(res.total);
      setPageSize(res.page_size);
      setPage(res.page);
    }).finally(() => setLoading(false));
  }

  useEffect(() => { load(1); }, []);

  return (
    <div>
      <div className="page-header">
        <h1>{t("nav.activityLog")}</h1>
      </div>

      <div className="card">
        <table>
          <thead><tr><th>{t("common.date")}</th><th>Action</th><th>Entity</th></tr></thead>
          <tbody>
            {loading && (
              <tr><td colSpan={3} style={{ color: "var(--color-text-muted)" }}>{t("common.loading")}</td></tr>
            )}
            {!loading && entries.map((e) => (
              <tr key={e.id}>
                <td className="num" style={{ whiteSpace: "nowrap" }}>{formatDateTime(e.created_at)}</td>
                <td style={{ fontWeight: 500 }}>{e.action}</td>
                <td style={{ fontSize: 12, color: "var(--color-text-muted)", textTransform: "capitalize" }}>{e.entity_type}</td>
              </tr>
            ))}
            {!loading && entries.length === 0 && (
              <tr>
                <td colSpan={3} style={{ padding: 40, textAlign: "center" }}>
                  <History size={28} color="var(--color-text-muted)" style={{ marginBottom: 8 }} />
                  <div style={{ color: "var(--color-text-muted)", fontSize: 13 }}>Nothing has happened yet.</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={Math.ceil(total / pageSize) || 1} onChange={load} />
    </div>
  );
}
