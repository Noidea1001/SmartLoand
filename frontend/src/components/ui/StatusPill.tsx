import { useTranslation } from "react-i18next";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Archive,
  RefreshCw,
} from "lucide-react";

interface StatusPillProps {
  status: string;
}

const STATUS_ICONS: Record<string, any> = {
  active: CheckCircle2,
  paid: CheckCircle2,
  pending_approval: Clock,
  due: Clock,
  upcoming: Clock,
  overdue: AlertTriangle,
  defaulted: AlertTriangle,
  rejected: XCircle,
  closed: Archive,
  written_off: Archive,
  restructured: RefreshCw,
  waived: Archive,
};

const STATUS_NAMES: Record<string, { km: string; en: string }> = {
  active: { km: "សកម្ម", en: "Active" },
  paid: { km: "បានទូទាត់", en: "Paid" },
  pending_approval: { km: "រង់ចាំការអនុម័ត", en: "Pending Approval" },
  due: { km: "ដល់កាលកំណត់", en: "Due" },
  upcoming: { km: "ជិតដល់កំណត់", en: "Upcoming" },
  overdue: { km: "ហួសកាលកំណត់", en: "Overdue" },
  defaulted: { km: "ខកខានសង", en: "Defaulted" },
  rejected: { km: "បានបដិសេធ", en: "Rejected" },
  closed: { km: "បានបញ្ចប់", en: "Closed" },
  written_off: { km: "បានលុបចោល", en: "Written Off" },
  restructured: { km: "រៀបចំរចនាសម្ព័ន្ធឡើងវិញ", en: "Restructured" },
  waived: { km: "បានលើកលែង", en: "Waived" },
};

export default function StatusPill({ status }: StatusPillProps) {
  const { i18n } = useTranslation();
  const Icon = STATUS_ICONS[status];
  const isKm = i18n.language === "km";
  const nameObj = STATUS_NAMES[status];
  const label = nameObj ? (isKm ? nameObj.km : nameObj.en) : status.replace(/_/g, " ");

  return (
    <span className={`status-pill status-${status}`} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
      {Icon && <Icon size={12} strokeWidth={2.4} />}
      <span>{label}</span>
    </span>
  );
}
