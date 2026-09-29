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

export default function StatusPill({ status }: StatusPillProps) {
  const Icon = STATUS_ICONS[status];
  const formatted = status.replace(/_/g, " ");

  return (
    <span className={`status-pill status-${status}`} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
      {Icon && <Icon size={12} strokeWidth={2.4} />}
      <span>{formatted}</span>
    </span>
  );
}
