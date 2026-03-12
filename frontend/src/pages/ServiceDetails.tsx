import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { servicesAPI, departmentsAPI, serviceCategoriesAPI } from "../utils/api";
import { hasPermission, PERMISSIONS } from "../utils/permissions";
import { showSuccess, showError } from "../utils/toast";

type PriceHistoryEntry = {
  price: number;
  effectiveDate: string;
  changedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  note?: string;
};

type Service = {
  _id: string;
  name: string;
  code: string;
  description?: string;
  categoryId?: {
    _id: string;
    name: string;
    code?: string;
  };
  price: number;
  duration?: number;
  status: "active" | "inactive";
  departmentId?: {
    _id: string;
    name: string;
    code?: string;
  };
  priceHistory?: PriceHistoryEntry[];
  createdAt: string;
  updatedAt?: string;
};

type ServiceForm = {
  name: string;
  code: string;
  description: string;
  categoryId: string;
  price: string;
  duration: string;
  status: "active" | "inactive";
  departmentId: string;
};

function ServiceDetails() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [service, setService] = useState<Service | null>(null);
  const [departments, setDepartments] = useState<Array<{ _id: string; name: string }>>([]);
  const [categories, setCategories] = useState<Array<{ _id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [formData, setFormData] = useState<ServiceForm>({
    name: "",
    code: "",
    description: "",
    category: "other",
    price: "",
    duration: "",
    status: "active",
    departmentId: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isNewService = id === "new";

  useEffect(() => {
    checkAuth();
    fetchDepartments();
    fetchCategories();
    if (id && !isNewService) {
      fetchService();
    } else if (isNewService) {
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

  const fetchDepartments = async () => {
    try {
      const response = await departmentsAPI.getAll({ status: "active" });
      if (response.success && response.data?.departments) {
        const deptList = response.data.departments.map((dept: any) => ({
          _id: dept._id,
          name: dept.name,
        }));
        setDepartments(deptList);
      }
    } catch (err) {
      console.error("Error fetching departments:", err);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await serviceCategoriesAPI.getAll({ status: "active" });
      if (response.success && response.data?.categories) {
        const catList = response.data.categories.map((cat: any) => ({
          _id: cat._id,
          name: cat.name,
        }));
        setCategories(catList);
      }
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  };

  const fetchService = async () => {
    if (!id || isNewService) return;
    try {
      setLoading(true);
      const response = await servicesAPI.getById(id);
      if (response.success) {
        const serviceData = response.data.service;
        setService(serviceData);
        setFormData({
          name: serviceData.name,
          code: serviceData.code,
          description: serviceData.description || "",
          categoryId: serviceData.categoryId?._id || "",
          price: serviceData.price.toString(),
          duration: serviceData.duration?.toString() || "",
          status: serviceData.status,
          departmentId: serviceData.departmentId?._id || "",
        });
      } else {
        showError("Failed to fetch service");
        setTimeout(() => navigate("/services"), 2000);
      }
    } catch (err) {
      showError("Error loading service");
      console.error(err);
      setTimeout(() => navigate("/services"), 2000);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (service) {
      setFormData({
        name: service.name,
        code: service.code,
        description: service.description || "",
        categoryId: service.categoryId?._id || "",
        price: service.price.toString(),
        duration: service.duration?.toString() || "",
        status: service.status,
        departmentId: service.departmentId?._id || "",
      });
    }
    setIsEditing(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    setIsSubmitting(true);

    try {
      if (!formData.name || !formData.code || !formData.price) {
        showError("Service name, code, and price are required");
        setIsSubmitting(false);
        return;
      }

      let response;
      if (isNewService) {
        response = await servicesAPI.create({
          name: formData.name,
          code: formData.code,
          description: formData.description || undefined,
          categoryId: formData.categoryId,
          price: parseFloat(formData.price),
          duration: formData.duration ? parseInt(formData.duration) : undefined,
          status: formData.status,
          departmentId: formData.departmentId || undefined,
        });
      } else {
        response = await servicesAPI.update(id, {
          name: formData.name,
          code: formData.code,
          description: formData.description || undefined,
          categoryId: formData.categoryId,
          price: parseFloat(formData.price),
          duration: formData.duration ? parseInt(formData.duration) : undefined,
          status: formData.status,
          departmentId: formData.departmentId || undefined,
        });
      }

      if (response.success) {
        showSuccess(
          isNewService
            ? "Service created successfully"
            : "Service updated successfully"
        );
        if (isNewService) {
          setTimeout(() => navigate("/services"), 1000);
        } else {
          setIsEditing(false);
          fetchService();
        }
      } else {
        showError(response.message || "Failed to save service");
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
    if (!id || isNewService) return;

    try {
      const response = await servicesAPI.delete(id);
      if (response.success) {
        showSuccess("Service deleted successfully");
        setTimeout(() => {
          navigate("/services");
        }, 1000);
      } else {
        showError(response.message || "Failed to delete service");
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
            <p className="text-slate-600">Loading service details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!service && !isNewService) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <div className="flex flex-1 items-center justify-center sidebar-content-margin">
          <div className="text-center">
            <p className="text-slate-600">Service not found</p>
            <Link
              to="/services"
              className="mt-4 inline-block text-indigo-600 hover:text-indigo-700"
            >
              Back to Services
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
                onClick={() => navigate("/services")}
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
                  {isNewService
                    ? "New Service"
                    : isEditing
                    ? "Edit Service"
                    : "Service Details"}
                </h1>
                <p className="mt-1 text-xs text-slate-600 sm:mt-1.5 sm:text-sm">
                  {isNewService
                    ? "Create a new service"
                    : isEditing
                    ? "Update service information"
                    : "View and manage service details"}
                </p>
              </div>
            </div>
            {!isNewService && !isEditing && service && (
              <div className="flex gap-2">
                {hasPermission(PERMISSIONS.SERVICES_EDIT) && (
                  <button
                    onClick={handleEdit}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Edit
                  </button>
                )}
                {hasPermission(PERMISSIONS.SERVICES_DELETE) && (
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
                    {isEditing || isNewService ? (
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
                        {service?.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Code <span className="text-red-500">*</span>
                    </label>
                    {isEditing || isNewService ? (
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
                        required
                      />
                    ) : (
                      <p className="mt-1 text-sm text-slate-900">
                        {service?.code}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Category
                    </label>
                    {isEditing || isNewService ? (
                      <select
                        value={formData.categoryId}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            categoryId: e.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      >
                        <option value="">Select Category</option>
                        {categories.map((cat) => (
                          <option key={cat._id} value={cat._id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="mt-1 inline-flex rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-sm font-medium text-slate-700">
                        {service?.categoryId?.name || "-"}
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Status
                    </label>
                    {isEditing || isNewService ? (
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
                          service?.status === "active"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-slate-50 text-slate-700"
                        }`}
                      >
                        {service?.status}
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Price (₹) <span className="text-red-500">*</span>
                    </label>
                    {isEditing || isNewService ? (
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.price}
                        onChange={(e) =>
                          setFormData({ ...formData, price: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        required
                      />
                    ) : (
                      <p className="mt-1 text-lg font-bold text-slate-900">
                        ₹{service?.price.toFixed(2)}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Duration (minutes)
                    </label>
                    {isEditing || isNewService ? (
                      <input
                        type="number"
                        min="0"
                        value={formData.duration}
                        onChange={(e) =>
                          setFormData({ ...formData, duration: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        placeholder="Optional"
                      />
                    ) : (
                      <p className="mt-1 text-sm text-slate-900">
                        {service?.duration ? `${service.duration} min` : "-"}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Department
                    </label>
                    {isEditing || isNewService ? (
                      <select
                        value={formData.departmentId}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            departmentId: e.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      >
                        <option value="">Select Department</option>
                        {departments.map((dept) => (
                          <option key={dept._id} value={dept._id}>
                            {dept.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="mt-1 text-sm text-slate-900">
                        {service?.departmentId?.name || "-"}
                      </p>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Description
                    </label>
                    {isEditing || isNewService ? (
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
                        placeholder="Service description..."
                      />
                    ) : (
                      <p className="mt-1 text-sm text-slate-900">
                        {service?.description || "-"}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Price History */}
              {!isNewService && service && service.priceHistory && service.priceHistory.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="mb-4 text-lg font-semibold text-slate-900">
                    Price History
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="border-b border-slate-200 bg-slate-50/80">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 sm:px-6 sm:py-4">
                            Date
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 sm:px-6 sm:py-4">
                            Price (₹)
                          </th>
                          <th className="hidden px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 md:table-cell sm:px-6 sm:py-4">
                            Changed By
                          </th>
                          <th className="hidden px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 lg:table-cell sm:px-6 sm:py-4">
                            Note
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {service.priceHistory
                          .slice()
                          .reverse()
                          .map((entry, index) => (
                            <tr key={index} className="transition hover:bg-slate-50">
                              <td className="px-4 py-3 sm:px-6 sm:py-4">
                                <div className="text-sm text-slate-900">
                                  {new Date(entry.effectiveDate).toLocaleDateString()}
                                </div>
                                <div className="text-xs text-slate-500">
                                  {new Date(entry.effectiveDate).toLocaleTimeString()}
                                </div>
                              </td>
                              <td className="px-4 py-3 sm:px-6 sm:py-4">
                                <div className="text-sm font-semibold text-slate-900">
                                  ₹{entry.price.toFixed(2)}
                                </div>
                              </td>
                              <td className="hidden px-4 py-3 md:table-cell sm:px-6 sm:py-4">
                                <div className="text-sm text-slate-600">
                                  {entry.changedBy?.name || "-"}
                                </div>
                              </td>
                              <td className="hidden px-4 py-3 lg:table-cell sm:px-6 sm:py-4">
                                <div className="text-sm text-slate-600">
                                  {entry.note || "-"}
                                </div>
                              </td>
                            </tr>
                          ))}
                        {/* Current price */}
                        <tr className="bg-indigo-50">
                          <td className="px-4 py-3 sm:px-6 sm:py-4">
                            <div className="text-sm font-medium text-indigo-900">
                              Current
                            </div>
                          </td>
                          <td className="px-4 py-3 sm:px-6 sm:py-4">
                            <div className="text-sm font-bold text-indigo-900">
                              ₹{service.price.toFixed(2)}
                            </div>
                          </td>
                          <td className="hidden px-4 py-3 md:table-cell sm:px-6 sm:py-4">
                            <div className="text-sm text-indigo-700">-</div>
                          </td>
                          <td className="hidden px-4 py-3 lg:table-cell sm:px-6 sm:py-4">
                            <div className="text-sm text-indigo-700">Current price</div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {(isEditing || isNewService) && (
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={isNewService ? () => navigate("/services") : handleCancel}
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
                      ? isNewService
                        ? "Creating..."
                        : "Saving..."
                      : isNewService
                      ? "Create Service"
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
                Delete Service
              </h2>
              <p className="mt-2 text-xs text-slate-600 sm:text-sm">
                Are you sure you want to delete{" "}
                <span className="font-medium">{service?.name}</span>? This
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

export default ServiceDetails;
