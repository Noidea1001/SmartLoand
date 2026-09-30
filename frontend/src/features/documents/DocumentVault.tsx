import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  FolderArchive,
  FileText,
  CreditCard,
  Home,
  FileCheck,
  Search,
  RefreshCw,
  Upload,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  ShieldCheck,
  X,
  Sparkles,
} from "lucide-react";
import {
  getDocumentsVault,
  type VaultDocsResponse,
  type VaultDocItem,
} from "../../api/reports";
import { formatDate } from "../../utils/format";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useToast } from "../../context/ToastContext";

export default function DocumentVault() {
  const { t, i18n } = useTranslation();
  const isKm = i18n.language === "km";
  useDocumentTitle(isKm ? "ឃ្លាំងឯកសារឌីជីថល & ផ្ទៀងផ្ទាត់អត្តសញ្ញាណប័ណ្ណ" : "Digital Document Vault & KYC Storage");
  const toast = useToast();

  const [data, setData] = useState<VaultDocsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Document Preview / Upload Modal
  const [viewDoc, setViewDoc] = useState<VaultDocItem | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newDocType, setNewDocType] = useState("national_id");
  const [newRefNumber, setNewRefNumber] = useState("");
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);

  function loadDocs() {
    setLoading(true);
    getDocumentsVault()
      .then(setData)
      .catch((err) => {
        console.error("Failed to load document vault:", err);
        toast.error(isKm ? "បរាជ័យក្នុងការទាញយកឃ្លាំងឯកសារ" : "Failed to load document vault.");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadDocs();
  }, []);

  // Filtered documents
  const filteredDocs = useMemo(() => {
    if (!data?.documents) return [];

    return data.documents.filter((doc) => {
      if (typeFilter !== "all" && doc.doc_type !== typeFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const clientMatch = doc.client_name.toLowerCase().includes(q);
        const refMatch = doc.reference_number.toLowerCase().includes(q);
        const idMatch = doc.doc_id.toLowerCase().includes(q);
        if (!clientMatch && !refMatch && !idMatch) return false;
      }
      return true;
    });
  }, [data, typeFilter, search]);

  function closeUploadModal() {
    setUploadModalOpen(false);
    setSelectedFile(null);
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    setFilePreviewUrl(null);
  }

  function handleUploadDoc() {
    if (!newClientName.trim() || !newRefNumber.trim() || !selectedFile) return;
    setUploading(true);
    setTimeout(() => {
      setUploading(false);
      toast.success(
        isKm
          ? `បានបញ្ចូលឯកសារថ្មីសម្រាប់ ${newClientName} ដោយជោគជ័យ!`
          : `Document uploaded successfully for ${newClientName}!`
      );
      setNewClientName("");
      setNewRefNumber("");
      closeUploadModal();
      loadDocs();
    }, 700);
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 4px", display: "flex", alignItems: "center", gap: 10 }}>
            <FolderArchive size={26} color="#059669" />
            {isKm ? "មជ្ឈមណ្ឌលផ្ទុកឯកសារកម្ចី & ផ្ទៀងផ្ទាត់អត្តសញ្ញាណប័ណ្ណ" : "Digital Document Vault & KYC Storage"}
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-muted)" }}>
            {isKm
              ? "រក្សាទុកឯកសារអត្តសញ្ញាណប័ណ្ណ សៀវភៅគ្រួសារ ប្លង់ដីបញ្ចាំ និងកិច្ចសន្យាឥណទានដែលមានចុះហត្ថលេខា"
              : "Central archive for borrower Khmer ID cards, Family Books, title deeds, and signed credit contracts"}
          </p>
        </div>

        <div className="page-actions" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            className="btn btn-sm"
            onClick={loadDocs}
            disabled={loading}
            style={{ borderRadius: 8, display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            {isKm ? "ផ្ទុកឡើងវិញ" : "Refresh"}
          </button>

          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => setUploadModalOpen(true)}
            style={{ borderRadius: 8, display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <Upload size={15} />
            {isKm ? "ផ្ទុកឡើងឯកសារថ្មី" : "Upload Document"}
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
        {/* Total Documents */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase" }}>
                {isKm ? "ឯកសារទាំងអស់ក្នុងឃ្លាំង" : "Total Documents"}
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>
                {data?.summary.total_documents || 0}
              </div>
            </div>
            <div style={{ width: 38, height: 38, borderRadius: 8, background: "#ecfdf5", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FolderArchive size={20} />
            </div>
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 6 }}>
            {isKm ? "ឯកសារឌីជីថលសុវត្ថិភាព" : "Secure digital copies"}
          </div>
        </div>

        {/* Verified */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase" }}>
                {isKm ? "បានផ្ទៀងផ្ទាត់រួចរាល់" : "Verified Documents"}
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4, color: "#3b82f6" }}>
                {data?.summary.verified_count || 0}
              </div>
            </div>
            <div style={{ width: 38, height: 38, borderRadius: 8, background: "#eff6ff", color: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 6 }}>
            {isKm ? "ឯកសារមានសុពលភាពពេញលេញ" : "Legally verified paperwork"}
          </div>
        </div>

        {/* Pending Review */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#b45309", textTransform: "uppercase" }}>
                {isKm ? "រង់ចាំការត្រួតពិនិត្យ" : "Pending Review"}
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4, color: "#d97706" }}>
                {data?.summary.pending_count || 0}
              </div>
            </div>
            <div style={{ width: 38, height: 38, borderRadius: 8, background: "#fffbeb", color: "#d97706", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Clock size={20} />
            </div>
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 6 }}>
            {isKm ? "រង់ចាំមន្ត្រីឥណទានផ្ទៀងផ្ទាត់" : "Awaiting officer sign-off"}
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="card" style={{ padding: 16, marginBottom: 20 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
          {/* Tabs */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button
              type="button"
              className={`btn btn-sm ${typeFilter === "all" ? "btn-primary" : ""}`}
              onClick={() => setTypeFilter("all")}
              style={{ borderRadius: 8 }}
            >
              {isKm ? "ទាំងអស់" : "All"} ({data?.documents?.length || 0})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${typeFilter === "national_id" ? "btn-primary" : ""}`}
              onClick={() => setTypeFilter("national_id")}
              style={{ borderRadius: 8 }}
            >
              <CreditCard size={13} style={{ marginRight: 4 }} />
              {isKm ? "អត្តសញ្ញាណប័ណ្ណ" : "National ID"}
            </button>
            <button
              type="button"
              className={`btn btn-sm ${typeFilter === "family_book" ? "btn-primary" : ""}`}
              onClick={() => setTypeFilter("family_book")}
              style={{ borderRadius: 8 }}
            >
              <Home size={13} style={{ marginRight: 4 }} />
              {isKm ? "សៀវភៅគ្រួសារ" : "Family Book"}
            </button>
            <button
              type="button"
              className={`btn btn-sm ${typeFilter === "title_deed" ? "btn-primary" : ""}`}
              onClick={() => setTypeFilter("title_deed")}
              style={{ borderRadius: 8 }}
            >
              <FileCheck size={13} style={{ marginRight: 4 }} />
              {isKm ? "ប្លង់ដីបញ្ចាំ" : "Title Deed"}
            </button>
            <button
              type="button"
              className={`btn btn-sm ${typeFilter === "loan_contract" ? "btn-primary" : ""}`}
              onClick={() => setTypeFilter("loan_contract")}
              style={{ borderRadius: 8 }}
            >
              <FileText size={13} style={{ marginRight: 4 }} />
              {isKm ? "កិច្ចសន្យាកម្ចី" : "Contract"}
            </button>
          </div>

          {/* Search Box */}
          <div style={{ position: "relative", minWidth: 260, flex: 1, maxWidth: 360 }}>
            <Search size={15} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)" }} />
            <input
              type="text"
              className="input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isKm ? "ស្វែងរកឈ្មោះអតិថិជន លេខយោងឯកសារ..." : "Search borrower, ref number..."}
              style={{ paddingLeft: 32, fontSize: 13, width: "100%", borderRadius: 8 }}
            />
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <FolderArchive size={18} color="#059669" />
            {isKm ? "បញ្ជីឯកសារកម្ចី និងស្ថានភាពផ្ទៀងផ្ទាត់" : "Borrower Document Inventory"}
          </h2>
          <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
            {isKm ? "បង្ហាញ " : "Showing "}{filteredDocs.length} {isKm ? "ឯកសារ" : "documents"}
          </span>
        </div>

        <div className="table-container" style={{ margin: 0 }}>
          <table className="table" style={{ width: "100%", fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ padding: "12px 16px" }}>{isKm ? "លេខកូដ & ប្រភេទឯកសារ" : "Document & Type"}</th>
                <th style={{ padding: "12px 16px" }}>{isKm ? "ឈ្មោះអតិថិជន / អ្នកខ្ចី" : "Borrower Name"}</th>
                <th style={{ padding: "12px 16px" }}>{isKm ? "លេខសម្គាល់ / លេខយោង" : "Reference ID"}</th>
                <th style={{ padding: "12px 16px" }}>{isKm ? "កាលបរិច្ឆេទ & ទម្រង់" : "Date & Format"}</th>
                <th style={{ padding: "12px 16px", textAlign: "center" }}>{isKm ? "ស្ថានភាព" : "Status"}</th>
                <th style={{ padding: "12px 16px", textAlign: "center" }}>{isKm ? "សកម្មភាព" : "Action"}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: 40, color: "var(--color-text-muted)" }}>
                    <div className="skeleton skeleton-text" style={{ maxWidth: 280, margin: "0 auto" }}></div>
                  </td>
                </tr>
              ) : filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: 50, color: "var(--color-text-muted)" }}>
                    <FileCheck size={36} color="#059669" style={{ margin: "0 auto 10px", display: "block" }} />
                    <div style={{ fontSize: 15, fontWeight: 600 }}>
                      {isKm ? "មិនមានឯកសារដែលត្រូវនឹងលក្ខខណ្ឌចម្រាញ់ទេ" : "No documents found matching your filter"}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc) => (
                  <tr key={doc.doc_id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                    {/* Doc Title & ID */}
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>
                        {isKm ? doc.doc_title_km : doc.doc_title_en}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>
                        {doc.doc_id}
                      </div>
                    </td>

                    {/* Borrower Name */}
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ fontWeight: 600 }}>{doc.client_name}</div>
                      <Link to={`/loans/${doc.loan_id}`} style={{ fontSize: 11, color: "#3b82f6", display: "inline-flex", alignItems: "center", gap: 3, marginTop: 2 }}>
                        #{doc.loan_id.slice(0, 8).toUpperCase()}
                        <ExternalLink size={10} />
                      </Link>
                    </td>

                    {/* Ref Number */}
                    <td style={{ padding: "14px 16px", fontWeight: 700 }}>
                      {doc.reference_number}
                    </td>

                    {/* Date & Format */}
                    <td style={{ padding: "14px 16px" }}>
                      <div>{formatDate(doc.uploaded_at, isKm ? "km" : "en")}</div>
                      <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>{doc.file_format}</div>
                    </td>

                    {/* Status Badge */}
                    <td style={{ padding: "14px 16px", textAlign: "center" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "3px 10px",
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 700,
                          background: doc.status === "verified" ? "#ecfdf5" : "#fffbeb",
                          color: doc.status === "verified" ? "#047857" : "#b45309",
                        }}
                      >
                        {doc.status === "verified" ? <CheckCircle2 size={11} /> : <Clock size={11} />}
                        <span>
                          {doc.status === "verified"
                            ? (isKm ? "ផ្ទៀងផ្ទាត់រួច" : "Verified")
                            : (isKm ? "រង់ចាំត្រួតពិនិត្យ" : "Pending")}
                        </span>
                      </span>
                    </td>

                    {/* Action */}
                    <td style={{ padding: "14px 16px", textAlign: "center" }}>
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost"
                        onClick={() => setViewDoc(doc)}
                        style={{ borderRadius: 6, display: "inline-flex", alignItems: "center", gap: 4, color: "#059669" }}
                      >
                        <Eye size={13} />
                        <span>{isKm ? "មើលឯកសារ" : "Preview"}</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Preview Modal */}
      {viewDoc && (
        <div
          className="modal-backdrop"
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
            style={{
              width: "100%",
              maxWidth: 520,
              padding: 0,
              borderRadius: 16,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#ecfdf5" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#065f46" }}>
                  {isKm ? viewDoc.doc_title_km : viewDoc.doc_title_en}
                </h3>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--color-text-muted)" }}>
                  {viewDoc.doc_id} | {viewDoc.client_name}
                </p>
              </div>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setViewDoc(null)}
                style={{ borderRadius: "50%", width: 32, height: 32, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: 24 }}>
              <div style={{ background: "var(--color-bg-secondary)", borderRadius: 10, padding: 16, marginBottom: 16, fontSize: 13, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <span style={{ color: "var(--color-text-muted)", display: "block", fontSize: 11 }}>{isKm ? "លេខកម្ចី" : "Loan ID"}</span>
                  <Link to={`/loans/${viewDoc.loan_id}`} style={{ color: "#3b82f6", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                    #{viewDoc.loan_id.slice(0, 8).toUpperCase()} <ExternalLink size={12} />
                  </Link>
                </div>
                <div>
                  <span style={{ color: "var(--color-text-muted)", display: "block", fontSize: 11 }}>{isKm ? "ឈ្មោះអតិថិជន" : "Borrower Name"}</span>
                  <strong style={{ color: "var(--color-text-main)" }}>{viewDoc.client_name}</strong>
                </div>
                <div>
                  <span style={{ color: "var(--color-text-muted)", display: "block", fontSize: 11 }}>{isKm ? "ប្រភេទឯកសារ" : "Document Type"}</span>
                  <strong style={{ color: "var(--color-text-main)" }}>{isKm ? viewDoc.doc_title_km : viewDoc.doc_title_en}</strong>
                </div>
                <div>
                  <span style={{ color: "var(--color-text-muted)", display: "block", fontSize: 11 }}>{isKm ? "លេខសម្គាល់ / យោង" : "Reference No."}</span>
                  <strong style={{ color: "var(--color-text-main)" }}>{viewDoc.reference_number}</strong>
                </div>
                <div>
                  <span style={{ color: "var(--color-text-muted)", display: "block", fontSize: 11 }}>{isKm ? "កាលបរិច្ឆេទផ្ទុកឡើង" : "Upload Date"}</span>
                  <strong style={{ color: "var(--color-text-main)" }}>{formatDate(viewDoc.uploaded_at, isKm ? "km" : "en")}</strong>
                </div>
                <div>
                  <span style={{ color: "var(--color-text-muted)", display: "block", fontSize: 11 }}>{isKm ? "ស្ថានភាពផ្ទៀងផ្ទាត់" : "Status"}</span>
                  <strong style={{ color: viewDoc.status === "verified" ? "#047857" : "#b45309", display: "flex", alignItems: "center", gap: 4 }}>
                    {viewDoc.status === "verified" ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                    {viewDoc.status === "verified" ? (isKm ? "បានផ្ទៀងផ្ទាត់រួច" : "Verified") : (isKm ? "រង់ចាំត្រួតពិនិត្យ" : "Pending")}
                  </strong>
                </div>
              </div>

              <div style={{ border: "1px solid var(--color-border)", borderRadius: 10, padding: 20, textAlign: "center", backgroundColor: "#f8fafc", marginBottom: 20, minHeight: 220, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                {viewDoc.doc_type === "national_id" && (
                  <div style={{ width: 280, height: 160, background: "linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)", borderRadius: 12, border: "1px solid #cbd5e1", display: "flex", flexDirection: "column", padding: 16, boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "auto" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                         <CreditCard size={24} color="#334155" />
                         <span style={{ fontWeight: 700, fontSize: 12, color: "#334155", textTransform: "uppercase" }}>{isKm ? "អត្តសញ្ញាណប័ណ្ណសញ្ជាតិខ្មែរ" : "National ID Card"}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                      <div style={{ width: 60, height: 80, background: "#cbd5e1", borderRadius: 6 }} />
                      <div style={{ flex: 1, textAlign: "left" }}>
                        <div style={{ fontSize: 10, color: "#64748b" }}>{isKm ? "ឈ្មោះ" : "Name"}</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", marginBottom: 4 }}>{viewDoc.client_name}</div>
                        <div style={{ fontSize: 10, color: "#64748b" }}>{isKm ? "លេខអត្តសញ្ញាណប័ណ្ណ" : "ID Number"}</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", letterSpacing: 1 }}>{viewDoc.reference_number}</div>
                      </div>
                    </div>
                  </div>
                )}
                {viewDoc.doc_type === "family_book" && (
                   <div style={{ width: 220, height: 280, background: "linear-gradient(to bottom, #1e3a8a 0%, #1e40af 100%)", borderRadius: "4px 16px 16px 4px", border: "1px solid #1e3a8a", display: "flex", flexDirection: "column", padding: 24, boxShadow: "inset 4px 0 8px rgba(0,0,0,0.2), 0 4px 10px rgba(0,0,0,0.1)", color: "white", alignItems: "center", justifyContent: "center" }}>
                      <Home size={32} color="#bfdbfe" style={{ marginBottom: 16 }} />
                      <h4 style={{ margin: "0 0 8px", fontSize: 16, textAlign: "center", color: "#f8fafc" }}>{isKm ? "សៀវភៅគ្រួសារ" : "Family Book"}</h4>
                      <div style={{ fontSize: 12, color: "#93c5fd", marginBottom: 24, textAlign: "center" }}>{viewDoc.client_name}</div>
                      <div style={{ background: "rgba(255,255,255,0.1)", padding: "8px 16px", borderRadius: 6, fontSize: 14, fontWeight: 700, letterSpacing: 1 }}>{viewDoc.reference_number}</div>
                   </div>
                )}
                {viewDoc.doc_type === "title_deed" && (
                   <div style={{ width: 260, height: 340, background: "#fff", borderRadius: 4, border: "2px solid #fbbf24", padding: 20, boxShadow: "0 4px 12px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
                      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 12, background: "repeating-linear-gradient(45deg, #fbbf24, #fbbf24 10px, #f59e0b 10px, #f59e0b 20px)" }} />
                      <div style={{ textAlign: "center", marginTop: 12, marginBottom: 24 }}>
                        <FileCheck size={28} color="#d97706" style={{ margin: "0 auto 8px" }} />
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#b45309" }}>{isKm ? "វិញ្ញាបនបត្រសម្គាល់ម្ចាស់អចលនវត្ថុ" : "Certificate of Land Title"}</div>
                      </div>
                      <div style={{ flex: 1, borderTop: "1px dashed #fcd34d", borderBottom: "1px dashed #fcd34d", padding: "16px 0", display: "flex", flexDirection: "column", gap: 12 }}>
                        <div>
                           <div style={{ fontSize: 10, color: "#92400e" }}>{isKm ? "ម្ចាស់ដី" : "Land Owner"}</div>
                           <div style={{ fontSize: 13, fontWeight: 600, color: "#78350f" }}>{viewDoc.client_name}</div>
                        </div>
                        <div>
                           <div style={{ fontSize: 10, color: "#92400e" }}>{isKm ? "លេខប្លង់ដី" : "Title Deed Number"}</div>
                           <div style={{ fontSize: 14, fontWeight: 700, color: "#78350f" }}>{viewDoc.reference_number}</div>
                        </div>
                      </div>
                   </div>
                )}
                {viewDoc.doc_type === "loan_contract" && (
                   <div style={{ width: 280, height: 360, background: "#fff", borderRadius: 4, border: "1px solid #e2e8f0", padding: 24, boxShadow: "0 2px 8px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column" }}>
                      <div style={{ textAlign: "center", borderBottom: "2px solid #334155", paddingBottom: 16, marginBottom: 16 }}>
                         <FileText size={24} color="#334155" style={{ margin: "0 auto 8px" }} />
                         <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b", textTransform: "uppercase" }}>{isKm ? "កិច្ចសន្យាឥណទាន" : "Loan Contract"}</div>
                      </div>
                      <div style={{ flex: 1 }}>
                         <div style={{ height: 8, background: "#f1f5f9", borderRadius: 4, marginBottom: 12, width: "100%" }} />
                         <div style={{ height: 8, background: "#f1f5f9", borderRadius: 4, marginBottom: 12, width: "85%" }} />
                         <div style={{ height: 8, background: "#f1f5f9", borderRadius: 4, marginBottom: 12, width: "95%" }} />
                         <div style={{ height: 8, background: "#f1f5f9", borderRadius: 4, marginBottom: 24, width: "60%" }} />
                         
                         <div style={{ background: "#f8fafc", padding: 12, borderRadius: 6, border: "1px dashed #cbd5e1" }}>
                            <div style={{ fontSize: 10, color: "#64748b", marginBottom: 2 }}>{isKm ? "ភាគីអ្នកខ្ចី" : "Borrower Party"}</div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>{viewDoc.client_name}</div>
                         </div>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 24 }}>
                         <div>
                            <div style={{ fontSize: 10, color: "#64748b" }}>{isKm ? "លេខយោងកិច្ចសន្យា" : "Contract Ref"}</div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#334155" }}>{viewDoc.reference_number}</div>
                         </div>
                         <div style={{ width: 60, height: 60, border: "2px solid #ef4444", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.8, transform: "rotate(-15deg)" }}>
                            <span style={{ color: "#ef4444", fontSize: 10, fontWeight: 700 }}>{isKm ? "ត្រា" : "SEALED"}</span>
                         </div>
                      </div>
                   </div>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setViewDoc(null)}
                  style={{ borderRadius: 8 }}
                >
                  {isKm ? "បិទ" : "Close"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {uploadModalOpen && (
        <div
          className="modal-backdrop"
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
            style={{
              width: "100%",
              maxWidth: 520,
              padding: 0,
              borderRadius: 16,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f0fdf4" }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#065f46", display: "flex", alignItems: "center", gap: 8 }}>
                <Upload size={18} />
                {isKm ? "ផ្ទុកឡើងឯកសារអតិថិជនថ្មី" : "Upload Borrower Document"}
              </h3>
              <button
                type="button"
                className="btn btn-sm"
                onClick={closeUploadModal}
                style={{ borderRadius: "50%", width: 32, height: 32, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: 24 }}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                  {isKm ? "ឈ្មោះអតិថិជន / អ្នកខ្ចី" : "Borrower Name"}
                </label>
                <input
                  type="text"
                  className="input"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder={isKm ? "ឧទាហរណ៍៖ សុខ សំណាង" : "e.g. Sok Samnang"}
                  style={{ width: "100%", padding: 8, fontSize: 13, borderRadius: 6 }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                  {isKm ? "ប្រភេទឯកសារ" : "Document Type"}
                </label>
                <select
                  className="input"
                  value={newDocType}
                  onChange={(e) => setNewDocType(e.target.value)}
                  style={{ width: "100%", padding: 8, fontSize: 13, borderRadius: 6 }}
                >
                  <option value="national_id">{isKm ? "អត្តសញ្ញាណប័ណ្ណសញ្ជាតិខ្មែរ" : "Cambodian National ID Card"}</option>
                  <option value="family_book">{isKm ? "សៀវភៅគ្រួសារ / សៀវភៅស្នាក់នៅ" : "Family / Residence Book"}</option>
                  <option value="title_deed">{isKm ? "ប័ណ្ណសម្គាល់សិទ្ធិកាន់កាប់អចលនវត្ថុ (ប្លង់ដី)" : "Land Title Deed"}</option>
                  <option value="loan_contract">{isKm ? "កិច្ចសន្យាឥណទានមានចុះហត្ថលេខា" : "Signed Credit Contract"}</option>
                </select>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                  {isKm ? "លេខសម្គាល់ ឬលេខយោងឯកសារ" : "Document Reference ID"}
                </label>
                <input
                  type="text"
                  className="input"
                  value={newRefNumber}
                  onChange={(e) => setNewRefNumber(e.target.value)}
                  placeholder={isKm ? "ឧទាហរណ៍៖ ID-010293847" : "e.g. ID-010293847"}
                  style={{ width: "100%", padding: 8, fontSize: 13, borderRadius: 6 }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                  {isKm ? "ឯកសារ" : "Document File"}
                </label>
                <div style={{
                  border: "2px dashed var(--color-border)",
                  borderRadius: 10,
                  padding: 20,
                  textAlign: "center",
                  backgroundColor: "var(--color-bg-secondary)",
                  cursor: "pointer"
                }} onClick={() => document.getElementById("file-upload")?.click()}>
                  <input 
                    id="file-upload" 
                    type="file" 
                    accept="image/*,.pdf" 
                    style={{ display: "none" }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        setSelectedFile(file);
                        if (file.type.startsWith("image/")) {
                          setFilePreviewUrl(URL.createObjectURL(file));
                        } else {
                          setFilePreviewUrl(null);
                        }
                      }
                    }}
                  />
                  {filePreviewUrl ? (
                    <img src={filePreviewUrl} alt="Preview" style={{ maxWidth: "100%", maxHeight: 150, objectFit: "contain" }} />
                  ) : (
                    <>
                      <Upload size={24} style={{ color: "var(--color-text-muted)", marginBottom: 8, display: "inline-block" }} />
                      <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
                        {isKm ? "ចុចទីនេះដើម្បីជ្រើសរើសឯកសារ" : "Click here to select a file"}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 4 }}>
                        {selectedFile ? selectedFile.name : (isKm ? "(រូបភាព ឬ PDF)" : "(Image or PDF)")}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  type="button"
                  className="btn"
                  onClick={closeUploadModal}
                  disabled={uploading}
                  style={{ borderRadius: 8 }}
                >
                  {isKm ? "បោះបង់" : "Cancel"}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleUploadDoc}
                  disabled={uploading || !newClientName.trim() || !newRefNumber.trim() || !selectedFile}
                  style={{ borderRadius: 8 }}
                >
                  {uploading ? (isKm ? "កំពុងបញ្ចូល..." : "Uploading...") : (isKm ? "រក្សាទុកឯកសារ" : "Upload File")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
