import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { servicesAPI, departmentsAPI, serviceCategoriesAPI } from "../utils/api";
import { canAccessRoute, hasPermission, PERMISSIONS } from "../utils/permissions";
import { showSuccess, showError } from "../utils/toast";

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
  createdAt: string;
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

function Services() {
  const navigate = useNavigate();
  const [services, setServices] = useState<Service[]>([]);
  const [departments, setDepartments] = useState<Array<{ _id: string; name: string }>>([]);
  const [categories, setCategories] = useState<Array<{ _id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "catalog">("list");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState<ServiceForm>({
    name: "",
    code: "",
    description: "",
    categoryId: "",
    price: "",
    duration: "",
    status: "active",
    departmentId: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    checkAuth();
    fetchServices();
    fetchDepartments();
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, categoryFilter, departmentFilter]);

  const checkAuth = () => {
    const token =
      localStorage.getItem("proclinic_token") ||
      sessionStorage.getItem("proclinic_token");
    if (!token) {
      navigate("/login");
      return;
    }
    if (!canAccessRoute("/services")) {
      navigate("/dashboard");
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

  const fetchServices = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter) params.categoryId = categoryFilter;
      if (departmentFilter) params.departmentId = departmentFilter;
      if (searchQuery) params.search = searchQuery;
      const response = await servicesAPI.getAll(params);
      if (response.success) {
        setServices(response.data.services);
      } else {
        showError("Failed to fetch services");
      }
    } catch (err) {
      showError("Error loading services");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery || statusFilter || categoryFilter || departmentFilter) {
        fetchServices();
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleOpenModal = () => {
    setFormData({
      name: "",
      code: "",
      description: "",
      categoryId: "",
      price: "",
      duration: "",
      status: "active",
      departmentId: "",
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({
      name: "",
      code: "",
      description: "",
      categoryId: "",
      price: "",
      duration: "",
      status: "active",
      departmentId: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!formData.name || !formData.code || !formData.price) {
        showError("Service name, code, and price are required");
        setIsSubmitting(false);
        return;
      }

      const response = await servicesAPI.create({
        name: formData.name,
        code: formData.code,
        description: formData.description || undefined,
        categoryId: formData.categoryId || undefined,
        price: parseFloat(formData.price),
        duration: formData.duration ? parseInt(formData.duration) : undefined,
        status: formData.status,
        departmentId: formData.departmentId || undefined,
      });

      if (response.success) {
        showSuccess("Service created successfully");
        fetchServices();
        setTimeout(() => {
          handleCloseModal();
        }, 1000);
      } else {
        showError(response.message || "Failed to create service");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      showError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredServices = services.filter((service) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        service.name.toLowerCase().includes(query) ||
        service.code.toLowerCase().includes(query) ||
        service.description?.toLowerCase().includes(query)
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
            <p className="text-slate-600">Loading services...</p>
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
              <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Services</h1>
              <p className="mt-1 text-xs text-slate-600 sm:mt-1.5 sm:text-sm">
                Manage service catalog and pricing
              </p>
            </div>
            <div className="flex gap-2">
              <div className="flex rounded-lg border border-slate-300 bg-white p-1">
                <button
                  onClick={() => setViewMode("list")}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                    viewMode === "list"
                      ? "bg-indigo-600 text-white"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  List
                </button>
                <button
                  onClick={() => setViewMode("catalog")}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                    viewMode === "catalog"
                      ? "bg-indigo-600 text-white"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Catalog
                </button>
              </div>
              {hasPermission(PERMISSIONS.SERVICES_CREATE) && (
                <button
                  onClick={handleOpenModal}
                  className="w-full rounded-xl bg-indigo-700 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-500/30 transition hover:bg-indigo-800 hover:shadow-lg hover:shadow-indigo-500/40 sm:w-auto sm:px-5 sm:py-2.5"
                >
                  + Add Service
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {/* Search and Filter Bar */}
          <div className="mb-4 sm:mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative sm:col-span-2 lg:col-span-1">
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
                placeholder="Search services..."
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
            <div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 px-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 sm:py-3"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat._id} value={cat._id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 px-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 sm:py-3"
              >
                <option value="">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept._id} value={dept._id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Services Display */}
          {viewMode === "list" ? (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-slate-200 bg-slate-50/80">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 sm:px-6 sm:py-4">
                        Code
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 sm:px-6 sm:py-4">
                        Name
                      </th>
                      <th className="hidden px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 md:table-cell sm:px-6 sm:py-4">
                        Category
                      </th>
                      <th className="hidden px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 lg:table-cell sm:px-6 sm:py-4">
                        Department
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 sm:px-6 sm:py-4">
                        Price
                      </th>
                      <th className="hidden px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 md:table-cell sm:px-6 sm:py-4">
                        Duration
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
                    {filteredServices.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-16 text-center">
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
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                              />
                            </svg>
                            <p className="text-sm font-medium text-slate-600">
                              No services found
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              Get started by adding your first service
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredServices.map((service) => (
                        <tr
                          key={service._id}
                          className="transition hover:bg-slate-50"
                        >
                          <td className="px-4 py-3 sm:px-6 sm:py-4">
                            <div className="text-sm font-medium text-slate-900">
                              {service.code}
                            </div>
                          </td>
                          <td className="px-4 py-3 sm:px-6 sm:py-4">
                            <div className="text-sm font-medium text-slate-900">
                              {service.name}
                            </div>
                            {service.description && (
                              <div className="mt-1 text-xs text-slate-500">
                                {service.description}
                              </div>
                            )}
                          </td>
                          <td className="hidden px-4 py-3 md:table-cell sm:px-6 sm:py-4">
                            <span className="inline-flex rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700">
                              {service.categoryId?.name || "-"}
                            </span>
                          </td>
                          <td className="hidden px-4 py-3 lg:table-cell sm:px-6 sm:py-4">
                            <div className="text-sm text-slate-600">
                              {service.departmentId?.name || "-"}
                            </div>
                          </td>
                          <td className="px-4 py-3 sm:px-6 sm:py-4">
                            <div className="text-sm font-semibold text-slate-900">
                              ₹{service.price.toFixed(2)}
                            </div>
                          </td>
                          <td className="hidden px-4 py-3 md:table-cell sm:px-6 sm:py-4">
                            <div className="text-sm text-slate-600">
                              {service.duration ? `${service.duration} min` : "-"}
                            </div>
                          </td>
                          <td className="px-4 py-3 sm:px-6 sm:py-4">
                            <span
                              className={`inline-flex rounded-lg border px-2 py-1 text-xs font-semibold capitalize ${
                                service.status === "active"
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : "border-slate-200 bg-slate-50 text-slate-700"
                              }`}
                            >
                              {service.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-medium sm:px-6 sm:py-4">
                            <button
                              onClick={() => navigate(`/services/${service._id}`)}
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
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredServices.length === 0 ? (
                <div className="col-span-full rounded-xl border border-slate-200 bg-white p-12 text-center">
                  <svg
                    className="mx-auto mb-4 h-12 w-12 text-slate-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <p className="text-sm font-medium text-slate-600">
                    No services found
                  </p>
                </div>
              ) : (
                filteredServices.map((service) => (
                  <div
                    key={service._id}
                    onClick={() => navigate(`/services/${service._id}`)}
                    className="cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="text-xs font-medium text-slate-500">
                          {service.code}
                        </div>
                        <h3 className="mt-1 text-base font-semibold text-slate-900">
                          {service.name}
                        </h3>
                        {service.description && (
                          <p className="mt-1 text-xs text-slate-600 line-clamp-2">
                            {service.description}
                          </p>
                        )}
                      </div>
                      <span
                        className={`ml-2 inline-flex rounded-lg border px-2 py-1 text-xs font-semibold capitalize ${
                          service.status === "active"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-slate-50 text-slate-700"
                        }`}
                      >
                        {service.status}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                      <div>
                        <div className="text-xs text-slate-500">Price</div>
                        <div className="text-lg font-bold text-slate-900">
                          ₹{service.price.toFixed(2)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-500">Category</div>
                        <div className="text-sm font-medium text-slate-700">
                          {service.categoryId?.name || "-"}
                        </div>
                      </div>
                    </div>
                    {service.duration && (
                      <div className="mt-2 text-xs text-slate-500">
                        Duration: {service.duration} min
                      </div>
                    )}
                    {service.departmentId && (
                      <div className="mt-1 text-xs text-slate-500">
                        Dept: {service.departmentId.name}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </main>
      </div>

      {/* Create Service Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="px-4 py-3 sm:px-6 sm:py-4">
              <h2 className="text-base font-semibold text-slate-900 sm:text-lg">
                Add Service
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="px-4 py-4 sm:px-6 sm:pb-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                      placeholder="e.g., Blood Test"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) =>
                        setFormData({ ...formData, code: e.target.value.toUpperCase() })
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      placeholder="e.g., SRV001"
                      required
                    />
                  </div>
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
                    placeholder="Service description..."
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Category
                    </label>
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
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Price (₹) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData({ ...formData, price: e.target.value })
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Duration (min)
                    </label>
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
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Department
                    </label>
                    <select
                      value={formData.departmentId}
                      onChange={(e) =>
                        setFormData({ ...formData, departmentId: e.target.value })
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
                  {isSubmitting ? "Creating..." : "Create Service"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Services;
