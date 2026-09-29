import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ShieldCheck, Plus, X, Shield, Lock, Search, Pencil, Trash2 } from "lucide-react";
import { createRole, updateRole, deleteRole, listPermissions, listRoles } from "../../api/roles";
import type { Permission, Role } from "../../api/roles";
import { useToast } from "../../context/ToastContext";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";

export default function RoleList() {
  useDocumentTitle("Roles & Permissions");
  const { t } = useTranslation();
  const toast = useToast();

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
    if (!window.confirm(`Are you sure you want to delete role "${r.name}"?`)) return;
    try {
      await deleteRole(r.id);
      toast.success(`Role "${r.name}" deleted.`, { title: "Role Deleted" });
      load();
    } catch {
      toast.error("Failed to delete role.", { title: "Delete Error" });
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
          <div className="page-subtitle">Configure security roles and fine-grained access policies</div>
        </div>

        <button
          className="btn btn-primary"
          onClick={handleOpenCreate}
        >
          <Plus size={16} />
          <span>Create Role</span>
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
                    {editingRole ? `Edit Role: ${editingRole.name}` : "Create New Role"}
                  </h2>
                  <p className="modal-header-desc" style={{ margin: "2px 0 0", fontSize: 13, color: "var(--color-text-muted)" }}>
                    {editingRole ? "Update permission scope for staff members" : "Assign permission scope for staff members"}
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
                  <label className="form-label" style={{ fontWeight: 600, display: "block", marginBottom: 6 }}>
                    Role Title <span className="required" style={{ color: "var(--color-danger)" }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Credit Risk Auditor, Junior Loan Officer..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{
                      borderRadius: "8px",
                      border: "1px solid var(--color-border)",
                      background: "#ffffff",
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
                      Module Permissions ({selected.size} selected)
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
                      {selected.size === permissions.length ? "Deselect All" : "Select All Available"}
                    </button>
                  </div>

                  <div style={{ display: "grid", gap: 14 }}>
                    {groupedEntries.map(([module, perms]) => {
                      const moduleCodes = perms.map((p) => p.code);
                      const allSelected = moduleCodes.every((c) => selected.has(c));

                      return (
                        <div
                          key={module}
                          style={{
                            background: "#ffffff",
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
                                fontSize: 12,
                                fontWeight: 700,
                                textTransform: "uppercase",
                                letterSpacing: "0.06em",
                                color: "var(--color-text)",
                              }}
                            >
                              {module.replace(/_/g, " ")} Module
                            </span>
                            <button
                              type="button"
                              className="btn btn-xs btn-ghost"
                              onClick={() => toggleModule(perms)}
                              style={{ fontSize: 11 }}
                            >
                              {allSelected ? "Clear Module" : "Select All"}
                            </button>
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8 }}>
                            {perms.map((p) => {
                              const isChecked = selected.has(p.code);
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
                                    border: isChecked ? "1px solid var(--color-border)" : "1px solid transparent",
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
                                    {p.description || p.code}
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
                {submitting ? "Saving..." : editingRole ? "Update Role" : "Save Role"}
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
            placeholder="Search roles or permissions..."
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
                    {r.is_system_default ? "System Protected" : "Custom Tenant Role"}
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
                {r.permission_codes.length} perms
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
                    +{r.permission_codes.length - 10} more
                  </span>
                )}
                {r.permission_codes.length === 0 && (
                  <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>No permissions assigned</span>
                )}
              </div>
            </div>

            <div className="entity-card-actions">
              <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                ID: {r.id.slice(0, 8)}
              </span>
              {r.is_system_default ? (
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-success)", display: "flex", alignItems: "center", gap: 4 }}>
                  <Lock size={12} /> Default
                </span>
              ) : (
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    type="button"
                    className="btn btn-xs btn-ghost"
                    onClick={() => handleOpenEdit(r)}
                    style={{ borderRadius: "6px", display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", fontSize: 11.5 }}
                    title="Edit Role"
                  >
                    <Pencil size={12} /> Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn-xs btn-ghost"
                    onClick={() => handleDelete(r)}
                    style={{ borderRadius: "6px", color: "var(--color-danger)", display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", fontSize: 11.5 }}
                    title="Delete Role"
                  >
                    <Trash2 size={12} /> Delete
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
