import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { serviceCategoriesAPI } from "../utils/api";
import { hasPermission, PERMISSIONS } from "../utils/permissions";
import { showSuccess, showError } from "../utils/toast";

type ServiceCategory = {
  _id: string;
  name: string;
  code: string;
  description?: string;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt?: string;
};

type ServiceCategoryForm = {
  name: string;
  code: string;
  description: string;
  status: "active" | "inactive";
};

function ServiceCategoryDetails() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [category, setCategory] = useState<ServiceCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [formData, setFormData] = useState<ServiceCategoryForm>({
    name: "",
    code: "",
    description: "",
    status: "active",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isNewCategory = id === "new";

  useEffect(() => {
    checkAuth();
    if (id && !isNewCategory) {
      fetchCategory();
    } else if (isNewCategory) {
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

  const fetchCategory = async () => {
    if (!id || isNewCategory) return;
    try {
      setLoading(true);
      const response = await serviceCategoriesAPI.getById(id);
      if (response.success) {
        const categoryData = response.data.category;
        setCategory(categoryData);
        setFormData({
          name: categoryData.name,
          code: categoryData.code,
          description: categoryData.description || "",
          status: categoryData.status,
        });
      } else {
        showError("Failed to fetch service category");
        setTimeout(() => navigate("/service-categories"), 2000);
      }
    } catch (err) {
      showError("Error loading service category");
      console.error(err);
      setTimeout(() => navigate("/service-categories"), 2000);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (category) {
      setFormData({
        name: category.name,
        code: category.code,
        description: category.description || "",
        status: category.status,
      });
    }
    setIsEditing(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    setIsSubmitting(true);

    try {
      if (!formData.name || !formData.code) {
        showError("Category name and code are required");
        setIsSubmitting(false);
        return;
      }

      let response;
      if (isNewCategory) {
        response = await serviceCategoriesAPI.create({
          name: formData.name,
          code: formData.code,
          description: formData.description || undefined,
          status: formData.status,
        });
      } else {
        response = await serviceCategoriesAPI.update(id, {
          name: formData.name,
          code: formData.code,
          description: formData.description || undefined,
          status: formData.status,
        });
      }

      if (response.success) {
        showSuccess(
          isNewCategory
            ? "Service category created successfully"
            : "Service category updated successfully"
        );
        if (isNewCategory) {
          setTimeout(() => navigate("/service-categories"), 1000);
        } else {
          setIsEditing(false);
          fetchCategory();
        }
      } else {
        showError(response.message || "Failed to save service category");
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
    if (!id || isNewCategory) return;

    try {
      const response = await serviceCategoriesAPI.delete(id);
      if (response.success) {
        showSuccess("Service category deleted successfully");
        setTimeout(() => {
          navigate("/service-categories");
        }, 1000);
      } else {
        showError(response.message || "Failed to delete service category");
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
            <p className="text-slate-600">Loading service category details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!category && !isNewCategory) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <div className="flex flex-1 items-center justify-center sidebar-content-margin">
          <div className="text-center">
            <p className="text-slate-600">Service category not found</p>
            <Link
              to="/service-categories"
              className="mt-4 inline-block text-indigo-600 hover:text-indigo-700"
            >
              Back to Service Categories
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
                onClick={() => navigate("/service-categories")}
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
                  {isNewCategory
                    ? "New Service Category"
                    : isEditing
                    ? "Edit Service Category"
                    : "Service Category Details"}
                </h1>
                <p className="mt-1 text-xs text-slate-600 sm:mt-1.5 sm:text-sm">
                  {isNewCategory
                    ? "Create a new service category"
                    : isEditing
                    ? "Update category information"
                    : "View and manage category details"}
                </p>
              </div>
            </div>
            {!isNewCategory && !isEditing && category && (
              <div className="flex gap-2">
                {hasPermission(PERMISSIONS.SERVICE_CATEGORIES_EDIT) && (
                  <button
                    onClick={handleEdit}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Edit
                  </button>
                )}
                {hasPermission(PERMISSIONS.SERVICE_CATEGORIES_DELETE) && (
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
                    {isEditing || isNewCategory ? (
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
                        {category?.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Code <span className="text-red-500">*</span>
                    </label>
                    {isEditing || isNewCategory ? (
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
                        {category?.code}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Status
                    </label>
                    {isEditing || isNewCategory ? (
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
                          category?.status === "active"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-slate-50 text-slate-700"
                        }`}
                      >
                        {category?.status}
                      </span>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Description
                    </label>
                    {isEditing || isNewCategory ? (
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
                        placeholder="Category description..."
                      />
                    ) : (
                      <p className="mt-1 text-sm text-slate-900">
                        {category?.description || "-"}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              {(isEditing || isNewCategory) && (
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={isNewCategory ? () => navigate("/service-categories") : handleCancel}
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
                      ? isNewCategory
                        ? "Creating..."
                        : "Saving..."
                      : isNewCategory
                      ? "Create Category"
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
                Delete Service Category
              </h2>
              <p className="mt-2 text-xs text-slate-600 sm:text-sm">
                Are you sure you want to delete{" "}
                <span className="font-medium">{category?.name}</span>? This
                action cannot be undone. If any services are using this category, deletion will be prevented.
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

export default ServiceCategoryDetails;
