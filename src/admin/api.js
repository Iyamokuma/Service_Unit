const DB_KEY = "sm_admin_demo_db_v1";

const seed = {
  admins: [
    { id: 1, full_name: "Super Admin", username: "superadmin", email: "superadmin@smhos.org", role: "super_admin", service_unit_id: null, sub_unit_name: "", is_active: 1, last_login: null, password: "Admin@1234" },
    { id: 2, full_name: "Media Leader", username: "media.leader", email: "media.leader@smhos.org", role: "service_unit_leader", service_unit_id: 2, sub_unit_name: "", is_active: 1, last_login: null, password: "Leader@1234" },
    { id: 3, full_name: "Audio Lead", username: "audio.lead", email: "audio.lead@smhos.org", role: "sub_unit_leader", service_unit_id: 2, sub_unit_name: "Audio", is_active: 1, last_login: null, password: "Subunit@1234" },
  ],
  units: [
    { id: 1, name: "Choir", description: "", coordinator: "Favour John", sort_order: 0, is_active: 1 },
    { id: 2, name: "Media & Service", description: "", coordinator: "Samuel Obi", sort_order: 1, is_active: 1 },
  ],
  sub_units: [
    { id: 1, unit_id: 2, name: "Audio", sort_order: 0, is_active: 1 },
    { id: 2, unit_id: 2, name: "Video", sort_order: 1, is_active: 1 },
  ],
  registrations: [
    { id: 1, first_name: "Chinwe", surname: "Okafor", other_names: "", sex: "Female", marital_status: "Single", nationality: "Nigerian", address: "Port Harcourt", bus_stop: "Rumuokoro", phone1: "+2348031112222", email: "chinwe@example.com", unit_id: 2, unit_name: "Media & Service", sub_unit: "Audio", status: "new", notes: "", submitted_at: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(), photo_path: "" },
    { id: 2, first_name: "Daniel", surname: "Eze", other_names: "", sex: "Male", marital_status: "Married", nationality: "Nigerian", address: "Abuja", bus_stop: "Wuse", phone1: "+2348033334444", email: "daniel@example.com", unit_id: 1, unit_name: "Choir", sub_unit: "", status: "accepted", notes: "", submitted_at: new Date().toISOString(), photo_path: "" },
    { id: 3, first_name: "Peace", surname: "Udo", other_names: "", sex: "Female", marital_status: "Single", nationality: "Nigerian", address: "Lagos", bus_stop: "CMS", phone1: "+2348090001111", email: "peace@example.com", unit_id: 2, unit_name: "Media & Service", sub_unit: "Video", status: "in_progress", notes: "", submitted_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), photo_path: "" },
  ],
  requests: [
    { id: 1, from_admin_id: 1, from_name: "Super Admin", from_role: "super_admin", message: "Welcome to the platform.", status: "resolved", created_at: new Date().toISOString() },
  ],
  settings: {
    templates: {
      approved: "Hello {{name}}, your registration has been approved.",
      rejected: "Hello {{name}}, your registration was not approved.",
      waitlisted: "Hello {{name}}, your registration is currently waitlisted.",
    },
    overdue_threshold_hours: 72,
    permissions: {
      leaders_can_update_queue: true,
      leaders_can_send_requests: true,
      sub_unit_leaders_can_update_queue: true,
    },
  },
  activity: [],
  nextIds: { admin: 4, unit: 3, sub: 3, reg: 4, act: 1, req: 2 },
};

function readDb() {
  try {
    const parsed = JSON.parse(localStorage.getItem(DB_KEY) || "null");
    return parsed || structuredClone(seed);
  } catch {
    return structuredClone(seed);
  }
}
function writeDb(db) { localStorage.setItem(DB_KEY, JSON.stringify(db)); }
function normalizeStatus(s) {
  const map = { pending: "new", approved: "accepted", waitlisted: "in_progress" };
  return map[s] || s || "new";
}
function canAccessRegistration(admin, row) {
  if (!admin || admin.role === "super_admin") return true;
  if (admin.role === "service_unit_leader") return Number(row.unit_id) === Number(admin.service_unit_id);
  if (admin.role === "sub_unit_leader") return Number(row.unit_id) === Number(admin.service_unit_id) && String(row.sub_unit || "").toLowerCase() === String(admin.sub_unit_name || "").toLowerCase();
  return false;
}
function log(db, admin_name, action, entity_type, entity_id, description) {
  db.activity.unshift({
    id: db.nextIds.act++,
    admin_name,
    action,
    entity_type,
    entity_id,
    description,
    ip_address: "browser",
    created_at: new Date().toISOString(),
  });
}
function paginate(rows, page = 1, per_page = 25) {
  const p = Math.max(1, Number(page) || 1);
  const pp = Math.max(1, Number(per_page) || 25);
  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / pp));
  return { data: rows.slice((p - 1) * pp, (p - 1) * pp + pp), pagination: { page: p, per_page: pp, total, pages } };
}
function withUnits(db) {
  return db.units
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name))
    .map((u) => ({
      ...u,
      sub_units: db.sub_units
        .filter((s) => Number(s.unit_id) === Number(u.id))
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name)),
    }));
}

export const api = {
  async login(body) {
    const db = readDb();
    const username = String(body?.username || "").trim().toLowerCase();
    const password = String(body?.password || "");
    const admin = db.admins.find(
      (a) =>
        a.is_active === 1 &&
        (a.username.toLowerCase() === username || a.email.toLowerCase() === username) &&
        a.password === password
    );
    if (!admin) throw new Error("Invalid credentials.");
    admin.last_login = new Date().toISOString();
    writeDb(db);
    log(db, admin.full_name, "admin.login", "admin", admin.id, "Admin logged in");
    writeDb(db);
    return {
      token: `local-${Date.now()}`,
      admin: {
        id: admin.id,
        full_name: admin.full_name,
        username: admin.username,
        email: admin.email,
        role: admin.role,
        service_unit_id: admin.service_unit_id,
        sub_unit_name: admin.sub_unit_name,
      },
    };
  },
  async logout() { return { ok: true }; },

  async stats() {
    const db = readDb();
    const regs = db.registrations;
    const totals = {
      registrations: regs.length,
      pending: regs.filter((r) => normalizeStatus(r.status) === "new").length,
      approved: regs.filter((r) => normalizeStatus(r.status) === "accepted").length,
      rejected: regs.filter((r) => r.status === "rejected").length,
      waitlisted: regs.filter((r) => normalizeStatus(r.status) === "in_progress").length,
      active_units: db.units.filter((u) => u.is_active === 1).length,
      this_week: regs.length,
    };
    const byUnitMap = {};
    regs.forEach((r) => { byUnitMap[r.unit_name || "Unknown"] = (byUnitMap[r.unit_name || "Unknown"] || 0) + 1; });
    const by_unit = Object.entries(byUnitMap).map(([unit_name, cnt]) => ({ unit_name, cnt }));
    const bySexMap = {};
    regs.forEach((r) => { bySexMap[r.sex || "Unknown"] = (bySexMap[r.sex || "Unknown"] || 0) + 1; });
    const by_sex = Object.entries(bySexMap).map(([sex, cnt]) => ({ sex, cnt }));
    const today = new Date();
    const trend = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (13 - i));
      const day = d.toISOString().slice(0, 10);
      const cnt = regs.filter((r) => String(r.submitted_at || "").slice(0, 10) === day).length;
      return { day, cnt };
    });
    return { totals, by_unit, by_sex, trend, recent_activity: db.activity.slice(0, 10) };
  },

  async queue(params = {}) {
    const db = readDb();
    let rows = db.registrations.map((r) => ({ ...r, status: normalizeStatus(r.status) })).sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));
    if (params.viewer) rows = rows.filter((r) => canAccessRegistration(params.viewer, r));
    if (params.status) rows = rows.filter((r) => normalizeStatus(r.status) === normalizeStatus(params.status));
    if (params.unit_id) rows = rows.filter((r) => Number(r.unit_id) === Number(params.unit_id));
    if (params.sex) rows = rows.filter((r) => (r.sex || "") === params.sex);
    if (params.search) {
      const q = String(params.search).toLowerCase();
      rows = rows.filter((r) => `${r.first_name} ${r.surname} ${r.email} ${r.phone1}`.toLowerCase().includes(q));
    }
    if (params.from) rows = rows.filter((r) => String(r.submitted_at).slice(0, 10) >= params.from);
    if (params.to) rows = rows.filter((r) => String(r.submitted_at).slice(0, 10) <= params.to);
    return paginate(rows, params.page, params.per_page);
  },
  async updateStatus(id, body) {
    const db = readDb();
    const row = db.registrations.find((r) => Number(r.id) === Number(id));
    if (!row) throw new Error("Registration not found.");
    const viewer = body.viewer || null;
    if (viewer && !canAccessRegistration(viewer, row)) throw new Error("Not allowed for this queue item.");
    const current = normalizeStatus(row.status);
    const target = normalizeStatus(body.status || current);
    const allowedTransitions = {
      new: ["in_progress", "accepted", "rejected"],
      in_progress: ["accepted", "rejected", "new"],
      accepted: ["accepted"],
      rejected: ["rejected"],
    };
    if (viewer?.role !== "super_admin" && !(allowedTransitions[current] || []).includes(target)) {
      throw new Error("Invalid status transition.");
    }
    row.status = target;
    row.notes = body.notes || "";
    log(db, viewer?.full_name || "Super Admin", "queue.update", "registration", row.id, `Status updated to ${row.status}`);
    writeDb(db);
    return { ok: true };
  },
  async deleteReg(id) {
    const db = readDb();
    db.registrations = db.registrations.filter((r) => Number(r.id) !== Number(id));
    log(db, "Super Admin", "queue.delete", "registration", id, "Registration deleted");
    writeDb(db);
    return { ok: true };
  },

  async units() { return { data: withUnits(readDb()) }; },
  async createUnit(body) {
    const db = readDb();
    const unit = { id: db.nextIds.unit++, name: body.name, description: body.description || "", coordinator: body.coordinator || "", sort_order: Number(body.sort_order || 0), is_active: Number(body.is_active ?? 1) };
    db.units.push(unit);
    log(db, "Super Admin", "unit.create", "unit", unit.id, `Created unit ${unit.name}`);
    writeDb(db);
    return { data: unit };
  },
  async updateUnit(id, body) {
    const db = readDb();
    const unit = db.units.find((u) => Number(u.id) === Number(id));
    if (!unit) throw new Error("Unit not found.");
    Object.assign(unit, { name: body.name, description: body.description || "", coordinator: body.coordinator || "", sort_order: Number(body.sort_order || 0), is_active: Number(body.is_active ?? 1) });
    log(db, "Super Admin", "unit.update", "unit", unit.id, `Updated unit ${unit.name}`);
    writeDb(db);
    return { data: unit };
  },
  async deleteUnit(id) {
    const db = readDb();
    db.units = db.units.filter((u) => Number(u.id) !== Number(id));
    db.sub_units = db.sub_units.filter((s) => Number(s.unit_id) !== Number(id));
    log(db, "Super Admin", "unit.delete", "unit", id, "Deleted unit");
    writeDb(db);
    return { ok: true };
  },

  async createSub(body) {
    const db = readDb();
    const sub = { id: db.nextIds.sub++, unit_id: Number(body.unit_id), name: body.name, sort_order: Number(body.sort_order || 0), is_active: Number(body.is_active ?? 1) };
    db.sub_units.push(sub);
    log(db, "Super Admin", "sub.create", "sub_unit", sub.id, `Created sub-unit ${sub.name}`);
    writeDb(db);
    return { data: sub };
  },
  async updateSub(id, body) {
    const db = readDb();
    const sub = db.sub_units.find((s) => Number(s.id) === Number(id));
    if (!sub) throw new Error("Sub-unit not found.");
    Object.assign(sub, { name: body.name, sort_order: Number(body.sort_order || 0), is_active: Number(body.is_active ?? 1) });
    log(db, "Super Admin", "sub.update", "sub_unit", sub.id, `Updated sub-unit ${sub.name}`);
    writeDb(db);
    return { data: sub };
  },
  async deleteSub(id) {
    const db = readDb();
    db.sub_units = db.sub_units.filter((s) => Number(s.id) !== Number(id));
    log(db, "Super Admin", "sub.delete", "sub_unit", id, "Deleted sub-unit");
    writeDb(db);
    return { ok: true };
  },

  async admins() {
    const db = readDb();
    return {
      data: db.admins.map((a) => ({
        ...(a),
        id: a.id,
        full_name: a.full_name,
        username: a.username,
        email: a.email,
        role: a.role,
        service_unit_name: db.units.find((u) => Number(u.id) === Number(a.service_unit_id))?.name || "",
        service_unit_id: a.service_unit_id ?? null,
        sub_unit_name: a.sub_unit_name || "",
        is_active: a.is_active,
        last_login: a.last_login,
      })),
    };
  },
  async createAdmin(body) {
    const db = readDb();
    if (db.admins.some((a) => a.username.toLowerCase() === String(body.username || "").toLowerCase())) {
      throw new Error("Username already exists.");
    }
    if (body.role !== "super_admin" && !body.service_unit_id) throw new Error("Service unit is required for leaders.");
    if (body.role === "sub_unit_leader" && !body.sub_unit_name) throw new Error("Sub-unit is required for sub-unit leaders.");
    const admin = {
      id: db.nextIds.admin++,
      full_name: body.full_name,
      username: body.username,
      email: body.email,
      password: body.password || "Admin@1234",
      role: body.role || "viewer",
      service_unit_id: body.service_unit_id ? Number(body.service_unit_id) : null,
      sub_unit_name: body.sub_unit_name || "",
      is_active: Number(body.is_active ?? 1),
      last_login: null,
    };
    db.admins.push(admin);
    log(db, "Super Admin", "admin.create", "admin", admin.id, `Created admin ${admin.username}`);
    writeDb(db);
    return { data: admin };
  },
  async updateAdmin(id, body) {
    const db = readDb();
    const admin = db.admins.find((a) => Number(a.id) === Number(id));
    if (!admin) throw new Error("Admin not found.");
    const nextRole = body.role ?? admin.role;
    const nextServiceUnitId = body.service_unit_id !== undefined ? (body.service_unit_id ? Number(body.service_unit_id) : null) : admin.service_unit_id;
    const nextSubUnitName = body.sub_unit_name !== undefined ? body.sub_unit_name : admin.sub_unit_name;
    if (nextRole !== "super_admin" && !nextServiceUnitId) throw new Error("Service unit is required for leaders.");
    if (nextRole === "sub_unit_leader" && !nextSubUnitName) throw new Error("Sub-unit is required for sub-unit leaders.");
    admin.full_name = body.full_name ?? admin.full_name;
    admin.email = body.email ?? admin.email;
    admin.role = body.role ?? admin.role;
    admin.service_unit_id = body.service_unit_id !== undefined ? (body.service_unit_id ? Number(body.service_unit_id) : null) : admin.service_unit_id;
    admin.sub_unit_name = body.sub_unit_name !== undefined ? body.sub_unit_name : admin.sub_unit_name;
    admin.is_active = Number(body.is_active ?? admin.is_active);
    if (body.password) admin.password = body.password;
    log(db, "Super Admin", "admin.update", "admin", admin.id, `Updated admin ${admin.username}`);
    writeDb(db);
    return { data: admin };
  },
  async deleteAdmin(id) {
    const db = readDb();
    db.admins = db.admins.filter((a) => Number(a.id) !== Number(id));
    log(db, "Super Admin", "admin.delete", "admin", id, "Deleted admin");
    writeDb(db);
    return { ok: true };
  },

  async members(params = {}) {
    const db = readDb();
    let rows = db.registrations.map((r) => ({ ...r, status: normalizeStatus(r.status) })).filter((r) => r.status === "accepted");
    if (params.viewer) rows = rows.filter((r) => canAccessRegistration(params.viewer, r));
    if (params.unit_id) rows = rows.filter((r) => Number(r.unit_id) === Number(params.unit_id));
    if (params.search) {
      const q = String(params.search).toLowerCase();
      rows = rows.filter((r) => `${r.first_name} ${r.surname} ${r.email} ${r.phone1}`.toLowerCase().includes(q));
    }
    rows.sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));
    return paginate(rows, params.page, params.per_page || 25);
  },

  async requests(params = {}) {
    const db = readDb();
    let rows = db.requests.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    if (params.status) rows = rows.filter((r) => r.status === params.status);
    if (params.from_admin_id) rows = rows.filter((r) => Number(r.from_admin_id) === Number(params.from_admin_id));
    return paginate(rows, params.page, params.per_page || 25);
  },
  async createRequest(body) {
    const db = readDb();
    const req = {
      id: db.nextIds.req++,
      from_admin_id: Number(body.from_admin_id),
      from_name: body.from_name,
      from_role: body.from_role,
      message: body.message,
      status: "open",
      created_at: new Date().toISOString(),
    };
    db.requests.unshift(req);
    log(db, body.from_name || "Admin", "request.create", "request", req.id, "Created support request");
    writeDb(db);
    return { data: req };
  },
  async updateRequest(id, body) {
    const db = readDb();
    const req = db.requests.find((r) => Number(r.id) === Number(id));
    if (!req) throw new Error("Request not found.");
    req.status = body.status || req.status;
    log(db, "Super Admin", "request.update", "request", req.id, `Request marked ${req.status}`);
    writeDb(db);
    return { data: req };
  },

  async settings() {
    return { data: readDb().settings };
  },
  async updateSettings(body) {
    const db = readDb();
    db.settings = {
      ...db.settings,
      ...body,
      templates: { ...(db.settings?.templates || {}), ...(body.templates || {}) },
      permissions: { ...(db.settings?.permissions || {}), ...(body.permissions || {}) },
    };
    log(db, "Super Admin", "settings.update", "settings", 1, "Updated platform settings");
    writeDb(db);
    return { data: db.settings };
  },

  async activity(params = {}) {
    const db = readDb();
    let rows = db.activity.slice();
    if (params.search) {
      const q = String(params.search).toLowerCase();
      rows = rows.filter((r) => `${r.description} ${r.action} ${r.admin_name}`.toLowerCase().includes(q));
    }
    if (params.action) rows = rows.filter((r) => r.action === params.action);
    if (params.entity) rows = rows.filter((r) => r.entity_type === params.entity);
    if (params.admin_id) rows = rows.filter((r) => String(r.entity_id) === String(params.admin_id) || String(r.admin_id) === String(params.admin_id));
    if (params.from) rows = rows.filter((r) => String(r.created_at).slice(0, 10) >= params.from);
    if (params.to) rows = rows.filter((r) => String(r.created_at).slice(0, 10) <= params.to);
    const result = paginate(rows, params.page, 50);
    const admins = db.admins.map((a) => ({ admin_id: a.id, admin_name: a.full_name }));
    return { ...result, admins };
  },
  async subUnitQueuesByUnit(viewer) {
    const db = readDb();
    const unitId = Number(viewer?.service_unit_id || 0);
    const rows = db.registrations.map((r) => ({ ...r, status: normalizeStatus(r.status) })).filter((r) => Number(r.unit_id) === unitId);
    const grouped = {};
    rows.forEach((r) => {
      const key = r.sub_unit || "No sub-unit";
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(r);
    });
    return { data: Object.entries(grouped).map(([sub_unit, items]) => ({ sub_unit, items: items.sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at)) })) };
  },
  async overdueAlerts(viewer) {
    const db = readDb();
    const threshold = Number(db.settings?.overdue_threshold_hours || 72);
    const now = Date.now();
    const alerts = db.registrations
      .map((r) => ({ ...r, status: normalizeStatus(r.status) }))
      .filter((r) => canAccessRegistration(viewer, r))
      .filter((r) => ["new", "in_progress"].includes(r.status))
      .filter((r) => ((now - new Date(r.submitted_at).getTime()) / (1000 * 60 * 60)) >= threshold)
      .sort((a, b) => new Date(a.submitted_at) - new Date(b.submitted_at));
    return { data: alerts };
  },
};
