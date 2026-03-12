import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { departmentsAPI, usersAPI } from "../utils/api";
import { hasPermission, PERMISSIONS } from "../utils/permissions";
import { showSuccess, showError } from "../utils/toast";

type Department = {
  _id: string;
  name: string;
  code?: string;
  description?: string;
  headOfDepartment?: {
    _id: string;
    name: string;
    email: string;
  };
  status: "active" | "inactive";
  createdAt: string;
  updatedAt?: string;
};

type DepartmentForm = {
  name: string;
  code: string;
  description: string;
  headOfDepartment: string;
  status: "active" | "inactive";
};

function DepartmentDetails() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [department, setDepartment] = useState<Department | null>(null);
  const [doctors, setDoctors] = useState<Array<{ _id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [formData, setFormData] = useState<DepartmentForm>({
    name: "",
    code: "",
    description: "",
    headOfDepartment: "",
    status: "active",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isNewDepartment = id === "new";

  useEffect(() => {
    checkAuth();
    fetchDoctors();
    if (id && !isNewDepartment) {
      fetchDepartment();
    } else if (isNewDepartment) {
      setLoading(false);
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

  const fetchDoctors = async () => {
    try {
      const response = await usersAPI.getAll();
      if (response.success && response.data?.users) {
        const doctorUsers = response.data.users.filter((user: any) => {
          if (user.roles && Array.isArray(user.roles)) {
            return user.roles.some((role: any) =>
              role.name && role.name.toLowerCase().includes("doctor")
            );
          }
          return user.role && user.role.toLowerCase().includes("doctor");
        });
        const doctorList = doctorUsers.map((user: any) => ({
          _id: user._id,
          name: user.name,
        }));
        setDoctors(doctorList);
      }
    } catch (err) {
      console.error("Error fetching doctors:", err);
    }
  };

  const fetchDepartment = async () => {
    if (!id || isNewDepartment) return;
    try {
      setLoading(true);
      const response = await departmentsAPI.getById(id);
      if (response.success) {
        const deptData = response.data.department;
        setDepartment(deptData);
        setFormData({
          name: deptData.name,
          code: deptData.code || "",
          description: deptData.description || "",
          headOfDepartment: deptData.headOfDepartment?._id || "",
          status: deptData.status,
        });
      } else {
        showError("Failed to fetch department");
        setTimeout(() => navigate("/departments"), 2000);
      }
    } catch (err) {
      showError("Error loading department");
      console.error(err);
      setTimeout(() => navigate("/departments"), 2000);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (department) {
      setFormData({
        name: department.name,
        code: department.code || "",
        description: department.description || "",
        headOfDepartment: department.headOfDepartment?._id || "",
        status: department.status,
      });
    }
    setIsEditing(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    setIsSubmitting(true);

    try {
      if (!formData.name) {
        showError("Department name is required");
        setIsSubmitting(false);
        return;
      }

      let response;
      if (isNewDepartment) {
        response = await departmentsAPI.create({
          name: formData.name,
          code: formData.code || undefined,
          description: formData.description || undefined,
          headOfDepartment: formData.headOfDepartment || undefined,
          status: formData.status,
        });
      } else {
        response = await departmentsAPI.update(id, {
          name: formData.name,
          code: formData.code || undefined,
          description: formData.description || undefined,
          headOfDepartment: formData.headOfDepartment || undefined,
          status: formData.status,
        });
      }

      if (response.success) {
        showSuccess(
          isNewDepartment
            ? "Department created successfully"
            : "Department updated successfully"
        );
        if (isNewDepartment) {
          setTimeout(() => navigate("/departments"), 1000);
        } else {
          setIsEditing(false);
          fetchDepartment();
        }
      } else {
        showError(response.message || "Failed to save department");
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
    if (!id || isNewDepartment) return;

    try {
      const response = await departmentsAPI.delete(id);
      if (response.success) {
        showSuccess("Department deleted successfully");
        setTimeout(() => {
          navigate("/departments");
        }, 1000);
      } else {
        showError(response.message || "Failed to delete department");
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
        <div className="flex flex-1 items-center justify-center sidebar-content-margin">
          <div className="text-center">
            <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
            <p className="text-slate-600">Loading department details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!department && !isNewDepartment) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <div className="flex flex-1 items-center justify-center sidebar-content-margin">
          <div className="text-center">
            <p className="text-slate-600">Department not found</p>
            <Link
              to="/departments"
              className="mt-4 inline-block text-indigo-600 hover:text-indigo-700"
            >
              Back to Departments
            </Link>
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
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/departments")}
                className="rounded-lg p-1.5 text-slate-600 transition hover:bg-slate-100"
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
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
                  {isNewDepartment
                    ? "New Department"
                    : isEditing
                    ? "Edit Department"
                    : "Department Details"}
                </h1>
                <p className="mt-1 text-xs text-slate-600 sm:mt-1.5 sm:text-sm">
                  {isNewDepartment
                    ? "Create a new department"
                    : isEditing
                    ? "Update department information"
                    : "View and manage department details"}
                </p>
              </div>
            </div>
            {!isNewDepartment && !isEditing && department && (
              <div className="flex gap-2">
                {hasPermission(PERMISSIONS.DEPARTMENTS_EDIT) && (
                  <button
                    onClick={handleEdit}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Edit
                  </button>
                )}
                {hasPermission(PERMISSIONS.DEPARTMENTS_DELETE) && (
                  <button
                    onClick={handleDeleteClick}
                    className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
                  >
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-slate-900">
                  Basic Information
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Name <span className="text-red-500">*</span>
                    </label>
                    {isEditing || isNewDepartment ? (
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        required
                      />
                    ) : (
                      <p className="mt-1 text-sm text-slate-900">
                        {department?.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Code
                    </label>
                    {isEditing || isNewDepartment ? (
                      <input
                        type="text"
                        value={formData.code}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            code: e.target.value.toUpperCase(),
                          })
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        placeholder="e.g., CAR001"
                      />
                    ) : (
                      <p className="mt-1 text-sm text-slate-900">
                        {department?.code || "-"}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Status
                    </label>
                    {isEditing || isNewDepartment ? (
                      <select
                        value={formData.status}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            status: e.target.value as "active" | "inactive",
                          })
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    ) : (
                      <span
                        className={`mt-1 inline-flex rounded-lg border px-2 py-1 text-xs font-semibold capitalize ${
                          department?.status === "active"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-slate-50 text-slate-700"
                        }`}
                      >
                        {department?.status}
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Head of Department
                    </label>
                    {isEditing || isNewDepartment ? (
                      <select
                        value={formData.headOfDepartment}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            headOfDepartment: e.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      >
                        <option value="">Select Doctor</option>
                        {doctors.map((doctor) => (
                          <option key={doctor._id} value={doctor._id}>
                            {doctor.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="mt-1 text-sm text-slate-900">
                        {department?.headOfDepartment?.name || "-"}
                      </p>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Description
                    </label>
                    {isEditing || isNewDepartment ? (
                      <textarea
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            description: e.target.value,
                          })
                        }
                        rows={4}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        placeholder="Department description..."
                      />
                    ) : (
                      <p className="mt-1 text-sm text-slate-900">
                        {department?.description || "-"}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              {(isEditing || isNewDepartment) && (
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={isNewDepartment ? () => navigate("/departments") : handleCancel}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSubmitting
                      ? isNewDepartment
                        ? "Creating..."
                        : "Saving..."
                      : isNewDepartment
                      ? "Create Department"
                      : "Save Changes"}
                  </button>
                </div>
              )}
            </div>
          </form>
        </main>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="px-4 py-3 sm:px-6 sm:py-4">
              <h2 className="text-base font-semibold text-slate-900 sm:text-lg">
                Delete Department
              </h2>
              <p className="mt-2 text-xs text-slate-600 sm:text-sm">
                Are you sure you want to delete{" "}
                <span className="font-medium">{department?.name}</span>? This
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

export default DepartmentDetails;
