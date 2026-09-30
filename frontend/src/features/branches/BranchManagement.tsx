import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Building2,
  MapPin,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Users,
  Search,
  RefreshCw,
  Award,
  Wallet,
  Landmark,
  Plus,
  Edit2,
  Trash2,
  X,
} from "lucide-react";
import {
  getBranchesSummary,
  createBranch,
  updateBranch,
  deleteBranch,
  type BranchesResponse,
  type BranchItem,
} from "../../api/reports";
import { formatCurrency } from "../../utils/format";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useToast } from "../../context/ToastContext";

export default function BranchManagement() {
  const { t, i18n } = useTranslation();
  const isKm = i18n.language === "km";
  useDocumentTitle(isKm ? "ការគ្រប់គ្រងបណ្តាញសាខា & តំបន់ប្រតិបត្តិការ" : "Multi-Branch & Provincial Network Management");
  const toast = useToast();

  const [data, setData] = useState<BranchesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // CRUD Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<BranchItem | null>(null);
  const [saving, setSaving] = useState(false);

  // Form Fields
  const [formCode, setFormCode] = useState("");
  const [formNameKm, setFormNameKm] = useState("");
  const [formNameEn, setFormNameEn] = useState("");
  const [formManager, setFormManager] = useState("");
  const [formTargetUsd, setFormTargetUsd] = useState("100000");
  const [formDrawerLimit, setFormDrawerLimit] = useState("15000");

  // Delete Confirm State
  const [deletingBranch, setDeletingBranch] = useState<BranchItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  function loadBranches() {
    setLoading(true);
    getBranchesSummary()
      .then(setData)
      .catch((err) => {
        console.error("Failed to load branches summary:", err);
        toast.error(isKm ? "បរាជ័យក្នុងការទាញយកទិន្នន័យសាខា" : "Failed to load branch data.");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadBranches();
  }, []);

  function openCreateModal() {
    setEditingBranch(null);
    setFormCode("");
    setFormNameKm("");
    setFormNameEn("");
    setFormManager("");
    setFormTargetUsd("100000");
    setFormDrawerLimit("15000");
    setModalOpen(true);
  }

  function openEditModal(branch: BranchItem) {
    setEditingBranch(branch);
    setFormCode(branch.branch_code);
    setFormNameKm(branch.name_km);
    setFormNameEn(branch.name_en);
    setFormManager(branch.branch_manager);
    setFormTargetUsd(String(branch.target_volume_usd || 100000));
    setFormDrawerLimit(String(branch.cash_drawer_limit_usd || 15000));
    setModalOpen(true);
  }

  async function handleSaveBranch(e: React.FormEvent) {
    e.preventDefault();
    if (!formCode.trim() || !formNameKm.trim()) {
      toast.error(isKm ? "សូមបញ្ចូលលេខកូដ និងឈ្មោះសាខា" : "Please provide branch code and name");
      return;
    }

    setSaving(true);
    try {
      if (editingBranch) {
        await updateBranch(editingBranch.branch_code, {
          name_km: formNameKm.trim(),
          name_en: formNameEn.trim() || formNameKm.trim(),
          branch_manager: formManager.trim(),
          target_volume_usd: parseFloat(formTargetUsd) || 100000,
          cash_drawer_limit_usd: parseFloat(formDrawerLimit) || 15000,
        });
        toast.success(isKm ? "បានធ្វើបច្ចុប្បន្នភាពសាខាជោគជ័យ" : "Branch updated successfully");
      } else {
        await createBranch({
          branch_code: formCode.trim().toUpperCase(),
          name_km: formNameKm.trim(),
          name_en: formNameEn.trim() || formNameKm.trim(),
          branch_manager: formManager.trim(),
          target_volume_usd: parseFloat(formTargetUsd) || 100000,
          cash_drawer_limit_usd: parseFloat(formDrawerLimit) || 15000,
        });
        toast.success(isKm ? "បានបង្កើតសាខាថ្មីជោគជ័យ" : "Branch created successfully");
      }
      setModalOpen(false);
      loadBranches();
    } catch (err: any) {
      const msg = err.response?.data?.detail || (isKm ? "បរាជ័យក្នុងការរក្សាទុកសាខា" : "Failed to save branch");
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteBranch() {
    if (!deletingBranch) return;
    setDeleting(true);
    try {
      await deleteBranch(deletingBranch.branch_code);
      toast.success(isKm ? "បានលុបសាខាជោគជ័យ" : "Branch deleted successfully");
      setDeletingBranch(null);
      loadBranches();
    } catch (err: any) {
      const msg = err.response?.data?.detail || (isKm ? "បរាជ័យក្នុងការលុបសាខា" : "Failed to delete branch");
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  }

  const filteredBranches = useMemo(() => {
    if (!data?.branches) return [];
    return data.branches.filter((b) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const codeMatch = b.branch_code.toLowerCase().includes(q);
        const kmMatch = b.name_km.toLowerCase().includes(q);
        const enMatch = b.name_en.toLowerCase().includes(q);
        const mgrMatch = b.branch_manager.toLowerCase().includes(q);
        if (!codeMatch && !kmMatch && !enMatch && !mgrMatch) return false;
      }
      return true;
    });
  }, [data, search]);

  const summary = useMemo(() => {
    if (!data?.branches) return { totalPortfolio: 0, totalOverdue: 0, totalLoans: 0 };
    let totalPortfolio = 0;
    let totalOverdue = 0;
    let totalLoans = 0;

    data.branches.forEach((b) => {
      totalPortfolio += b.portfolio_volume_usd;
      totalOverdue += b.overdue_volume_usd;
      totalLoans += b.active_loans_count;
    });

    return { totalPortfolio, totalOverdue, totalLoans };
  }, [data]);

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 4px", display: "flex", alignItems: "center", gap: 10 }}>
            <Building2 size={26} color="#0284c7" />
            {isKm ? "ការគ្រប់គ្រងបណ្តាញសាខា & តំបន់ប្រតិបត្តិការ" : "Multi-Branch & Provincial Network Management"}
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-muted)" }}>
            {isKm
              ? "តាមដាន និងគ្រប់គ្រងផលប័ត្រកម្ចី ការសម្រេចគោលដៅ និងកម្រិតហានិភ័យទូទាំងសាខារាជធានី-ខេត្ត"
              : "Monitor regional portfolio performance, target achievements, and cash limits across Cambodian branches"}
          </p>
        </div>

        <div className="page-actions" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            className="btn btn-sm"
            onClick={loadBranches}
            disabled={loading}
            style={{ borderRadius: 8, display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            {isKm ? "ផ្ទុកឡើងវិញ" : "Refresh"}
          </button>

          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={openCreateModal}
            style={{ borderRadius: 8, display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <Plus size={15} />
            {isKm ? "បន្ថែមសាខាថ្មី" : "Add Branch"}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        {/* Total Branches */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase" }}>
                {isKm ? "សាខាប្រតិបត្តិការសរុប" : "Total Active Branches"}
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>
                {data?.total_branches || 0}
              </div>
            </div>
            <div style={{ width: 38, height: 38, borderRadius: 8, background: "#f0f9ff", color: "#0284c7", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Landmark size={20} />
            </div>
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 6 }}>
            {isKm ? "រាជធានី និងបណ្តាខេត្តសំខាន់ៗ" : "Phnom Penh & Provinces"}
          </div>
        </div>

        {/* Total Portfolio */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase" }}>
                {isKm ? "ផលប័ត្រកម្ចីទូទាំងបណ្តាញ" : "Network Portfolio"}
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4, color: "#10b981" }}>
                {formatCurrency(summary.totalPortfolio, "USD")}
              </div>
            </div>
            <div style={{ width: 38, height: 38, borderRadius: 8, background: "#ecfdf5", color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <TrendingUp size={20} />
            </div>
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 6 }}>
            {summary.totalLoans} {isKm ? "កម្ចីសកម្ម" : "Active Loans"}
          </div>
        </div>

        {/* Delinquency */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#b91c1c", textTransform: "uppercase" }}>
                {isKm ? "ទំហំបំណុលហួសកំណត់" : "Network Overdue Balance"}
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4, color: "#ef4444" }}>
                {formatCurrency(summary.totalOverdue, "USD")}
              </div>
            </div>
            <div style={{ width: 38, height: 38, borderRadius: 8, background: "#fef2f2", color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <AlertTriangle size={20} />
            </div>
          </div>
          <div style={{ fontSize: 12, color: "#b91c1c", marginTop: 6 }}>
            {isKm ? "សន្ទស្សន៍ទូទាំងស្ថាប័ន" : "Total across all branches"}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="card" style={{ padding: 14, marginBottom: 20 }}>
        <div style={{ position: "relative", width: "100%", maxWidth: 420 }}>
          <Search size={15} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)" }} />
          <input
            type="text"
            className="input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isKm ? "ស្វែងរកសាខា តាមឈ្មោះ លេខកូដ ឬប្រធានសាខា..." : "Search branch by name, code, or manager..."}
            style={{ paddingLeft: 32, fontSize: 13, width: "100%", borderRadius: 8 }}
          />
        </div>
      </div>

      {/* Branch Cards Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
        {loading ? (
          <div className="card" style={{ padding: 40, textAlign: "center", gridColumn: "1 / -1" }}>
            <div className="skeleton skeleton-heading" style={{ margin: "0 auto 10px" }}></div>
            <div className="skeleton skeleton-text" style={{ maxWidth: 280, margin: "0 auto" }}></div>
          </div>
        ) : (
          filteredBranches.map((b) => (
            <div key={b.branch_code} className="card" style={{ padding: 20, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                {/* Branch Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          padding: "2px 8px",
                          borderRadius: 6,
                          background: "#eff6ff",
                          color: "#1d4ed8",
                        }}
                      >
                        {b.branch_code}
                      </span>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "2px 8px",
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 700,
                          background: b.status === "healthy" ? "#ecfdf5" : "#fef2f2",
                          color: b.status === "healthy" ? "#047857" : "#b91c1c",
                        }}
                      >
                        {b.status === "healthy" ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />}
                        <span>{b.status === "healthy" ? (isKm ? "ដំណើរការល្អ" : "Healthy") : (isKm ? "តាមដាន" : "Watch")}</span>
                      </span>
                    </div>

                    <h3 style={{ margin: "8px 0 2px", fontSize: 16, fontWeight: 700 }}>
                      {isKm ? b.name_km : b.name_en}
                    </h3>
                    <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                      {isKm ? "ប្រធានសាខា៖ " : "Manager: "}{b.branch_manager || (isKm ? "មិនទាន់កំណត់" : "Unassigned")}
                    </div>
                  </div>

                  {/* Actions: Edit & Delete */}
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      onClick={() => openEditModal(b)}
                      title={isKm ? "កែសម្រួលសាខា" : "Edit Branch"}
                      style={{ padding: "4px 8px", borderRadius: 6, color: "var(--color-text-muted)" }}
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      onClick={() => setDeletingBranch(b)}
                      title={isKm ? "លុបសាខា" : "Delete Branch"}
                      style={{ padding: "4px 8px", borderRadius: 6, color: "#ef4444" }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Metrics Grid */}
                <div style={{ background: "var(--color-bg-secondary)", borderRadius: 10, padding: 12, margin: "14px 0", fontSize: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ color: "var(--color-text-muted)" }}>{isKm ? "ផលប័ត្រកម្ចីសកម្ម៖" : "Portfolio Volume:"}</span>
                    <strong style={{ fontSize: 14 }}>{formatCurrency(b.portfolio_volume_usd, "USD")}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ color: "var(--color-text-muted)" }}>{isKm ? "ចំនួនកម្ចីសកម្ម៖" : "Active Loans:"}</span>
                    <strong style={{ color: "#3b82f6" }}>{b.active_loans_count} {isKm ? "កម្ចី" : "loans"}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--color-text-muted)" }}>{isKm ? "អនុបាតឥណទានមានហានិភ័យ៖" : "PAR > 30d:"}</span>
                    <strong style={{ color: b.par_rate_percent > 5 ? "#ef4444" : "#10b981" }}>
                      {b.par_rate_percent}%
                    </strong>
                  </div>
                </div>

                {/* Target Progress Bar */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                    <span style={{ color: "var(--color-text-muted)" }}>{isKm ? "ការសម្រេចគោលដៅបញ្ចេញកម្ចី៖" : "Target Achievement:"}</span>
                    <strong>{b.target_achievement_percent}%</strong>
                  </div>
                  <div style={{ height: 6, background: "var(--color-border)", borderRadius: 3, overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${Math.min(100, b.target_achievement_percent)}%`,
                        height: "100%",
                        background: b.target_achievement_percent >= 100 ? "#10b981" : "#3b82f6",
                        borderRadius: 3,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Cash Limit */}
              <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: 10, display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--color-text-muted)" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <Wallet size={12} />
                  <span>{isKm ? "ដែនកំណត់សាច់ប្រាក់បេឡា៖" : "Drawer Cash Limit:"}</span>
                </span>
                <strong style={{ color: "var(--color-text-primary)" }}>{formatCurrency(b.cash_drawer_limit_usd, "USD")}</strong>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create / Edit Branch Modal */}
      {modalOpen && (
        <div
          className="modal-backdrop"
          onClick={() => setModalOpen(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1050,
            padding: 20,
          }}
        >
          <div
            className="card"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 500,
              padding: 0,
              borderRadius: 16,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f0f9ff" }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#0369a1", display: "flex", alignItems: "center", gap: 8 }}>
                <Building2 size={18} />
                {editingBranch
                  ? (isKm ? "កែសម្រួលព័ត៌មានសាខា" : "Edit Branch Details")
                  : (isKm ? "បង្កើតសាខាថ្មី" : "Create New Branch")}
              </h3>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setModalOpen(false)}
                style={{ borderRadius: "50%", width: 32, height: 32, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveBranch} style={{ padding: 24 }}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                  {isKm ? "លេខកូដសាខា" : "Branch Code"}
                </label>
                <input
                  type="text"
                  className="input"
                  required
                  disabled={Boolean(editingBranch)}
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  placeholder={isKm ? "ឧ. BR-KPC, BR-SR" : "e.g. BR-KPC, BR-SR"}
                  style={{ width: "100%", padding: 8, fontSize: 13, borderRadius: 6, textTransform: "uppercase" }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                  {isKm ? "ឈ្មោះសាខា (ភាសាខ្មែរ)" : "Branch Name (Khmer)"}
                </label>
                <input
                  type="text"
                  className="input"
                  required
                  value={formNameKm}
                  onChange={(e) => setFormNameKm(e.target.value)}
                  placeholder={isKm ? "ឧ. សាខាខេត្តកំពង់ឆ្នាំង" : "e.g. សាខាខេត្តកំពង់ឆ្នាំង"}
                  style={{ width: "100%", padding: 8, fontSize: 13, borderRadius: 6 }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                  {isKm ? "ឈ្មោះសាខា (ភាសាអង់គ្លេស)" : "Branch Name (English)"}
                </label>
                <input
                  type="text"
                  className="input"
                  value={formNameEn}
                  onChange={(e) => setFormNameEn(e.target.value)}
                  placeholder={isKm ? "ឧ. Kampong Chhnang Provincial Branch" : "e.g. Kampong Chhnang Provincial Branch"}
                  style={{ width: "100%", padding: 8, fontSize: 13, borderRadius: 6 }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                  {isKm ? "ឈ្មោះប្រធានសាខា" : "Branch Manager"}
                </label>
                <input
                  type="text"
                  className="input"
                  value={formManager}
                  onChange={(e) => setFormManager(e.target.value)}
                  placeholder={isKm ? "ឧ. លោក សុខ ចិន្តា" : "e.g. Mr. Sok Chenda"}
                  style={{ width: "100%", padding: 8, fontSize: 13, borderRadius: 6 }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                    {isKm ? "គោលដៅកម្ចី ($ USD)" : "Target Volume ($ USD)"}
                  </label>
                  <input
                    type="number"
                    step="1000"
                    className="input"
                    value={formTargetUsd}
                    onChange={(e) => setFormTargetUsd(e.target.value)}
                    style={{ width: "100%", padding: 8, fontSize: 13, borderRadius: 6 }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                    {isKm ? "ដែនកំណត់បេឡា ($ USD)" : "Drawer Cash Limit ($ USD)"}
                  </label>
                  <input
                    type="number"
                    step="500"
                    className="input"
                    value={formDrawerLimit}
                    onChange={(e) => setFormDrawerLimit(e.target.value)}
                    style={{ width: "100%", padding: 8, fontSize: 13, borderRadius: 6 }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                  style={{ borderRadius: 8 }}
                >
                  {isKm ? "បោះបង់" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                  style={{ borderRadius: 8 }}
                >
                  {saving
                    ? (isKm ? "កំពុងរក្សាទុក..." : "Saving...")
                    : (isKm ? "រក្សាទុក" : "Save Branch")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingBranch && (
        <div
          className="modal-backdrop"
          onClick={() => setDeletingBranch(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1050,
            padding: 20,
          }}
        >
          <div
            className="card"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 420,
              padding: 24,
              borderRadius: 16,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              textAlign: "center",
            }}
          >
            <div style={{ width: 50, height: 50, borderRadius: "50%", background: "#fef2f2", color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <AlertTriangle size={24} />
            </div>
            <h3 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700 }}>
              {isKm ? "តើអ្នកប្រាកដជាចង់លុបសាខានេះមែនទេ?" : "Are you sure you want to delete this branch?"}
            </h3>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: "var(--color-text-muted)" }}>
              <strong>{deletingBranch.branch_code}</strong> - {isKm ? deletingBranch.name_km : deletingBranch.name_en}
            </p>

            <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
              <button
                type="button"
                className="btn"
                onClick={() => setDeletingBranch(null)}
                disabled={deleting}
                style={{ borderRadius: 8 }}
              >
                {isKm ? "បោះបង់" : "Cancel"}
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDeleteBranch}
                disabled={deleting}
                style={{ borderRadius: 8, background: "#ef4444", color: "#fff", border: "none" }}
              >
                {deleting ? (isKm ? "កំពុងលុប..." : "Deleting...") : (isKm ? "យល់ព្រមលុប" : "Delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
