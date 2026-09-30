import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Users,
  Award,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  ShieldAlert,
  Search,
  RefreshCw,
  BarChart3,
  FileSpreadsheet,
  ArrowUpRight,
  UserCheck,
  Target,
} from "lucide-react";
import {
  getOfficersPerformance,
  type OfficersPerformanceResponse,
  type OfficerPerformanceItem,
} from "../../api/reports";
import { formatCurrency, formatPercent, convertCurrencyAmount } from "../../utils/format";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useToast } from "../../context/ToastContext";
import { useBranding } from "../../context/BrandingContext";

export default function OfficerAnalytics() {
  useDocumentTitle("Loan Officer Performance & Portfolio Analytics");
  const { t, i18n } = useTranslation();
  const isKm = i18n.language === "km";
  const toast = useToast();
  const { baseCurrency, usdToKhrRate } = useBranding();

  const [data, setData] = useState<OfficersPerformanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<"all" | "excellent" | "good" | "needs_improvement">("all");
  const [selectedOfficer, setSelectedOfficer] = useState<OfficerPerformanceItem | null>(null);

  function loadOfficers() {
    setLoading(true);
    getOfficersPerformance()
      .then(setData)
      .catch((err) => {
        console.error("Failed to load officer performance:", err);
        toast.error(isKm ? "បរាជ័យក្នុងការទាញយកទិន្នន័យមន្ត្រីឥណទាន" : "Failed to load officer performance.");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadOfficers();
  }, []);

  // Filtered officers
  const filteredOfficers = useMemo(() => {
    if (!data?.officers) return [];

    return data.officers.filter((officer) => {
      if (tierFilter !== "all" && officer.tier !== tierFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const nameMatch = officer.name.toLowerCase().includes(q);
        const emailMatch = officer.email.toLowerCase().includes(q);
        if (!nameMatch && !emailMatch) return false;
      }
      return true;
    });
  }, [data, tierFilter, search]);

  // Overall Metrics
  const metrics = useMemo(() => {
    if (!data?.officers) return { totalOfficers: 0, totalPortfolio: 0, totalOverdue: 0, avgPar: 0, topOfficer: "—" };

    const totalOfficers = data.officers.length;
    let totalPortfolio = 0;
    let totalOverdue = 0;

    data.officers.forEach((o) => {
      totalPortfolio += o.portfolio_volume_usd;
      totalOverdue += o.overdue_volume_usd;
    });

    const avgPar = totalPortfolio > 0 ? (totalOverdue / totalPortfolio) * 100 : 0;
    const topOfficer = data.officers.length > 0 ? data.officers[0].name : "—";

    return {
      totalOfficers,
      totalPortfolio,
      totalOverdue,
      avgPar: Math.round(avgPar * 100) / 100,
      topOfficer,
    };
  }, [data]);

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 4px", display: "flex", alignItems: "center", gap: 10 }}>
            <Users size={26} color="#3b82f6" />
            {isKm ? "ការវិភាគការងារមន្ត្រីឥណទាន & សាខា" : "Credit Officer (CO) Performance & Portfolio Analytics"}
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-muted)" }}>
            {isKm
              ? "តាមដានទំហំផលប័ត្រកម្ចី អនុបាតហានិភ័យឥណទាន អត្រាទារប្រាក់ត្រឡប់ និងចំណាត់ថ្នាក់មន្ត្រីឥណទាន"
              : "Track officer portfolio volume, PAR > 30 days, collection recovery rate %, and performance rankings"}
          </p>
        </div>

        <div className="page-actions" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            className="btn btn-sm"
            onClick={loadOfficers}
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
        {/* Total Active Officers */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase" }}>
                {isKm ? "មន្ត្រីឥណទានសកម្ម" : "Active Credit Officers"}
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>
                {metrics.totalOfficers}
              </div>
            </div>
            <div style={{ width: 38, height: 38, borderRadius: 8, background: "#eff6ff", color: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <UserCheck size={20} />
            </div>
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 6 }}>
            {isKm ? "មន្ត្រីឈានមុខ៖ " : "Top Performer: "}
            <span style={{ fontWeight: 700, color: "var(--color-text-primary)" }}>{metrics.topOfficer}</span>
          </div>
        </div>

        {/* Total Managed Portfolio */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase" }}>
                {isKm ? "ផលប័ត្រកម្ចីសរុបក្រោមការគ្រប់គ្រង" : "Total Portfolio Managed"}
              </div>
              <div className="num" style={{ fontSize: 24, fontWeight: 800, marginTop: 4, color: "#10b981" }}>
                {formatCurrency(
                  convertCurrencyAmount(metrics.totalPortfolio, "USD", baseCurrency, usdToKhrRate),
                  baseCurrency
                )}
              </div>
            </div>
            <div style={{ width: 38, height: 38, borderRadius: 8, background: "#ecfdf5", color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <TrendingUp size={20} />
            </div>
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 6 }}>
            {isKm ? "ទំហំប្រាក់កម្ចីសកម្មក្នុងដៃមន្ត្រីទាំងអស់" : "Active outstanding portfolio volume"}
          </div>
        </div>

        {/* Portfolio Overdue Amount */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#ef4444", textTransform: "uppercase" }}>
                {isKm ? "ទំហំប្រាក់ហួសកាលកំណត់" : "Delinquent Portfolio"}
              </div>
              <div className="num" style={{ fontSize: 24, fontWeight: 800, marginTop: 4, color: "#ef4444" }}>
                {formatCurrency(
                  convertCurrencyAmount(metrics.totalOverdue, "USD", baseCurrency, usdToKhrRate),
                  baseCurrency
                )}
              </div>
            </div>
            <div style={{ width: 38, height: 38, borderRadius: 8, background: "#fef2f2", color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <AlertTriangle size={20} />
            </div>
          </div>
          <div style={{ fontSize: 12, color: "#b91c1c", marginTop: 6 }}>
            {isKm ? "ទាមទារការចុះជួបអតិថិជនជាបន្ទាន់" : "Requires field recovery actions"}
          </div>
        </div>

        {/* Average PAR Rate */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase" }}>
                {isKm ? "អនុបាតហានិភ័យផលប័ត្រ" : "Average PAR Rate"}
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4, color: metrics.avgPar > 5 ? "#ef4444" : "#d97706" }}>
                {metrics.avgPar}%
              </div>
            </div>
            <div style={{ width: 38, height: 38, borderRadius: 8, background: "#fffbeb", color: "#d97706", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ShieldAlert size={20} />
            </div>
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 6 }}>
            {isKm ? "គោលដៅស្តង់ដារក្រោម ៥.០%" : "Target benchmark: below 5.0%"}
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="card" style={{ padding: 16, marginBottom: 20 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
          {/* Tier Tabs */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button
              type="button"
              className={`btn btn-sm ${tierFilter === "all" ? "btn-primary" : ""}`}
              onClick={() => setTierFilter("all")}
              style={{ borderRadius: 8 }}
            >
              {isKm ? "មន្ត្រីទាំងអស់" : "All Officers"} ({data?.officers?.length || 0})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${tierFilter === "excellent" ? "btn-primary" : ""}`}
              onClick={() => setTierFilter("excellent")}
              style={{
                borderRadius: 8,
                backgroundColor: tierFilter === "excellent" ? "#10b981" : undefined,
                color: tierFilter === "excellent" ? "#fff" : undefined,
                borderColor: tierFilter === "excellent" ? "#10b981" : undefined,
              }}
            >
              <Award size={13} style={{ marginRight: 4 }} />
              {isKm ? "កម្រិតឆ្នើម" : "Excellent Tier"}
            </button>
            <button
              type="button"
              className={`btn btn-sm ${tierFilter === "good" ? "btn-primary" : ""}`}
              onClick={() => setTierFilter("good")}
              style={{
                borderRadius: 8,
                backgroundColor: tierFilter === "good" ? "#3b82f6" : undefined,
                color: tierFilter === "good" ? "#fff" : undefined,
                borderColor: tierFilter === "good" ? "#3b82f6" : undefined,
              }}
            >
              <CheckCircle2 size={13} style={{ marginRight: 4 }} />
              {isKm ? "កម្រិតល្អ" : "Good Tier"}
            </button>
            <button
              type="button"
              className={`btn btn-sm ${tierFilter === "needs_improvement" ? "btn-primary" : ""}`}
              onClick={() => setTierFilter("needs_improvement")}
              style={{
                borderRadius: 8,
                backgroundColor: tierFilter === "needs_improvement" ? "#ef4444" : undefined,
                color: tierFilter === "needs_improvement" ? "#fff" : undefined,
                borderColor: tierFilter === "needs_improvement" ? "#ef4444" : undefined,
              }}
            >
              <AlertTriangle size={13} style={{ marginRight: 4 }} />
              {isKm ? "ត្រូវយកចិត្តទុកដាក់" : "Needs Attention"}
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
              placeholder={isKm ? "ស្វែងរកឈ្មោះមន្ត្រី ឬអ៊ីមែល..." : "Search officer name, email..."}
              style={{ paddingLeft: 32, fontSize: 13, width: "100%", borderRadius: 8 }}
            />
          </div>
        </div>
      </div>

      {/* Main Officers Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <BarChart3 size={18} color="#3b82f6" />
            {isKm ? "តារាងលទ្ធផលការងារ និងចំណាត់ថ្នាក់មន្ត្រីឥណទាន" : "Loan Officer Scorecard & Performance Matrix"}
          </h2>
          <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
            {isKm ? "បង្ហាញ " : "Showing "}{filteredOfficers.length} {isKm ? "នាក់" : "officers"}
          </span>
        </div>

        <div className="table-container" style={{ margin: 0 }}>
          <table className="table" style={{ width: "100%", fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ padding: "12px 16px" }}>{isKm ? "ឈ្មោះមន្ត្រីឥណទាន" : "Credit Officer"}</th>
                <th style={{ padding: "12px 16px", textAlign: "center" }}>{isKm ? "កម្ចីសកម្ម / សរុប" : "Active / Total"}</th>
                <th style={{ padding: "12px 16px", textAlign: "right" }}>{isKm ? "ផលប័ត្រសរុប" : "Portfolio Volume"}</th>
                <th style={{ padding: "12px 16px", textAlign: "center" }}>{isKm ? "អនុបាតហានិភ័យ" : "PAR > 30d"}</th>
                <th style={{ padding: "12px 16px", textAlign: "center" }}>{isKm ? "អត្រាទារប្រាក់" : "Recovery %"}</th>
                <th style={{ padding: "12px 16px", textAlign: "center" }}>{isKm ? "ពិន្ទុ & ចំណាត់ថ្នាក់" : "Score & Tier"}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: 40, color: "var(--color-text-muted)" }}>
                    <div className="skeleton skeleton-text" style={{ maxWidth: 280, margin: "0 auto" }}></div>
                  </td>
                </tr>
              ) : filteredOfficers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: 50, color: "var(--color-text-muted)" }}>
                    {isKm ? "មិនមានទិន្នន័យមន្ត្រីឥណទានដែលត្រូវនឹងលក្ខខណ្ឌស្វែងរកទេ" : "No loan officers matching your filter"}
                  </td>
                </tr>
              ) : (
                filteredOfficers.map((o, idx) => (
                  <tr key={o.officer_id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                    {/* Name & Ranking */}
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: "50%",
                            background: idx === 0 ? "#fef3c7" : "#f1f5f9",
                            color: idx === 0 ? "#b45309" : "#64748b",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 11,
                            fontWeight: 800,
                          }}
                        >
                          {idx + 1}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{o.name}</div>
                          <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{o.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Active / Total Loans */}
                    <td style={{ padding: "14px 16px", textAlign: "center" }}>
                      <span style={{ fontWeight: 700, color: "#3b82f6" }}>{o.active_loans_count}</span>
                      <span style={{ color: "var(--color-text-muted)", margin: "0 4px" }}>/</span>
                      <span style={{ color: "var(--color-text-muted)" }}>{o.total_originated_loans}</span>
                    </td>

                    {/* Portfolio Volume */}
                    <td style={{ padding: "14px 16px", textAlign: "right" }}>
                      <div style={{ fontWeight: 800, fontSize: 14 }}>
                        {formatCurrency(
                          convertCurrencyAmount(o.portfolio_volume_usd, "USD", baseCurrency, usdToKhrRate),
                          baseCurrency
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: o.overdue_volume_usd > 0 ? "#ef4444" : "var(--color-text-muted)" }}>
                        {isKm ? "ហួសកំណត់៖ " : "Overdue: "}
                        {formatCurrency(
                          convertCurrencyAmount(o.overdue_volume_usd, "USD", baseCurrency, usdToKhrRate),
                          baseCurrency
                        )}
                      </div>
                    </td>

                    {/* PAR Rate */}
                    <td style={{ padding: "14px 16px", textAlign: "center" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          padding: "2px 8px",
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 700,
                          background: o.par_rate_percent > 5 ? "#fef2f2" : (o.par_rate_percent > 3 ? "#fffbeb" : "#ecfdf5"),
                          color: o.par_rate_percent > 5 ? "#b91c1c" : (o.par_rate_percent > 3 ? "#b45309" : "#047857"),
                        }}
                      >
                        {o.par_rate_percent}%
                      </span>
                    </td>

                    {/* Recovery Rate */}
                    <td style={{ padding: "14px 16px", textAlign: "center" }}>
                      <div style={{ fontWeight: 700, color: o.recovery_rate_percent >= 90 ? "#059669" : "#d97706" }}>
                        {o.recovery_rate_percent}%
                      </div>
                    </td>

                    {/* Score & Tier */}
                    <td style={{ padding: "14px 16px", textAlign: "center" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "3px 10px",
                          borderRadius: 12,
                          fontSize: 12,
                          fontWeight: 700,
                          background: o.tier === "excellent" ? "#ecfdf5" : (o.tier === "good" ? "#eff6ff" : "#fef2f2"),
                          color: o.tier === "excellent" ? "#047857" : (o.tier === "good" ? "#1d4ed8" : "#b91c1c"),
                        }}
                      >
                        <Award size={12} />
                        <span>{o.performance_score} / 100</span>
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
