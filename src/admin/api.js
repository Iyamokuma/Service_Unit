const BASE = "http://localhost:8080/admin";

function token() {
  return localStorage.getItem("admin_token") || "";
}

async function req(path, options = {}) {
  const url = `${BASE}${path}`;
  const headers = {
    ...(options.body && !(options.body instanceof FormData)
      ? { "Content-Type": "application/json" }
      : {}),
    Authorization: `Bearer ${token()}`,
    ...(options.headers || {}),
  };
  const res = await fetch(url, { ...options, headers });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json;
}

export const api = {
  // Auth
  login:  (body) => req("/login.php",  { method: "POST", body: JSON.stringify(body) }),
  logout: ()     => req("/logout.php", { method: "POST" }),

  // Stats
  stats:  () => req("/stats.php"),

  // Queue
  queue:  (params = {}) => req("/queue.php?" + new URLSearchParams(params)),
  updateStatus: (id, body) =>
    req("/queue.php?id=" + id, { method: "PATCH", body: JSON.stringify(body) }),
  deleteReg: (id) => req("/queue.php?id=" + id, { method: "DELETE" }),

  // Units
  units:      ()     => req("/units.php"),
  createUnit: (body) => req("/units.php",        { method: "POST",   body: JSON.stringify(body) }),
  updateUnit: (id, body) =>
    req("/units.php?id=" + id, { method: "PUT",    body: JSON.stringify(body) }),
  deleteUnit: (id)   => req("/units.php?id=" + id, { method: "DELETE" }),

  createSub: (body) => req("/sub_units.php",         { method: "POST",   body: JSON.stringify(body) }),
  updateSub: (id, body) =>
    req("/sub_units.php?id=" + id, { method: "PUT",    body: JSON.stringify(body) }),
  deleteSub: (id)   => req("/sub_units.php?id=" + id, { method: "DELETE" }),

  // Admins
  admins:      ()     => req("/admins.php"),
  createAdmin: (body) => req("/admins.php",         { method: "POST",   body: JSON.stringify(body) }),
  updateAdmin: (id, body) =>
    req("/admins.php?id=" + id, { method: "PUT",    body: JSON.stringify(body) }),
  deleteAdmin: (id)   => req("/admins.php?id=" + id, { method: "DELETE" }),

  // Activity
  activity: (params = {}) => req("/activity.php?" + new URLSearchParams(params)),
};
