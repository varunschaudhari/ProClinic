import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { canAccessRoute } from "../utils/permissions";
import { authAPI } from "../utils/api";

type SubMenuItem = {
  name: string;
  path: string;
  badge?: number;
};

type MenuItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  badge?: number;
  section?: string;
  children?: SubMenuItem[]; // Submenu items
};

function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());
  const [user, setUser] = useState<{
    name: string;
    email: string;
    role: string;
    permissions?: string[];
  } | null>(() => {
    const userData =
      localStorage.getItem("proclinic_user") ||
      sessionStorage.getItem("proclinic_user");
    if (userData) {
      try {
        return JSON.parse(userData);
      } catch (error) {
        console.error("Error parsing user data:", error);
        return null;
      }
    }
    return null;
  });

  // Refresh user permissions periodically and on storage changes
  useEffect(() => {
    const refreshUserData = async () => {
      try {
        const response = await authAPI.getMe();
        if (response.success && response.data.user) {
          const updatedUser = response.data.user;
          const userData = {
            name: updatedUser.name,
            email: updatedUser.email,
            role: updatedUser.role,
            permissions: updatedUser.permissions || [],
          };
          
          // Update storage
          const storage = localStorage.getItem("proclinic_token") ? localStorage : sessionStorage;
          storage.setItem("proclinic_user", JSON.stringify(userData));
          
          // Update state
          setUser(userData);
        }
      } catch (error) {
        console.error("Error refreshing user data:", error);
      }
    };

    // Refresh immediately
    refreshUserData();

    // Refresh every 30 seconds
    const interval = setInterval(refreshUserData, 30000);

    // Listen for storage changes (when roles are updated in another tab/window)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "proclinic_user" && e.newValue) {
        try {
          const updatedUser = JSON.parse(e.newValue);
          setUser(updatedUser);
        } catch (error) {
          console.error("Error parsing updated user data:", error);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // Auto-expand submenu if any child is active
  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith("/ipd")) {
      setExpandedMenus((prev) => new Set(prev).add("IPD"));
    }
    if (path.startsWith("/opd")) {
      setExpandedMenus((prev) => new Set(prev).add("OPD"));
    }
  }, [location.pathname]);

  const toggleSubmenu = (menuName: string) => {
    setExpandedMenus((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(menuName)) {
        newSet.delete(menuName);
      } else {
        newSet.add(menuName);
      }
      return newSet;
    });
  };

  const isSubmenuExpanded = (menuName: string) => expandedMenus.has(menuName);

  const isChildActive = (children?: SubMenuItem[]) => {
    if (!children) return false;
    return children.some((child) => location.pathname === child.path || location.pathname.startsWith(child.path + "/"));
  };

  const menuItems: MenuItem[] = [
    {
      name: "Dashboard",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      ),
      path: "/dashboard",
      section: "main",
    },
    {
      name: "Patients",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-3-3h-4a3 3 0 00-3 3v2zM9 10a3 3 0 100-6 3 3 0 000 6zm7 0a3 3 0 100-6 3 3 0 000 6z"
          />
        </svg>
      ),
      path: "/patients",
      section: "main",
    },
    {
      name: "OPD",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
      path: "/opd/dashboard",
      section: "main",
      children: [
        { name: "OPD Dashboard", path: "/opd/dashboard" },
        { name: "Register Patient", path: "/opd/register" },
        { name: "Queue", path: "/opd/queue" },
        { name: "OPD Records", path: "/opd" },
      ],
    },
    {
      name: "IPD",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
      ),
      path: "/ipd/dashboard",
      section: "main",
      children: [
        { name: "IPD Dashboard", path: "/ipd/dashboard" },
        { name: "Admit Patient", path: "/ipd/admit" },
        { name: "IPD Records", path: "/ipd" },
        { name: "IPD Billing", path: "/ipd/billing" },
        { name: "Room Management", path: "/ipd/rooms" },
        { name: "Ward Management", path: "/ipd/wards" },
        { name: "OT Management", path: "/ipd/ot" },
        { name: "OT Scheduler", path: "/ipd/ot/scheduler" },
      ],
    },
    {
      name: "Appointments",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      ),
      path: "/appointments",
      section: "main",
    },
    {
      name: "Doctor Schedules",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          />
        </svg>
      ),
      path: "/doctor-schedules",
      section: "main",
    },
    {
      name: "Users",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ),
      path: "/users",
      section: "main",
    },
    {
      name: "Roles",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
      ),
      path: "/roles",
      section: "main",
    },
    {
      name: "Settings",
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      ),
      path: "/settings",
      section: "main",
    },
  ];

  const handleLogout = () => {
    localStorage.removeItem("proclinic_token");
    localStorage.removeItem("proclinic_user");
    sessionStorage.removeItem("proclinic_token");
    sessionStorage.removeItem("proclinic_user");
    navigate("/login");
  };

  const isActive = (path: string) => location.pathname === path;

  const getRoleBadgeColor = (role: string) => {
    switch (role?.toLowerCase()) {
      case "admin":
        return "bg-purple-100 text-purple-700 border-purple-200";
      case "doctor":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "nurse":
        return "bg-cyan-100 text-cyan-700 border-cyan-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  // Filter menu items based on permissions
  const filteredMenuItems = menuItems.filter((item) => {
    // If item has children, check if any child is accessible
    if (item.children && item.children.length > 0) {
      const hasAccessibleChild = item.children.some((child) => canAccessRoute(child.path));
      return hasAccessibleChild;
    }
    // For regular items, check the item path
    if (item.path) {
      const canAccess = canAccessRoute(item.path);
      if (process.env.NODE_ENV === "development" && !canAccess) {
        console.log(`[Sidebar] Hiding menu item: ${item.name} (${item.path})`);
      }
      return canAccess;
    }
    return true;
  });
  
  // All items are in main menu now
  const mainMenuItems = filteredMenuItems;

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="fixed left-3 top-3 z-50 flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-lg transition hover:bg-slate-50 sm:left-4 sm:top-4 sm:h-10 sm:w-10 lg:hidden"
        aria-label="Toggle menu"
      >
        <svg
          className="h-6 w-6 text-slate-700"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          {isMobileMenuOpen ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          )}
        </svg>
      </button>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-40 h-screen w-72 transform border-r border-slate-200/80 bg-gradient-to-b from-white to-slate-50/50 shadow-xl transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Logo Section */}
          <div className="border-b border-slate-200/80 bg-white/80 px-6 py-5 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 via-indigo-500 to-cyan-500 shadow-lg shadow-indigo-500/30">
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent"></div>
                <span className="relative text-xl font-bold text-white">P</span>
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  ProClinic
                </h1>
                <p className="text-xs font-medium text-slate-500">
                  Hospital Management
                </p>
              </div>
            </div>
          </div>

          {/* User Profile Section */}
          {user && (
            <div className="border-b border-slate-200/80 bg-gradient-to-r from-indigo-50/50 to-cyan-50/50 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-500 shadow-md">
                    <span className="text-sm font-bold text-white">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-white bg-emerald-500"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {user.name}
                  </p>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${getRoleBadgeColor(
                        user.role
                      )}`}
                    >
                      {user.role}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-4 py-6 custom-scrollbar">
            {/* Main Menu */}
            <div>
              <ul className="space-y-1">
                {mainMenuItems.map((item) => {
                  const hasChildren = item.children && item.children.length > 0;
                  const isExpanded = hasChildren && isSubmenuExpanded(item.name);
                  const childActive = hasChildren && isChildActive(item.children);
                  const isItemActive = item.path ? isActive(item.path) : childActive;

                  return (
                    <li key={item.path || item.name}>
                      {hasChildren ? (
                        <>
                          {/* Parent menu item with submenu */}
                          <button
                            onClick={() => toggleSubmenu(item.name)}
                            className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                              isItemActive
                                ? "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/30"
                                : "text-slate-700 hover:bg-slate-100/80 hover:text-slate-900"
                            }`}
                          >
                            {isItemActive && (
                              <div className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-white/50"></div>
                            )}
                            <span
                              className={`flex-shrink-0 ${
                                isItemActive
                                  ? "text-white"
                                  : "text-slate-500 group-hover:text-indigo-600"
                              }`}
                            >
                              {item.icon}
                            </span>
                            <span className="flex-1 text-left">{item.name}</span>
                            <svg
                              className={`h-4 w-4 transition-transform ${
                                isExpanded ? "rotate-90" : ""
                              } ${isItemActive ? "text-white" : "text-slate-400"}`}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </button>
                          {/* Submenu items */}
                          {isExpanded && (
                            <ul className="ml-4 mt-1 space-y-0.5 border-l-2 border-slate-200 pl-2">
                              {item.children
                                ?.filter((child) => canAccessRoute(child.path))
                                .map((child) => {
                                  const isChildItemActive =
                                    location.pathname === child.path ||
                                    location.pathname.startsWith(child.path + "/");
                                  return (
                                    <li key={child.path}>
                                      <Link
                                        to={child.path}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className={`group flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                                          isChildItemActive
                                            ? "bg-indigo-50 text-indigo-700 font-semibold"
                                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                        }`}
                                      >
                                        <span
                                          className={`h-1.5 w-1.5 rounded-full ${
                                            isChildItemActive
                                              ? "bg-indigo-600"
                                              : "bg-slate-300 group-hover:bg-slate-400"
                                          }`}
                                        ></span>
                                        <span>{child.name}</span>
                                        {child.badge !== undefined && child.badge > 0 && (
                                          <span
                                            className={`ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                                              isChildItemActive
                                                ? "bg-indigo-100 text-indigo-700"
                                                : "bg-slate-100 text-slate-600"
                                            }`}
                                          >
                                            {child.badge}
                                          </span>
                                        )}
                                      </Link>
                                    </li>
                                  );
                                })}
                            </ul>
                          )}
                        </>
                      ) : (
                        /* Regular menu item without submenu */
                        <Link
                          to={item.path || "#"}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                            isItemActive
                              ? "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-500/30"
                              : "text-slate-700 hover:bg-slate-100/80 hover:text-slate-900"
                          }`}
                        >
                          {isItemActive && (
                            <div className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-white/50"></div>
                          )}
                          <span
                            className={`flex-shrink-0 ${
                              isItemActive
                                ? "text-white"
                                : "text-slate-500 group-hover:text-indigo-600"
                            }`}
                          >
                            {item.icon}
                          </span>
                          <span className="flex-1">{item.name}</span>
                          {item.badge !== undefined && item.badge > 0 && (
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                                isItemActive
                                  ? "bg-white/20 text-white"
                                  : "bg-indigo-100 text-indigo-700"
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </nav>

          {/* Footer Section */}
          <div className="border-t border-slate-200/80 bg-white/80 p-4 backdrop-blur-sm">
            <button
              onClick={handleLogout}
              className="group flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
            >
              <svg
                className="h-5 w-5 transition-transform group-hover:translate-x-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              <span>Sign Out</span>
            </button>
            <div className="mt-3 text-center">
              <p className="text-xs text-slate-500">
                Version 1.0.0
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
