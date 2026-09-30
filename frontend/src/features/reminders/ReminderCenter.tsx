import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  BellRing,
  Send,
  MessageSquare,
  Phone,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Copy,
  ExternalLink,
  Search,
  Filter,
  X,
  Sparkles,
  Check,
  Smartphone,
  SendHorizontal,
} from "lucide-react";
import {
  getRemindersDueList,
  sendPaymentReminder,
  type RemindersResponse,
  type DueReminderItem,
} from "../../api/reports";
import { formatCurrency, formatDate, convertCurrencyAmount } from "../../utils/format";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useToast } from "../../context/ToastContext";
import { useBranding } from "../../context/BrandingContext";

export default function ReminderCenter() {
  useDocumentTitle("Payment Reminders & Alerts");
  const { t, i18n } = useTranslation();
  const isKm = i18n.language === "km";
  const toast = useToast();
  const { companyName, baseCurrency, usdToKhrRate } = useBranding();

  const [data, setData] = useState<RemindersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [daysAhead, setDaysAhead] = useState<number>(7);
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "overdue" | "urgent" | "upcoming">("all");

  // Dispatch modal state
  const [dispatchModalItem, setDispatchModalItem] = useState<DueReminderItem | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<"telegram" | "sms">("telegram");
  const [customMessage, setCustomMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function loadReminders() {
    setLoading(true);
    getRemindersDueList(daysAhead)
      .then(setData)
      .catch((err) => {
        console.error("Failed to load reminders:", err);
        toast.error(isKm ? "មិនអាចទាញយកទិន្នន័យការរំលឹកបានទេ" : "Failed to load payment reminders.");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadReminders();
  }, [daysAhead]);

  // Generate default message for an item
  function getDefaultMessage(item: DueReminderItem, channel: "telegram" | "sms") {
    const formattedAmount = `${item.amount_due.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${item.currency}`;
    const formattedDate = formatDate(item.due_date, isKm ? "km" : "en");

    if (isKm) {
      if (item.is_overdue) {
        return `[សាររំលឹកបន្ទាន់] សួស្តី ${item.client_name}! នេះជាសារពីគ្រឹះស្ថាន ${companyName}។ ដំណាក់កាលទី ${item.installment_number} នៃកម្ចីរបស់អ្នក ចំនួនទឹកប្រាក់ ${formattedAmount} បានហួសកាលកំណត់ចំនួន ${item.days_overdue} ថ្ងៃ (កាលកំណត់ថ្ងៃ ${formattedDate})។ សូមមេត្តាទូទាត់ជាបន្ទាន់តាម ABA PayWay ឬទាក់ទងមកកាន់គ្រឹះស្ថានយើងខ្ញុំ។ សូមអរគុណ!`;
      }
      return `សួស្តី ${item.client_name}! នេះជាសាររំលឹកពីគ្រឹះស្ថាន ${companyName}។ ដំណាក់កាលទី ${item.installment_number} នៃកម្ចីរបស់អ្នក ចំនួនទឹកប្រាក់ ${formattedAmount} នឹងដល់កាលកំណត់នៅថ្ងៃ ${formattedDate}។ សូមមេត្តាទូទាត់តាមរយៈ ABA PayWay ឬសាខាដែលនៅជិតលោកអ្នកបំផុត។ សូមអរគុណ!`;
    } else {
      if (item.is_overdue) {
        return `[URGENT REMINDER] Dear ${item.client_name}, repayment reminder from ${companyName}. Installment #${item.installment_number} of ${formattedAmount} is overdue by ${item.days_overdue} days (due date: ${formattedDate}). Please settle immediately via ABA PayWay or contact our office. Thank you!`;
      }
      return `Dear ${item.client_name}, repayment notice from ${companyName}. Installment #${item.installment_number} of ${formattedAmount} is due on ${formattedDate}. Please pay conveniently via ABA PayWay or at your nearest branch. Thank you!`;
    }
  }

  function openDispatchModal(item: DueReminderItem, channel: "telegram" | "sms" = "telegram") {
    setDispatchModalItem(item);
    setSelectedChannel(channel);
    setCustomMessage(getDefaultMessage(item, channel));
  }

  async function handleSendReminder() {
    if (!dispatchModalItem) return;
    setSending(true);
    try {
      const res = await sendPaymentReminder({
        installment_id: dispatchModalItem.installment_id,
        channel: selectedChannel,
      });

      if (res.ok) {
        toast.success(
          isKm
            ? `បានផ្ញើសាររំលឹកតាម ${selectedChannel === "telegram" ? "Telegram" : "SMS"} ទៅកាន់ ${dispatchModalItem.client_name} ដោយជោគជ័យ!`
            : `Reminder sent via ${selectedChannel === "telegram" ? "Telegram" : "SMS"} to ${dispatchModalItem.client_name} successfully!`
        );
        setDispatchModalItem(null);
      }
    } catch (err) {
      console.error("Failed to send reminder:", err);
      toast.error(isKm ? "បរាជ័យក្នុងការផ្ញើសាររំលឹក" : "Failed to dispatch reminder.");
    } finally {
      setSending(false);
    }
  }

  function handleCopyMessage(item: DueReminderItem) {
    const msg = getDefaultMessage(item, "telegram");
    navigator.clipboard.writeText(msg);
    setCopiedId(item.installment_id);
    toast.success(
      isKm
        ? `បានចម្លងសាររំលឹកសម្រាប់ ${item.client_name} ទៅកាន់ក្ដារចម្លង!`
        : `Reminder message copied to clipboard for ${item.client_name}!`
    );
    setTimeout(() => {
      setCopiedId(null);
    }, 2500);
  }

  // Filtered items
  const filteredItems = useMemo(() => {
    if (!data?.due_items) return [];

    return data.due_items.filter((item) => {
      // Tab filter
      if (filterTab === "overdue" && !item.is_overdue) return false;
      if (filterTab === "urgent" && (item.is_overdue || item.days_diff > 3)) return false;
      if (filterTab === "upcoming" && (item.is_overdue || item.days_diff <= 3)) return false;

      // Text search
      if (search.trim()) {
        const q = search.toLowerCase();
        const nameMatch = item.client_name.toLowerCase().includes(q);
        const phoneMatch = item.client_phone?.toLowerCase().includes(q);
        const loanMatch = item.loan_id.toLowerCase().includes(q);
        if (!nameMatch && !phoneMatch && !loanMatch) return false;
      }

      return true;
    });
  }, [data, filterTab, search]);

  // Metrics
  const metrics = useMemo(() => {
    if (!data?.due_items) return { totalCount: 0, overdueCount: 0, urgentCount: 0, upcomingCount: 0, totalAmountUsd: 0, totalOverdueAmountUsd: 0 };

    let totalCount = data.due_items.length;
    let overdueCount = 0;
    let urgentCount = 0;
    let upcomingCount = 0;
    let totalAmountUsd = 0;
    let totalOverdueAmountUsd = 0;

    data.due_items.forEach((item) => {
      const amtUsd = item.currency === "USD" ? item.amount_due : item.amount_due / 4100;
      totalAmountUsd += amtUsd;

      if (item.is_overdue) {
        overdueCount++;
        totalOverdueAmountUsd += amtUsd;
      } else if (item.days_diff <= 3) {
        urgentCount++;
      } else {
        upcomingCount++;
      }
    });

    return { totalCount, overdueCount, urgentCount, upcomingCount, totalAmountUsd, totalOverdueAmountUsd };
  }, [data]);

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 4px", display: "flex", alignItems: "center", gap: 10 }}>
            <BellRing size={26} color="#3b82f6" />
            {isKm ? "មជ្ឈមណ្ឌលរំលឹកការបង់ប្រាក់ & សារជូនដំណឹង" : "Payment Reminders & Alert Center"}
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-muted)" }}>
            {isKm
              ? "ប្រព័ន្ធស្វ័យប្រវត្តិកម្មផ្ញើសាររំលឹកតាម Telegram & SMS ទៅកាន់អតិថិជនជិតដល់កាលកំណត់ និងហួសកាលកំណត់"
              : "Automated Telegram & SMS installment reminder dispatch for upcoming and overdue borrowers"}
          </p>
        </div>

        <div className="page-actions" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--color-text-muted)" }}>
            <Calendar size={15} />
            <span>{isKm ? "គិតជាមុន៖" : "Lookahead:"}</span>
            <select
              className="input"
              value={daysAhead}
              onChange={(e) => setDaysAhead(Number(e.target.value))}
              style={{ padding: "6px 12px", fontSize: 13, borderRadius: 8 }}
            >
              <option value={3}>{isKm ? "៣ ថ្ងៃបន្ទាប់" : "Next 3 Days"}</option>
              <option value={7}>{isKm ? "៧ ថ្ងៃបន្ទាប់" : "Next 7 Days"}</option>
              <option value={14}>{isKm ? "១៤ ថ្ងៃបន្ទាប់" : "Next 14 Days"}</option>
              <option value={30}>{isKm ? "៣០ ថ្ងៃបន្ទាប់" : "Next 30 Days"}</option>
            </select>
          </div>

          <button
            type="button"
            className="btn btn-sm"
            onClick={loadReminders}
            disabled={loading}
            style={{ borderRadius: 8, display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            {isKm ? "ផ្ទុកឡើងវិញ" : "Refresh"}
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
        {/* Total in Queue */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase" }}>
                {isKm ? "ការបង់ប្រាក់ក្នុងបញ្ជីរំលឹក" : "Total Due in Queue"}
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, marginTop: 4 }}>
                {loading ? "..." : metrics.totalCount}
              </div>
            </div>
            <div style={{ width: 38, height: 38, borderRadius: 8, background: "#eff6ff", color: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <BellRing size={20} />
            </div>
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 8 }}>
            {isKm ? "ទំហំប្រាក់សរុប៖ " : "Total Volume: "}
            <span style={{ fontWeight: 700, color: "var(--color-text-primary)" }}>
              {formatCurrency(
                convertCurrencyAmount(metrics.totalAmountUsd, "USD", baseCurrency, usdToKhrRate),
                baseCurrency
              )}
            </span>
          </div>
        </div>

        {/* Overdue (Urgent) */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#ef4444", textTransform: "uppercase" }}>
                {isKm ? "ហួសកាលកំណត់ (បន្ទាន់)" : "Overdue (Urgent)"}
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, marginTop: 4, color: "#ef4444" }}>
                {loading ? "..." : metrics.overdueCount}
              </div>
            </div>
            <div style={{ width: 38, height: 38, borderRadius: 8, background: "#fef2f2", color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <AlertTriangle size={20} />
            </div>
          </div>
          <div style={{ fontSize: 12, color: "#b91c1c", marginTop: 8 }}>
            {isKm ? "ទំហំប្រាក់ហួសកំណត់៖ " : "Overdue Balance: "}
            <span style={{ fontWeight: 700 }}>
              {formatCurrency(
                convertCurrencyAmount(metrics.totalOverdueAmountUsd, "USD", baseCurrency, usdToKhrRate),
                baseCurrency
              )}
            </span>
          </div>
        </div>

        {/* Due in 1-3 Days */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#b45309", textTransform: "uppercase" }}>
                {isKm ? "ជិតដល់កាលកំណត់ (១-៣ ថ្ងៃ)" : "Due in 1-3 Days"}
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, marginTop: 4, color: "#d97706" }}>
                {loading ? "..." : metrics.urgentCount}
              </div>
            </div>
            <div style={{ width: 38, height: 38, borderRadius: 8, background: "#fffbeb", color: "#d97706", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Clock size={20} />
            </div>
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 8 }}>
            {isKm ? "តម្រូវឱ្យផ្ញើសាររំលឹកជាមុន" : "Requires advance notification"}
          </div>
        </div>

        {/* Due in 4+ Days */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#047857", textTransform: "uppercase" }}>
                {isKm ? "កាលវិភាគខាងមុខ (៤-៧ ថ្ងៃ)" : "Upcoming (4-7 Days)"}
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, marginTop: 4, color: "#10b981" }}>
                {loading ? "..." : metrics.upcomingCount}
              </div>
            </div>
            <div style={{ width: 38, height: 38, borderRadius: 8, background: "#ecfdf5", color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 8 }}>
            {isKm ? "ស្ថានភាពធម្មតា មិនទាន់ប្រញាប់" : "Scheduled on track"}
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="card" style={{ padding: 16, marginBottom: 20 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
          {/* Status Tabs */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button
              type="button"
              className={`btn btn-sm ${filterTab === "all" ? "btn-primary" : ""}`}
              onClick={() => setFilterTab("all")}
              style={{ borderRadius: 8 }}
            >
              {isKm ? "ទាំងអស់" : "All"} ({data?.due_items?.length || 0})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${filterTab === "overdue" ? "btn-danger" : ""}`}
              onClick={() => setFilterTab("overdue")}
              style={{
                borderRadius: 8,
                backgroundColor: filterTab === "overdue" ? "#ef4444" : undefined,
                color: filterTab === "overdue" ? "#fff" : undefined,
                borderColor: filterTab === "overdue" ? "#ef4444" : undefined,
              }}
            >
              <AlertTriangle size={13} style={{ marginRight: 4 }} />
              {isKm ? "ហួសកាលកំណត់" : "Overdue"} ({metrics.overdueCount})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${filterTab === "urgent" ? "btn-primary" : ""}`}
              onClick={() => setFilterTab("urgent")}
              style={{
                borderRadius: 8,
                backgroundColor: filterTab === "urgent" ? "#f59e0b" : undefined,
                color: filterTab === "urgent" ? "#fff" : undefined,
                borderColor: filterTab === "urgent" ? "#f59e0b" : undefined,
              }}
            >
              <Clock size={13} style={{ marginRight: 4 }} />
              {isKm ? "ជិតដល់ (១-៣ ថ្ងៃ)" : "Due in 1-3 Days"} ({metrics.urgentCount})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${filterTab === "upcoming" ? "btn-primary" : ""}`}
              onClick={() => setFilterTab("upcoming")}
              style={{ borderRadius: 8 }}
            >
              <Calendar size={13} style={{ marginRight: 4 }} />
              {isKm ? "ខាងមុខ (៤+ ថ្ងៃ)" : "Upcoming"} ({metrics.upcomingCount})
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
              placeholder={isKm ? "ស្វែងរកឈ្មោះអតិថិជន លេខទូរស័ព្ទ លេខកម្ចី..." : "Search borrower, phone, loan ref..."}
              style={{ paddingLeft: 32, fontSize: 13, width: "100%", borderRadius: 8 }}
            />
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <MessageSquare size={18} color="#3b82f6" />
            {isKm ? "បញ្ជីរំលឹកការទូទាត់ប្រាក់សម្រាប់មន្ត្រីឥណទាន" : "Repayment Notification Queue"}
          </h2>
          <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
            {isKm ? "បង្ហាញ " : "Showing "}{filteredItems.length} {isKm ? "កំណត់ត្រា" : "records"}
          </span>
        </div>

        <div className="table-container" style={{ margin: 0 }}>
          <table className="table" style={{ width: "100%", fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ padding: "12px 16px" }}>{isKm ? "អតិថិជន / អ្នកខ្ចី" : "Borrower"}</th>
                <th style={{ padding: "12px 16px" }}>{isKm ? "លេខកម្ចី & ដំណាក់កាល" : "Loan & Installment"}</th>
                <th style={{ padding: "12px 16px" }}>{isKm ? "កាលបរិច្ឆេទ & ស្ថានភាព" : "Due Date & Timeline"}</th>
                <th style={{ padding: "12px 16px", textAlign: "right" }}>{isKm ? "ចំនួនត្រូវបង់" : "Amount Due"}</th>
                <th style={{ padding: "12px 16px", textAlign: "center" }}>{isKm ? "សកម្មភាពផ្ញើសារ" : "Dispatch Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: 40, color: "var(--color-text-muted)" }}>
                    <div className="skeleton skeleton-text" style={{ maxWidth: 300, margin: "0 auto" }}></div>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: 50, color: "var(--color-text-muted)" }}>
                    <CheckCircle2 size={36} color="#10b981" style={{ margin: "0 auto 10px", display: "block" }} />
                    <div style={{ fontSize: 15, fontWeight: 600 }}>
                      {isKm ? "មិនមានការបង់ប្រាក់ណាមួយត្រូវរំលឹកនៅឡើយទេ" : "No pending payment reminders found"}
                    </div>
                    <p style={{ fontSize: 12, margin: "4px 0 0" }}>
                      {isKm ? "គ្រប់កាលវិភាគបង់ប្រាក់ទាំងអស់ស្ថិតក្នុងស្ថានភាពទូទាត់ត្រឹមត្រូវ" : "All installments are paid up or outside the lookahead range"}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isCopied = copiedId === item.installment_id;

                  return (
                    <tr key={item.installment_id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                      {/* Client Info */}
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{item.client_name}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 }}>
                          <Phone size={12} />
                          <span>{item.client_phone || (isKm ? "មិនមានលេខទូរស័ព្ទ" : "No phone registered")}</span>
                        </div>
                      </td>

                      {/* Loan Ref & Installment */}
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <Link
                            to={`/loans/${item.loan_id}`}
                            style={{ fontWeight: 600, color: "#3b82f6", display: "inline-flex", alignItems: "center", gap: 4 }}
                          >
                            #{item.loan_id.slice(0, 8).toUpperCase()}
                            <ExternalLink size={12} />
                          </Link>
                        </div>
                        <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 }}>
                          {isKm ? "ដំណាក់កាលទី " : "Installment #"}{item.installment_number}
                        </div>
                      </td>

                      {/* Due Date & Timeline Status */}
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ fontWeight: 600 }}>{formatDate(item.due_date, isKm ? "km" : "en")}</div>
                        <div style={{ marginTop: 4 }}>
                          {item.is_overdue ? (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                padding: "2px 8px",
                                borderRadius: 12,
                                fontSize: 11,
                                fontWeight: 700,
                                background: "#fef2f2",
                                color: "#b91c1c",
                                border: "1px solid #fecaca",
                              }}
                            >
                              <AlertTriangle size={11} />
                              {isKm ? `ហួសកំណត់ ${item.days_overdue} ថ្ងៃ` : `${item.days_overdue} days overdue`}
                            </span>
                          ) : item.days_diff === 0 ? (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                padding: "2px 8px",
                                borderRadius: 12,
                                fontSize: 11,
                                fontWeight: 700,
                                background: "#fffbeb",
                                color: "#b45309",
                                border: "1px solid #fde68a",
                              }}
                            >
                              <Clock size={11} />
                              {isKm ? "ដល់កំណត់ថ្ងៃនេះ" : "Due Today"}
                            </span>
                          ) : item.days_diff <= 3 ? (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                padding: "2px 8px",
                                borderRadius: 12,
                                fontSize: 11,
                                fontWeight: 600,
                                background: "#fffbeb",
                                color: "#d97706",
                              }}
                            >
                              <Clock size={11} />
                              {isKm ? `នៅសល់ ${item.days_diff} ថ្ងៃ` : `In ${item.days_diff} days`}
                            </span>
                          ) : (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                padding: "2px 8px",
                                borderRadius: 12,
                                fontSize: 11,
                                fontWeight: 600,
                                background: "#ecfdf5",
                                color: "#047857",
                              }}
                            >
                              <Calendar size={11} />
                              {isKm ? `នៅសល់ ${item.days_diff} ថ្ងៃ` : `In ${item.days_diff} days`}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Amount Due */}
                      <td style={{ padding: "14px 16px", textAlign: "right" }}>
                        <div style={{ fontSize: 15, fontWeight: 800, color: item.is_overdue ? "#b91c1c" : "var(--color-text-primary)" }}>
                          {formatCurrency(item.amount_due, item.currency)}
                        </div>
                        {item.currency !== baseCurrency && (
                          <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                            ≈ {formatCurrency(convertCurrencyAmount(item.amount_due, item.currency, baseCurrency, usdToKhrRate), baseCurrency)}
                          </div>
                        )}
                        <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                          {isKm ? "បូកបញ្ចូលការប្រាក់" : "Principal + Int"}
                        </div>
                      </td>

                      {/* Dispatch Actions */}
                      <td style={{ padding: "14px 16px", textAlign: "center" }}>
                        <div style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                          {/* Send Telegram */}
                          <button
                            type="button"
                            className="btn btn-sm"
                            onClick={() => openDispatchModal(item, "telegram")}
                            title={isKm ? "ផ្ញើសារតាម Telegram" : "Send Telegram reminder"}
                            style={{
                              borderRadius: 8,
                              backgroundColor: "#0088cc",
                              color: "#fff",
                              borderColor: "#0088cc",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              padding: "6px 10px",
                              fontSize: 12,
                            }}
                          >
                            <Send size={13} />
                            <span>Telegram</span>
                          </button>

                          {/* Send SMS */}
                          <button
                            type="button"
                            className="btn btn-sm"
                            onClick={() => openDispatchModal(item, "sms")}
                            title={isKm ? "ផ្ញើសារតាម SMS" : "Send SMS reminder"}
                            style={{
                              borderRadius: 8,
                              backgroundColor: "#059669",
                              color: "#fff",
                              borderColor: "#059669",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              padding: "6px 10px",
                              fontSize: 12,
                            }}
                          >
                            <Smartphone size={13} />
                            <span>SMS</span>
                          </button>

                          {/* Copy pre-formatted text */}
                          <button
                            type="button"
                            className="btn btn-sm"
                            onClick={() => handleCopyMessage(item)}
                            title={isKm ? "ចម្លងសារជាអក្សរ" : "Copy reminder message"}
                            style={{
                              borderRadius: 8,
                              padding: "6px 9px",
                              display: "inline-flex",
                              alignItems: "center",
                              color: isCopied ? "#059669" : undefined,
                            }}
                          >
                            {isCopied ? <Check size={14} color="#059669" /> : <Copy size={14} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dispatch Modal */}
      {dispatchModalItem && (
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
              maxWidth: 580,
              padding: 0,
              borderRadius: 16,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              overflow: "hidden",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid var(--color-border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: selectedChannel === "telegram" ? "#f0f9ff" : "#f0fdf4",
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                  {selectedChannel === "telegram" ? (
                    <Send size={18} color="#0088cc" />
                  ) : (
                    <Smartphone size={18} color="#059669" />
                  )}
                  {isKm
                    ? `ផ្ញើសាររំលឹកតាម ${selectedChannel === "telegram" ? "Telegram" : "SMS"}`
                    : `Dispatch Reminder via ${selectedChannel === "telegram" ? "Telegram" : "SMS"}`}
                </h3>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--color-text-muted)" }}>
                  {isKm ? "ជូនដំណឹងទៅកាន់អ្នកខ្ចីអំពីកាលវិភាគបង់ប្រាក់ឥណទាន" : "Notify borrower about upcoming or overdue loan installment"}
                </p>
              </div>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setDispatchModalItem(null)}
                style={{ borderRadius: "50%", width: 32, height: 32, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: 24 }}>
              {/* Recipient Details */}
              <div
                style={{
                  background: "var(--color-bg-secondary)",
                  borderRadius: 10,
                  padding: 14,
                  marginBottom: 18,
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                  fontSize: 13,
                }}
              >
                <div>
                  <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{isKm ? "អ្នកទទួល / អតិថិជន" : "Recipient / Borrower"}</div>
                  <div style={{ fontWeight: 700, fontSize: 14, marginTop: 2 }}>{dispatchModalItem.client_name}</div>
                  <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 }}>
                    {dispatchModalItem.client_phone || (isKm ? "មិនមានលេខទូរស័ព្ទ" : "No phone")}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{isKm ? "កម្ចី & ដំណាក់កាល" : "Loan & Installment"}</div>
                  <div style={{ fontWeight: 700, fontSize: 14, marginTop: 2 }}>
                    #{dispatchModalItem.loan_id.slice(0, 8).toUpperCase()} ({isKm ? "ទី " : "#"}{dispatchModalItem.installment_number})
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: dispatchModalItem.is_overdue ? "#ef4444" : "#10b981", marginTop: 2 }}>
                    {formatCurrency(dispatchModalItem.amount_due, dispatchModalItem.currency)}
                  </div>
                </div>
              </div>

              {/* Channel Selector */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
                  {isKm ? "ជ្រើសរើសបណ្តាញទំនាក់ទំនង" : "Select Communication Channel"}
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedChannel("telegram");
                      setCustomMessage(getDefaultMessage(dispatchModalItem, "telegram"));
                    }}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 8,
                      border: selectedChannel === "telegram" ? "2px solid #0088cc" : "1px solid var(--color-border)",
                      background: selectedChannel === "telegram" ? "#f0f9ff" : "transparent",
                      color: selectedChannel === "telegram" ? "#0088cc" : "inherit",
                      fontWeight: selectedChannel === "telegram" ? 700 : 500,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      cursor: "pointer",
                      fontSize: 13,
                    }}
                  >
                    <Send size={16} color="#0088cc" />
                    <span>Telegram Bot</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedChannel("sms");
                      setCustomMessage(getDefaultMessage(dispatchModalItem, "sms"));
                    }}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 8,
                      border: selectedChannel === "sms" ? "2px solid #059669" : "1px solid var(--color-border)",
                      background: selectedChannel === "sms" ? "#f0fdf4" : "transparent",
                      color: selectedChannel === "sms" ? "#059669" : "inherit",
                      fontWeight: selectedChannel === "sms" ? 700 : 500,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      cursor: "pointer",
                      fontSize: 13,
                    }}
                  >
                    <Smartphone size={16} color="#059669" />
                    <span>SMS Gateway</span>
                  </button>
                </div>
              </div>

              {/* Message Content Preview / Edit */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 700 }}>
                    {isKm ? "ខ្លឹមសារសារជូនដំណឹង (អាចកែសម្រួលបាន)" : "Reminder Message Content (Editable)"}
                  </label>
                  <button
                    type="button"
                    onClick={() => setCustomMessage(getDefaultMessage(dispatchModalItem, selectedChannel))}
                    style={{ fontSize: 11, color: "#3b82f6", background: "none", border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 3 }}
                  >
                    <Sparkles size={11} />
                    {isKm ? "ស្ដារសារលំនាំដើម" : "Reset Template"}
                  </button>
                </div>
                <textarea
                  className="input"
                  rows={5}
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  style={{
                    width: "100%",
                    fontSize: 13,
                    lineHeight: 1.6,
                    padding: 12,
                    borderRadius: 8,
                    resize: "vertical",
                  }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setDispatchModalItem(null)}
                  disabled={sending}
                  style={{ borderRadius: 8 }}
                >
                  {isKm ? "បោះបង់" : "Cancel"}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSendReminder}
                  disabled={sending || !customMessage.trim()}
                  style={{
                    borderRadius: 8,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    backgroundColor: selectedChannel === "telegram" ? "#0088cc" : "#059669",
                    borderColor: selectedChannel === "telegram" ? "#0088cc" : "#059669",
                  }}
                >
                  <SendHorizontal size={15} />
                  <span>{sending ? (isKm ? "កំពុងផ្ញើ..." : "Sending...") : (isKm ? "បញ្ជូនសារឥឡូវនេះ" : "Dispatch Now")}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
