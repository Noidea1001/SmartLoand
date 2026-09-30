import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  History,
  ShieldCheck,
  Search,
  Download,
  RefreshCw,
  Eye,
  X,
  User,
  Activity,
  Calendar,
  Layers,
  FileText,
  Copy,
  Check,
  Clock,
} from "lucide-react";
import {
  listActivity,
  exportActivityLogCsv,
  type ActivityLogResponse,
  type TimeRangeOption,
} from "../../api/activityLog";
import type { ActivityLogEntry } from "../../api/types";
import { formatDateTime } from "../../utils/format";
import Pagination from "../../components/ui/Pagination";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useToast } from "../../context/ToastContext";

export default function ActivityLog() {
  const { i18n } = useTranslation();
  const isKm = i18n.language === "km";
  useDocumentTitle(isKm ? "ប្រវត្តិកំណត់ហេតុកិច្ចសកម្មភាព & សវនកម្ម" : "System Activity & Audit Trail");
  const toast = useToast();

  const [entries, setEntries] = useState<ActivityLogEntry[]>([]);
  const [metrics, setMetrics] = useState<{ total_events: number; today_events: number; active_actors: number } | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(30);
  const [loading, setLoading] = useState(true);

  // Time Range Filter: day | week | month | year | all
  const [timeRange, setTimeRange] = useState<TimeRangeOption>("all");

  // Entity Category Filter
  const [selectedEntity, setSelectedEntity] = useState<string>("all");

  // Search input with real-time debouncing
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Modal inspection
  const [selectedLog, setSelectedLog] = useState<ActivityLogEntry | null>(null);
  const [copied, setCopied] = useState(false);

  // Debounce search input for real-time live filtering without clicking button
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 250);
    return () => clearTimeout(handler);
  }, [search]);

  function loadData(p = page, entity = selectedEntity, range = timeRange, q = debouncedSearch) {
    setLoading(true);
    listActivity({
      page: p,
      page_size: pageSize,
      entity_type: entity === "all" ? undefined : entity,
      time_range: range,
      q: q.trim() || undefined,
    })
      .then((res) => {
        setEntries(res.items);
        setTotal(res.total);
        setPageSize(res.page_size);
        setPage(res.page);
        if (res.metrics) {
          setMetrics(res.metrics);
        }
      })
      .catch((err) => {
        console.error("Failed to load activity logs:", err);
        toast.error(isKm ? "បរាជ័យក្នុងការទាញយកកំណត់ហេតុ" : "Failed to load activity logs.");
      })
      .finally(() => setLoading(false));
  }

  // Trigger real-time search whenever entity, timeRange, or debouncedSearch changes
  useEffect(() => {
    loadData(1, selectedEntity, timeRange, debouncedSearch);
  }, [selectedEntity, timeRange, debouncedSearch]);

  async function handleExportCsv() {
    try {
      const blob = await exportActivityLogCsv(
        selectedEntity === "all" ? undefined : selectedEntity,
        timeRange
      );
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `System_Audit_Trail_${timeRange}_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success(isKm ? "បានទាញយកឯកសារសវនកម្ម CSV ជោគជ័យ" : "Audit trail CSV exported successfully.");
    } catch {
      toast.error(isKm ? "បរាជ័យក្នុងការទាញយកឯកសារ" : "Failed to export CSV.");
    }
  }

  function handleCopyJson() {
    if (!selectedLog) return;
    const jsonStr = JSON.stringify(selectedLog, null, 2);
    navigator.clipboard.writeText(jsonStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success(isKm ? "បានចម្លងទិន្នន័យ JSON ទៅក្ដារតម្បៀតខ្ទាស់" : "JSON payload copied to clipboard.");
  }

  function getEntityColor(entity: string) {
    const e = entity.toLowerCase();
    if (e.includes("loan")) return { bg: "rgba(59, 130, 246, 0.15)", text: "#3b82f6" };
    if (e.includes("payment") || e.includes("repay")) return { bg: "rgba(16, 185, 129, 0.15)", text: "#10b981" };
    if (e.includes("eod")) return { bg: "rgba(245, 158, 11, 0.15)", text: "#f59e0b" };
    if (e.includes("user") || e.includes("auth") || e.includes("role")) return { bg: "rgba(139, 92, 246, 0.15)", text: "#8b5cf6" };
    if (e.includes("setting")) return { bg: "rgba(236, 72, 153, 0.15)", text: "#ec4899" };
    return { bg: "var(--color-surface-sunken)", text: "var(--color-text-muted)" };
  }

  const TIME_RANGES: { key: TimeRangeOption; km: string; en: string }[] = [
    { key: "all", km: "គ្រប់ពេល", en: "All Time" },
    { key: "day", km: "ថ្ងៃនេះ", en: "Today" },
    { key: "week", km: "សប្តាហ៍នេះ", en: "This Week" },
    { key: "month", km: "ខែនេះ", en: "This Month" },
    { key: "year", km: "ឆ្នាំនេះ", en: "This Year" },
  ];

  const ENTITY_TABS = [
    { key: "all", km: "ទាំងអស់", en: "All Logs" },
    { key: "loan", km: "កម្ចី", en: "Loans" },
    { key: "payment", km: "ការទូទាត់", en: "Repayments" },
    { key: "eod_batch", km: "បិទបញ្ជី EOD", en: "EOD Batch" },
    { key: "user", km: "អ្នកប្រើប្រាស់", en: "Users" },
    { key: "settings", km: "ការកំណត់", en: "Settings" },
  ];

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1400, margin: "0 auto" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "var(--color-accent-soft)",
                color: "var(--color-accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <History size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "var(--color-text)" }}>
                {isKm ? "ប្រវត្តិកំណត់ហេតុកិច្ចសកម្មភាព & សវនកម្មប្រព័ន្ធ" : "System Activity & Compliance Audit Trail"}
              </h1>
              <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-muted)" }}>
                {isKm
                  ? "ការកត់ត្រារាល់ប្រតិបត្តិការហិរញ្ញវត្ថុ ការអនុម័ត និងការកែប្រែទិន្នន័យដោយមិនអាចលុបបាន (Immutable Audit Feed)"
                  : "Immutable regulatory audit trail logging loan approvals, repayments, batch runs, and system administration events"}
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => loadData(page, selectedEntity, timeRange, debouncedSearch)}
            className="btn btn-secondary"
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            <span>{isKm ? "ផ្ទុកឡើងវិញ" : "Refresh"}</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="btn btn-primary"
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <Download size={15} />
            <span>{isKm ? "ទាញយកកំណត់ហេតុ CSV" : "Export Audit CSV"}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div className="card" style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: "var(--color-text-muted)", fontWeight: 500 }}>
              {isKm ? "កំណត់ហេតុសរុប (Total Events)" : "Total Audit Events"}
            </span>
            <Activity size={18} style={{ color: "var(--color-accent)" }} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "var(--color-text)" }}>
            {(metrics?.total_events ?? total).toLocaleString()}
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 }}>
            {isKm ? "កត់ត្រាជាប់ក្នុងប្រព័ន្ធជានិច្ច" : "Persisted and tamper-evident"}
          </div>
        </div>

        <div className="card" style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: "var(--color-text-muted)", fontWeight: 500 }}>
              {isKm ? "សកម្មភាពថ្ងៃនេះ (Today)" : "Events Recorded Today"}
            </span>
            <Calendar size={18} style={{ color: "var(--color-success)" }} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "var(--color-success)" }}>
            {(metrics?.today_events ?? 0).toLocaleString()}
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 }}>
            {isKm ? "គិតចាប់ពីម៉ោង 00:00 មក" : "Since 00:00 midnight"}
          </div>
        </div>

        <div className="card" style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: "var(--color-text-muted)", fontWeight: 500 }}>
              {isKm ? "អ្នកប្រតិបត្តិការសកម្ម (Active Actors)" : "Active Operators"}
            </span>
            <User size={18} style={{ color: "#3b82f6" }} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "var(--color-text)" }}>
            {(metrics?.active_actors ?? 1).toLocaleString()}
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 }}>
            {isKm ? "មន្ត្រី និងប្រព័ន្ធស្វ័យប្រវត្តិ" : "Staff and automated batch"}
          </div>
        </div>

        <div className="card" style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: "var(--color-text-muted)", fontWeight: 500 }}>
              {isKm ? "ស្ថានភាពអនុលោមភាពសវនកម្ម" : "Audit Compliance Standard"}
            </span>
            <ShieldCheck size={18} style={{ color: "var(--color-accent)" }} />
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--color-accent)" }}>
            NBC / ISO 27001
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 }}>
            {isKm ? "រក្សាទុកកំណត់ត្រា ១០ ឆ្នាំ" : "10-Year regulatory retention"}
          </div>
        </div>
      </div>

      {/* Filter and Table Container */}
      <div className="card" style={{ padding: "20px 24px" }}>
        {/* Controls Bar: Real-time Search + Time Range Selector + Entity Tabs */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 18 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            {/* Real-time Search Input (No button needed) */}
            <div style={{ position: "relative", width: "100%", maxWidth: 380 }}>
              <Search
                size={16}
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--color-text-muted)",
                  pointerEvents: "none",
                }}
              />
              <input
                type="text"
                placeholder={isKm ? "ស្វែងរកភ្លាមៗ (សកម្មភាព, អ្នកធ្វើ, ID)..." : "Search in real time (action, actor, ID)..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input"
                style={{
                  width: "100%",
                  paddingLeft: 36,
                  paddingRight: search ? 34 : 12,
                  fontSize: 13.5,
                }}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "var(--color-text-muted)",
                    cursor: "pointer",
                    padding: 2,
                  }}
                  title={isKm ? "សម្អាត" : "Clear search"}
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Time Range Filter: Day / Week / Month / Year / All */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Clock size={15} style={{ color: "var(--color-text-muted)" }} />
              <div
                style={{
                  display: "flex",
                  background: "var(--color-surface-sunken)",
                  borderRadius: 8,
                  padding: 3,
                  border: "1px solid var(--color-border)",
                }}
              >
                {TIME_RANGES.map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => setTimeRange(r.key)}
                    style={{
                      padding: "5px 12px",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      border: "none",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      background: timeRange === r.key ? "var(--color-accent)" : "transparent",
                      color: timeRange === r.key ? "#ffffff" : "var(--color-text-muted)",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {isKm ? r.km : r.en}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Entity Category Filter Tabs & Result Count */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
              borderTop: "1px solid var(--color-border)",
              paddingTop: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                background: "var(--color-surface-sunken)",
                borderRadius: 8,
                padding: 3,
                border: "1px solid var(--color-border)",
                overflowX: "auto",
              }}
            >
              {ENTITY_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setSelectedEntity(tab.key)}
                  style={{
                    padding: "5px 12px",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    border: "none",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    background: selectedEntity === tab.key ? "var(--color-accent)" : "transparent",
                    color: selectedEntity === tab.key ? "#ffffff" : "var(--color-text-muted)",
                    transition: "all 0.15s ease",
                  }}
                >
                  {isKm ? tab.km : tab.en}
                </button>
              ))}
            </div>

            <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
              {isKm ? `បង្ហាញ ${entries.length} នៃ ${total} កំណត់ហេតុ` : `Showing ${entries.length} of ${total} events`}
            </div>
          </div>
        </div>

        {/* Audit Table */}
        <div style={{ overflowX: "auto" }}>
          <table className="table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th style={{ width: 180 }}>{isKm ? "កាលបរិច្ឆេទ & ម៉ោង" : "Timestamp"}</th>
                <th style={{ width: 180 }}>{isKm ? "អ្នកប្រតិបត្តិការ" : "Actor / Operator"}</th>
                <th>{isKm ? "សកម្មភាពដែលបានអនុវត្ត" : "Action Performed"}</th>
                <th style={{ width: 140 }}>{isKm ? "ប្រភេទអង្គភាព" : "Entity Category"}</th>
                <th style={{ width: 140 }}>{isKm ? "លេខសម្គាល់អង្គភាព" : "Entity Reference"}</th>
                <th style={{ textAlign: "right", width: 90 }}>{isKm ? "លម្អិត" : "Details"}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "36px 0", color: "var(--color-text-muted)" }}>
                    <RefreshCw size={22} className="animate-spin" style={{ margin: "0 auto 8px" }} />
                    <div>{isKm ? "កំពុងស្វែងរកទិន្នន័យផ្ទាល់..." : "Searching audit events in real time..."}</div>
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "36px 0", color: "var(--color-text-muted)" }}>
                    {isKm ? "មិនមានកំណត់ហេតុកិច្ចសកម្មភាពនៅក្នុងលក្ខខណ្ឌនេះទេ" : "No audit trail records found matching criteria."}
                  </td>
                </tr>
              ) : (
                entries.map((e) => {
                  const tagColor = getEntityColor(e.entity_type);
                  return (
                    <tr key={e.id}>
                      <td style={{ fontSize: 12.5, whiteSpace: "nowrap", fontFamily: "var(--font-mono, monospace)" }}>
                        {formatDateTime(e.created_at)}
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: 12,
                              background: "var(--color-surface-sunken)",
                              border: "1px solid var(--color-border)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 10,
                              fontWeight: 700,
                              color: "var(--color-accent)",
                            }}
                          >
                            {(e.actor_name || "S").slice(0, 1).toUpperCase()}
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)" }}>
                            {e.actor_name || "System Operator"}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text)" }}>
                          {e.action}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: 11.5,
                            fontWeight: 600,
                            padding: "3px 8px",
                            borderRadius: 6,
                            background: tagColor.bg,
                            color: tagColor.text,
                            textTransform: "capitalize",
                          }}
                        >
                          {e.entity_type.replace("_", " ")}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, fontFamily: "var(--font-mono, monospace)", color: "var(--color-text-muted)" }}>
                        {e.entity_id ? e.entity_id.slice(0, 8).toUpperCase() : "-"}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          onClick={() => setSelectedLog(e)}
                          className="btn btn-secondary"
                          style={{ padding: "4px 8px", fontSize: 12 }}
                          title={isKm ? "មើលទិន្នន័យលម្អិត" : "Inspect payload"}
                        >
                          <Eye size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ marginTop: 16 }}>
          <Pagination
            page={page}
            totalPages={Math.ceil(total / pageSize) || 1}
            onChange={(newPage) => loadData(newPage, selectedEntity, timeRange, debouncedSearch)}
          />
        </div>
      </div>

      {/* Modal: Inspect Audit Log Metadata */}
      {selectedLog && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: 620,
              padding: 24,
              borderRadius: 14,
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--color-text)" }}>
                  {isKm ? "ព័ត៌មានលម្អិតសវនកម្ម (Audit Event Payload)" : "Audit Event Inspection"}
                </h3>
                <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 }}>
                  ID: {selectedLog.id}
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                style={{ background: "none", border: "none", color: "var(--color-text-muted)", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: "var(--color-surface-sunken)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{isKm ? "កាលបរិច្ឆេទ" : "Timestamp"}</div>
                <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{formatDateTime(selectedLog.created_at)}</div>
              </div>

              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: "var(--color-surface-sunken)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{isKm ? "អ្នកប្រតិបត្តិការ" : "Actor"}</div>
                <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{selectedLog.actor_name || "System Operator"}</div>
              </div>

              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: "var(--color-surface-sunken)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{isKm ? "ប្រភេទអង្គភាព" : "Entity Type"}</div>
                <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2, textTransform: "capitalize" }}>
                  {selectedLog.entity_type}
                </div>
              </div>

              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: "var(--color-surface-sunken)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{isKm ? "លេខសម្គាល់អង្គភាព" : "Entity ID"}</div>
                <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{selectedLog.entity_id}</div>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--color-text)" }}>
                  {isKm ? "ទិន្នន័យ Payload (JSON Metadata)" : "JSON Metadata & Parameters"}
                </span>
                <button
                  type="button"
                  onClick={handleCopyJson}
                  className="btn btn-secondary"
                  style={{ fontSize: 11, padding: "3px 8px", display: "flex", alignItems: "center", gap: 4 }}
                >
                  {copied ? <Check size={12} color="var(--color-success)" /> : <Copy size={12} />}
                  <span>{copied ? (isKm ? "បានចម្លង" : "Copied") : (isKm ? "ចម្លង JSON" : "Copy JSON")}</span>
                </button>
              </div>

              <pre
                style={{
                  background: "var(--color-surface-sunken)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  padding: 14,
                  fontSize: 12,
                  fontFamily: "var(--font-mono, monospace)",
                  maxHeight: 220,
                  overflowY: "auto",
                  color: "var(--color-text)",
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                {JSON.stringify(selectedLog, null, 2)}
              </pre>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setSelectedLog(null)} className="btn btn-secondary">
                {isKm ? "បិទ" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
