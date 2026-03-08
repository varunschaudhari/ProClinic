// Permission constants for action-based RBAC
// Format: module.action

export const PERMISSIONS = {
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
