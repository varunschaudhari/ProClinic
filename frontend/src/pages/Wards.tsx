import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { wardAPI, settingsAPI, usersAPI } from "../utils/api";
import { canAccessRoute, hasPermission, PERMISSIONS } from "../utils/permissions";
import { showSuccess, showError } from "../utils/toast";

type Ward = {
  _id: string;
  wardName: string;
  wardCode?: string;
  wardType: string;
  floor?: string;
  description?: string;
  capacity: number;
  currentOccupancy: number;
  inCharge?: {
    _id: string;
    name: string;
    email: string;
  };
  isActive: boolean;
  stats?: {
    totalRooms: number;
    totalBeds: number;
    occupiedBeds: number;
    availableBeds: number;
    currentAdmissions: number;
    occupancyRate: string;
  };
};

type WardStats = {
  totalWards: number;
  totalCapacity: number;
  totalOccupancy: number;
  overallOccupancyRate: string;
  wardsByType: Record<string, number>;
};

function Wards() {
  const navigate = useNavigate();
  const [wards, setWards] = useState<Ward[]>([]);
  const [stats, setStats] = useState<WardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [wardTypes, setWardTypes] = useState<string[]>([]);
  const [users, setUsers] = useState<Array<{ _id: string; name: string }>>([]);
  const [filters, setFilters] = useState({
    wardType: "",
    floor: "",
    isActive: "",
  });
  const [formData, setFormData] = useState({
    wardName: "",
    wardCode: "",
    wardType: "",
    floor: "",
    description: "",
    capacity: "0",
    inCharge: "",
    notes: "",
  });

  useEffect(() => {
    checkAuth();
    fetchWardTypes();
    fetchUsers();
    fetchWards();
    fetchStats();
  }, [filters]);

  const checkAuth = () => {
    const token =
      localStorage.getItem("proclinic_token") ||
      sessionStorage.getItem("proclinic_token");
    if (!token) {
      navigate("/login");
      return;
    }
    if (!canAccessRoute("/ipd/wards")) {
      navigate("/dashboard");
    }
  };

  const fetchWardTypes = async () => {
    try {
      const response = await settingsAPI.getWardTypes();
      if (response.success && response.data?.wardTypes) {
        setWardTypes(response.data.wardTypes);
      }
    } catch (err) {
      console.error("Error fetching ward types:", err);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await usersAPI.getAll();
      if (response.success && response.data?.users) {
        const userList = response.data.users.map((user: any) => ({
          _id: user._id,
          name: user.name,
        }));
        setUsers(userList);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  };

  const fetchWards = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filters.wardType) params.wardType = filters.wardType;
      if (filters.floor) params.floor = filters.floor;
      if (filters.isActive !== "") params.isActive = filters.isActive === "true";

      const response = await wardAPI.getAll(params);
      if (response.success) {
        setWards(response.data.wards);
      } else {
        showError("Failed to fetch wards");
      }
    } catch (err) {
      showError("Error loading wards");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const params: any = {};
      if (filters.wardType) params.wardType = filters.wardType;

      const response = await wardAPI.getStats(params);
      if (response.success) {
        setStats(response.data.stats);
      }
    } catch (err) {
      console.error("Error fetching ward stats:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        wardName: formData.wardName,
        wardType: formData.wardType,
        capacity: parseInt(formData.capacity) || 0,
      };

      if (formData.wardCode) payload.wardCode = formData.wardCode;
      if (formData.floor) payload.floor = formData.floor;
      if (formData.description) payload.description = formData.description;
      if (formData.inCharge) payload.inCharge = formData.inCharge;
      if (formData.notes) payload.notes = formData.notes;

      const response = await wardAPI.create(payload);

      if (response.success) {
        showSuccess("Ward created successfully");
        setShowCreateModal(false);
        setFormData({
          wardName: "",
          wardCode: "",
          wardType: "",
          floor: "",
          description: "",
          capacity: "0",
          inCharge: "",
          notes: "",
        });
        fetchWards();
        fetchStats();
      } else {
        showError(response.message || "Failed to create ward");
      }
    } catch (err: any) {
      showError(err.message || "Error creating ward");
    }
  };

  const handleDelete = async (id: string, wardName: string) => {
    if (!window.confirm(`Are you sure you want to delete ward "${wardName}"?`)) {
      return;
    }

    try {
      const response = await wardAPI.delete(id);
      if (response.success) {
        showSuccess("Ward deleted successfully");
        fetchWards();
        fetchStats();
      } else {
        showError(response.message || "Failed to delete ward");
      }
    } catch (err: any) {
      showError(err.message || "Error deleting ward");
    }
  };

  const handleToggleActive = async (ward: Ward) => {
    try {
      const response = await wardAPI.update(ward._id, {
        isActive: !ward.isActive,
      });
      if (response.success) {
        showSuccess(`Ward ${!ward.isActive ? "activated" : "deactivated"}`);
        fetchWards();
        fetchStats();
      } else {
        showError(response.message || "Failed to update ward");
      }
    } catch (err: any) {
      showError(err.message || "Error updating ward");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <div className="flex flex-1 items-center justify-center sidebar-content-margin">
          <div className="text-center">
            <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
            <p className="text-slate-600">Loading wards...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <div className="flex flex-1 flex-col sidebar-content-margin">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm shadow-sm">
          <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4 lg:px-8">
            <div>
              <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Ward Management</h1>
              <p className="mt-1 text-xs text-slate-600 sm:mt-1.5 sm:text-sm">
                Manage wards, capacity, and occupancy
              </p>
            </div>
            {hasPermission(PERMISSIONS.WARDS_CREATE) && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="w-full rounded-xl bg-indigo-700 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-500/30 transition hover:bg-indigo-800 hover:shadow-lg hover:shadow-indigo-500/40 sm:w-auto sm:px-5 sm:py-2.5"
              >
                + Add Ward
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {/* Stats */}
          {stats && (
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-600">Total Wards</p>
                <p className="mt-1 text-3xl font-bold text-slate-900">{stats.totalWards}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-600">Total Capacity</p>
                <p className="mt-1 text-3xl font-bold text-slate-900">{stats.totalCapacity}</p>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
                <p className="text-sm font-medium text-blue-700">Current Occupancy</p>
                <p className="mt-1 text-3xl font-bold text-blue-900">{stats.totalOccupancy}</p>
              </div>
              <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5 shadow-sm">
                <p className="text-sm font-medium text-indigo-700">Occupancy Rate</p>
                <p className="mt-1 text-3xl font-bold text-indigo-900">{stats.overallOccupancyRate}%</p>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <select
                value={filters.wardType}
                onChange={(e) => setFilters({ ...filters, wardType: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 px-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 sm:py-3"
              >
                <option value="">All Ward Types</option>
                {wardTypes.map((type) => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1).replace(/-/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <input
                type="text"
                placeholder="Floor"
                value={filters.floor}
                onChange={(e) => setFilters({ ...filters, floor: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 px-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 sm:py-3"
              />
            </div>
            <div>
              <select
                value={filters.isActive}
                onChange={(e) => setFilters({ ...filters, isActive: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 px-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 sm:py-3"
              >
                <option value="">All Status</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </div>

          {/* Wards Table */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full min-w-[1000px]">
                <thead className="border-b border-slate-200 bg-slate-50/80">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 sm:px-6 sm:py-4">
                      Ward Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 sm:px-6 sm:py-4">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 sm:px-6 sm:py-4">
                      Floor
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 sm:px-6 sm:py-4">
                      In-Charge
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 sm:px-6 sm:py-4">
                      Capacity
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 sm:px-6 sm:py-4">
                      Occupancy
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
                  {wards.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center justify-center">
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
                          <p className="text-sm font-medium text-slate-600">No wards found</p>
                          <p className="mt-1 text-xs text-slate-500">Create your first ward to get started</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    wards.map((ward) => (
                      <tr
                        key={ward._id}
                        className="transition-colors hover:bg-slate-50/50 cursor-pointer"
                        onClick={() => navigate(`/ipd/wards/${ward._id}`)}
                      >
                        <td className="whitespace-nowrap px-4 py-3 sm:px-6 sm:py-4">
                          <div className="text-sm font-semibold text-indigo-700">
                            {ward.wardName}
                          </div>
                          {ward.wardCode && (
                            <div className="text-xs text-slate-500">{ward.wardCode}</div>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 sm:px-6 sm:py-4">
                          <span className="inline-flex rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 capitalize">
                            {ward.wardType.replace(/-/g, " ")}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600 sm:px-6 sm:py-4">
                          {ward.floor || "N/A"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600 sm:px-6 sm:py-4">
                          {ward.inCharge ? ward.inCharge.name : "Not Assigned"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600 sm:px-6 sm:py-4">
                          {ward.capacity}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 sm:px-6 sm:py-4">
                          <div className="text-sm text-slate-900">
                            {ward.currentOccupancy} / {ward.capacity}
                          </div>
                          {ward.stats && (
                            <div className="text-xs text-slate-500">
                              {ward.stats.occupancyRate}% occupied
                            </div>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 sm:px-6 sm:py-4">
                          <span
                            className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                              ward.isActive
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border-slate-200 bg-slate-50 text-slate-600"
                            }`}
                          >
                            {ward.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right sm:px-6 sm:py-4">
                          <div className="flex justify-end gap-2">
                            {hasPermission(PERMISSIONS.WARDS_EDIT) && (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleActive(ward);
                                  }}
                                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                                    ward.isActive
                                      ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                                      : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                  }`}
                                >
                                  {ward.isActive ? "Deactivate" : "Activate"}
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/ipd/wards/${ward._id}`);
                                  }}
                                  className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
                                >
                                  View
                                </button>
                              </>
                            )}
                            {hasPermission(PERMISSIONS.WARDS_DELETE) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(ward._id, ward.wardName);
                                }}
                                className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                              >
                                Delete
                              </button>
                            )}
                          </div>
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

      {/* Create Ward Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="px-4 py-3 sm:px-6 sm:py-4">
              <h2 className="text-base font-semibold text-slate-900 sm:text-lg">Create New Ward</h2>
            </div>
            <form onSubmit={handleSubmit} className="px-4 sm:px-6 sm:pb-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Ward Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.wardName}
                    onChange={(e) => setFormData({ ...formData, wardName: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="e.g., General Ward A"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Ward Code
                  </label>
                  <input
                    type="text"
                    value={formData.wardCode}
                    onChange={(e) => setFormData({ ...formData, wardCode: e.target.value.toUpperCase() })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="e.g., GW-A"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Ward Type *
                  </label>
                  <select
                    required
                    value={formData.wardType}
                    onChange={(e) => setFormData({ ...formData, wardType: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  >
                    <option value="">Select Ward Type</option>
                    {wardTypes.map((type) => (
                      <option key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1).replace(/-/g, " ")}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Floor
                  </label>
                  <input
                    type="text"
                    value={formData.floor}
                    onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="e.g., 1st Floor"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Capacity
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    In-Charge
                  </label>
                  <select
                    value={formData.inCharge}
                    onChange={(e) => setFormData({ ...formData, inCharge: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  >
                    <option value="">Select In-Charge</option>
                    {users.map((user) => (
                      <option key={user._id} value={user._id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="Ward description..."
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="Additional notes..."
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setFormData({
                      wardName: "",
                      wardCode: "",
                      wardType: "",
                      floor: "",
                      description: "",
                      capacity: "0",
                      inCharge: "",
                      notes: "",
                    });
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-800"
                >
                  Create Ward
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Wards;
