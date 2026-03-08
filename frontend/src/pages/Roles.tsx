import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { rolesAPI } from "../utils/api";
import { canAccessRoute } from "../utils/permissions";
import { showSuccess, showError } from "../utils/toast";

type Role = {
  _id: string;
  name: string;
  displayName: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
};

type PermissionGroup = {
  [module: string]: { permission: string; action: string }[];
};

type RoleForm = {
  name: string;
  displayName: string;
  description: string;
  permissions: string[];
};

function Roles() {
  const navigate = useNavigate();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [permissionsByModule, setPermissionsByModule] = useState<PermissionGroup>({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<RoleForm>({
    name: "",
    displayName: "",
    description: "",
    permissions: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    checkAuth();
    fetchRoles();
    fetchPermissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAuth = () => {
    const token =
      localStorage.getItem("proclinic_token") ||
      sessionStorage.getItem("proclinic_token");
    if (!token) {
      navigate("/login");
      return;
    }
    if (!canAccessRoute("/roles")) {
      navigate("/dashboard");
    }
  };

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const response = await rolesAPI.getAll();
      if (response.success) {
        setRoles(response.data.roles);
      } else {
        showError("Failed to fetch roles");
      }
    } catch (err) {
      showError("Error loading roles");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      const response = await rolesAPI.getPermissions();
      if (response.success) {
        setPermissions(response.data.permissions);
        setPermissionsByModule(response.data.permissionsByModule);
      }
    } catch (err) {
      console.error("Error loading permissions:", err);
    }
  };

  const handleOpenModal = () => {
    setFormData({
      name: "",
      displayName: "",
      description: "",
      permissions: [],
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({
      name: "",
      displayName: "",
      description: "",
      permissions: [],
    });
  };

  const handlePermissionToggle = (permission: string) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter((p) => p !== permission)
        : [...prev.permissions, permission],
    }));
  };

  const handleModuleToggle = (module: string) => {
    const modulePermissions = permissionsByModule[module] || [];
    const modulePermissionValues = modulePermissions.map((p) => p.permission);
    const allSelected = modulePermissionValues.every((p) =>
      formData.permissions.includes(p)
    );

    setFormData((prev) => ({
      ...prev,
      permissions: allSelected
        ? prev.permissions.filter((p) => !modulePermissionValues.includes(p))
        : [
            ...new Set([
              ...prev.permissions,
              ...modulePermissionValues,
            ]),
          ],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Only create role (edit is handled in RoleDetails page)
      if (!formData.name || !formData.displayName || formData.permissions.length === 0) {
        showError("Please fill all required fields and select at least one permission");
        setIsSubmitting(false);
        return;
      }

      const response = await rolesAPI.create({
        name: formData.name,
        displayName: formData.displayName,
        description: formData.description,
        permissions: formData.permissions,
      });

      if (response.success) {
        showSuccess("Role created successfully");
        fetchRoles();
        setTimeout(() => {
          handleCloseModal();
        }, 1000);
      } else {
        showError(response.message || "Failed to create role");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      showError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <div className="flex flex-1 items-center justify-center sidebar-content-margin">
          <div className="text-center">
            <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
            <p className="text-slate-600">Loading roles...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <div className="flex flex-1 flex-col sidebar-content-margin">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm shadow-sm">
          <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4 lg:px-8">
            <div>
              <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Roles</h1>
              <p className="mt-1 text-xs text-slate-600 sm:mt-1.5 sm:text-sm">
                Manage user roles and permissions
              </p>
            </div>
            <button
              onClick={() => handleOpenModal()}
              className="w-full rounded-xl bg-indigo-700 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-500/30 transition hover:bg-indigo-800 hover:shadow-lg hover:shadow-indigo-500/40 sm:w-auto sm:px-5 sm:py-2.5"
            >
              + Add Role
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {/* Alerts */}

          {/* Roles Table */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full min-w-[640px]">
                <thead className="border-b border-slate-200 bg-slate-50/80">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 sm:px-6 sm:py-4">
                      Role Name
                    </th>
                    <th className="hidden px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 sm:table-cell sm:px-6 sm:py-4">
                      Display Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 sm:px-6 sm:py-4">
                      Permissions
                    </th>
                    <th className="hidden px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 md:table-cell sm:px-6 sm:py-4">
                      Status
                    </th>
                    <th className="hidden px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 lg:table-cell sm:px-6 sm:py-4">
                      Type
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-600 sm:px-6 sm:py-4">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {roles.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <svg
                            className="mb-4 h-12 w-12 text-slate-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                            />
                          </svg>
                          <p className="text-sm font-medium text-slate-600">
                            No roles found
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Get started by adding your first role
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    roles.map((role) => (
                      <tr
                        key={role._id}
                        className="cursor-pointer transition-colors hover:bg-slate-50/50"
                        onClick={() => navigate(`/roles/${role._id}`)}
                      >
                        <td className="whitespace-nowrap px-4 py-3 sm:px-6 sm:py-4">
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-slate-900 sm:text-sm">
                              {role.name}
                            </div>
                            <div className="mt-0.5 text-xs text-slate-500 sm:hidden">
                              {role.displayName}
                            </div>
                          </div>
                        </td>
                        <td className="hidden whitespace-nowrap px-4 py-3 text-sm font-medium text-slate-700 sm:table-cell sm:px-6 sm:py-4">
                          <div className="text-sm font-medium text-slate-700">
                            {role.displayName}
                          </div>
                        </td>
                        <td className="px-4 py-3 sm:px-6 sm:py-4">
                          <div className="text-xs text-slate-600 sm:text-sm">
                            {role.permissions.length} permission{role.permissions.length !== 1 ? "s" : ""}
                          </div>
                        </td>
                        <td className="hidden whitespace-nowrap px-4 py-3 md:table-cell sm:px-6 sm:py-4">
                          <span
                            className={`inline-flex items-center gap-1 rounded-lg border px-1.5 py-0.5 text-[10px] font-semibold sm:gap-1.5 sm:px-2.5 sm:py-1 sm:text-xs ${
                              role.isActive
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border-slate-200 bg-slate-50 text-slate-600"
                            }`}
                          >
                            <span
                              className={`h-1 w-1 rounded-full sm:h-1.5 sm:w-1.5 ${
                                role.isActive ? "bg-emerald-500" : "bg-slate-400"
                              }`}
                            />
                            {role.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="hidden whitespace-nowrap px-4 py-3 lg:table-cell sm:px-6 sm:py-4">
                          <span
                            className={`inline-flex rounded-lg border px-1.5 py-0.5 text-[10px] font-semibold sm:px-2.5 sm:py-1 sm:text-xs ${
                              role.isSystem
                                ? "border-purple-200 bg-purple-50 text-purple-700"
                                : "border-slate-200 bg-slate-50 text-slate-600"
                            }`}
                          >
                            {role.isSystem ? "System" : "Custom"}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right sm:px-6 sm:py-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/roles/${role._id}`);
                            }}
                            className="rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1 text-[10px] font-semibold text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100 sm:px-3 sm:py-1.5 sm:text-xs"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* Add/Edit Role Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl my-auto">
            <div className="sticky top-0 border-b border-slate-200 bg-white px-4 py-3 sm:px-6 sm:py-4">
              <h2 className="text-base font-semibold text-slate-900 sm:text-lg">
                Add New Role
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="px-4 py-4 sm:px-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Role Name (lowercase, no spaces) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value.toLowerCase().replace(/\s+/g, "-") })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="e.g., manager"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Display Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.displayName}
                    onChange={(e) =>
                      setFormData({ ...formData, displayName: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="e.g., Manager"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="Role description..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">
                    Permissions *
                  </label>
                  <div className="space-y-3 max-h-80 overflow-y-auto border border-slate-200 rounded-lg p-3 sm:space-y-4 sm:max-h-96 sm:p-4">
                    {Object.entries(permissionsByModule).map(([module, modulePermissions]) => {
                      const modulePermissionValues = modulePermissions.map((p) => p.permission);
                      const allSelected = modulePermissionValues.every((p) =>
                        formData.permissions.includes(p)
                      );
                      const someSelected = modulePermissionValues.some((p) =>
                        formData.permissions.includes(p)
                      );

                      return (
                        <div key={module} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
                          <div className="flex items-center gap-2 mb-2">
                            <input
                              type="checkbox"
                              checked={allSelected}
                              ref={(input) => {
                                if (input) {
                                  input.indeterminate = someSelected && !allSelected;
                                }
                              }}
                              onChange={() => handleModuleToggle(module)}
                              className="h-4 w-4 rounded border-slate-300 text-indigo-700 accent-indigo-700"
                            />
                            <label className="text-sm font-semibold text-slate-900 capitalize">
                              {module}
                            </label>
                          </div>
                          <div className="ml-6 space-y-2">
                            {modulePermissions.map(({ permission, action }) => (
                              <label
                                key={permission}
                                className="flex items-center gap-2 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={formData.permissions.includes(permission)}
                                  onChange={() => handlePermissionToggle(permission)}
                                  className="h-4 w-4 rounded border-slate-300 text-indigo-700 accent-indigo-700"
                                />
                                <span className="text-sm text-slate-700 capitalize">
                                  {action}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {formData.permissions.length === 0 && (
                    <p className="mt-2 text-xs text-rose-600">
                      Please select at least one permission
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || formData.permissions.length === 0}
                  className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? "Creating..." : "Create Role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default Roles;
