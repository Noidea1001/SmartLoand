import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ShieldCheck, Plus, X, Shield, Lock, Search, Pencil, Trash2 } from "lucide-react";
import { createRole, updateRole, deleteRole, listPermissions, listRoles } from "../../api/roles";
import type { Permission, Role } from "../../api/roles";
import { useToast } from "../../context/ToastContext";
import { useConfirm } from "../../context/ConfirmContext";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";

const MODULE_NAMES: Record<string, { km: string; en: string }> = {
  loans: { km: "ឥណទាន & កម្ចី", en: "Loans" },
  payments: { km: "ការទូទាត់សងប្រាក់", en: "Payments" },
  clients: { km: "អតិថិជន & កូនបំណុល", en: "Clients" },
  products: { km: "ផលិតផលឥណទាន", en: "Products" },
  users: { km: "អ្នកប្រើប្រាស់ & តួនាទី", en: "Users & Roles" },
  settings: { km: "ការកំណត់ប្រព័ន្ធ", en: "Settings" },
  reports: { km: "របាយការណ៍ & ផ្ទាំងគ្រប់គ្រង", en: "Reports & Dashboard" },
  branches: { km: "ការគ្រប់គ្រងបណ្តាញសាខា", en: "Branches & Network" },
  calculator: { km: "ម៉ាស៊ីនគណនាកម្ចី", en: "Loan Calculator" },
  field_collection: { km: "ការប្រមូលប្រាក់តាមភូមិ/តំបន់", en: "Field Collection" },
  eod: { km: "ដំណើរការបិទបញ្ជី EOD", en: "End-of-Day Engine" },
  watchlist: { km: "បញ្ជីតាមដានហានិភ័យ & កម្ចីជាន់គ្នា", en: "Risk Watchlist" },
  cbc: { km: "ការិយាល័យឥណទានកម្ពុជា (CBC)", en: "Credit Bureau (CBC)" },
  early_warning: { km: "ប្រព័ន្ធប្រកាសអាសន្នហានិភ័យ (EWS)", en: "Early Warning System" },
  documents: { km: "បណ្ណសារឯកសារ & KYC", en: "Document Vault" },
  collaterals: { km: "ការគ្រប់គ្រងទ្រព្យធានា", en: "Collateral Vault" },
  guarantors: { km: "បញ្ជីអ្នកធានា & ហានិភ័យ", en: "Guarantor Registry" },
  reminders: { km: "ការរំលឹកការសងប្រាក់", en: "Payment Reminders" },
  officers: { km: "ការវិភាគមន្ត្រីឥណទាន", en: "Credit Officers" },
  cashier: { km: "ការបិទបញ្ជីបេឡាប្រចាំថ្ងៃ", en: "Cashier Closing" },
  restructure: { km: "ការរៀបចំរចនាសម្ព័ន្ធកម្ចី", en: "Loan Restructuring" },
  nbc_provisioning: { km: "ការកំណត់សំវិធានធនធានាគារជាតិ (NBC)", en: "NBC Provisioning" },
  writeoffs: { km: "ការលុបបំណុល & តាមដានការទារបំណុលខូច", en: "Loan Write-Offs & Recovery" },
  fx_exchange: { km: "ការប្តូរប្រាក់ទ្វេរបិយប័ណ្ណ & បេឡារង", en: "Dual FX & Petty Cash" },
  telegram_bot: { km: "ប្រព័ន្ធ Telegram Bot ស្វ័យប្រវត្តិ", en: "Telegram Bot Dispatcher" },
  leads: { km: "ប្រព័ន្ធទទួលពាក្យកម្ចីអនឡាញ & QR", en: "Online Loan Intake & Leads" },
};

const PERM_DESCRIPTIONS_KM: Record<string, string> = {
  "loans.create": "ស្នើសុំបង្កើតកម្ចីថ្មី",
  "loans.approve": "អនុម័ត ឬបដិសេធសំណើកម្ចី",
  "loans.edit_rate": "កែសម្រួលអត្រាការប្រាក់កម្ចី",
  "loans.view": "មើលបញ្ជី និងព័ត៌មានលម្អិតកម្ចី",
  "loans.lifecycle": "កត់ត្រាការបង់ផ្តាច់ រៀបចំឡើងវិញ ឬលុបបំណុល",
  "payments.record": "កត់ត្រាការទទួលប្រាក់សងតាមវគ្គ",
  "clients.create": "ចុះឈ្មោះអតិថិជនថ្មី",
  "clients.edit": "កែសម្រួលព័ត៌មានអតិថិជន",
  "clients.delete": "លុបអតិថិជនចេញពីប្រព័ន្ធ",
  "clients.view": "មើលបញ្ជី និងប្រវត្តិរូបអតិថិជន",
  "products.manage": "បង្កើត កែប្រែ ឬលុបផលិតផលកម្ចី",
  "products.view": "មើលផលិតផលកម្ចីទាំងអស់",
  "roles.manage": "គ្រប់គ្រងតួនាទី និងកំណត់សិទ្ធិ",
  "users.manage": "គ្រប់គ្រង និងអញ្ជើញអ្នកប្រើប្រាស់",
  "settings.manage": "គ្រប់គ្រងការកំណត់ទូទៅរបស់ស្ថាប័ន",
  "activity_log.view": "មើលប្រវត្តិកំណត់ហេតុសកម្មភាពប្រព័ន្ធ",
  "reports.view": "មើល និងទាញយករបាយការណ៍ហិរញ្ញវត្ថុ",
  "dashboard.view": "មើលផ្ទាំងគ្រប់គ្រង និងទិន្នន័យវិភាគ",
  "branches.view": "មើលបណ្តាញសាខា និងទិន្នន័យប្រតិបត្តិការ",
  "branches.manage": "បង្កើត កែប្រែ លុបសាខា និងកំណត់ដែនបេឡា",
  "calculator.view": "ប្រើប្រាស់ម៉ាស៊ីនគណនាកម្ចី និងតារាងរំលស់",
  "field_collection.view": "មើលតារាងចុះប្រមូលប្រាក់តាមភូមិ",
  "field_collection.manage": "កត់ត្រាការប្រមូលប្រាក់នៅមូលដ្ឋាន និងចេញបង្កាន់ដៃ",
  "eod.view": "មើលស្ថានភាព និងកំណត់ត្រាបិទបញ្ជី EOD",
  "eod.run": "ដំណើរការបិទបញ្ជីប្រចាំថ្ងៃ និងគិតពិន័យដោយផ្ទាល់",
  "watchlist.view": "មើលបញ្ជីតាមដានហានិភ័យ និងកម្ចីជាន់គ្នា",
  "watchlist.manage": "បញ្ចូល ឬដកអតិថិជនពីបញ្ជីតាមដានហានិភ័យ",
  "cbc.view": "ចូលប្រើប្រាស់មជ្ឈមណ្ឌល CBC",
  "cbc.export": "ទាញយកឯកសាររបាយការណ៍ CBC តាមបទប្បញ្ញត្តិ",
  "ews.view": "មើលសញ្ញាហានិភ័យមុនកាលកំណត់ (EWS)",
  "documents.view": "មើលឯកសារ KYC និងកិច្ចសន្យាក្នុងទូសុវត្ថិភាព",
  "documents.upload": "ផ្ទុកឡើង និងរក្សាទុកឯកសារអតិថិជន",
  "collaterals.view": "មើលបញ្ជី និងទីតាំងតម្កល់ទ្រព្យធានា",
  "collaterals.manage": "កែសម្រួលទីតាំងតម្កល់ និងចេញលិខិតដោះលែងទ្រព្យ",
  "guarantors.view": "មើលបញ្ជីអ្នកធានា និងម៉ាទ្រីសហានិភ័យធានា",
  "reminders.view": "មើលបញ្ជីរំលឹកការសងប្រាក់",
  "reminders.manage": "ផ្ញើសេចក្តីជូនដំណឹងរំលឹកតាម SMS និង Telegram",
  "officers.view": "មើលការវិភាគសមិទ្ធផលមន្ត្រីឥណទាន",
  "cashier.view": "មើលបញ្ជីផ្ទៀងផ្ទាត់ និងថតបេឡាប្រចាំថ្ងៃ",
  "cashier.reconcile": "បិទបញ្ជីបេឡាប្រចាំថ្ងៃ និងបោះពុម្ពប័ណ្ណបិទបញ្ជី",
  "restructure.view": "គណនា និងប្រៀបធៀបការរៀបចំកម្ចីឡើងវិញ",
  "restructure.manage": "ដាក់ស្នើ និងអនុម័តសំណើរៀបចំកម្ចីឡើងវិញ",
  "nbc_provisioning.view": "មើលម៉ាទ្រីសសំវិធានធន និងការគណនាបម្រុងទុក NBC",
  "nbc_provisioning.export": "ទាញយករបាយការណ៍អនុលោមភាពបទប្បញ្ញត្តិ NBC",
  "writeoffs.view": "មើលបញ្ជីកម្ចីខូចដែលបានលុប និងកំណត់ត្រាទារប្រាក់",
  "writeoffs.manage": "ដាក់ស្នើអនុម័តលុបបំណុល និងកត់ត្រាការទារប្រាក់បានមកវិញ",
  "fx_exchange.view": "មើលតារាងប្តូរប្រាក់ FX និងចលនាបេឡារង",
  "fx_exchange.manage": "អនុវត្តប្រតិបត្តិការប្តូរប្រាក់ និងកែសម្រួលសមតុល្យបេឡារង",
  "telegram_bot.view": "មើលកំណត់ត្រាការផ្ញើសារជូនដំណឹង និងសង្ខេបប្រចាំថ្ងៃ",
  "telegram_bot.manage": "កំណត់ Token បូត Telegram និងចុចបញ្ជូនសារស្វ័យប្រវត្តិ",
  "leads.view": "មើលបញ្ជីពាក្យស្នើសុំកម្ចីអនឡាញ និងការវាយតម្លៃបឋម",
  "leads.manage": "ដំណើរការ ចាត់ចែង និងបំប្លែងពាក្យស្នើសុំទៅជាកម្ចីសកម្ម",
};

export default function RoleList() {
  useDocumentTitle("Roles & Permissions");
  const { t, i18n } = useTranslation();
  const isKm = i18n.language === "km";
  const toast = useToast();
  const confirm = useConfirm();

  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");

  function load() {
    listRoles().then(setRoles);
    listPermissions().then(setPermissions);
  }

  useEffect(load, []);

  // Close modal on Escape
  useEffect(() => {
    if (!showForm) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") resetForm();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showForm]);

  function resetForm() {
    setName("");
    setSelected(new Set());
    setEditingRole(null);
    setShowForm(false);
  }

  function handleOpenCreate() {
    resetForm();
    setShowForm(true);
  }

  function handleOpenEdit(r: Role) {
    setEditingRole(r);
    setName(r.name);
    setSelected(new Set(r.permission_codes));
    setShowForm(true);
  }

  function toggle(code: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function toggleModule(perms: Permission[]) {
    const codes = perms.map((p) => p.code);
    const allSelected = codes.every((c) => selected.has(c));

    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        codes.forEach((c) => next.delete(c));
      } else {
        codes.forEach((c) => next.add(c));
      }
      return next;
    });
  }

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      if (editingRole) {
        await updateRole(editingRole.id, name.trim(), Array.from(selected));
        toast.success(`Role "${name.trim()}" updated successfully.`, {
          title: "Role Updated",
        });
      } else {
        await createRole(name.trim(), Array.from(selected));
        toast.success(`Role "${name.trim()}" with ${selected.size} permissions created.`, {
          title: "Role Created",
        });
      }
      resetForm();
      load();
    } catch {
      toast.error(editingRole ? "Failed to update role." : "Failed to create role.", { title: "Role Error" });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(r: Role) {
    const isKm = i18n.language === "km";
    const ok = await confirm({
      title: isKm ? `តើអ្នកចង់លុបតួនាទី "${r.name}" មែនទេ?` : `Delete role "${r.name}"?`,
      message: isKm
        ? "សកម្មភាពនេះនឹងដកហូតសិទ្ធិទាំងអស់ដែលភ្ជាប់ជាមួយតួនាទីនេះ។ តើអ្នកប្រាកដដែរឬទេ?"
        : `Are you sure you want to permanently delete the role "${r.name}"? Users with this role may lose access permissions.`,
      confirmLabel: isKm ? "លុបតួនាទី" : "Delete Role",
      cancelLabel: isKm ? "បោះបង់" : "Cancel",
      danger: true,
    });
    if (!ok) return;

    try {
      await deleteRole(r.id);
      toast.success(
        isKm ? `បានលុបតួនាទី "${r.name}" ដោយជោគជ័យ។` : `Role "${r.name}" deleted.`,
        { title: isKm ? "បានលុប" : "Role Deleted" }
      );
      load();
    } catch {
      toast.error(
        isKm ? "មិនអាចលុបតួនាទីនេះបានទេ។" : "Failed to delete role.",
        { title: isKm ? "កំហុស" : "Delete Error" }
      );
    }
  }

  const grouped: Record<string, Permission[]> = {};
  for (const p of permissions) {
    if (!grouped[p.module]) grouped[p.module] = [];
    grouped[p.module].push(p);
  }
  const groupedEntries: [string, Permission[]][] = Object.entries(grouped);

  const filteredRoles = useMemo(() => {
    if (!search.trim()) return roles;
    const q = search.toLowerCase();
    return roles.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.permission_codes.some((c) => c.toLowerCase().includes(q))
    );
  }, [roles, search]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{t("nav.roles")}</h1>
          <div className="page-subtitle">
            {isKm
              ? "កំណត់រចនាសម្ព័ន្ធតួនាទីសុវត្ថិភាព និងគោលការណ៍សិទ្ធិចូលប្រើប្រាស់លម្អិត"
              : "Configure security roles and fine-grained access policies"}
          </div>
        </div>

        <button
          className="btn btn-primary"
          onClick={handleOpenCreate}
        >
          <Plus size={16} />
          <span>{isKm ? "បង្កើតតួនាទីថ្មី" : "Create Role"}</span>
        </button>
      </div>

      {/* Alert Modal Form for Create / Edit Role */}
      {showForm && (
        <div className="no-print modal-backdrop" onClick={resetForm}>
          <div
            className="modal-box"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 720,
              width: "100%",
              background: "var(--color-surface)",
              borderRadius: "14px",
              boxShadow: "0 20px 45px -10px rgba(0, 0, 0, 0.25)",
              border: "1px solid var(--color-border)",
              display: "flex",
              flexDirection: "column",
              maxHeight: "90vh",
              overflow: "hidden",
            }}
          >
            {/* Modal Header Banner */}
            <div
              className="modal-header-banner"
              style={{
                background: "var(--color-surface)",
                borderBottom: "1px solid var(--color-border)",
                padding: "20px 24px 16px",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 14,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  className="modal-header-badge"
                  style={{
                    backgroundColor: "var(--color-surface-sunken)",
                    color: "var(--color-accent)",
                    borderRadius: "10px",
                    width: 44,
                    height: 44,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <ShieldCheck size={20} />
                </div>
                <div className="modal-header-text">
                  <h2 className="modal-header-title" style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "var(--color-text)" }}>
                    {editingRole
                      ? (isKm ? `កែសម្រួលតួនាទី៖ ${editingRole.name}` : `Edit Role: ${editingRole.name}`)
                      : (isKm ? "បង្កើតតួនាទីថ្មី" : "Create New Role")}
                  </h2>
                  <p className="modal-header-desc" style={{ margin: "2px 0 0", fontSize: 13, color: "var(--color-text-muted)" }}>
                    {editingRole
                      ? (isKm ? "ធ្វើបច្ចុប្បន្នភាពវិសាលភាពសិទ្ធិសម្រាប់បុគ្គលិក" : "Update permission scope for staff members")
                      : (isKm ? "កំណត់វិសាលភាពសិទ្ធិសម្រាប់បុគ្គលិក" : "Assign permission scope for staff members")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="btn-icon"
                onClick={resetForm}
                aria-label="Close"
                style={{ marginTop: -4, marginRight: -4, borderRadius: "8px" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div
              className="modal-body-scroll"
              style={{
                background: "var(--color-surface)",
                padding: "20px 24px",
                overflowY: "auto",
                flex: 1,
              }}
            >
              <form id="role-form" onSubmit={handleSubmit} style={{ display: "grid", gap: 18 }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, display: "block", marginBottom: 6, color: "var(--color-text)" }}>
                    {isKm ? "ឈ្មោះតួនាទី" : "Role Title"} <span className="required" style={{ color: "var(--color-danger)" }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder={isKm ? "ឧ. មន្ត្រីហានិភ័យឥណទាន, ប្រធានសាខា..." : "e.g. Credit Risk Auditor, Junior Loan Officer..."}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{
                      borderRadius: "8px",
                      border: "1px solid var(--color-border)",
                      background: "var(--color-surface)",
                      color: "var(--color-text)",
                      padding: "11px 14px",
                      fontSize: 14.5,
                      width: "100%",
                      fontWeight: 600,
                    }}
                    autoFocus
                  />
                </div>

                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "var(--color-text)" }}>
                      {isKm
                        ? `សិទ្ធិតាមផ្នែក (${selected.size} បានជ្រើសរើស)`
                        : `Module Permissions (${selected.size} selected)`}
                    </span>
                    <button
                      type="button"
                      className="btn btn-xs btn-ghost"
                      onClick={() => {
                        if (selected.size === permissions.length) setSelected(new Set());
                        else setSelected(new Set(permissions.map((p) => p.code)));
                      }}
                      style={{ color: "var(--color-accent)", fontWeight: 600 }}
                    >
                      {selected.size === permissions.length
                        ? (isKm ? "ដោះការជ្រើសរើសទាំងអស់" : "Deselect All")
                        : (isKm ? "ជ្រើសរើសទាំងអស់" : "Select All Available")}
                    </button>
                  </div>

                  <div style={{ display: "grid", gap: 14 }}>
                    {groupedEntries.map(([module, perms]) => {
                      const moduleCodes = perms.map((p) => p.code);
                      const allSelected = moduleCodes.every((c) => selected.has(c));
                      const moduleTitle = MODULE_NAMES[module]?.[isKm ? "km" : "en"] || module.replace(/_/g, " ");

                      return (
                        <div
                          key={module}
                          style={{
                            background: "var(--color-surface-sunken)",
                            borderRadius: "8px",
                            padding: 14,
                            border: "1px solid var(--color-border)",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: 10,
                              paddingBottom: 6,
                              borderBottom: "1px solid var(--color-border)",
                            }}
                          >
                            <span
                              style={{
                                fontSize: 12.5,
                                fontWeight: 700,
                                textTransform: isKm ? "none" : "uppercase",
                                letterSpacing: isKm ? "normal" : "0.06em",
                                color: "var(--color-text)",
                              }}
                            >
                              {moduleTitle}
                            </span>
                            <button
                              type="button"
                              className="btn btn-xs btn-ghost"
                              onClick={() => toggleModule(perms)}
                              style={{ fontSize: 11, color: "var(--color-accent)", fontWeight: 600 }}
                            >
                              {allSelected
                                ? (isKm ? "ដោះការជ្រើសរើសផ្នែកនេះ" : "Clear Module")
                                : (isKm ? "ជ្រើសរើសទាំងអស់" : "Select All")}
                            </button>
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8 }}>
                            {perms.map((p) => {
                              const isChecked = selected.has(p.code);
                              const permDesc = isKm ? (PERM_DESCRIPTIONS_KM[p.code] || p.description) : (p.description || p.code);
                              return (
                                <label
                                  key={p.code}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                    fontSize: 12.5,
                                    padding: "6px 8px",
                                    borderRadius: "8px",
                                    background: isChecked ? "var(--color-accent-soft)" : "transparent",
                                    border: isChecked ? "1px solid var(--color-accent)" : "1px solid transparent",
                                    cursor: "pointer",
                                    transition: "background 0.15s ease",
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => toggle(p.code)}
                                    style={{ accentColor: "var(--color-accent)" }}
                                  />
                                  <span style={{ fontWeight: isChecked ? 600 : 400, color: "var(--color-text)" }}>
                                    {permDesc}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </form>
            </div>

            {/* Modal Footer Bar */}
            <div
              className="modal-footer-bar"
              style={{
                background: "var(--color-surface-sunken)",
                borderTop: "1px solid var(--color-border)",
                padding: "14px 24px 16px",
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
              }}
            >
              <button
                type="button"
                className="btn"
                onClick={resetForm}
                style={{ minWidth: 90, borderRadius: "8px" }}
              >
                {t("common.cancel")}
              </button>
              <button
                type="submit"
                form="role-form"
                className="btn btn-primary"
                disabled={!name.trim() || submitting}
                style={{ minWidth: 120, borderRadius: "8px" }}
              >
                {submitting
                  ? (isKm ? "កំពុងរក្សាទុក..." : "Saving...")
                  : editingRole
                  ? (isKm ? "ធ្វើបច្ចុប្បន្នភាពតួនាទី" : "Update Role")
                  : (isKm ? "រក្សាទុកតួនាទី" : "Save Role")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar Search */}
      <div className="toolbar">
        <div className="search-input-wrapper" style={{ flex: 1, maxWidth: 360 }}>
          <Search size={16} />
          <input
            type="search"
            placeholder={isKm ? "ស្វែងរកតួនាទី ឬសិទ្ធិ..." : "Search roles or permissions..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Role Cards Grid */}
      <div className="entity-card-grid">
        {filteredRoles.map((r) => (
          <div key={r.id} className="entity-card">
            <div className="entity-card-top">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "var(--radius-sm)",
                    background: r.is_system_default ? "rgba(16, 185, 129, 0.12)" : "var(--color-accent-soft)",
                    color: r.is_system_default ? "var(--color-success)" : "var(--color-accent)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Shield size={16} />
                </div>
                <div>
                  <div className="entity-card-title">{r.name}</div>
                  <div className="entity-card-sub">
                    {r.is_system_default
                      ? (isKm ? "ប្រព័ន្ធការពារលំនាំដើម" : "System Protected")
                      : (isKm ? "តួនាទីបង្កើតបន្ថែម" : "Custom Tenant Role")}
                  </div>
                </div>
              </div>

              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "3px 8px",
                  borderRadius: 999,
                  background: "var(--color-surface-sunken)",
                  color: "var(--color-text)",
                  border: "1px solid var(--color-border)",
                }}
              >
                {r.permission_codes.length} {isKm ? "សិទ្ធិ" : "perms"}
              </span>
            </div>

            <div style={{ margin: "10px 0", flex: 1 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, maxHeight: 110, overflowY: "auto" }}>
                {r.permission_codes.slice(0, 10).map((code) => (
                  <span
                    key={code}
                    style={{
                      fontSize: 10.5,
                      fontFamily: "var(--font-sans)",
                      padding: "2px 6px",
                      borderRadius: 4,
                      background: "var(--color-surface-sunken)",
                      color: "var(--color-text-secondary)",
                      border: "1px solid var(--color-border)",
                    }}
                  >
                    {code}
                  </span>
                ))}
                {r.permission_codes.length > 10 && (
                  <span style={{ fontSize: 10.5, color: "var(--color-accent)", fontWeight: 600, padding: "2px 4px" }}>
                    +{r.permission_codes.length - 10} {isKm ? "ផ្សេងទៀត" : "more"}
                  </span>
                )}
                {r.permission_codes.length === 0 && (
                  <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                    {isKm ? "មិនទាន់បានកំណត់សិទ្ធិនៅឡើយទេ" : "No permissions assigned"}
                  </span>
                )}
              </div>
            </div>

            <div className="entity-card-actions">
              <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                ID: {r.id.slice(0, 8)}
              </span>
              {r.is_system_default ? (
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-success)", display: "flex", alignItems: "center", gap: 4 }}>
                  <Lock size={12} /> {isKm ? "លំនាំដើម" : "Default"}
                </span>
              ) : (
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    type="button"
                    className="btn btn-xs btn-ghost"
                    onClick={() => handleOpenEdit(r)}
                    style={{ borderRadius: "6px", display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", fontSize: 11.5 }}
                    title={isKm ? "កែប្រែតួនាទី" : "Edit Role"}
                  >
                    <Pencil size={12} /> {isKm ? "កែប្រែ" : "Edit"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-xs btn-ghost"
                    onClick={() => handleDelete(r)}
                    style={{ borderRadius: "6px", color: "var(--color-danger)", display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", fontSize: 11.5 }}
                    title={isKm ? "លុបតួនាទី" : "Delete Role"}
                  >
                    <Trash2 size={12} /> {isKm ? "លុប" : "Delete"}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
