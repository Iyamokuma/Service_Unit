import { useState } from "react";
import { api } from "../api.js";
import { Modal, ConfirmModal } from "../components/Modal.jsx";
import { useToast } from "../components/Toast.jsx";
import { useAdminAuth } from "../AdminContext.jsx";

const ROLES = [
  { value: "super_admin", label: "Super Admin",  desc: "Full access to everything." },
  { value: "unit_admin",  label: "Unit Admin",   desc: "Can view and process their assigned units." },
  { value: "viewer",      label: "Viewer",        desc: "Read-only access to queue." },
];

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function fmtDate(str) {
  if (!str) return "Never";
  const d = new Date(str);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function AdminUsers({ data, units, reload }) {
  const toast        = useToast();
  const { admin: me } = useAdminAuth();
  const admins       = data?.data ?? [];
  const unitList     = units?.data ?? [];

  const [modal,  setModal]  = useState(null); // null | {} | admin
  const [delId,  setDelId]  = useState(null);
  const [saving, setSaving] = useState(false);

  async function save(form) {
    setSaving(true);
    try {
      if (form.id) await api.updateAdmin(form.id, form);
      else         await api.createAdmin(form);
      toast(form.id ? "Admin updated." : "Admin created.", "success");
      setModal(null);
      reload();
    } catch (e) { toast(e.message, "error"); }
    finally { setSaving(false); }
  }

  async function del() {
    try {
      await api.deleteAdmin(delId);
      toast("Admin deleted.", "success");
      setDelId(null);
      reload();
    } catch (e) { toast(e.message, "error"); }
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>Admin Accounts</h2>
          <p className="sa-text-muted sa-text-sm">{admins.length} administrator{admins.length !== 1 ? "s" : ""}</p>
        </div>
        <button className="sa-btn sa-btn-primary" onClick={() => setModal({})}>+ New Admin</button>
      </div>

      <div className="sa-card">
        <div className="sa-table-wrap">
          {admins.length === 0 ? (
            <div className="sa-empty"><div className="sa-empty-icon">👤</div><div className="sa-empty-text">No admins yet.</div></div>
          ) : (
            <table className="sa-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Unit Access</th>
                  <th>Status</th>
                  <th>Last Login</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div className="sa-avatar" style={{ width: 30, height: 30, fontSize: 12 }}>
                          {a.full_name.split(" ").map((w) => w[0]).join("").slice(0,2).toUpperCase()}
                        </div>
                        <div className="sa-fw-600">{a.full_name}</div>
                        {a.id === +me.id && <span className="sa-badge viewer">You</span>}
                      </div>
                    </td>
                    <td className="sa-text-muted">{a.username}</td>
                    <td>{a.email}</td>
                    <td><span className={`sa-badge ${a.role}`}>{a.role.replace("_", " ")}</span></td>
                    <td className="sa-text-muted sa-text-sm">
                      {a.role === "super_admin" ? "All units" : a.unit_access?.length ? `${a.unit_access.length} unit(s)` : "All units"}
                    </td>
                    <td><span className={`sa-badge ${a.is_active ? "active" : "inactive"}`}>{a.is_active ? "Active" : "Inactive"}</span></td>
                    <td className="sa-text-muted">{fmtDate(a.last_login)}</td>
                    <td>
                      <div className="sa-table-actions">
                        <button className="sa-btn sa-btn-outline sa-btn-sm" onClick={() => setModal(a)}>Edit</button>
                        {a.id !== +me.id && (
                          <button className="sa-btn sa-btn-danger sa-btn-sm" onClick={() => setDelId(a.id)}>Delete</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <AdminModal open={!!modal} data={modal} unitList={unitList} onClose={() => setModal(null)} onSave={save} saving={saving} />

      <ConfirmModal
        open={!!delId}
        onClose={() => setDelId(null)}
        onConfirm={del}
        title="Delete Admin"
        message="Are you sure you want to delete this admin account? They will lose access immediately."
        danger
      />
    </>
  );
}

function AdminModal({ open, data, unitList, onClose, onSave, saving }) {
  const isEdit = !!data?.id;
  const [form, setForm] = useState({ full_name: "", username: "", email: "", password: "", role: "viewer", unit_access: [], is_active: 1 });

  // Sync form when data changes
  if (open && data && form._id !== data.id) {
    setForm({
      _id: data.id,
      full_name: data.full_name || "",
      username:  data.username  || "",
      email:     data.email     || "",
      password:  "",
      role:      data.role      || "viewer",
      unit_access: data.unit_access || [],
      is_active: data.is_active ?? 1,
      id: data.id,
    });
  }
  if (!open && form._id !== undefined) setForm({ full_name: "", username: "", email: "", password: "", role: "viewer", unit_access: [], is_active: 1 });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function toggleUnit(uid) {
    setForm((f) => {
      const ua = f.unit_access || [];
      return { ...f, unit_access: ua.includes(uid) ? ua.filter((x) => x !== uid) : [...ua, uid] };
    });
  }

  return (
    <Modal
      open={open} onClose={onClose}
      title={isEdit ? "Edit Admin Account" : "Create Admin Account"}
      size="md"
      footer={<>
        <button className="sa-btn sa-btn-outline" onClick={onClose}>Cancel</button>
        <button className="sa-btn sa-btn-primary" onClick={() => onSave(form)} disabled={saving}>
          {saving ? "Saving…" : (isEdit ? "Save Changes" : "Create")}
        </button>
      </>}
    >
      <div className="sa-form-row">
        <div className="sa-field">
          <label className="sa-label">Full Name <span className="sa-required">*</span></label>
          <input className="sa-input" value={form.full_name} onChange={set("full_name")} placeholder="John Doe" />
        </div>
        <div className="sa-field">
          <label className="sa-label">Username <span className="sa-required">*</span></label>
          <input className="sa-input" value={form.username} onChange={set("username")} placeholder="johndoe" disabled={isEdit} />
        </div>
      </div>
      <div className="sa-field">
        <label className="sa-label">Email <span className="sa-required">*</span></label>
        <input className="sa-input" type="email" value={form.email} onChange={set("email")} placeholder="john@example.com" />
      </div>
      <div className="sa-field">
        <label className="sa-label">{isEdit ? "New Password (leave blank to keep current)" : "Password"} {!isEdit && <span className="sa-required">*</span>}</label>
        <input className="sa-input" type="password" value={form.password} onChange={set("password")} placeholder="Min 8 characters" />
      </div>
      <div className="sa-form-row">
        <div className="sa-field">
          <label className="sa-label">Role</label>
          <select className="sa-field-select" value={form.role} onChange={set("role")}>
            {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <div className="sa-field-hint">{ROLES.find((r) => r.value === form.role)?.desc}</div>
        </div>
        <div className="sa-field">
          <label className="sa-label">Status</label>
          <select className="sa-field-select" value={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: +e.target.value }))}>
            <option value={1}>Active</option>
            <option value={0}>Inactive</option>
          </select>
        </div>
      </div>

      {form.role === "unit_admin" && (
        <div className="sa-field">
          <label className="sa-label">Unit Access <span className="sa-field-hint">(leave empty for all units)</span></label>
          <div className="sa-checkbox-group">
            {unitList.map((u) => (
              <div
                key={u.id}
                className={`sa-checkbox-item${form.unit_access?.includes(u.id) ? " checked" : ""}`}
                onClick={() => toggleUnit(u.id)}
              >
                {form.unit_access?.includes(u.id) && "✓ "}
                {u.name}
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
