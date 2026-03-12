// Permission constants for action-based RBAC
// Format: module.action

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
};

// Get all permissions as an array
export const getAllPermissions = () => {
  return Object.values(PERMISSIONS);
};

// Get permissions grouped by module
export const getPermissionsByModule = () => {
  const modules = {};
  
  Object.values(PERMISSIONS).forEach((permission) => {
    const [module, action] = permission.split(".");
    if (!modules[module]) {
      modules[module] = [];
    }
    modules[module].push({ permission, action });
  });
  
  return modules;
};
