import { useEffect, useState, useMemo, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import {
  Users,
  Search,
  Trash2,
  Pencil,
  X,
  Plus,
  LayoutGrid,
  List as ListIcon,
  Download,
  Phone,
  CreditCard,
  Calendar,
  Sparkles,
  ShieldCheck,
  Landmark,
  UserCheck,
} from "lucide-react";
import { createClient, deleteClient, listClients, updateClient } from "../../api/clients";
import type { Client } from "../../api/types";
import { usePermission } from "../../hooks/usePermission";
import { useToast } from "../../context/ToastContext";
import { useConfirm } from "../../context/ConfirmContext";
import { formatDate } from "../../utils/format";
import Pagination from "../../components/ui/Pagination";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import LoanForm from "../loans/LoanForm";

export default function ClientList() {
  useDocumentTitle("Clients");
  const { t } = useTranslation();
  const toast = useToast();
  const confirm = useConfirm();

  const canCreate = usePermission("clients.create");
  const canDelete = usePermission("clients.delete");
  const canEdit = usePermission("clients.create"); // reuses create permission

  const [clients, setClients] = useState<Client[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // Form input states
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Loan modal for this specific client
  const [loanForClient, setLoanForClient] = useState<Client | null>(null);

  // View Mode: Cards vs Table
  const [viewMode, setViewMode] = useState<"table" | "cards">(() => {
    try {
      return (localStorage.getItem("smartloan_client_view") as "table" | "cards") || "cards";
    } catch {
      return "cards";
    }
  });

  function toggleViewMode(mode: "table" | "cards") {
    setViewMode(mode);
    try {
      localStorage.setItem("smartloan_client_view", mode);
    } catch {}
  }

  function load(p: number, q: string) {
    setLoading(true);
    listClients(p, q)
      .then((res) => {
        setClients(res.items);
        setTotal(res.total);
        setPageSize(res.page_size);
        setPage(res.page);
      })
      .catch(() => toast.error("Failed to fetch clients."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load(1, search);
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => load(1, search), 300);
    return () => clearTimeout(handle);
  }, [search]);

  useEffect(() => {
    if (!showForm) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") resetForm();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showForm]);

  function resetForm() {
    setName("");
    setPhone("");
    setNationalId("");
    setShowForm(false);
    setEditingClient(null);
    setError(null);
  }

  function startEdit(client: Client) {
    setEditingClient(client);
    setName(client.current_name);
    setPhone(client.phone || "");
    setNationalId(client.national_id || "");
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (editingClient) {
        await updateClient(editingClient.id, {
          current_name: name,
          phone: phone || undefined,
          national_id: nationalId || undefined,
        });
        toast.success(`Client profile for "${name}" has been updated.`, {
          title: "Profile Updated",
        });
      } else {
        await createClient({
          current_name: name,
          phone: phone || undefined,
          national_id: nationalId || undefined,
        });
        toast.success(`Client "${name}" has been registered successfully.`, {
          title: "Client Registered",
        });
      }
      resetForm();
      load(page, search);
    } catch (err: any) {
      const detail =
        err?.response?.data?.detail ||
        (editingClient ? "Failed to update client." : "Failed to register client.");
      setError(detail);
      toast.error(detail, { title: "Error" });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(client: Client) {
    const ok = await confirm({
      title: `Remove ${client.current_name}?`,
      message:
        "This soft-deletes the client from active directories while preserving all associated financial records and history.",
      confirmLabel: "Remove Client",
      danger: true,
    });
    if (!ok) return;

    try {
      await deleteClient(client.id);
      toast.success(`${client.current_name} was removed from the client registry.`, {
        title: "Client Removed",
      });
      load(page, search);
    } catch {
      toast.error("Failed to remove client.", { title: "Removal Failed" });
    }
  }

  function exportCSV() {
    if (clients.length === 0) {
      toast.warning("No client records to export.");
      return;
    }
    const headers = ["Client ID", "Name", "Phone", "National ID", "Created At"];
    const rows = clients.map((c) => [
      c.id,
      `"${c.current_name.replace(/"/g, '""')}"`,
      `"${c.phone || ""}"`,
      `"${c.national_id || ""}"`,
      c.created_at,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `clients-export-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${clients.length} clients to CSV.`);
  }

  // Initials for avatar
  const previewInitials = useMemo(() => {
    if (!name.trim()) return "CL";
    return name
      .trim()
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }, [name]);

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>{t("nav.clients")}</h1>
          <div className="page-subtitle">{t("clients.subtitle")}</div>
        </div>
        <div className="page-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={exportCSV}
            title="Export clients to CSV"
          >
            <Download size={15} />
            <span>{t("common.exportCsv")}</span>
          </button>
          {canCreate && (
            <button
              className="btn btn-primary"
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
            >
              <Plus size={16} />
              <span>{t("clients.addClient")}</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="stats-summary-strip">
        <div className="stats-summary-pill">
          <div
            className="stats-summary-icon"
            style={{ background: "rgba(99, 102, 241, 0.12)", color: "var(--color-accent)" }}
          >
            <Users size={18} />
          </div>
          <div className="stats-summary-meta">
            <span className="stats-summary-label">{t("clients.totalClients")}</span>
            <span className="stats-summary-num">{total}</span>
          </div>
        </div>
        <div className="stats-summary-pill">
          <div
            className="stats-summary-icon"
            style={{ background: "rgba(16, 185, 129, 0.12)", color: "var(--color-success)" }}
          >
            <ShieldCheck size={18} />
          </div>
          <div className="stats-summary-meta">
            <span className="stats-summary-label">{t("clients.idVerified")}</span>
            <span className="stats-summary-num">
              {clients.filter((c) => Boolean(c.national_id)).length}
            </span>
          </div>
        </div>
        <div className="stats-summary-pill">
          <div
            className="stats-summary-icon"
            style={{ background: "rgba(245, 158, 11, 0.12)", color: "var(--color-warning)" }}
          >
            <Phone size={18} />
          </div>
          <div className="stats-summary-meta">
            <span className="stats-summary-label">{t("clients.phoneLinked")}</span>
            <span className="stats-summary-num">
              {clients.filter((c) => Boolean(c.phone)).length}
            </span>
          </div>
        </div>
      </div>

      {/* Modal for Creating Loan directly for a specific client */}
      {loanForClient && (
        <LoanForm
          initialClientId={loanForClient.id}
          onCreated={() => {
            setLoanForClient(null);
            toast.success(`Loan successfully scheduled for ${loanForClient.current_name}!`);
          }}
          onCancel={() => setLoanForClient(null)}
        />
      )}

      {/* Alert Modal Form for Create / Edit Client */}
      {showForm && (
        <div className="no-print modal-backdrop" onClick={resetForm}>
          <div
            className="modal-box"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 480,
              background: "var(--color-surface)",
              borderRadius: "14px",
              boxShadow: "0 20px 45px -10px rgba(0, 0, 0, 0.25)",
              border: "1px solid var(--color-border)",
            }}
          >
            {/* Modal Header Banner */}
            <div
              className="modal-header-banner"
              style={{
                background: "var(--color-surface)",
                borderBottom: "1px solid var(--color-border)",
                padding: "20px 24px 16px",
              }}
            >
              <div
                className="modal-header-badge"
                style={{
                  backgroundColor: "var(--color-surface-sunken)",
                  color: "var(--color-accent)",
                  borderRadius: "10px",
                }}
              >
                {editingClient ? <Pencil size={20} /> : <UserCheck size={20} />}
              </div>
              <div className="modal-header-text">
                <h2 className="modal-header-title">
                  {editingClient ? `${t("clients.editClient")}: ${editingClient.current_name}` : t("clients.registerClient")}
                </h2>
                <p className="modal-header-desc">
                  {editingClient ? t("clients.editCardDesc") : t("clients.createCardDesc")}
                </p>
              </div>
              <button
                type="button"
                className="btn-icon"
                onClick={resetForm}
                aria-label="Close"
                style={{ marginTop: -4, marginRight: -4, borderRadius: "8px" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="modal-body-scroll" style={{ background: "var(--color-surface)", padding: "20px 24px" }}>
              <form id="client-form" onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    {t("common.name")} <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder={t("clients.namePlaceholder")}
                    style={{ borderRadius: "8px", border: "1px solid var(--color-border)" }}
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>{t("common.phone")}</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={t("clients.phonePlaceholder")}
                    style={{ borderRadius: "8px", border: "1px solid var(--color-border)" }}
                  />
                  <span className="form-help">{t("clients.phoneHelp")}</span>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>{t("clients.nationalId")}</label>
                  <input
                    type="text"
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    placeholder={t("clients.idPlaceholder")}
                    style={{ borderRadius: "8px", border: "1px solid var(--color-border)" }}
                  />
                </div>

                {error && (
                  <div
                    style={{
                      color: "var(--color-danger)",
                      fontSize: 13,
                      padding: "10px 14px",
                      background: "var(--color-danger-soft)",
                      borderRadius: "8px",
                      border: "1px solid var(--color-danger)",
                    }}
                  >
                    {error}
                  </div>
                )}
              </form>
            </div>

            {/* Modal Footer Bar */}
            <div
              className="modal-footer-bar"
              style={{
                background: "var(--color-surface-sunken)",
                borderTop: "1px solid var(--color-border)",
                padding: "14px 24px 16px",
              }}
            >
              <button
                type="button"
                className="btn"
                onClick={resetForm}
                style={{ minWidth: 90, borderRadius: "8px" }}
              >
                {t("common.cancel")}
              </button>
              <button
                type="submit"
                form="client-form"
                className="btn btn-primary"
                disabled={submitting || !name.trim()}
                style={{ minWidth: 120, borderRadius: "8px" }}
              >
                {submitting ? t("common.loading") : (editingClient ? t("common.save") : t("clients.registerClient"))}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar: Search & View Toggle */}
      <div className="toolbar" style={{ justifyContent: "space-between" }}>
        <div className="search-input-wrapper" style={{ flex: 1, maxWidth: 380 }}>
          <Search size={16} />
          <input
            type="search"
            placeholder={t("clients.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
                cursor: "pointer",
                color: "var(--color-text-muted)",
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* View Switcher */}
        <div className="view-mode-toggle">
          <button
            type="button"
            className={`view-mode-btn${viewMode === "cards" ? " active" : ""}`}
            onClick={() => toggleViewMode("cards")}
          >
            <LayoutGrid size={14} />
            <span>Cards</span>
          </button>
          <button
            type="button"
            className={`view-mode-btn${viewMode === "table" ? " active" : ""}`}
            onClick={() => toggleViewMode("table")}
          >
            <ListIcon size={14} />
            <span>Table</span>
          </button>
        </div>
      </div>

      {/* Main View: Cards vs Table */}
      {viewMode === "cards" ? (
        <div>
          {loading ? (
            <div className="entity-card-grid">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="entity-card">
                  <div className="skeleton" style={{ height: 40, width: "70%", marginBottom: 12 }} />
                  <div className="skeleton" style={{ height: 20, width: "90%", marginBottom: 12 }} />
                  <div className="skeleton" style={{ height: 50, width: "100%", marginBottom: 16 }} />
                  <div className="skeleton" style={{ height: 32, width: "100%" }} />
                </div>
              ))}
            </div>
          ) : clients.length === 0 ? (
            <div className="card">
              <div className="table-empty">
                <Users size={36} className="table-empty-icon" />
                <div className="table-empty-text">
                  {search
                    ? "No clients match your search query."
                    : "No borrowers in registry yet -- add your first client."}
                </div>
                {canCreate && !showForm && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    style={{ marginTop: 8 }}
                    onClick={() => setShowForm(true)}
                  >
                    <Plus size={14} /> Add First Client
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="entity-card-grid">
              {clients.map((c) => {
                const initials = c.current_name
                  .split(/\s+/)
                  .map((w) => w[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2);

                return (
                  <div key={c.id} className="entity-card">
                    {/* Top Row: Avatar + Name + Joined */}
                    <div className="entity-card-top">
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div
                          style={{
                            width: 42,
                            height: 42,
                            borderRadius: "50%",
                            background: "linear-gradient(135deg, var(--color-accent), #4f46e5)",
                            color: "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 700,
                            fontSize: 15,
                            flexShrink: 0,
                          }}
                        >
                          {initials}
                        </div>
                        <div>
                          <div className="entity-card-title">{c.current_name}</div>
                          <div className="entity-card-sub">Member since {formatDate(c.created_at)}</div>
                        </div>
                      </div>
                    </div>

                    {/* Metrics Box: Phone and National ID */}
                    <div className="entity-card-metrics">
                      <div className="entity-metric-item">
                        <span className="entity-metric-label">Phone</span>
                        <span className="entity-metric-value num" style={{ fontSize: 13 }}>
                          {c.phone || "—"}
                        </span>
                      </div>
                      <div className="entity-metric-item">
                        <span className="entity-metric-label">National ID</span>
                        <span className="entity-metric-value num" style={{ fontSize: 13 }}>
                          {c.national_id || "—"}
                        </span>
                      </div>
                    </div>

                    {/* Footer Actions: New Loan, Edit, Delete */}
                    <div className="entity-card-actions">
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost"
                        onClick={() => setLoanForClient(c)}
                        title="Create a loan for this borrower"
                        style={{ color: "var(--color-accent)", fontWeight: 600 }}
                      >
                        <Landmark size={14} />
                        <span>New Loan</span>
                      </button>

                      <div style={{ display: "flex", gap: 4 }}>
                        {canEdit && (
                          <button
                            type="button"
                            className="btn-icon"
                            onClick={() => startEdit(c)}
                            title="Edit Client"
                          >
                            <Pencil size={15} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            className="btn-icon"
                            onClick={() => handleDelete(c)}
                            title="Remove Client"
                            style={{ color: "var(--color-danger)" }}
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Table View */
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Borrower Name</th>
                <th>{t("common.phone")}</th>
                <th>National ID</th>
                <th>Registered Date</th>
                <th style={{ textAlign: "right", minWidth: 120 }}>{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} style={{ color: "var(--color-text-muted)", padding: 24, textAlign: "center" }}>
                    {t("common.loading")}
                  </td>
                </tr>
              )}
              {!loading &&
                clients.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>{c.current_name}</td>
                    <td className="num">{c.phone || "—"}</td>
                    <td className="num">{c.national_id || "—"}</td>
                    <td className="num">{formatDate(c.created_at)}</td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: 6 }}>
                        <button
                          type="button"
                          className="btn btn-xs btn-ghost"
                          onClick={() => setLoanForClient(c)}
                          title="New Loan"
                          style={{ color: "var(--color-accent)" }}
                        >
                          <Landmark size={13} /> Loan
                        </button>
                        {canEdit && (
                          <button
                            className="btn-icon"
                            onClick={() => startEdit(c)}
                            aria-label="Edit client"
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            className="btn-icon"
                            onClick={() => handleDelete(c)}
                            aria-label="Remove client"
                            title="Remove"
                            style={{ color: "var(--color-danger)" }}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              {!loading && clients.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <div className="table-empty">
                      <Users size={32} className="table-empty-icon" />
                      <div className="table-empty-text">
                        {search ? "No clients match your search." : "No clients yet -- add your first one."}
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <Pagination
        page={page}
        totalPages={Math.ceil(total / pageSize) || 1}
        onChange={(p) => load(p, search)}
      />
    </div>
  );
}
