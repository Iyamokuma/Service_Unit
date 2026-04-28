import { useAdminAuth } from "../AdminContext.jsx";

const NAV = [
  {
    section: "Dashboard",
    items: [
      { id: "overview",  label: "Overview",       icon: <GridIcon /> },
    ],
  },
  {
    section: "Operations",
    items: [
      { id: "queue",     label: "Application Queue", icon: <ListIcon /> },
      { id: "units",     label: "Service Units",     icon: <LayersIcon /> },
    ],
  },
  {
    section: "System",
    items: [
      { id: "admins",   label: "Admin Accounts",   icon: <UsersIcon /> },
      { id: "activity", label: "Activity Log",      icon: <ActivityIcon /> },
    ],
  },
];

export function Sidebar({ page, setPage, pendingCount }) {
  const { admin, logout } = useAdminAuth();
  const initials = admin?.full_name?.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "SA";

  return (
    <aside className="sa-sidebar">
      <div className="sa-sidebar-brand">
        <div className="sa-brand-mark">S</div>
        <div>
          <div className="sa-brand-name">Salvation Ministries</div>
          <div className="sa-brand-sub">Super Admin</div>
        </div>
      </div>

      <nav className="sa-nav">
        {NAV.map((group) => (
          <div key={group.section}>
            <div className="sa-nav-section">{group.section}</div>
            {group.items.map((item) => (
              <button
                key={item.id}
                className={`sa-nav-item${page === item.id ? " active" : ""}`}
                onClick={() => setPage(item.id)}
              >
                {item.icon}
                {item.label}
                {item.id === "queue" && pendingCount > 0 && (
                  <span className="sa-nav-badge">{pendingCount > 99 ? "99+" : pendingCount}</span>
                )}
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div className="sa-sidebar-footer">
        <div className="sa-user-card">
          <div className="sa-avatar">{initials}</div>
          <div>
            <div className="sa-user-name">{admin?.full_name}</div>
            <div className="sa-user-role">{admin?.role?.replace("_", " ")}</div>
          </div>
        </div>
        <button className="sa-logout-btn" onClick={logout}>
          <LogoutIcon /> Sign out
        </button>
      </div>
    </aside>
  );
}

function GridIcon()     { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>; }
function ListIcon()     { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>; }
function LayersIcon()   { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>; }
function UsersIcon()    { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>; }
function ActivityIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>; }
function LogoutIcon()   { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>; }
