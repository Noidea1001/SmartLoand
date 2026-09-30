import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  MapPin,
  Calendar,
  Search,
  RefreshCw,
  Phone,
  DollarSign,
  QrCode,
  CheckCircle2,
  Clock,
  Printer,
  X,
  CreditCard,
  UserCheck,
  Building,
  AlertTriangle,
} from "lucide-react";
import {
  getFieldCollectionSheet,
  quickFieldCollection,
  type FieldCollectionResponse,
  type FieldCollectionItem,
} from "../../api/reports";
import { formatCurrency, formatDate, convertCurrencyAmount } from "../../utils/format";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useToast } from "../../context/ToastContext";
import { useBranding } from "../../context/BrandingContext";

export default function FieldCollectionSheet() {
  const { t, i18n } = useTranslation();
  const isKm = i18n.language === "km";
  useDocumentTitle(isKm ? "តារាងប្រមូលប្រាក់តាមភូមិ/តំបន់" : "Field Collection Mobile Sheet");
  const toast = useToast();
  const { companyName, baseCurrency, usdToKhrRate } = useBranding();

  const [data, setData] = useState<FieldCollectionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [targetDate, setTargetDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Quick Collect Modal State
  const [activeItem, setActiveItem] = useState<FieldCollectionItem | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<string>("cash");
  const [payNotes, setPayNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  // KHQR QR Code Modal State
  const [khqrItem, setKhqrItem] = useState<FieldCollectionItem | null>(null);

  function loadSheet() {
    setLoading(true);
    getFieldCollectionSheet({ collection_date: targetDate })
      .then(setData)
      .catch((err) => {
        console.error("Failed to load field collection sheet:", err);
        toast.error(isKm ? "បរាជ័យក្នុងការទាញយកតារាងប្រមូលប្រាក់" : "Failed to load field collection sheet");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadSheet();
  }, [targetDate]);

  function openCollectModal(item: FieldCollectionItem) {
    setActiveItem(item);
    setPayAmount(item.amount_due);
    setPayMethod("cash");
    setPayNotes("");
  }

  async function handleQuickCollect(e: React.FormEvent) {
    e.preventDefault();
    if (!activeItem || payAmount <= 0) return;

    setSubmitting(true);
    try {
      await quickFieldCollection({
        loan_id: activeItem.loan_id,
        installment_id: activeItem.installment_id,
        amount: payAmount,
        method: payMethod,
        notes: payNotes,
      });

      toast.success(
        isKm
          ? `បានកត់ត្រាការប្រមូលប្រាក់ ${payAmount} ${activeItem.currency} ដោយជោគជ័យ!`
          : `Collected ${payAmount} ${activeItem.currency} recorded successfully!`
      );
      setActiveItem(null);
      loadSheet();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || (isKm ? "បរាជ័យក្នុងការកត់ត្រាការប្រមូលប្រាក់" : "Failed to record collection"));
    } finally {
      setSubmitting(false);
    }
  }

  const filteredItems = useMemo(() => {
    if (!data?.collections) return [];
    return data.collections.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const nameMatch = item.client_name.toLowerCase().includes(q);
        const phoneMatch = item.client_phone.toLowerCase().includes(q);
        const locMatch = item.location_details.toLowerCase().includes(q);
        const loanMatch = item.loan_id.toLowerCase().includes(q);
        if (!nameMatch && !phoneMatch && !locMatch && !loanMatch) return false;
      }
      return true;
    });
  }, [data, search, statusFilter]);

  const collectionRate = useMemo(() => {
    if (!data?.summary) return 0;
    const total = data.summary.total_due_usd + (data.summary.collected_today_usd || 0);
    if (total <= 0) return 0;
    return Math.min(100, Math.round(((data.summary.collected_today_usd || 0) / total) * 100));
  }, [data]);

  return (
    <div>
      {/* Header */}
      <div className="page-header no-print" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 4px", display: "flex", alignItems: "center", gap: 10 }}>
            <MapPin size={26} color="var(--color-accent)" />
            {isKm ? "តារាងប្រមូលប្រាក់តាមភូមិ/តំបន់" : "Field Collection Mobile Sheet"}
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-muted)" }}>
            {isKm
              ? "ឧបករណ៍សម្រាប់មន្ត្រីឥណទានចុះប្រមូលប្រាក់ដោយផ្ទាល់តាមខ្នងផ្ទះ បង្កើតបង្កាន់ដៃ និងទទួលប្រាក់តាម KHQR"
              : "Field officer toolkit for door-to-door village collections, rapid KHQR payments, and offline receipting"}
          </p>
        </div>

        <div className="page-actions" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            className="btn btn-sm"
            onClick={loadSheet}
            disabled={loading}
            style={{ borderRadius: 8, display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            {isKm ? "ផ្ទុកឡើងវិញ" : "Refresh"}
          </button>

          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => window.print()}
            style={{ borderRadius: 8, display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <Printer size={15} />
            {isKm ? "បោះពុម្ពតារាងចុះប្រមូល" : "Print Sheet"}
          </button>
        </div>
      </div>

      {/* Printable Sheet Header */}
      <div className="print-only" style={{ display: "none", marginBottom: 20, textAlign: "center" }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 800 }}>{companyName || "SMART LOAN PLATFORM"}</h2>
        <div style={{ fontSize: 13, fontWeight: 700 }}>
          {isKm ? "តារាងចុះប្រមូលប្រាក់កម្ចីប្រចាំថ្ងៃតាមភូមិ/ឃុំ" : "DAILY FIELD COLLECTION RECORD SHEET"}
        </div>
        <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 4 }}>
          {isKm ? "កាលបរិច្ឆេទប្រមូល៖ " : "Collection Date: "} {formatDate(targetDate, isKm ? "km" : "en")}
        </div>
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
          marginBottom: 20,
        }}
      >
        {/* Total to Collect */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase" }}>
                {isKm ? "ចំនួនត្រូវប្រមូលថ្ងៃនេះ" : "Due to Collect Today"}
              </div>
              {baseCurrency === "KHR" ? (
                <>
                  <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4, color: "var(--color-success)" }}>
                    {formatCurrency((data?.summary.total_due_khr || 0) + convertCurrencyAmount(data?.summary.total_due_usd || 0, "USD", "KHR", usdToKhrRate), "KHR")}
                  </div>
                  {(data?.summary.total_due_usd || 0) > 0 && (
                    <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>
                      ≈ {formatCurrency(data?.summary.total_due_usd || 0, "USD")}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4, color: "var(--color-success)" }}>
                    {formatCurrency(data?.summary.total_due_usd || 0, "USD")}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>
                    ≈ {formatCurrency((data?.summary.total_due_khr || 0) + convertCurrencyAmount(data?.summary.total_due_usd || 0, "USD", "KHR", usdToKhrRate), "KHR")}
                  </div>
                </>
              )}
            </div>
            <div style={{ width: 38, height: 38, borderRadius: 8, background: "var(--color-success-soft)", color: "var(--color-success)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <DollarSign size={20} />
            </div>
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 6 }}>
            {data?.summary.total_borrowers_due || 0} {isKm ? "កូនបំណុលត្រូវជួប" : "borrowers on schedule"}
          </div>
        </div>

        {/* Collected Today */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase" }}>
                {isKm ? "ប្រមូលបានថ្ងៃនេះ" : "Collected Today"}
              </div>
              {baseCurrency === "KHR" ? (
                <>
                  <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4, color: "var(--color-accent)" }}>
                    {formatCurrency((data?.summary.collected_today_khr || 0) + convertCurrencyAmount(data?.summary.collected_today_usd || 0, "USD", "KHR", usdToKhrRate), "KHR")}
                  </div>
                  {(data?.summary.collected_today_usd || 0) > 0 && (
                    <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>
                      ≈ {formatCurrency(data?.summary.collected_today_usd || 0, "USD")}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4, color: "var(--color-accent)" }}>
                    {formatCurrency(data?.summary.collected_today_usd || 0, "USD")}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>
                    ≈ {formatCurrency((data?.summary.collected_today_khr || 0) + convertCurrencyAmount(data?.summary.collected_today_usd || 0, "USD", "KHR", usdToKhrRate), "KHR")}
                  </div>
                </>
              )}
            </div>
            <div style={{ width: 38, height: 38, borderRadius: 8, background: "var(--color-accent-soft)", color: "var(--color-accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div style={{ fontSize: 12, color: "var(--color-accent)", marginTop: 6, fontWeight: 600 }}>
            {isKm ? `សម្រេចបាន ${collectionRate}% នៃផែនការ` : `${collectionRate}% of daily target achieved`}
          </div>
        </div>

        {/* Overdue Borrowers */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-danger)", textTransform: "uppercase" }}>
                {isKm ? "កម្ចីហួសកាលកំណត់" : "Overdue Borrowers"}
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4, color: "var(--color-danger)" }}>
                {filteredItems.filter((i) => i.is_overdue).length}
              </div>
              <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>
                {isKm ? "ត្រូវការការតាមដានជាបន្ទាន់" : "Immediate follow-up required"}
              </div>
            </div>
            <div style={{ width: 38, height: 38, borderRadius: 8, background: "var(--color-danger-soft)", color: "var(--color-danger)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <AlertTriangle size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Date Bar */}
      <div className="card no-print" style={{ padding: 16, marginBottom: 20 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            {/* Date Picker */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Calendar size={15} color="var(--color-text-muted)" />
              <input
                type="date"
                className="input"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                style={{ padding: "6px 10px", fontSize: 13, borderRadius: 8 }}
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input"
              style={{ width: "auto", padding: "6px 12px", fontSize: 13, borderRadius: 8 }}
            >
              <option value="all">{isKm ? "ទាំងអស់" : "All Status"}</option>
              <option value="due">{isKm ? "ដល់ថ្ងៃបង់" : "Due Today"}</option>
              <option value="overdue">{isKm ? "ហួសកំណត់" : "Overdue"}</option>
            </select>
          </div>

          {/* Search Box */}
          <div style={{ position: "relative", minWidth: 260, flex: 1, maxWidth: 360 }}>
            <Search size={15} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)" }} />
            <input
              type="text"
              className="input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isKm ? "ស្វែងរកឈ្មោះ លេខទូរស័ព្ទ ឬភូមិ/ឃុំ..." : "Search borrower, phone, village..."}
              style={{ paddingLeft: 32, fontSize: 13, width: "100%", borderRadius: 8 }}
            />
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <MapPin size={18} color="var(--color-accent)" />
            {isKm ? "បញ្ជីកូនបំណុលត្រូវចុះប្រមូលប្រាក់" : "Field Collection Roster"}
          </h2>
          <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
            {filteredItems.length} {isKm ? "អតិថិជន" : "borrowers"}
          </span>
        </div>

        <div className="table-container" style={{ margin: 0 }}>
          <table className="table" style={{ width: "100%", fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ padding: "12px 16px" }}>{isKm ? "អតិថិជន & លេខកម្ចី" : "Borrower & Loan"}</th>
                <th style={{ padding: "12px 16px" }}>{isKm ? "ទីតាំង & អាសយដ្ឋាន" : "Location / Village"}</th>
                <th style={{ padding: "12px 16px" }}>{isKm ? "កាលបរិច្ឆេទ" : "Due Date"}</th>
                <th style={{ padding: "12px 16px", textAlign: "right" }}>{isKm ? "ចំនួនត្រូវប្រមូល" : "Amount Due"}</th>
                <th style={{ padding: "12px 16px", textAlign: "center" }}>{isKm ? "ស្ថានភាព" : "Status"}</th>
                <th className="no-print" style={{ padding: "12px 16px", textAlign: "center" }}>{isKm ? "សកម្មភាពប្រមូល" : "Collection Action"}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: 40, color: "var(--color-text-muted)" }}>
                    <div className="skeleton skeleton-text" style={{ maxWidth: 280, margin: "0 auto" }}></div>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: 40, color: "var(--color-text-muted)" }}>
                    <CheckCircle2 size={36} color="var(--color-success)" style={{ margin: "0 auto 8px", display: "block" }} />
                    <div style={{ fontWeight: 600 }}>
                      {isKm ? "មិនមានកម្ចីត្រូវប្រមូលសម្រាប់លក្ខខណ្ឌនេះទេ" : "No pending collections found for this selection."}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.installment_id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                    {/* Borrower & Loan */}
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{item.client_name}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>
                        <Link to={`/loans/${item.loan_id}`} style={{ color: "var(--color-accent)", textDecoration: "none" }}>
                          #{item.loan_id.slice(0, 8).toUpperCase()}
                        </Link>
                        <span>•</span>
                        <span>{isKm ? `វគ្គ ${item.installment_number}` : `Inst #${item.installment_number}`}</span>
                      </div>
                      {item.client_phone && (
                        <a
                          href={`tel:${item.client_phone}`}
                          style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--color-success)", marginTop: 3, textDecoration: "none" }}
                        >
                          <Phone size={11} />
                          <span>{item.client_phone}</span>
                        </a>
                      )}
                    </td>

                    {/* Location */}
                    <td style={{ padding: "12px 16px", color: "var(--color-text-muted)" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 4 }}>
                        <MapPin size={13} style={{ flexShrink: 0, marginTop: 2, color: "var(--color-accent)" }} />
                        <span>{item.location_details}</span>
                      </div>
                    </td>

                    {/* Due Date */}
                    <td style={{ padding: "12px 16px" }}>
                      <div>{formatDate(item.due_date, isKm ? "km" : "en")}</div>
                      {item.is_overdue && (
                        <div style={{ fontSize: 11, color: "var(--color-danger)", fontWeight: 700, marginTop: 2 }}>
                          {isKm ? `ហួស ${item.days_overdue} ថ្ងៃ` : `${item.days_overdue} days overdue`}
                        </div>
                      )}
                    </td>

                    {/* Amount Due */}
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <strong style={{ fontSize: 14, color: item.is_overdue ? "var(--color-danger)" : "var(--color-success)" }}>
                        {formatCurrency(item.amount_due, item.currency)}
                      </strong>
                      {item.currency !== baseCurrency && (
                        <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>
                          ≈ {formatCurrency(convertCurrencyAmount(item.amount_due, item.currency as any, baseCurrency, usdToKhrRate), baseCurrency)}
                        </div>
                      )}
                      {item.late_fee_applied > 0 && (
                        <div style={{ fontSize: 10, color: "var(--color-danger)", marginTop: 2 }}>
                          {isKm ? `+ពិន័យ ` : `+Fee: `}{formatCurrency(item.late_fee_applied, item.currency)}
                        </div>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "3px 8px",
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 700,
                          background: item.is_overdue ? "var(--color-danger-soft)" : "var(--color-success-soft)",
                          color: item.is_overdue ? "var(--color-danger)" : "var(--color-success)",
                        }}
                      >
                        {item.is_overdue ? <AlertTriangle size={11} /> : <Clock size={11} />}
                        <span>{item.is_overdue ? (isKm ? "ហួសកំណត់" : "Overdue") : (isKm ? "ដល់ថ្ងៃបង់" : "Due")}</span>
                      </span>
                    </td>

                    {/* Action Buttons */}
                    <td className="no-print" style={{ padding: "12px 16px", textAlign: "center" }}>
                      <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={() => openCollectModal(item)}
                          style={{ borderRadius: 6, fontSize: 12, padding: "5px 10px" }}
                        >
                          <DollarSign size={13} style={{ marginRight: 2 }} />
                          <span>{isKm ? "ប្រមូលប្រាក់" : "Collect"}</span>
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost"
                          onClick={() => setKhqrItem(item)}
                          title="KHQR"
                          style={{ borderRadius: 6, padding: "5px 8px", color: "var(--color-accent)" }}
                        >
                          <QrCode size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Collect Modal */}
      {activeItem && (
        <div
          className="modal-backdrop"
          onClick={() => setActiveItem(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.65)",
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
              maxWidth: 460,
              padding: 0,
              borderRadius: 16,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
              overflow: "hidden",
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
            }}
          >
            <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--color-surface)" }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--color-text)", display: "flex", alignItems: "center", gap: 8 }}>
                <DollarSign size={18} color="var(--color-accent)" />
                {isKm ? "កត់ត្រាការប្រមូលប្រាក់នៅមូលដ្ឋាន" : "Record Field Collection"}
              </h3>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => setActiveItem(null)}
                style={{ borderRadius: "50%", width: 32, height: 32, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleQuickCollect} style={{ padding: 24, background: "var(--color-surface)" }}>
              {/* Borrower Summary */}
              <div style={{ background: "var(--color-surface-sunken)", border: "1px solid var(--color-border)", borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 13 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: "var(--color-text)" }}>{activeItem.client_name}</div>
                <div style={{ color: "var(--color-text-muted)", marginTop: 2 }}>
                  {isKm ? "កម្ចីលេខ៖ " : "Loan Ref: "} #{activeItem.loan_id.slice(0, 8).toUpperCase()} • {isKm ? `វគ្គ ${activeItem.installment_number}` : `Inst #${activeItem.installment_number}`}
                </div>
                <div style={{ color: "var(--color-success)", fontWeight: 700, marginTop: 4 }}>
                  {isKm ? "ចំនួនត្រូវសង៖ " : "Total Balance: "} {formatCurrency(activeItem.amount_due, activeItem.currency)}
                  {activeItem.currency !== baseCurrency && (
                    <span style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-muted)", marginLeft: 6 }}>
                      (≈ {formatCurrency(convertCurrencyAmount(activeItem.amount_due, activeItem.currency as any, baseCurrency, usdToKhrRate), baseCurrency)})
                    </span>
                  )}
                </div>
              </div>

              {/* Amount to Collect */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                  {isKm ? "ចំនួនទឹកប្រាក់ទទួលបាន" : "Collected Amount"} ({activeItem.currency})
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  className="input"
                  value={payAmount}
                  onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                  style={{ width: "100%", padding: 8, fontSize: 14, fontWeight: 700, borderRadius: 6 }}
                />
              </div>

              {/* Method */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                  {isKm ? "វិធីសាស្ត្រទូទាត់" : "Payment Method"}
                </label>
                <select
                  className="input"
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  style={{ width: "100%", padding: 8, fontSize: 13, borderRadius: 6 }}
                >
                  <option value="cash">{isKm ? "សាច់ប្រាក់សុទ្ធ (Cash)" : "Cash in Field"}</option>
                  <option value="aba_khqr">{isKm ? "ABA KHQR / ធនាគារចល័ត" : "ABA KHQR / Mobile Bank"}</option>
                  <option value="bank_transfer">{isKm ? "ផ្ទេរប្រាក់តាមគណនី" : "Direct Transfer"}</option>
                </select>
              </div>

              {/* Notes */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                  {isKm ? "កំណត់សម្គាល់បន្ថែម" : "Field Notes"}
                </label>
                <input
                  type="text"
                  className="input"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder={isKm ? "ឧ. ទទួលនៅផ្ទះកូនបំណុល ភូមិ..." : "e.g. Received at borrower house..."}
                  style={{ width: "100%", padding: 8, fontSize: 13, borderRadius: 6 }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setActiveItem(null)}
                  disabled={submitting}
                  style={{ borderRadius: 8 }}
                >
                  {isKm ? "បោះបង់" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting || payAmount <= 0}
                  style={{ borderRadius: 8 }}
                >
                  {submitting ? (isKm ? "កំពុងកត់ត្រា..." : "Saving...") : (isKm ? "បញ្ជាក់ការប្រមូល" : "Confirm Collection")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* KHQR Modal */}
      {khqrItem && (
        <div
          className="modal-backdrop"
          onClick={() => setKhqrItem(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.65)",
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
              maxWidth: 360,
              padding: 24,
              borderRadius: 16,
              textAlign: "center",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: "#e11d48", textTransform: "uppercase" }}>
                BAKONG KHQR PAYWAY
              </div>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setKhqrItem(null)} style={{ padding: 4 }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ border: "2px solid #e11d48", borderRadius: 12, padding: 16, background: "#ffffff", display: "inline-block", marginBottom: 16 }}>
              <div style={{ width: 180, height: 180, background: "#f8fafc", margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", border: "1px dashed #cbd5e1", borderRadius: 8 }}>
                <QrCode size={110} color="#0f172a" />
                <span style={{ fontSize: 10, fontWeight: 700, color: "#e11d48", marginTop: 6 }}>SCAN TO PAY</span>
              </div>
            </div>

            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 2, color: "var(--color-text)" }}>{khqrItem.client_name}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "var(--color-success)", marginBottom: 8 }}>
              {formatCurrency(khqrItem.amount_due, khqrItem.currency)}
              {khqrItem.currency !== baseCurrency && (
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-muted)", marginTop: 2 }}>
                  ≈ {formatCurrency(convertCurrencyAmount(khqrItem.amount_due, khqrItem.currency as any, baseCurrency, usdToKhrRate), baseCurrency)}
                </div>
              )}
            </div>
            <p style={{ fontSize: 11, color: "var(--color-text-muted)", margin: "0 0 16px" }}>
              {isKm ? "ស្កេនទូទាត់តាមកម្មវិធីធនាគារណាមួយនៅក្នុងប្រទេសកម្ពុជា" : "Scan using any Cambodian banking app (ABA, Acleda, Wing, etc.)"}
            </p>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                openCollectModal(khqrItem);
                setKhqrItem(null);
              }}
              style={{ width: "100%", borderRadius: 8 }}
            >
              {isKm ? "កត់ត្រាការទូទាត់ជោគជ័យ" : "Record Success"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
