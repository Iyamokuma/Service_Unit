import { useCallback, useEffect, useState } from "react";
import { Sidebar } from "./components/Sidebar.jsx";
import { Overview } from "./pages/Overview.jsx";
import { Queue } from "./pages/Queue.jsx";
import { ServiceUnits } from "./pages/ServiceUnits.jsx";
import { AdminUsers } from "./pages/AdminUsers.jsx";
import { ActivityLog } from "./pages/ActivityLog.jsx";
import { UnitMembers } from "./pages/UnitMembers.jsx";
import { Requests } from "./pages/Requests.jsx";
import { Settings } from "./pages/Settings.jsx";
import { api } from "./api.js";
import { useToast } from "./components/Toast.jsx";
import { useAdminAuth } from "./AdminContext.jsx";

const PAGE_TITLES = {
  overview: "Dashboard Overview",
  queue:    "Application Queue",
  units:    "Service Units",
  members:  "Unit Members",
  admins:   "Admin Accounts",
  requests: "Requests",
  activity: "Activity Log",
  settings: "Settings",
};

export function AdminLayout() {
  const toast  = useToast();
  const { admin } = useAdminAuth();
  const isSuperAdmin = admin?.role === "super_admin";
  const [page, setPage]   = useState("overview");
  const [units, setUnits] = useState(null);
  const [admins, setAdmins] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);

  const loadUnits  = useCallback(() => api.units().then(setUnits).catch(() => {}), []);
  const loadAdmins = useCallback(() => api.admins().then(setAdmins).catch(() => {}), []);

  useEffect(() => { loadUnits(); loadAdmins(); }, [loadUnits, loadAdmins]);

  // Fetch pending count for sidebar badge
  useEffect(() => {
    api.queue({ status: "pending", per_page: 1 })
      .then((r) => setPendingCount(r.pagination?.total ?? 0))
      .catch(() => {});
  }, [page]);

  const now = new Date().toLocaleString("en-GB", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className="sa-root">
      <Sidebar page={page} setPage={setPage} pendingCount={pendingCount} />

      <div className="sa-main">
        <div className="sa-topbar">
          <div className="sa-page-title">{PAGE_TITLES[page]}</div>
          <div className="sa-topbar-right">
            <span className="sa-topbar-time">{now}</span>
          </div>
        </div>

        <div className="sa-content">
          {page === "overview"  && <Overview />}
          {page === "queue"     && <Queue     units={units} />}
          {page === "units"     && <ServiceUnits data={units}  reload={loadUnits} />}
          {page === "members"   && <UnitMembers units={units} />}
          {page === "admins"    && <AdminUsers data={admins} units={units} reload={loadAdmins} />}
          {page === "requests"  && <Requests />}
          {page === "activity"  && <ActivityLog />}
          {page === "settings"  && isSuperAdmin && <Settings />}
        </div>
      </div>
    </div>
  );
}
