import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { settingsAPI } from "../utils/api";
import { canAccessRoute, hasPermission, PERMISSIONS } from "../utils/permissions";
import { showSuccess, showError } from "../utils/toast";

type RoomType = {
  _id: string;
  key: string;
  value: string;
  description?: string;
  isActive: boolean;
  isSystem: boolean;
};

function Settings() {
  const navigate = useNavigate();
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingType, setEditingType] = useState<RoomType | null>(null);
  const [formData, setFormData] = useState({
    roomType: "",
    description: "",
  });

  useEffect(() => {
    checkAuth();
    fetchRoomTypes();
  }, []);

  const checkAuth = () => {
    const token =
      localStorage.getItem("proclinic_token") ||
      sessionStorage.getItem("proclinic_token");
    if (!token) {
      navigate("/login");
      return;
    }
    if (!canAccessRoute("/settings")) {
      navigate("/dashboard");
    }
  };

  const fetchRoomTypes = async () => {
    try {
      setLoading(true);
      const response = await settingsAPI.getAll({ category: "room-types" });
      if (response.success && response.data?.settings) {
        const types = response.data.settings["room-types"] || [];
        setRoomTypes(types);
      } else {
        showError("Failed to fetch room types");
      }
    } catch (err) {
      showError("Error loading room types");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRoomType = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await settingsAPI.addRoomType(formData);
      if (response.success) {
        showSuccess("Room type added successfully");
        setShowAddModal(false);
        setFormData({ roomType: "", description: "" });
        fetchRoomTypes();
      } else {
        showError(response.message || "Failed to add room type");
      }
    } catch (err: any) {
      showError(err.message || "Error adding room type");
    }
  };

  const handleEditRoomType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingType) return;

    try {
      const response = await settingsAPI.update(editingType._id, {
        value: formData.roomType,
        description: formData.description,
      });
      if (response.success) {
        showSuccess("Room type updated successfully");
        setEditingType(null);
        setFormData({ roomType: "", description: "" });
        fetchRoomTypes();
      } else {
        showError(response.message || "Failed to update room type");
      }
    } catch (err: any) {
      showError(err.message || "Error updating room type");
    }
  };

  const handleDeleteRoomType = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this room type?")) {
      return;
    }

    try {
      const response = await settingsAPI.delete(id);
      if (response.success) {
        showSuccess("Room type deleted successfully");
        fetchRoomTypes();
      } else {
        showError(response.message || "Failed to delete room type");
      }
    } catch (err: any) {
      showError(err.message || "Error deleting room type");
    }
  };

  const handleToggleActive = async (type: RoomType) => {
    try {
      const response = await settingsAPI.update(type._id, {
        isActive: !type.isActive,
      });
      if (response.success) {
        showSuccess(`Room type ${!type.isActive ? "activated" : "deactivated"}`);
        fetchRoomTypes();
      } else {
        showError(response.message || "Failed to update room type");
      }
    } catch (err: any) {
      showError(err.message || "Error updating room type");
    }
  };

  const handleEditClick = (type: RoomType) => {
    setEditingType(type);
    setFormData({
      roomType: type.value,
      description: type.description || "",
    });
    setShowAddModal(true);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <div className="flex flex-1 items-center justify-center lg:ml-72">
          <div className="text-center">
            <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
            <p className="text-slate-600">Loading settings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <div className="flex flex-1 flex-col lg:ml-72">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm shadow-sm">
          <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4 lg:px-8">
            <div>
              <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Settings</h1>
              <p className="mt-1 text-xs text-slate-600 sm:mt-1.5 sm:text-sm">
                Manage hospital preferences and configurations
              </p>
            </div>
            {hasPermission(PERMISSIONS.SETTINGS_EDIT) && (
              <button
                onClick={() => {
                  setEditingType(null);
                  setFormData({ roomType: "", description: "" });
                  setShowAddModal(true);
                }}
                className="w-full rounded-xl bg-indigo-700 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-500/30 transition hover:bg-indigo-800 hover:shadow-lg hover:shadow-indigo-500/40 sm:w-auto sm:px-5 sm:py-2.5"
              >
                + Add Room Type
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {/* Room Types Section */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-3 sm:px-6 sm:py-4">
              <h2 className="text-lg font-semibold text-slate-900">Room Types</h2>
              <p className="mt-1 text-xs text-slate-600 sm:text-sm">
                Manage room types available for room creation and patient admission
              </p>
            </div>
            <div className="p-4 sm:p-6">
              {roomTypes.length === 0 ? (
                <div className="py-8 text-center">
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
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                  <p className="text-sm text-slate-600">No room types configured</p>
                  <p className="mt-1 text-xs text-slate-500">Add your first room type to get started</p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <table className="w-full min-w-[640px]">
                    <thead className="border-b border-slate-200 bg-slate-50/80">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 sm:px-6 sm:py-4">
                          Room Type
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 sm:px-6 sm:py-4">
                          Description
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
                      {roomTypes.map((type) => (
                        <tr key={type._id} className="transition-colors hover:bg-slate-50/50">
                          <td className="whitespace-nowrap px-4 py-3 sm:px-6 sm:py-4">
                            <div className="text-sm font-medium text-slate-900 capitalize">
                              {type.value}
                            </div>
                          </td>
                          <td className="px-4 py-3 sm:px-6 sm:py-4">
                            <div className="text-sm text-slate-600">
                              {type.description || "No description"}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 sm:px-6 sm:py-4">
                            <span
                              className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                                type.isActive
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : "border-slate-200 bg-slate-50 text-slate-600"
                              }`}
                            >
                              {type.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right sm:px-6 sm:py-4">
                            <div className="flex justify-end gap-2">
                              {hasPermission(PERMISSIONS.SETTINGS_EDIT) && (
                                <>
                                  <button
                                    onClick={() => handleToggleActive(type)}
                                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                                      type.isActive
                                        ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                                        : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                    }`}
                                  >
                                    {type.isActive ? "Deactivate" : "Activate"}
                                  </button>
                                  <button
                                    onClick={() => handleEditClick(type)}
                                    className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
                                  >
                                    Edit
                                  </button>
                                  {!type.isSystem && (
                                    <button
                                      onClick={() => handleDeleteRoomType(type._id)}
                                      className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                                    >
                                      Delete
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Add/Edit Room Type Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="px-4 py-3 sm:px-6 sm:py-4">
              <h2 className="text-base font-semibold text-slate-900 sm:text-lg">
                {editingType ? "Edit Room Type" : "Add Room Type"}
              </h2>
            </div>
            <form
              onSubmit={editingType ? handleEditRoomType : handleAddRoomType}
              className="px-4 sm:px-6 sm:pb-6"
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Room Type Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.roomType}
                    onChange={(e) => setFormData({ ...formData, roomType: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="e.g., Deluxe, VIP, Executive"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="Description of this room type..."
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingType(null);
                    setFormData({ roomType: "", description: "" });
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-800"
                >
                  {editingType ? "Update" : "Add"} Room Type
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Settings;
