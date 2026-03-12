// Permission checking utility

// Get user data from storage
export const getUserData = () => {
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
};

// Get user permissions from storage
export const getUserPermissions = (): string[] => {
  const user = getUserData();
  if (user) {
    return user.permissions || [];
  }
  return [];
};

// Get user role (legacy)
export const getUserRole = (): string | null => {
  const user = getUserData();
  if (user) {
    return user.role || null;
  }
  return null;
};

// Check if user has a specific permission
export const hasPermission = (permission: string): boolean => {
  const permissions = getUserPermissions();
  return permissions.includes(permission);
};

// Check if user has any of the specified permissions
export const hasAnyPermission = (permissions: string[]): boolean => {
  const userPermissions = getUserPermissions();
  return permissions.some((permission) => userPermissions.includes(permission));
};

// Check if user has all of the specified permissions
export const hasAllPermissions = (permissions: string[]): boolean => {
  const userPermissions = getUserPermissions();
  return permissions.every((permission) => userPermissions.includes(permission));
};

// Permission constants matching backend
export const PERMISSIONS = {
  // Dashboard module
  DASHBOARD_VIEW: "dashboard.view",

  // Users module
  USERS_VIEW: "users.view",
  USERS_CREATE: "users.create",
  USERS_EDIT: "users.edit",
  USERS_DELETE: "users.delete",

  // Patients module
  PATIENTS_VIEW: "patients.view",
  PATIENTS_CREATE: "patients.create",
  PATIENTS_EDIT: "patients.edit",
  PATIENTS_DELETE: "patients.delete",

  // Appointments module
  APPOINTMENTS_VIEW: "appointments.view",
  APPOINTMENTS_CREATE: "appointments.create",
  APPOINTMENTS_EDIT: "appointments.edit",
  APPOINTMENTS_DELETE: "appointments.delete",

  // Doctors module
  DOCTORS_VIEW: "doctors.view",
  DOCTORS_CREATE: "doctors.create",
  DOCTORS_EDIT: "doctors.edit",
  DOCTORS_DELETE: "doctors.delete",

  // Billing module
  BILLING_VIEW: "billing.view",
  BILLING_CREATE: "billing.create",
  BILLING_EDIT: "billing.edit",
  BILLING_DELETE: "billing.delete",

  // Reports module
  REPORTS_VIEW: "reports.view",
  REPORTS_CREATE: "reports.create",
  REPORTS_EDIT: "reports.edit",
  REPORTS_DELETE: "reports.delete",

  // Roles module
  ROLES_VIEW: "roles.view",
  ROLES_CREATE: "roles.create",
  ROLES_EDIT: "roles.edit",
  ROLES_DELETE: "roles.delete",

  // Departments module
  DEPARTMENTS_VIEW: "departments.view",
  DEPARTMENTS_CREATE: "departments.create",
  DEPARTMENTS_EDIT: "departments.edit",
  DEPARTMENTS_DELETE: "departments.delete",

  // Services module
  SERVICES_VIEW: "services.view",
  SERVICES_CREATE: "services.create",
  SERVICES_EDIT: "services.edit",
  SERVICES_DELETE: "services.delete",

  // Service Categories module
  SERVICE_CATEGORIES_VIEW: "service-categories.view",
  SERVICE_CATEGORIES_CREATE: "service-categories.create",
  SERVICE_CATEGORIES_EDIT: "service-categories.edit",
  SERVICE_CATEGORIES_DELETE: "service-categories.delete",

  // Settings module
  SETTINGS_VIEW: "settings.view",
  SETTINGS_EDIT: "settings.edit",

  // OPD module
  OPD_VIEW: "opd.view",
  OPD_CREATE: "opd.create",
  OPD_EDIT: "opd.edit",
  OPD_DELETE: "opd.delete",
  OPD_BILLING: "opd.billing",

  // IPD module
  IPD_VIEW: "ipd.view",
  IPD_CREATE: "ipd.create",
  IPD_EDIT: "ipd.edit",
  IPD_DELETE: "ipd.delete",
  IPD_BILLING: "ipd.billing",

  // Wards module
  WARDS_VIEW: "wards.view",
  WARDS_CREATE: "wards.create",
  WARDS_EDIT: "wards.edit",
  WARDS_DELETE: "wards.delete",

  // OT (Operation Theater) module
  OT_VIEW: "ot.view",
  OT_CREATE: "ot.create",
  OT_EDIT: "ot.edit",
  OT_DELETE: "ot.delete",
  OT_SCHEDULE_VIEW: "ot.schedule.view",
  OT_SCHEDULE_CREATE: "ot.schedule.create",
  OT_SCHEDULE_EDIT: "ot.schedule.edit",
  OT_SCHEDULE_DELETE: "ot.schedule.delete",

  // Patient detail tabs
  PATIENTS_CONSULTATION_SUMMARY_VIEW: "patients.consultation-summary.view",
  PATIENTS_CLINICAL_DATA_VIEW: "patients.clinical-data.view",
  PATIENTS_CLINICAL_DATA_EDIT: "patients.clinical-data.edit",
  PATIENTS_OPERATIVE_SUMMARY_VIEW: "patients.operative-summary.view",
  PATIENTS_ENGAGEMENT_VIEW: "patients.engagement.view",
  PATIENTS_ENGAGEMENT_EDIT: "patients.engagement.edit",
  PATIENTS_REMARKS_VIEW: "patients.remarks.view",
  PATIENTS_REMARKS_EDIT: "patients.remarks.edit",
  PATIENTS_BILLING_VIEW: "patients.billing.view",
  PATIENTS_BILLING: "patients.billing",
};

// Map menu items to required permissions
export const MENU_PERMISSIONS: Record<string, string> = {
  "/dashboard": PERMISSIONS.DASHBOARD_VIEW,
  "/patients": PERMISSIONS.PATIENTS_VIEW,
  "/opd": PERMISSIONS.OPD_VIEW,
  "/opd/dashboard": PERMISSIONS.OPD_VIEW,
  "/opd/register": PERMISSIONS.OPD_CREATE,
  "/opd/billing": PERMISSIONS.OPD_BILLING,
  "/ipd": PERMISSIONS.IPD_VIEW,
  "/ipd/dashboard": PERMISSIONS.IPD_VIEW,
  "/ipd/admit": PERMISSIONS.IPD_CREATE,
  "/ipd/billing": PERMISSIONS.IPD_BILLING,
  "/ipd/rooms": PERMISSIONS.IPD_VIEW,
  "/ipd/wards": PERMISSIONS.WARDS_VIEW,
  "/ipd/ot": PERMISSIONS.OT_VIEW,
  "/ipd/ot/scheduler": PERMISSIONS.OT_SCHEDULE_VIEW,
  "/ipd/:id": PERMISSIONS.IPD_VIEW,
  "/appointments": PERMISSIONS.APPOINTMENTS_VIEW,
  "/doctor-schedules": PERMISSIONS.APPOINTMENTS_VIEW,
  "/doctors": PERMISSIONS.DOCTORS_VIEW,
  "/users": PERMISSIONS.USERS_VIEW,
  "/billing": PERMISSIONS.BILLING_VIEW,
  "/reports": PERMISSIONS.REPORTS_VIEW,
  "/roles": PERMISSIONS.ROLES_VIEW,
  "/departments": PERMISSIONS.DEPARTMENTS_VIEW,
  "/services": PERMISSIONS.SERVICES_VIEW,
  "/service-categories": PERMISSIONS.SERVICE_CATEGORIES_VIEW,
  "/settings": PERMISSIONS.SETTINGS_VIEW,
};

// Check if user can access a route
export const canAccessRoute = (path: string): boolean => {
  const requiredPermission = MENU_PERMISSIONS[path];
  // /dashboard access is permission-controlled (dashboard.view)
  
  // If no permission required, allow access
  if (!requiredPermission) {
    return true;
  }
  
  // Check if user has the required permission
  const hasAccess = hasPermission(requiredPermission);
  
  // Fallback: If no permissions but user has admin role, allow access to admin routes
  if (!hasAccess) {
    const userRole = getUserRole();
    const adminRoutes = ["/users", "/roles", "/departments", "/services", "/service-categories"];
    
    if (userRole === "admin" && adminRoutes.includes(path)) {
      // Admin role should have access to users and roles
      return true;
    }
  }
  
  // Debug logging (can be removed in production)
  // NOTE: Avoid `process.env` in browser TS builds; Vite exposes `import.meta.env`.
  if (!hasAccess && (import.meta as any)?.env?.DEV) {
    const userPermissions = getUserPermissions();
    const userRole = getUserRole();
    console.log(`[Permission Check] Path: ${path}, Required: ${requiredPermission}`);
    console.log(`  User Permissions:`, userPermissions);
    console.log(`  User Role:`, userRole);
    console.log(`  Has Access:`, hasAccess);
  }
  
  return hasAccess;
};
