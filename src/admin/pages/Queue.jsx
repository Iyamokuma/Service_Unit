import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api.js";
import { Modal, ConfirmModal } from "../components/Modal.jsx";
import { useToast } from "../components/Toast.jsx";

const STATUSES = ["pending", "approved", "rejected", "waitlisted"];
const MONTHS   = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function fmtDate(str) {
  if (!str) return "—";
  const d = new Date(str);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}
function fullName(r) { return [r.first_name, r.surname].filter(Boolean).join(" "); }

export function Queue({ units }) {
  const toast = useToast();
  const [rows, setRows]       = useState([]);
  const [pag,  setPag]        = useState({ page: 1, per_page: 25, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [statusModal, setStatusModal] = useState(null); // { id, currentStatus }
  const [deleteModal, setDeleteModal] = useState(null); // id
  const [filters, setFilters] = useState({ search: "", unit_id: "", status: "", sex: "", from: "", to: "", sort: "submitted_at", dir: "DESC" });

  const debounce = useRef(null);

  const load = useCallback(async (params) => {
    setLoading(true);
    try {
      const res = await api.queue({ ...params, page: params.page ?? 1, per_page: 25 });
      setRows(res.data);
      setPag(res.pagination);
    } catch (e) { toast(e.message, "error"); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => {
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => load({ ...filters, page: 1 }), 300);
  }, [filters, load]);

  const setFilter = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }));
  const gotoPage  = (p)  => load({ ...filters, page: p });

  async function updateStatus(id, status, notes) {
    try {
      await api.updateStatus(id, { status, notes });
      toast("Status updated.", "success");
      setStatusModal(null);
      load({ ...filters, page: pag.page });
    } catch (e) { toast(e.message, "error"); }
  }

  async function deleteReg(id) {
    try {
      await api.deleteReg(id);
      toast("Registration deleted.", "success");
      setDeleteModal(null);
      load({ ...filters, page: pag.page });
    } catch (e) { toast(e.message, "error"); }
  }

  const unitOpts = units?.data ?? [];

  return (
    <>
      <div className="sa-card">
        {/* Filters */}
        <div className="sa-filters">
          <div className="sa-search" style={{ minWidth: 240 }}>
            <span className="sa-search-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </span>
            <input placeholder="Search name, email, phone…" value={filters.search} onChange={setFilter("search")} />
          </div>
          <select className="sa-select" value={filters.unit_id} onChange={setFilter("unit_id")}>
            <option value="">All Units</option>
            {unitOpts.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <select className="sa-select" value={filters.status} onChange={setFilter("status")}>
            <option value="">All Statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
          <select className="sa-select" value={filters.sex} onChange={setFilter("sex")}>
            <option value="">All Genders</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
          <input className="sa-date-input" type="date" value={filters.from} onChange={setFilter("from")} title="From date" />
          <input className="sa-date-input" type="date" value={filters.to}   onChange={setFilter("to")}   title="To date" />
          <button className="sa-btn sa-btn-outline sa-btn-sm" onClick={() => setFilters({ search: "", unit_id: "", status: "", sex: "", from: "", to: "", sort: "submitted_at", dir: "DESC" })}>
            Clear
          </button>
          <span className="sa-text-muted sa-text-sm" style={{ marginLeft: "auto", whiteSpace: "nowrap" }}>
            {pag.total} result{pag.total !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Table */}
        <div className="sa-table-wrap">
          {loading ? (
            <div className="sa-loading"><div className="sa-spinner"/><span>Loading…</span></div>
          ) : rows.length === 0 ? (
            <div className="sa-empty"><div className="sa-empty-icon">📋</div><div className="sa-empty-text">No registrations found.</div></div>
          ) : (
            <table className="sa-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Photo</th>
                  <th>Name</th>
                  <th>Unit</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <>
                    <tr key={r.id} style={{ cursor: "pointer" }}>
                      <td className="sa-text-muted">{r.id}</td>
                      <td>
                        {r.photo_path
                          ? <img src={`http://localhost:8080/${r.photo_path}`} className="sa-photo" alt="" />
                          : <div className="sa-photo-placeholder">{(r.first_name?.[0] || "?").toUpperCase()}</div>
                        }
                      </td>
                      <td>
                        <div className="sa-fw-600">{fullName(r)}</div>
                        {r.other_names && <div className="sa-text-sm sa-text-muted">{r.other_names}</div>}
                      </td>
                      <td>
                        <div>{r.unit_name}</div>
                        {r.sub_unit && <div className="sa-text-sm sa-text-muted">{r.sub_unit}</div>}
                      </td>
                      <td>{r.phone1}</td>
                      <td className="sa-truncate">{r.email || "—"}</td>
                      <td><span className={`sa-badge ${r.status}`}>{r.status}</span></td>
                      <td className="sa-text-muted">{fmtDate(r.submitted_at)}</td>
                      <td>
                        <div className="sa-table-actions">
                          <button className="sa-btn sa-btn-ghost sa-btn-sm" onClick={() => setExpanded(expanded === r.id ? null : r.id)} title="Details">
                            {expanded === r.id ? "▲" : "▼"}
                          </button>
                          <button className="sa-btn sa-btn-outline sa-btn-sm" onClick={() => setStatusModal({ id: r.id, status: r.status, notes: r.notes || "" })}>
                            Update
                          </button>
                          <button className="sa-btn sa-btn-danger sa-btn-sm" onClick={() => setDeleteModal(r.id)}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expanded === r.id && (
                      <tr className="sa-detail-row" key={`exp-${r.id}`}>
                        <td colSpan={9}>
                          <div className="sa-detail-inner">
                            <Field label="Date of Birth" value={[r.dob_month, r.dob_day, r.dob_year].filter(Boolean).join(" / ") || "—"} />
                            <Field label="Sex" value={r.sex || "—"} />
                            <Field label="Marital Status" value={r.marital_status || "—"} />
                            <Field label="Nationality" value={r.nationality || "—"} />
                            <Field label="Address" value={r.address} />
                            <Field label="Bus Stop" value={r.bus_stop} />
                            <Field label="Workplace" value={r.workplace || "—"} />
                            <Field label="Tithe Card" value={r.tithe_card || "—"} />
                            <Field label="Homecell" value={r.homecell || "—"} />
                            <Field label="Born Again" value={r.born_again || "—"} />
                            <Field label="Baptised" value={r.baptised || "—"} />
                            <Field label="WOLBI" value={r.wolbi ? `${r.wolbi} — ${r.wolbi_level || ""}` : "—"} />
                            <Field label="Joined Church" value={[r.joined_church_month, r.joined_church_year].filter(Boolean).join(" / ") || "—"} />
                            {r.notes && <Field label="Notes" value={r.notes} />}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {pag.pages > 1 && (
          <div className="sa-pagination">
            <span>Page {pag.page} of {pag.pages} ({pag.total} total)</span>
            <div className="sa-pag-btns">
              <button className="sa-pag-btn" disabled={pag.page <= 1} onClick={() => gotoPage(pag.page - 1)}>‹</button>
              {Array.from({ length: Math.min(7, pag.pages) }, (_, i) => {
                const p = pag.page <= 4 ? i + 1 : pag.page - 3 + i;
                if (p > pag.pages) return null;
                return <button key={p} className={`sa-pag-btn${p === pag.page ? " active" : ""}`} onClick={() => gotoPage(p)}>{p}</button>;
              })}
              <button className="sa-pag-btn" disabled={pag.page >= pag.pages} onClick={() => gotoPage(pag.page + 1)}>›</button>
            </div>
          </div>
        )}
      </div>

      {/* Status update modal */}
      <StatusModal
        open={!!statusModal}
        data={statusModal}
        onClose={() => setStatusModal(null)}
        onSave={updateStatus}
      />

      {/* Delete confirm */}
      <ConfirmModal
        open={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        onConfirm={() => deleteReg(deleteModal)}
        title="Delete Registration"
        message="Are you sure you want to permanently delete this registration? This cannot be undone."
        danger
      />
    </>
  );
}

function StatusModal({ open, data, onClose, onSave }) {
  const [status, setStatus] = useState("");
  const [notes,  setNotes]  = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) { setStatus(data.status); setNotes(data.notes || ""); }
  }, [data]);

  async function save() {
    setSaving(true);
    await onSave(data.id, status, notes);
    setSaving(false);
  }

  return (
    <Modal open={open} onClose={onClose} title="Update Application Status" size="sm"
      footer={<>
        <button className="sa-btn sa-btn-outline" onClick={onClose}>Cancel</button>
        <button className="sa-btn sa-btn-primary" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
      </>}
    >
      <div className="sa-field">
        <label className="sa-label">Status</label>
        <select className="sa-field-select" value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
      </div>
      <div className="sa-field">
        <label className="sa-label">Notes (optional)</label>
        <textarea className="sa-textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add internal notes…" />
      </div>
    </Modal>
  );
}

function Field({ label, value }) {
  return (
    <div className="sa-detail-field">
      <div className="sa-detail-label">{label}</div>
      <div className="sa-detail-value">{value}</div>
    </div>
  );
}
