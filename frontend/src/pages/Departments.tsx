import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { departmentsAPI, usersAPI } from "../utils/api";
import { canAccessRoute, hasPermission, PERMISSIONS } from "../utils/permissions";
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
};

type DepartmentForm = {
  name: string;
  code: string;
  description: string;
  headOfDepartment: string;
  status: "active" | "inactive";
};

function Departments() {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<Array<{ _id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState<DepartmentForm>({
    name: "",
    code: "",
    description: "",
    headOfDepartment: "",
    status: "active",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    checkAuth();
    fetchDepartments();
    fetchDoctors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const checkAuth = () => {
    const token =
      localStorage.getItem("proclinic_token") ||
      sessionStorage.getItem("proclinic_token");
    if (!token) {
      navigate("/login");
      return;
    }
    if (!canAccessRoute("/departments")) {
      navigate("/dashboard");
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

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      if (searchQuery) params.search = searchQuery;
      const response = await departmentsAPI.getAll(params);
      if (response.success) {
        setDepartments(response.data.departments);
      } else {
        showError("Failed to fetch departments");
      }
    } catch (err) {
      showError("Error loading departments");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery || statusFilter) {
        fetchDepartments();
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleOpenModal = () => {
    setFormData({
      name: "",
      code: "",
      description: "",
      headOfDepartment: "",
      status: "active",
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({
      name: "",
      code: "",
      description: "",
      headOfDepartment: "",
      status: "active",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!formData.name) {
        showError("Department name is required");
        setIsSubmitting(false);
        return;
      }

      const response = await departmentsAPI.create({
        name: formData.name,
        code: formData.code || undefined,
        description: formData.description || undefined,
        headOfDepartment: formData.headOfDepartment || undefined,
        status: formData.status,
      });

      if (response.success) {
        showSuccess("Department created successfully");
        fetchDepartments();
        setTimeout(() => {
          handleCloseModal();
        }, 1000);
      } else {
        showError(response.message || "Failed to create department");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      showError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredDepartments = departments.filter((dept) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        dept.name.toLowerCase().includes(query) ||
        dept.code?.toLowerCase().includes(query) ||
        dept.description?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <div className="flex flex-1 items-center justify-center sidebar-content-margin">
          <div className="text-center">
            <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
            <p className="text-slate-600">Loading departments...</p>
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
              <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Departments</h1>
              <p className="mt-1 text-xs text-slate-600 sm:mt-1.5 sm:text-sm">
                Manage hospital departments and their heads
              </p>
            </div>
            {hasPermission(PERMISSIONS.DEPARTMENTS_CREATE) && (
              <button
                onClick={handleOpenModal}
                className="w-full rounded-xl bg-indigo-700 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-500/30 transition hover:bg-indigo-800 hover:shadow-lg hover:shadow-indigo-500/40 sm:w-auto sm:px-5 sm:py-2.5"
              >
                + Add Department
              </button>
            )}
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {/* Search and Filter Bar */}
          <div className="mb-4 sm:mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <svg
                  className="h-5 w-5 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search departments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 sm:py-3"
              />
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 px-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 sm:py-3"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Departments Table */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-slate-200 bg-slate-50/80">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 sm:px-6 sm:py-4">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 sm:px-6 sm:py-4">
                      Code
                    </th>
                    <th className="hidden px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 md:table-cell sm:px-6 sm:py-4">
                      Description
                    </th>
                    <th className="hidden px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 lg:table-cell sm:px-6 sm:py-4">
                      Head of Department
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 sm:px-6 sm:py-4">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-600 sm:px-6 sm:py-4">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredDepartments.length === 0 ? (
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
                              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                            />
                          </svg>
                          <p className="text-sm font-medium text-slate-600">
                            No departments found
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Get started by adding your first department
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredDepartments.map((department) => (
                      <tr
                        key={department._id}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="px-4 py-3 sm:px-6 sm:py-4">
                          <div className="text-sm font-medium text-slate-900">
                            {department.name}
                          </div>
                        </td>
                        <td className="px-4 py-3 sm:px-6 sm:py-4">
                          <div className="text-sm text-slate-600">
                            {department.code || "-"}
                          </div>
                        </td>
                        <td className="hidden px-4 py-3 md:table-cell sm:px-6 sm:py-4">
                          <div className="text-sm text-slate-600">
                            {department.description || "-"}
                          </div>
                        </td>
                        <td className="hidden px-4 py-3 lg:table-cell sm:px-6 sm:py-4">
                          <div className="text-sm text-slate-600">
                            {department.headOfDepartment?.name || "-"}
                          </div>
                        </td>
                        <td className="px-4 py-3 sm:px-6 sm:py-4">
                          <span
                            className={`inline-flex rounded-lg border px-2 py-1 text-xs font-semibold capitalize ${
                              department.status === "active"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border-slate-200 bg-slate-50 text-slate-700"
                            }`}
                          >
                            {department.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium sm:px-6 sm:py-4">
                          <button
                            onClick={() => navigate(`/departments/${department._id}`)}
                            className="text-indigo-600 hover:text-indigo-900"
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

      {/* Create Department Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="px-4 py-3 sm:px-6 sm:py-4">
              <h2 className="text-base font-semibold text-slate-900 sm:text-lg">
                Add Department
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="px-4 py-4 sm:px-6 sm:pb-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="e.g., Cardiology"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Code
                    </label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) =>
                        setFormData({ ...formData, code: e.target.value.toUpperCase() })
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      placeholder="e.g., CAR001"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Status
                    </label>
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
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Head of Department
                  </label>
                  <select
                    value={formData.headOfDepartment}
                    onChange={(e) =>
                      setFormData({ ...formData, headOfDepartment: e.target.value })
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
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={3}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="Department description..."
                  />
                </div>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:w-auto"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  {isSubmitting ? "Creating..." : "Create Department"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Departments;
