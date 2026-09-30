import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowRightLeft,
  DollarSign,
  TrendingUp,
  RefreshCw,
  Wallet,
  Receipt,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Shield,
  Clock,
  X,
  Sparkles,
} from "lucide-react";
import {
  getFxSummary,
  convertCurrency,
  managePettyCash,
  type FxSummaryResponse,
  type FxConversion,
  type PettyCashLog,
} from "../../api/reports";
import { formatCurrency } from "../../utils/format";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useToast } from "../../context/ToastContext";

export default function FxExchangeDrawer() {
  const { i18n } = useTranslation();
  const isKm = i18n.language === "km";
  useDocumentTitle(isKm ? "ការប្តូរប្រាក់ FX & បេឡារង" : "Dual FX & Petty Cash Drawer");
  const toast = useToast();

  const [data, setData] = useState<FxSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"conversions" | "drawer">("conversions");

  // Conversion Form State
  const [direction, setDirection] = useState<"USD_TO_KHR" | "KHR_TO_USD">("USD_TO_KHR");
  const [amountIn, setAmountIn] = useState<number>(100);
  const [clientName, setClientName] = useState("");
  const [submittingConv, setSubmittingConv] = useState(false);

  // Petty Cash Modal State
  const [showDrawerModal, setShowDrawerModal] = useState(false);
  const [drawerActionType, setDrawerActionType] = useState<"replenishment" | "withdrawal">("replenishment");
  const [drawerCurrency, setDrawerCurrency] = useState<"USD" | "KHR">("USD");
  const [drawerAmount, setDrawerAmount] = useState<number>(0);
  const [drawerReason, setDrawerReason] = useState("");
  const [submittingDrawer, setSubmittingDrawer] = useState(false);

  function loadData() {
    setLoading(true);
    getFxSummary()
      .then(setData)
      .catch((err) => {
        console.error("Failed to load FX drawer:", err);
        toast.error(isKm ? "បរាជ័យក្នុងការទាញយកទិន្នន័យ FX" : "Failed to load FX drawer summary.");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadData();
  }, []);

  const currentRate = direction === "USD_TO_KHR"
    ? data?.rates.branch_buy_rate || 4060
    : data?.rates.branch_sell_rate || 4100;

  const calculatedOut = direction === "USD_TO_KHR"
    ? Math.round(amountIn * currentRate)
    : (amountIn > 0 ? Number((amountIn / currentRate).toFixed(2)) : 0);

  async function handleExecuteConversion(e: React.FormEvent) {
    e.preventDefault();
    if (amountIn <= 0) {
      toast.error(isKm ? "សូមបញ្ចូលចំនួនទឹកប្រាក់ត្រឹមត្រូវ" : "Please enter a valid amount.");
      return;
    }
    setSubmittingConv(true);
    try {
      await convertCurrency({
        from_currency: direction === "USD_TO_KHR" ? "USD" : "KHR",
        to_currency: direction === "USD_TO_KHR" ? "KHR" : "USD",
        amount_in: amountIn,
        rate: currentRate,
        client_name: clientName || (isKm ? "អតិថិជនទូទៅ" : "Walk-in Customer"),
      });
      toast.success(isKm ? "ការប្តូរប្រាក់ជោគជ័យ និងបានកែប្រែសមតុល្យបេឡារង" : "Currency exchanged and drawer updated successfully.");
      setClientName("");
      loadData();
    } catch (err: any) {
      const msg = err.response?.data?.detail || (isKm ? "បរាជ័យក្នុងការប្តូរប្រាក់" : "Failed to execute conversion.");
      toast.error(msg);
    } finally {
      setSubmittingConv(false);
    }
  }

  async function handlePettyCashMovement(e: React.FormEvent) {
    e.preventDefault();
    if (drawerAmount <= 0) {
      toast.error(isKm ? "សូមបញ្ចូលចំនួនទឹកប្រាក់ត្រឹមត្រូវ" : "Please enter a valid amount.");
      return;
    }
    setSubmittingDrawer(true);
    try {
      await managePettyCash({
        type: drawerActionType,
        currency: drawerCurrency,
        amount: drawerAmount,
        reason: drawerReason || (drawerActionType === "replenishment" ? (isKm ? "បញ្ចូលថវិកាបេឡារង" : "Petty cash replenishment") : (isKm ? "ដកប្រាក់បេឡារង" : "Drawer withdrawal")),
      });
      toast.success(isKm ? "បានធ្វើបច្ចុប្បន្នភាពបេឡារងជោគជ័យ" : "Petty cash updated successfully.");
      setShowDrawerModal(false);
      setDrawerAmount(0);
      setDrawerReason("");
      loadData();
    } catch (err: any) {
      const msg = err.response?.data?.detail || (isKm ? "បរាជ័យក្នុងការកែប្រែបេឡារង" : "Failed to update petty cash.");
      toast.error(msg);
    } finally {
      setSubmittingDrawer(false);
    }
  }

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
              <ArrowRightLeft size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "var(--color-text)" }}>
                {isKm ? "ការប្តូរប្រាក់ទ្វេរបិយប័ណ្ណ & បេឡារង (Dual FX & Petty Cash Drawer)" : "Dual-Currency FX Exchange & Petty Cash Drawer"}
              </h1>
              <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-muted)" }}>
                {isKm
                  ? "គណនាអត្រាប្តូរប្រាក់ USD ⇄ KHR តាមស្តង់ដារធនាគារជាតិ គ្រប់គ្រងចំណេញពីគម្លាត និងតាមដានថតបេឡារង"
                  : "Exchange USD and KHR at official NBC & branch rates, manage spread profits, and reconcile branch petty cash"}
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={loadData}
            className="btn btn-secondary"
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            <span>{isKm ? "ផ្ទុកឡើងវិញ" : "Refresh"}</span>
          </button>
          <button
            onClick={() => {
              setDrawerActionType("replenishment");
              setShowDrawerModal(true);
            }}
            className="btn btn-primary"
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <Plus size={15} />
            <span>{isKm ? "បញ្ចូល/ដកថវិកាបេឡារង" : "Manage Petty Cash"}</span>
          </button>
        </div>
      </div>

      {/* Institutional Exchange Rate Ticker */}
      <div
        className="card"
        style={{
          padding: "16px 20px",
          marginBottom: 24,
          background: "linear-gradient(135deg, var(--color-surface) 0%, var(--color-surface-sunken) 100%)",
          border: "1px solid var(--color-border)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Sparkles size={18} style={{ color: "var(--color-accent)" }} />
            <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--color-text)" }}>
              {isKm ? "អត្រាប្តូរប្រាក់ប្រចាំថ្ងៃផ្លូវការ" : "Today's Official Exchange Rates"}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
            <div>
              <span style={{ fontSize: 11.5, color: "var(--color-text-muted)", display: "block" }}>
                {isKm ? "អត្រាយោងធនាគារជាតិ NBC" : "NBC Reference Rate"}
              </span>
              <span style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text)" }}>
                1 USD = {data ? data.rates.nbc_rate.toLocaleString() : "4,080"} ៛
              </span>
            </div>

            <div style={{ height: 24, width: 1, background: "var(--color-border)" }} />

            <div>
              <span style={{ fontSize: 11.5, color: "var(--color-text-muted)", display: "block" }}>
                {isKm ? "សាខាទិញចូល (Branch Buy USD)" : "Branch Buy (USD)"}
              </span>
              <span style={{ fontSize: 15, fontWeight: 700, color: "var(--color-success)" }}>
                1 USD = {data ? data.rates.branch_buy_rate.toLocaleString() : "4,060"} ៛
              </span>
            </div>

            <div style={{ height: 24, width: 1, background: "var(--color-border)" }} />

            <div>
              <span style={{ fontSize: 11.5, color: "var(--color-text-muted)", display: "block" }}>
                {isKm ? "សាខាលក់ចេញ (Branch Sell USD)" : "Branch Sell (USD)"}
              </span>
              <span style={{ fontSize: 15, fontWeight: 700, color: "var(--color-accent)" }}>
                1 USD = {data ? data.rates.branch_sell_rate.toLocaleString() : "4,100"} ៛
              </span>
            </div>

            <div style={{ height: 24, width: 1, background: "var(--color-border)" }} />

            <div>
              <span style={{ fontSize: 11.5, color: "var(--color-text-muted)", display: "block" }}>
                {isKm ? "គម្លាតចំណេញ (Spread Profit)" : "FX Spread Profit"}
              </span>
              <span style={{ fontSize: 15, fontWeight: 700, color: "var(--color-warning)" }}>
                {data ? `${data.rates.branch_sell_rate - data.rates.branch_buy_rate} ៛/USD` : "40 ៛/USD"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Drawer Balances & Quick Converter */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 20, marginBottom: 24 }}>
        {/* Card 1: Petty Cash Drawer Balances */}
        <div className="card" style={{ padding: "22px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Wallet size={19} style={{ color: "var(--color-accent)" }} />
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--color-text)" }}>
                {isKm ? "សមតុល្យថតបេឡារង (Petty Cash Drawers)" : "Petty Cash Drawer Balances"}
              </h3>
            </div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: "2px 8px",
                borderRadius: 12,
                background: "rgba(16, 185, 129, 0.15)",
                color: "#10b981",
              }}
            >
              {isKm ? "សកម្ម" : "Active Float"}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* USD Drawer */}
            <div
              style={{
                padding: "16px 18px",
                borderRadius: 10,
                background: "var(--color-surface-sunken)",
                border: "1px solid var(--color-border)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-muted)" }}>
                  {isKm ? "ថតប្រាក់ដុល្លារ (USD Drawer)" : "USD Cash Drawer"}
                </span>
                <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                  {isKm ? `ដែនកំណត់: $${data?.drawer.vault_limit_usd.toLocaleString()}` : `Limit: $${data?.drawer.vault_limit_usd.toLocaleString()}`}
                </span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "var(--color-text)" }}>
                {data ? formatCurrency(data.drawer.usd_balance, "USD") : "$0.00"}
              </div>
            </div>

            {/* KHR Drawer */}
            <div
              style={{
                padding: "16px 18px",
                borderRadius: 10,
                background: "var(--color-surface-sunken)",
                border: "1px solid var(--color-border)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-muted)" }}>
                  {isKm ? "ថតប្រាក់រៀល (KHR Drawer)" : "KHR Cash Drawer"}
                </span>
                <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                  {isKm ? `ដែនកំណត់: ${data?.drawer.vault_limit_khr.toLocaleString()} ៛` : `Limit: ${data?.drawer.vault_limit_khr.toLocaleString()} ៛`}
                </span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "var(--color-text)" }}>
                {data ? formatCurrency(data.drawer.khr_balance, "KHR") : "0 ៛"}
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Interactive FX Currency Conversion Form */}
        <div className="card" style={{ padding: "22px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <ArrowRightLeft size={19} style={{ color: "var(--color-accent)" }} />
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--color-text)" }}>
                {isKm ? "ម៉ាស៊ីនប្តូរប្រាក់រហ័ស (Quick FX Converter)" : "Quick FX Currency Converter"}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setDirection(direction === "USD_TO_KHR" ? "KHR_TO_USD" : "USD_TO_KHR")}
              className="btn btn-secondary"
              style={{ fontSize: 12, padding: "4px 10px", display: "flex", alignItems: "center", gap: 5 }}
            >
              <ArrowRightLeft size={13} />
              <span>{direction === "USD_TO_KHR" ? "USD ➔ KHR" : "KHR ➔ USD"}</span>
            </button>
          </div>

          <form onSubmit={handleExecuteConversion}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 5 }}>
                  {isKm
                    ? `ចំនួនទឹកប្រាក់ប្តូរចូល (${direction === "USD_TO_KHR" ? "USD" : "KHR"}) *`
                    : `Amount In (${direction === "USD_TO_KHR" ? "USD" : "KHR"}) *`}
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  step="any"
                  value={amountIn || ""}
                  onChange={(e) => setAmountIn(parseFloat(e.target.value) || 0)}
                  className="input"
                  style={{ width: "100%", fontSize: 16, fontWeight: 600 }}
                />
              </div>

              {/* Calculated Result Display */}
              <div
                style={{
                  padding: "14px 16px",
                  borderRadius: 8,
                  background: "var(--color-surface-sunken)",
                  border: "1px dashed var(--color-border)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <span style={{ fontSize: 11.5, color: "var(--color-text-muted)", display: "block" }}>
                    {isKm ? "ទឹកប្រាក់ត្រូវបើកជូន (Amount Out)" : "Customer Receives"}
                  </span>
                  <span style={{ fontSize: 20, fontWeight: 700, color: "var(--color-success)" }}>
                    {direction === "USD_TO_KHR"
                      ? `${calculatedOut.toLocaleString()} ៛`
                      : `$${calculatedOut.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: 11.5, color: "var(--color-text-muted)", display: "block" }}>
                    {isKm ? "អត្រាអនុវត្ត" : "Applied Rate"}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text)" }}>
                    {currentRate.toLocaleString()} ៛
                  </span>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 5 }}>
                  {isKm ? "ឈ្មោះអតិថិជន (Client Name)" : "Customer / Borrower Name"}
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder={isKm ? "ឧ. សុខ វិបុល" : "e.g. Sok Vibul"}
                  className="input"
                  style={{ width: "100%" }}
                />
              </div>

              <button
                type="submit"
                disabled={submittingConv || amountIn <= 0}
                className="btn btn-primary"
                style={{ width: "100%", padding: "10px 0", marginTop: 4, fontWeight: 600 }}
              >
                {submittingConv
                  ? (isKm ? "កំពុងដំណើរការ..." : "Processing...")
                  : (isKm ? "អនុវត្តការប្តូរប្រាក់ និងទូទាត់" : "Execute Conversion & Dispense")}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Tabs & Table */}
      <div className="card" style={{ padding: "20px 24px" }}>
        <div style={{ display: "flex", gap: 12, borderBottom: "1px solid var(--color-border)", paddingBottom: 14, marginBottom: 16 }}>
          <button
            onClick={() => setActiveTab("conversions")}
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              background: activeTab === "conversions" ? "var(--color-accent)" : "transparent",
              color: activeTab === "conversions" ? "#ffffff" : "var(--color-text-muted)",
            }}
          >
            {isKm ? "ប្រវត្តិប្តូរប្រាក់ FX (Recent Conversions)" : "Recent FX Conversions"}
          </button>
          <button
            onClick={() => setActiveTab("drawer")}
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              background: activeTab === "drawer" ? "var(--color-accent)" : "transparent",
              color: activeTab === "drawer" ? "#ffffff" : "var(--color-text-muted)",
            }}
          >
            {isKm ? "កំណត់ហេតុបេឡារង Petty Cash Logs" : "Petty Cash Drawer Logs"}
          </button>
        </div>

        {activeTab === "conversions" ? (
          <div style={{ overflowX: "auto" }}>
            <table className="table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>{isKm ? "លេខកូដ / ម៉ោង" : "Transaction ID / Time"}</th>
                  <th>{isKm ? "អតិថិជន" : "Customer"}</th>
                  <th>{isKm ? "ប្តូរចូល (In)" : "Amount In"}</th>
                  <th>{isKm ? "បើកចេញ (Out)" : "Amount Out"}</th>
                  <th>{isKm ? "អត្រាប្តូរប្រាក់" : "Rate"}</th>
                  <th>{isKm ? "ចំណេញពីគម្លាត" : "Spread Profit"}</th>
                  <th>{isKm ? "មន្ត្រីបេឡា" : "Teller / Officer"}</th>
                </tr>
              </thead>
              <tbody>
                {data?.conversions.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: "var(--color-text)" }}>{c.id}</div>
                      <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{c.created_at}</div>
                    </td>
                    <td style={{ fontWeight: 600 }}>{c.client_name}</td>
                    <td style={{ fontWeight: 600, color: "var(--color-text)" }}>
                      {formatCurrency(c.amount_in, c.from_currency as any)}
                    </td>
                    <td style={{ fontWeight: 700, color: "var(--color-success)" }}>
                      {formatCurrency(c.amount_out, c.to_currency as any)}
                    </td>
                    <td>{c.rate.toLocaleString()} ៛</td>
                    <td style={{ fontWeight: 600, color: "var(--color-accent)" }}>
                      +${c.spread_gain_usd.toFixed(2)}
                    </td>
                    <td>{c.officer}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>{isKm ? "កាលបរិច្ឆេទ" : "Date"}</th>
                  <th>{isKm ? "ប្រភេទប្រតិបត្តិការ" : "Type"}</th>
                  <th>{isKm ? "រូបិយប័ណ្ណ & ចំនួន" : "Currency & Amount"}</th>
                  <th>{isKm ? "មូលហេតុ" : "Reason"}</th>
                  <th>{isKm ? "មន្ត្រីអនុវត្ត" : "Authorized By"}</th>
                </tr>
              </thead>
              <tbody>
                {data?.drawer_logs.map((log) => (
                  <tr key={log.id}>
                    <td>{log.date}</td>
                    <td>
                      <span
                        style={{
                          fontSize: 11.5,
                          fontWeight: 600,
                          padding: "3px 8px",
                          borderRadius: 6,
                          background:
                            log.type === "replenishment"
                              ? "rgba(16, 185, 129, 0.15)"
                              : "rgba(239, 68, 68, 0.15)",
                          color: log.type === "replenishment" ? "#10b981" : "#ef4444",
                        }}
                      >
                        {log.type === "replenishment"
                          ? (isKm ? "បញ្ចូលថវិកា (Replenish)" : "Replenishment")
                          : (isKm ? "ដកថវិកា (Withdraw)" : "Withdrawal")}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: "var(--color-text)" }}>
                      {formatCurrency(log.amount, log.currency as any)}
                    </td>
                    <td>{log.reason}</td>
                    <td>{log.officer}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Manage Petty Cash Drawer */}
      {showDrawerModal && (
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--color-text)" }}>
                {isKm ? "បញ្ចូល / ដកថវិកាបេឡារង (Petty Cash Drawer)" : "Manage Petty Cash Drawer"}
              </h3>
              <button
                onClick={() => setShowDrawerModal(false)}
                style={{ background: "none", border: "none", color: "var(--color-text-muted)", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handlePettyCashMovement}>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 5 }}>
                      {isKm ? "ប្រភេទសកម្មភាព" : "Action Type"}
                    </label>
                    <select
                      value={drawerActionType}
                      onChange={(e) => setDrawerActionType(e.target.value as any)}
                      className="input"
                      style={{ width: "100%" }}
                    >
                      <option value="replenishment">{isKm ? "បញ្ចូលថវិកា (Replenish)" : "Replenishment"}</option>
                      <option value="withdrawal">{isKm ? "ដកថវិកា (Withdraw)" : "Withdrawal"}</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 5 }}>
                      {isKm ? "រូបិយប័ណ្ណ" : "Currency"}
                    </label>
                    <select
                      value={drawerCurrency}
                      onChange={(e) => setDrawerCurrency(e.target.value as any)}
                      className="input"
                      style={{ width: "100%" }}
                    >
                      <option value="USD">USD ($)</option>
                      <option value="KHR">KHR (៛)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 5 }}>
                    {isKm ? `ចំនួនទឹកប្រាក់ (${drawerCurrency}) *` : `Amount (${drawerCurrency}) *`}
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    step="any"
                    value={drawerAmount || ""}
                    onChange={(e) => setDrawerAmount(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="input"
                    style={{ width: "100%" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 5 }}>
                    {isKm ? "មូលហេតុនៃការចល័តថវិកា" : "Reason / Purpose"}
                  </label>
                  <textarea
                    rows={2}
                    value={drawerReason}
                    onChange={(e) => setDrawerReason(e.target.value)}
                    placeholder={isKm ? "ឧ. បើកថវិកាបេឡារងប្រចាំព្រឹក ឬផ្ទេរចូលទូសុវត្ថិភាព..." : "e.g. Morning float replenishment or vault remittance..."}
                    className="input"
                    style={{ width: "100%", resize: "vertical" }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={() => setShowDrawerModal(false)}
                    className="btn btn-secondary"
                  >
                    {isKm ? "បោះបង់" : "Cancel"}
                  </button>
                  <button type="submit" disabled={submittingDrawer} className="btn btn-primary">
                    {submittingDrawer ? (isKm ? "កំពុងរក្សាទុក..." : "Saving...") : (isKm ? "អនុវត្ត" : "Confirm")}
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
