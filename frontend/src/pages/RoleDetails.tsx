import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { rolesAPI } from "../utils/api";
import { showSuccess, showError } from "../utils/toast";

type PermissionGroup = {
  [module: string]: { permission: string; action: string }[];
};

type Role = {
  _id: string;
  name: string;
  displayName: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
};

type RoleForm = {
  name: string;
  displayName: string;
  description: string;
  permissions: string[];
};

function RoleDetails() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [role, setRole] = useState<Role | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [permissionsByModule, setPermissionsByModule] = useState<PermissionGroup>({});
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [formData, setFormData] = useState<RoleForm>({
    name: "",
    displayName: "",
    description: "",
    permissions: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    checkAuth();
    if (id) {
      fetchRole();
      fetchPermissions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const checkAuth = () => {
    const token =
      localStorage.getItem("proclinic_token") ||
      sessionStorage.getItem("proclinic_token");
    if (!token) {
      navigate("/login");
    }
  };

  const fetchRole = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const response = await rolesAPI.getById(id);
      if (response.success) {
        const roleData = response.data.role;
        setRole(roleData);
        setFormData({
          name: roleData.name,
          displayName: roleData.displayName,
          description: roleData.description,
          permissions: roleData.permissions || [],
        });
      } else {
        showError("Failed to fetch role");
        setTimeout(() => navigate("/roles"), 2000);
      }
    } catch (err) {
      showError("Error loading role");
      console.error(err);
      setTimeout(() => navigate("/roles"), 2000);
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

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (role) {
      setFormData({
        name: role.name,
        displayName: role.displayName,
        description: role.description,
        permissions: role.permissions || [],
      });
    }
    setIsEditing(false);
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
    if (!id) return;

    setIsSubmitting(true);

    try {
      if (formData.permissions.length === 0) {
        showError("Please select at least one permission");
        setIsSubmitting(false);
        return;
      }

      const updateData: {
        displayName?: string;
        description?: string;
        permissions?: string[];
        isActive?: boolean;
      } = {
        displayName: formData.displayName,
        description: formData.description,
        permissions: formData.permissions,
      };

      const response = await rolesAPI.update(id, updateData);
      if (response.success) {
        showSuccess("Role updated successfully");
        setIsEditing(false);
        fetchRole(); // Refresh role data
      } else {
        showError(response.message || "Failed to update role");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      showError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!id) return;

    try {
      const response = await rolesAPI.delete(id);
      if (response.success) {
        showSuccess("Role deleted successfully");
        setTimeout(() => {
          navigate("/roles");
        }, 1000);
      } else {
        showError(response.message || "Failed to delete role");
        setShowDeleteModal(false);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      showError(errorMessage);
      setShowDeleteModal(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <div className="flex flex-1 items-center justify-center lg:ml-72">
          <div className="text-center">
            <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
            <p className="text-slate-600">Loading role details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!role) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <div className="flex flex-1 items-center justify-center lg:ml-72">
          <div className="text-center">
            <p className="text-slate-600">Role not found</p>
            <Link
              to="/roles"
              className="mt-4 inline-block text-indigo-600 hover:text-indigo-700"
            >
              Back to Roles
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <div className="flex flex-1 flex-col lg:ml-72">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm shadow-sm">
          <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4 lg:px-8">
            <div className="flex items-center gap-2 sm:gap-4">
              <Link
                to="/roles"
                className="rounded-lg p-1.5 text-slate-600 transition hover:bg-slate-100 sm:p-2"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
              </Link>
              <div>
                <h1 className="text-lg font-bold text-slate-900 sm:text-xl lg:text-2xl">
                  {isEditing ? "Edit Role" : "Role Details"}
                </h1>
                <p className="mt-0.5 text-xs text-slate-600 sm:mt-1.5 sm:text-sm">
                  {isEditing
                    ? "Update role information and permissions"
                    : "View and manage role details"}
                </p>
              </div>
            </div>
            {!isEditing && (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                {!role.isSystem && (
                  <>
                    <button
                      onClick={handleEdit}
                      className="w-full rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100 sm:w-auto sm:px-5 sm:py-2.5 sm:text-sm"
                    >
                      Edit Role
                    </button>
                    <button
                      onClick={handleDeleteClick}
                      className="w-full rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100 sm:w-auto sm:px-5 sm:py-2.5 sm:text-sm"
                    >
                      Delete Role
                    </button>
                  </>
                )}
                {role.isSystem && (
                  <span className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600 sm:w-auto sm:px-5 sm:py-2.5 sm:text-sm">
                    System Role (Cannot be edited)
                  </span>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {/* Alerts */}

          {/* Role Details Form */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 lg:p-8">
              <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
                {/* Role Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Role Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.name}
                      disabled
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-500"
                    />
                  ) : (
                    <p className="mt-1 text-sm font-medium text-slate-900">
                      {role.name}
                    </p>
                  )}
                </div>

                {/* Display Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Display Name *
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      required
                      value={formData.displayName}
                      onChange={(e) =>
                        setFormData({ ...formData, displayName: e.target.value })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                  ) : (
                    <p className="mt-1 text-sm font-medium text-slate-900">
                      {role.displayName}
                    </p>
                  )}
                </div>

                {/* Description */}
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Description
                  </label>
                  {isEditing ? (
                    <textarea
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      rows={3}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      placeholder="Role description..."
                    />
                  ) : (
                    <p className="mt-1 text-sm text-slate-900">
                      {role.description || "No description"}
                    </p>
                  )}
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Status
                  </label>
                  <span
                    className={`mt-1 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                      role.isActive
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-slate-50 text-slate-600"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        role.isActive ? "bg-emerald-500" : "bg-slate-400"
                      }`}
                    />
                    {role.isActive ? "Active" : "Inactive"}
                  </span>
                </div>

                {/* Type */}
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Type
                  </label>
                  <span
                    className={`mt-1 inline-flex rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                      role.isSystem
                        ? "border-purple-200 bg-purple-50 text-purple-700"
                        : "border-slate-200 bg-slate-50 text-slate-600"
                    }`}
                  >
                    {role.isSystem ? "System" : "Custom"}
                  </span>
                </div>

                {/* Permissions */}
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-3">
                    Permissions * ({formData.permissions.length} selected)
                  </label>
                  {isEditing ? (
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
                  ) : (
                    <div className="space-y-2">
                      {role.permissions && role.permissions.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {role.permissions.map((permission) => {
                            const [module, action] = permission.split(".");
                            return (
                              <span
                                key={permission}
                                className="inline-flex rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700"
                              >
                                {module}.{action}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-sm text-slate-500">
                          No permissions assigned
                        </span>
                      )}
                    </div>
                  )}
                  {isEditing && formData.permissions.length === 0 && (
                    <p className="mt-2 text-xs text-rose-600">
                      Please select at least one permission
                    </p>
                  )}
                </div>

                {/* Created At */}
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Created At
                  </label>
                  <p className="mt-1 text-sm text-slate-600">
                    {new Date(role.createdAt).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>

              {/* Form Actions */}
              {isEditing && (
                <div className="mt-6 flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-end sm:gap-3 sm:pt-6">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:w-auto"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || formData.permissions.length === 0}
                    className="w-full rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                  >
                    {isSubmitting ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              )}
            </form>
          </div>
        </main>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl my-auto">
            <div className="px-4 py-3 sm:px-6 sm:py-4">
              <h2 className="text-base font-semibold text-slate-900 sm:text-lg">
                Delete Role
              </h2>
              <p className="mt-2 text-xs text-slate-600 sm:text-sm">
                Are you sure you want to delete{" "}
                <span className="font-medium">{role.displayName}</span>? This
                action cannot be undone.
              </p>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-end sm:gap-3 sm:px-6 sm:py-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:w-auto"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="w-full rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 sm:w-auto"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RoleDetails;
