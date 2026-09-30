import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import {
  QrCode,
  Users,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  ExternalLink,
  Phone,
  Copy,
  Download,
  Printer,
  ChevronRight,
  UserCheck,
  X,
  FileCheck,
} from "lucide-react";
import {
  getLoanIntakeLeads,
  updateLeadStatus,
  type LeadsResponse,
  type LoanLeadItem,
} from "../../api/reports";
import { formatCurrency } from "../../utils/format";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useToast } from "../../context/ToastContext";

export default function LoanIntakeLeads() {
  const { i18n } = useTranslation();
  const isKm = i18n.language === "km";
  useDocumentTitle(isKm ? "ទទួលពាក្យកម្ចីអនឡាញ & QR" : "Online Loan Intake & Leads");
  const toast = useToast();
  const navigate = useNavigate();

  const [data, setData] = useState<LeadsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showQrModal, setShowQrModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<LoanLeadItem | null>(null);

  // Edit lead modal state
  const [editStatus, setEditStatus] = useState<string>("new");
  const [editOfficer, setEditOfficer] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [savingLead, setSavingLead] = useState(false);

  const publicApplyUrl = `${window.location.origin}/apply`;

  function loadLeads() {
    setLoading(true);
    getLoanIntakeLeads()
      .then(setData)
      .catch((err) => {
        console.error("Failed to load leads:", err);
        toast.error(isKm ? "បរាជ័យក្នុងការទាញយកបញ្ជីពាក្យស្នើសុំ" : "Failed to load intake leads.");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadLeads();
  }, []);

  function handleCopyLink() {
    navigator.clipboard.writeText(publicApplyUrl);
    toast.success(isKm ? "បានចម្លងតំណភ្ជាប់ពាក្យស្នើសុំសាធារណៈ!" : "Public apply link copied to clipboard!");
  }

  async function handleSaveLead(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedLead) return;
    setSavingLead(true);
    try {
      await updateLeadStatus(selectedLead.id, {
        status: editStatus,
        assigned_officer: editOfficer,
        notes: editNotes,
      });
      toast.success(isKm ? "បានកែប្រែស្ថានភាពពាក្យស្នើសុំជោគជ័យ" : "Lead status updated successfully.");
      setSelectedLead(null);
      loadLeads();
    } catch {
      toast.error(isKm ? "បរាជ័យក្នុងការកែប្រែ" : "Failed to update lead.");
    } finally {
      setSavingLead(false);
    }
  }

  const filteredLeads = useMemo(() => {
    if (!data) return [];
    return data.leads.filter((l) => {
      const matchesStatus = statusFilter === "all" || l.status === statusFilter;
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        l.full_name.toLowerCase().includes(q) ||
        l.id.toLowerCase().includes(q) ||
        l.phone.includes(q) ||
        (l.province && l.province.toLowerCase().includes(q));
      return matchesStatus && matchesSearch;
    });
  }, [data, statusFilter, search]);

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
                background: "rgba(16, 185, 129, 0.15)",
                color: "#10b981",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <QrCode size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "var(--color-text)" }}>
                {isKm ? "ប្រព័ន្ធទទួលពាក្យកម្ចីអនឡាញ & QR (Online Loan Intake & Leads)" : "Customer Online Loan Intake & QR Leads Portal"}
              </h1>
              <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-muted)" }}>
                {isKm
                  ? "គ្រប់គ្រងពាក្យស្នើសុំកម្ចីបឋមដែលអតិថិជនស្កេន QR កូដ ឬដាក់ពាក្យតាមគេហទំព័រសាធារណៈ"
                  : "Manage incoming pre-qualification loan requests captured via branch QR codes or public application web portal"}
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => setShowQrModal(true)}
            className="btn btn-secondary"
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <QrCode size={15} />
            <span>{isKm ? "បង្ហាញ QR កូដសាខា" : "Branch QR Stand"}</span>
          </button>
          <button
            onClick={loadLeads}
            className="btn btn-secondary"
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            <span>{isKm ? "ផ្ទុកឡើងវិញ" : "Refresh"}</span>
          </button>
          <a
            href={publicApplyUrl}
            target="_blank"
            rel="noreferrer"
            className="btn btn-primary"
            style={{ display: "flex", alignItems: "center", gap: 6, textDecoration: "none" }}
          >
            <ExternalLink size={15} />
            <span>{isKm ? "ទំព័រស្នើសុំសាធារណៈ" : "Public Apply Portal"}</span>
          </a>
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
              {isKm ? "ពាក្យស្នើសុំសរុប (Total Leads)" : "Total Online Leads"}
            </span>
            <Users size={18} style={{ color: "var(--color-accent)" }} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "var(--color-text)" }}>
            {data ? `${data.summary.total_leads} ${isKm ? "ពាក្យ" : "leads"}` : "..."}
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 }}>
            {isKm ? "ប្រភព: QR កូដ និងគេហទំព័រ" : "Source: Branch QR & Website"}
          </div>
        </div>

        <div className="card" style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: "var(--color-text-muted)", fontWeight: 500 }}>
              {isKm ? "ពាក្យថ្មីមិនទាន់ពិនិត្យ" : "New Submissions"}
            </span>
            <Clock size={18} style={{ color: "var(--color-warning)" }} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "var(--color-warning)" }}>
            {data ? `${data.summary.new_count} ${isKm ? "ពាក្យ" : "new"}` : "..."}
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 }}>
            {isKm ? "ត្រូវការការទាក់ទងបឋម" : "Requires initial callback"}
          </div>
        </div>

        <div className="card" style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: "var(--color-text-muted)", fontWeight: 500 }}>
              {isKm ? "បានទាក់ទង / កំពុងវាយតម្លៃ" : "Contacted & Reviewing"}
            </span>
            <Phone size={18} style={{ color: "#3b82f6" }} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#3b82f6" }}>
            {data ? `${data.summary.contacted_count + data.summary.under_review_count} ${isKm ? "ពាក្យ" : "leads"}` : "..."}
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 }}>
            {isKm ? "កំពុងណាត់ជួបវាយតម្លៃទ្រព្យ" : "Appraisal in progress"}
          </div>
        </div>

        <div className="card" style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: "var(--color-text-muted)", fontWeight: 500 }}>
              {isKm ? "បំប្លែងជាកម្ចីជោគជ័យ" : "Converted to Loans"}
            </span>
            <CheckCircle2 size={18} style={{ color: "var(--color-success)" }} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "var(--color-success)" }}>
            {data ? `${data.summary.converted_count} ${isKm ? "កម្ចី" : "loans"}` : "..."}
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 }}>
            {isKm ? "បានក្លាយជាកម្ចីសកម្មក្នុងប្រព័ន្ធ" : "Approved and active"}
          </div>
        </div>
      </div>

      {/* Filter and Table */}
      <div className="card" style={{ padding: "20px 24px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 260 }}>
            <input
              type="text"
              placeholder={isKm ? "ស្វែងរកតាមឈ្មោះ ទូរស័ព្ទ ខេត្ត ឬលេខកូដ..." : "Search by name, phone, province, ID..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input"
              style={{ width: "100%", maxWidth: 360 }}
            />
            <div
              style={{
                display: "flex",
                background: "var(--color-surface-sunken)",
                borderRadius: 8,
                padding: 3,
                border: "1px solid var(--color-border)",
              }}
            >
              {[
                { key: "all", labelKm: "ទាំងអស់", labelEn: "All" },
                { key: "new", labelKm: "ថ្មី", labelEn: "New" },
                { key: "contacted", labelKm: "បានទាក់ទង", labelEn: "Contacted" },
                { key: "under_review", labelKm: "កំពុងពិនិត្យ", labelEn: "Reviewing" },
                { key: "converted", labelKm: "បំប្លែងជាកម្ចី", labelEn: "Converted" },
                { key: "rejected", labelKm: "បដិសេធ", labelEn: "Rejected" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key)}
                  style={{
                    padding: "5px 12px",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    border: "none",
                    cursor: "pointer",
                    background: statusFilter === tab.key ? "var(--color-accent)" : "transparent",
                    color: statusFilter === tab.key ? "#ffffff" : "var(--color-text-muted)",
                  }}
                >
                  {isKm ? tab.labelKm : tab.labelEn}
                </button>
              ))}
            </div>
          </div>
          <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
            {isKm ? `បង្ហាញ ${filteredLeads.length} ពាក្យស្នើសុំ` : `Showing ${filteredLeads.length} leads`}
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: "auto" }}>
          <table className="table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>{isKm ? "កូដ / កាលបរិច្ឆេទ" : "Code / Date"}</th>
                <th>{isKm ? "អ្នកស្នើសុំ / ទូរស័ព្ទ" : "Borrower / Phone"}</th>
                <th>{isKm ? "ទំហំកម្ចីស្នើសុំ" : "Requested Amount"}</th>
                <th>{isKm ? "គោលបំណង & ទីតាំង" : "Purpose & Province"}</th>
                <th>{isKm ? "ចំណូល / ទ្រព្យបញ្ចាំ" : "Income / Collateral"}</th>
                <th>{isKm ? "មន្ត្រីទទួលបន្ទុក" : "Assigned Officer"}</th>
                <th>{isKm ? "ស្ថានភាព" : "Status"}</th>
                <th style={{ textAlign: "right" }}>{isKm ? "សកម្មភាព" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "36px 0", color: "var(--color-text-muted)" }}>
                    <RefreshCw size={22} className="animate-spin" style={{ margin: "0 auto 8px" }} />
                    <div>{isKm ? "កំពុងទាញយកទិន្នន័យ..." : "Loading intake leads..."}</div>
                  </td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "36px 0", color: "var(--color-text-muted)" }}>
                    {isKm ? "មិនមានពាក្យស្នើសុំកម្ចីទេ" : "No loan applications found."}
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr key={lead.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: "var(--color-text)" }}>{lead.id}</div>
                      <div style={{ fontSize: 11.5, color: "var(--color-text-muted)" }}>{lead.created_at}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: "var(--color-text)" }}>{lead.full_name}</div>
                      <div style={{ fontSize: 12, color: "var(--color-accent)", display: "flex", alignItems: "center", gap: 4 }}>
                        <Phone size={12} />
                        <span>{lead.phone}</span>
                      </div>
                      {lead.national_id && (
                        <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                          ID: {lead.national_id}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: "var(--color-text)", fontSize: 14 }}>
                        {formatCurrency(lead.requested_amount, lead.currency as any)}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{lead.currency}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: 12.5, fontWeight: 500, color: "var(--color-text)" }}>{lead.loan_purpose}</div>
                      <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{lead.province || "ភ្នំពេញ"}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: 12, color: "var(--color-text)" }}>{lead.monthly_income || "N/A"}</div>
                      <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{lead.collateral_type || "គ្មាន"}</div>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <UserCheck size={14} style={{ color: "var(--color-accent)" }} />
                        <span style={{ fontSize: 12.5 }}>{lead.assigned_officer || (isKm ? "មិនទាន់ចាត់តាំង" : "Unassigned")}</span>
                      </div>
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: 11.5,
                          fontWeight: 600,
                          padding: "3px 8px",
                          borderRadius: 6,
                          background:
                            lead.status === "new"
                              ? "rgba(245, 158, 11, 0.15)"
                              : lead.status === "converted"
                              ? "rgba(16, 185, 129, 0.15)"
                              : lead.status === "rejected"
                              ? "rgba(239, 68, 68, 0.15)"
                              : "rgba(59, 130, 246, 0.15)",
                          color:
                            lead.status === "new"
                              ? "#f59e0b"
                              : lead.status === "converted"
                              ? "#10b981"
                              : lead.status === "rejected"
                              ? "#ef4444"
                              : "#3b82f6",
                        }}
                      >
                        {lead.status === "new"
                          ? (isKm ? "ថ្មី" : "New")
                          : lead.status === "contacted"
                          ? (isKm ? "បានទាក់ទង" : "Contacted")
                          : lead.status === "under_review"
                          ? (isKm ? "កំពុងពិនិត្យ" : "Under Review")
                          : lead.status === "converted"
                          ? (isKm ? "បំប្លែងជាកម្ចី" : "Converted")
                          : (isKm ? "បដិសេធ" : "Rejected")}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                        <button
                          onClick={() => {
                            setSelectedLead(lead);
                            setEditStatus(lead.status);
                            setEditOfficer(lead.assigned_officer || "");
                            setEditNotes(lead.notes || "");
                          }}
                          className="btn btn-secondary"
                          style={{ fontSize: 12, padding: "4px 8px" }}
                        >
                          {isKm ? "ចាត់ចែង" : "Manage"}
                        </button>
                        {lead.status !== "converted" && (
                          <button
                            onClick={() => {
                              navigate(`/loans?client_name=${encodeURIComponent(lead.full_name)}&amount=${lead.requested_amount}`);
                            }}
                            className="btn btn-primary"
                            style={{ fontSize: 12, padding: "4px 8px", display: "flex", alignItems: "center", gap: 4 }}
                          >
                            <FileCheck size={13} />
                            <span>{isKm ? "បង្កើតកម្ចី" : "Convert"}</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Branch QR Stand Display */}
      {showQrModal && (
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
              maxWidth: 440,
              padding: 28,
              borderRadius: 16,
              textAlign: "center",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowQrModal(false)}
                style={{ background: "none", border: "none", color: "var(--color-text-muted)", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: 12 }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  background: "var(--color-accent-soft)",
                  color: "var(--color-accent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 12px",
                }}
              >
                <QrCode size={28} />
              </div>
              <h3 style={{ margin: "0 0 6px 0", fontSize: 19, fontWeight: 700, color: "var(--color-text)" }}>
                {isKm ? "ស្កេន QR ស្នើសុំកម្ចីរហ័ស" : "Scan to Apply for a Loan"}
              </h3>
              <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-muted)" }}>
                {isKm
                  ? "ដាក់តាំង QR កូដនេះនៅបញ្ជរបេឡាសាខា ដើម្បីឱ្យអតិថិជនដាក់ពាក្យស្នើសុំកម្ចីដោយខ្លួនឯង"
                  : "Display this official QR stand at branch counters for self-service loan intake applications"}
              </p>
            </div>

            {/* QR Code Container */}
            <div
              style={{
                background: "#ffffff",
                padding: 20,
                borderRadius: 12,
                display: "inline-block",
                margin: "14px 0",
                boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
              }}
            >
              <QRCodeSVG
                value={publicApplyUrl}
                size={200}
                level="H"
                includeMargin={false}
              />
            </div>

            <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 18, wordBreak: "break-all" }}>
              {publicApplyUrl}
            </div>

            <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
              <button onClick={handleCopyLink} className="btn btn-secondary" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Copy size={15} />
                <span>{isKm ? "ចម្លងតំណភ្ជាប់" : "Copy Link"}</span>
              </button>
              <button onClick={() => window.print()} className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Printer size={15} />
                <span>{isKm ? "បោះពុម្ព QR ដាក់តាំង" : "Print QR Stand"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Manage Lead Status */}
      {selectedLead && (
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
              maxWidth: 480,
              padding: 24,
              borderRadius: 14,
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--color-text)" }}>
                  {isKm ? "ចាត់ចែងពាក្យស្នើសុំកម្ចី" : "Process Loan Application Lead"}
                </h3>
                <div style={{ fontSize: 12.5, color: "var(--color-text-muted)", marginTop: 2 }}>
                  {selectedLead.full_name} ({selectedLead.id})
                </div>
              </div>
              <button
                onClick={() => setSelectedLead(null)}
                style={{ background: "none", border: "none", color: "var(--color-text-muted)", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveLead}>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 5 }}>
                    {isKm ? "ស្ថានភាពពាក្យស្នើសុំ" : "Workflow Status"}
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="input"
                    style={{ width: "100%" }}
                  >
                    <option value="new">{isKm ? "ថ្មី (New)" : "New"}</option>
                    <option value="contacted">{isKm ? "បានទូរស័ព្ទជួប (Contacted)" : "Contacted"}</option>
                    <option value="under_review">{isKm ? "កំពុងចុះវាយតម្លៃ (Under Review)" : "Under Review"}</option>
                    <option value="converted">{isKm ? "បំប្លែងជាកម្ចីជោគជ័យ (Converted)" : "Converted"}</option>
                    <option value="rejected">{isKm ? "បដិសេធសំណើ (Rejected)" : "Rejected"}</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 5 }}>
                    {isKm ? "មន្ត្រីឥណទានទទួលបន្ទុក" : "Assigned Loan Officer"}
                  </label>
                  <input
                    type="text"
                    value={editOfficer}
                    onChange={(e) => setEditOfficer(e.target.value)}
                    placeholder={isKm ? "ឈ្មោះមន្ត្រីឥណទាន" : "Loan Officer Name"}
                    className="input"
                    style={{ width: "100%" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 5 }}>
                    {isKm ? "កំណត់ចំណាំផ្ទៃក្នុង" : "Internal Review Notes"}
                  </label>
                  <textarea
                    rows={3}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder={isKm ? "កត់ត្រាលទ្ធផលនៃការទូរស័ព្ទ ឬការចុះជួបផ្ទាល់..." : "Document call notes or initial appraisal findings..."}
                    className="input"
                    style={{ width: "100%", resize: "vertical" }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={() => setSelectedLead(null)}
                    className="btn btn-secondary"
                  >
                    {isKm ? "បោះបង់" : "Cancel"}
                  </button>
                  <button type="submit" disabled={savingLead} className="btn btn-primary">
                    {savingLead ? (isKm ? "កំពុងរក្សាទុក..." : "Saving...") : (isKm ? "រក្សាទុកការកែប្រែ" : "Save Changes")}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
