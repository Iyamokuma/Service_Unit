import { useState } from "react";
import { api } from "../api.js";
import { Modal } from "../components/Modal.jsx";
import { useToast } from "../components/Toast.jsx";
import { useAdminAuth } from "../AdminContext.jsx";

const ROLES = [
  { value: "super_admin", label: "Super Admin", desc: "Full global access." },
  { value: "service_unit_leader", label: "Service Unit Leader", desc: "Can manage assigned service unit." },
  { value: "sub_unit_leader", label: "Sub-unit Leader", desc: "Can manage assigned sub-unit only." },
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

  async function toggleActive(admin) {
    try {
      await api.updateAdmin(admin.id, { is_active: admin.is_active ? 0 : 1 });
      toast(admin.is_active ? "Admin deactivated." : "Admin activated.", "success");
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
                  <th>Scope</th>
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
                    <td className="sa-text-muted sa-text-sm">{a.role === "super_admin" ? "Global" : `${a.service_unit_name || "—"}${a.sub_unit_name ? ` / ${a.sub_unit_name}` : ""}`}</td>
                    <td><span className={`sa-badge ${a.is_active ? "active" : "inactive"}`}>{a.is_active ? "Active" : "Inactive"}</span></td>
                    <td className="sa-text-muted">{fmtDate(a.last_login)}</td>
                    <td>
                      <div className="sa-table-actions">
                        <button className="sa-btn sa-btn-outline sa-btn-sm" onClick={() => setModal(a)}>Edit</button>
                        {a.id !== +me.id && <button className="sa-btn sa-btn-danger sa-btn-sm" onClick={() => toggleActive(a)}>{a.is_active ? "Deactivate" : "Activate"}</button>}
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
    </>
  );
}

function AdminModal({ open, data, unitList, onClose, onSave, saving }) {
  const isEdit = !!data?.id;
  const [form, setForm] = useState({ full_name: "", username: "", email: "", password: "", role: "service_unit_leader", service_unit_id: "", sub_unit_name: "", is_active: 1 });

  // Sync form when data changes
  if (open && data && form._id !== data.id) {
    setForm({
      _id: data.id,
      full_name: data.full_name || "",
      username:  data.username  || "",
      email:     data.email     || "",
      password:  "",
      role:      data.role      || "service_unit_leader",
      service_unit_id: data.service_unit_id || "",
      sub_unit_name: data.sub_unit_name || "",
      is_active: data.is_active ?? 1,
      id: data.id,
    });
  }
  if (!open && form._id !== undefined) setForm({ full_name: "", username: "", email: "", password: "", role: "service_unit_leader", service_unit_id: "", sub_unit_name: "", is_active: 1 });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const selectedUnit = unitList.find((u) => Number(u.id) === Number(form.service_unit_id));

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

      {form.role !== "super_admin" && (
        <div className="sa-form-row">
          <div className="sa-field">
            <label className="sa-label">Service Unit <span className="sa-required">*</span></label>
            <select className="sa-field-select" value={form.service_unit_id} onChange={(e) => setForm((f) => ({ ...f, service_unit_id: e.target.value, sub_unit_name: "" }))}>
              <option value="">Select unit</option>
              {unitList.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          {form.role === "sub_unit_leader" && (
            <div className="sa-field">
              <label className="sa-label">Sub-unit <span className="sa-required">*</span></label>
              <select className="sa-field-select" value={form.sub_unit_name} onChange={(e) => setForm((f) => ({ ...f, sub_unit_name: e.target.value }))}>
                <option value="">Select sub-unit</option>
                {(selectedUnit?.sub_units || []).map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
