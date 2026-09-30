import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Send,
  BellRing,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Key,
  MessageSquare,
  Clock,
  Sparkles,
  Smartphone,
  Save,
  Radio,
} from "lucide-react";
import {
  getTelegramConfig,
  saveTelegramConfig,
  dispatchTelegramBriefing,
  type TelegramConfigResponse,
} from "../../api/reports";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useToast } from "../../context/ToastContext";

export default function TelegramBotDispatcher() {
  const { i18n } = useTranslation();
  const isKm = i18n.language === "km";
  useDocumentTitle(isKm ? "ប្រព័ន្ធ Telegram Bot ស្វ័យប្រវត្តិ" : "Automated Telegram Bot Dispatcher");
  const toast = useToast();

  const [config, setConfig] = useState<TelegramConfigResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dispatching, setDispatching] = useState(false);

  // Form states
  const [botToken, setBotToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [briefingTime, setBriefingTime] = useState("08:00 AM");
  const [notifyDelinquency, setNotifyDelinquency] = useState(true);
  const [notifyApprovals, setNotifyApprovals] = useState(true);
  const [notifyEod, setNotifyEod] = useState(true);
  const [enabled, setEnabled] = useState(true);

  // Live preview message
  const [previewMsg, setPreviewMsg] = useState<string>("");

  function loadConfig() {
    setLoading(true);
    getTelegramConfig()
      .then((cfg) => {
        setConfig(cfg);
        setBotToken(cfg.bot_token || "");
        setChatId(cfg.chat_id || "@smartloan_cambodia_alerts");
        setBriefingTime(cfg.briefing_time || "08:00 AM");
        setNotifyDelinquency(cfg.notify_delinquency);
        setNotifyApprovals(cfg.notify_approvals);
        setNotifyEod(cfg.notify_eod);
        setEnabled(cfg.enabled);
      })
      .catch((err) => {
        console.error("Failed to load Telegram bot config:", err);
        toast.error(isKm ? "បរាជ័យក្នុងការទាញយកការកំណត់ Telegram" : "Failed to load Telegram configuration.");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadConfig();
  }, []);

  async function handleSaveConfig(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await saveTelegramConfig({
        enabled,
        bot_token: botToken,
        chat_id: chatId,
        briefing_time: briefingTime,
        notify_delinquency: notifyDelinquency,
        notify_approvals: notifyApprovals,
        notify_eod: notifyEod,
      });
      toast.success(isKm ? "បានរក្សាទុកការកំណត់ Telegram Bot ជោគជ័យ" : "Telegram bot configuration saved successfully.");
      loadConfig();
    } catch {
      toast.error(isKm ? "បរាជ័យក្នុងការរក្សាទុក" : "Failed to save Telegram settings.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDispatchNow() {
    setDispatching(true);
    try {
      const res = await dispatchTelegramBriefing();
      setPreviewMsg(res.message_preview);
      if (res.status === "delivered") {
        toast.success(isKm ? "បានបញ្ជូនរបាយការណ៍សង្ខេបទៅកាន់ Telegram ជោគជ័យ!" : "Briefing sent to Telegram successfully!");
      } else {
        toast.success(isKm ? "បានបង្កើតសារសង្ខេប និងកត់ត្រាកំណត់ហេតុជោគជ័យ (សាកល្បង)" : "Briefing simulation logged successfully!");
      }
      loadConfig();
    } catch {
      toast.error(isKm ? "បរាជ័យក្នុងការបញ្ជូនសារ" : "Failed to dispatch Telegram briefing.");
    } finally {
      setDispatching(false);
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
                background: "rgba(59, 130, 246, 0.15)",
                color: "#3b82f6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Send size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "var(--color-text)" }}>
                {isKm ? "ប្រព័ន្ធ Telegram Bot ស្វ័យប្រវត្តិ (Automated Morning Dispatcher)" : "Automated Daily Morning Telegram Bot Dispatcher"}
              </h1>
              <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-muted)" }}>
                {isKm
                  ? "ផ្ញើសារសង្ខេបប្រតិបត្តិការប្រចាំព្រឹក គណនីត្រូវប្រមូល និងដំណឹងឥណទានយឺតយ៉ាវទៅកាន់គ្រុប Telegram ថ្នាក់ដឹកនាំ"
                  : "Broadcast daily 8:00 AM executive briefings, payment collection schedules, and delinquency alerts to Telegram groups"}
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={loadConfig}
            className="btn btn-secondary"
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            <span>{isKm ? "ផ្ទុកឡើងវិញ" : "Refresh"}</span>
          </button>
          <button
            onClick={handleDispatchNow}
            disabled={dispatching}
            className="btn btn-primary"
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <Send size={15} className={dispatching ? "animate-spin" : ""} />
            <span>{isKm ? "ផ្ញើសារសង្ខេបពេលព្រឹកឥឡូវនេះ" : "Send Briefing Now"}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Bot Config Form + Phone Preview */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: 20, marginBottom: 24 }}>
        {/* Form: Bot Configuration */}
        <div className="card" style={{ padding: "22px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Key size={19} style={{ color: "var(--color-accent)" }} />
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--color-text)" }}>
                {isKm ? "ការកំណត់ Telegram API & កាលវិភាគ" : "Bot Credentials & Triggers"}
              </h3>
            </div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: "2px 8px",
                borderRadius: 12,
                background: enabled ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                color: enabled ? "#10b981" : "#ef4444",
              }}
            >
              {enabled ? (isKm ? "បើកដំណើរការ" : "Active") : (isKm ? "បិទ" : "Disabled")}
            </span>
          </div>

          <form onSubmit={handleSaveConfig}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 5 }}>
                  {isKm ? "Telegram Bot Token (ពី @BotFather)" : "Telegram Bot API Token"}
                </label>
                <input
                  type="password"
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ..."
                  className="input"
                  style={{ width: "100%", fontFamily: "monospace", fontSize: 13 }}
                />
                <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", marginTop: 4 }}>
                  {isKm
                    ? "ប្រសិនបើទុកទទេ ប្រព័ន្ធនឹងដំណើរការក្នុងរបៀបសាកល្បង (Simulated Mode)"
                    : "Leave blank to run in simulated test logging mode"}
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 5 }}>
                  {isKm ? "Channel / Group Chat ID *" : "Channel / Group Chat ID *"}
                </label>
                <input
                  type="text"
                  required
                  value={chatId}
                  onChange={(e) => setChatId(e.target.value)}
                  placeholder="@smartloan_cambodia_alerts ឬ -100xxxxxxxxxx"
                  className="input"
                  style={{ width: "100%" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 5 }}>
                    {isKm ? "ម៉ោងផ្ញើសង្ខេបប្រចាំព្រឹក" : "Morning Briefing Time"}
                  </label>
                  <select
                    value={briefingTime}
                    onChange={(e) => setBriefingTime(e.target.value)}
                    className="input"
                    style={{ width: "100%" }}
                  >
                    <option value="07:30 AM">07:30 AM</option>
                    <option value="08:00 AM">08:00 AM</option>
                    <option value="08:30 AM">08:30 AM</option>
                    <option value="09:00 AM">09:00 AM</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 5 }}>
                    {isKm ? "ស្ថានភាពប្រព័ន្ធ" : "Dispatcher Switch"}
                  </label>
                  <select
                    value={enabled ? "yes" : "no"}
                    onChange={(e) => setEnabled(e.target.value === "yes")}
                    className="input"
                    style={{ width: "100%" }}
                  >
                    <option value="yes">{isKm ? "បើកស្វ័យប្រវត្តិ" : "Enabled"}</option>
                    <option value="no">{isKm ? "ផ្អាកបណ្តោះអាសន្ន" : "Disabled"}</option>
                  </select>
                </div>
              </div>

              {/* Notification Toggles */}
              <div
                style={{
                  padding: "14px 16px",
                  borderRadius: 10,
                  background: "var(--color-surface-sunken)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--color-text)" }}>
                  {isKm ? "មុខងារជូនដំណឹងដែលត្រូវបញ្ចូលក្នុងរបាយការណ៍" : "Included Broadcast Modules"}
                </span>

                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={notifyDelinquency}
                    onChange={(e) => setNotifyDelinquency(e.target.checked)}
                  />
                  <span>{isKm ? "ការប្រមូលប្រាក់ត្រូវសង & ឥណទានហួសកាលកំណត់ (Overdue)" : "Today's collections & overdue debt count"}</span>
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={notifyApprovals}
                    onChange={(e) => setNotifyApprovals(e.target.checked)}
                  />
                  <span>{isKm ? "សំណើកម្ចីថ្មីរង់ចាំការពិនិត្យ & អនុម័ត" : "Pending loan approvals queue count"}</span>
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={notifyEod}
                    onChange={(e) => setNotifyEod(e.target.checked)}
                  />
                  <span>{isKm ? "ស្ថានភាពបិទបញ្ជី EOD & ចលនាបេឡា" : "EOD batch processing status & cashier"}</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="btn btn-primary"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 4 }}
              >
                <Save size={15} />
                <span>{saving ? (isKm ? "កំពុងរក្សាទុក..." : "Saving...") : (isKm ? "រក្សាទុកការកំណត់" : "Save Bot Settings")}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Card 2: Interactive Telegram Message Simulation / Preview */}
        <div className="card" style={{ padding: "22px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Smartphone size={19} style={{ color: "var(--color-accent)" }} />
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--color-text)" }}>
                {isKm ? "ទម្រង់សារបង្ហាញក្នុង Telegram (Live Feed Preview)" : "Telegram Live Message Preview"}
              </h3>
            </div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: "2px 8px",
                borderRadius: 12,
                background: "var(--color-surface-sunken)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text-muted)",
              }}
            >
              Markdown Feed
            </span>
          </div>

          <div
            style={{
              borderRadius: 12,
              background: "var(--color-surface-sunken)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text)",
              padding: "20px 22px",
              fontFamily: "system-ui, -apple-system, sans-serif",
              fontSize: 13.5,
              lineHeight: 1.7,
              whiteSpace: "pre-line",
              minHeight: 280,
            }}
          >
            {previewMsg || (
              <>
                <strong>របាយការណ៍សង្ខេបប្រតិបត្តិការប្រចាំព្រឹក (Morning Executive Briefing)</strong>{"\n"}
                កាលបរិច្ឆេទ: {new Date().toLocaleDateString("en-GB")}{"\n"}
                ស្ថាប័ន: Smart Loan Cambodia MFI{"\n"}
                ----------------------------------------{"\n\n"}
                <strong>១. ការប្រមូលប្រាក់ត្រូវសងថ្ងៃនេះ:</strong>{"\n"}
                {"  "}• ចំនួនវគ្គត្រូវប្រមូល: <strong>14</strong> គណនី{"\n"}
                {"  "}• សមតុល្យដុល្លារ: <strong>$4,250.00 USD</strong>{"\n"}
                {"  "}• សមតុល្យរៀល: <strong>8,450,000 KHR</strong>{"\n\n"}
                <strong>២. ស្ថានភាពហានិភ័យ & ឥណទានហួសកាលកំណត់:</strong>{"\n"}
                {"  "}• គណនីហួសកាលកំណត់ (Overdue): <strong>3</strong> គណនី{"\n\n"}
                <strong>៣. សំណើកម្ចីថ្មីរង់ចាំការពិនិត្យ & អនុម័ត:</strong>{"\n"}
                {"  "}• សំណើរង់ចាំអនុម័ត: <strong>2</strong> កម្ចី{"\n\n"}
                <em>សេចក្តីជូនដំណឹង: សូមមន្ត្រីឥណទាន និងមេបេឡាត្រួតពិនិត្យតារាងប្រមូលប្រាក់ និងផ្ទៀងផ្ទាត់ថតបេឡារបស់ខ្លួន។</em>
              </>
            )}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", marginTop: 10, textAlign: "right" }}>
            {isKm ? "បញ្ជូនស្វ័យប្រវត្តិតាម Telegram Bot API" : "Dispatched via Telegram Bot API with Markdown Formatting"}
          </div>
        </div>
      </div>

      {/* Dispatch History Log Table */}
      <div className="card" style={{ padding: "20px 24px" }}>
        <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 700, color: "var(--color-text)" }}>
          {isKm ? "ប្រវត្តិកំណត់ហេតុការផ្ញើសារសង្ខេប (Dispatch Logs)" : "Recent Telegram Dispatch History"}
        </h3>

        <div style={{ overflowX: "auto" }}>
          <table className="table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>{isKm ? "លេខសម្គាល់ / ម៉ោងបញ្ជូន" : "Log ID / Timestamp"}</th>
                <th>{isKm ? "គោលដៅទទួល" : "Target Recipient"}</th>
                <th>{isKm ? "ខ្លឹមសារសង្ខេប" : "Content Summary"}</th>
                <th>{isKm ? "ស្ថានភាព" : "Status"}</th>
              </tr>
            </thead>
            <tbody>
              {config?.dispatch_logs.map((log) => (
                <tr key={log.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: "var(--color-text)" }}>{log.id}</div>
                    <div style={{ fontSize: 11.5, color: "var(--color-text-muted)" }}>{log.dispatched_at}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: "var(--color-accent)" }}>{log.recipient}</div>
                    <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{log.chat_id}</div>
                  </td>
                  <td style={{ fontSize: 13 }}>{log.content_summary}</td>
                  <td>
                    <span
                      style={{
                        fontSize: 11.5,
                        fontWeight: 600,
                        padding: "3px 8px",
                        borderRadius: 6,
                        background:
                          log.status.includes("success") || log.status === "delivered"
                            ? "rgba(16, 185, 129, 0.15)"
                            : "rgba(245, 158, 11, 0.15)",
                        color:
                          log.status.includes("success") || log.status === "delivered"
                            ? "#10b981"
                            : "#f59e0b",
                      }}
                    >
                      {log.status === "delivered"
                        ? isKm
                          ? "បានបញ្ជូនជោគជ័យ"
                          : "Delivered"
                        : log.status.includes("success")
                        ? isKm
                          ? "សាកល្បងជោគជ័យ"
                          : "Simulated Success"
                        : log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
