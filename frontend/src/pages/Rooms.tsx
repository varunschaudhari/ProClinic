import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { roomAPI, settingsAPI } from "../utils/api";
import { canAccessRoute, hasPermission, PERMISSIONS } from "../utils/permissions";
import { showSuccess, showError } from "../utils/toast";

type Room = {
  _id: string;
  roomNumber: string;
  roomType: string;
  floor?: string;
  ward?: string;
  capacity: number;
  ratePerDay: number;
  amenities: string[];
  beds: Array<{
    bedNumber: string;
    status: string;
    currentPatientId?: string;
  }>;
  stats?: {
    total: number;
    occupied: number;
    available: number;
    maintenance: number;
    occupancyRate: string;
  };
  currentPatients?: Array<{
    ipdId: string;
    patientId: {
      _id: string;
      name: string;
      patientId: string;
    };
    bedNumber: string;
  }>;
};

type RoomStats = {
  totalRooms: number;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  maintenanceBeds: number;
  occupancyRate: string;
  currentAdmissions: number;
  roomsByType: Record<string, number>;
};

function Rooms() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [stats, setStats] = useState<RoomStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [roomTypes, setRoomTypes] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    roomType: "",
    floor: "",
    ward: "",
    status: "",
  });
  const [formData, setFormData] = useState({
    roomNumber: "",
    roomType: "general",
    floor: "",
    ward: "",
    capacity: "1",
    ratePerDay: "0",
    amenities: "",
    notes: "",
    beds: "",
  });

  useEffect(() => {
    checkAuth();
    fetchRoomTypes();
    fetchRooms();
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
    if (!canAccessRoute("/ipd/rooms")) {
      navigate("/dashboard");
    }
  };

  const fetchRoomTypes = async () => {
    try {
      const response = await settingsAPI.getRoomTypes();
      if (response.success && response.data?.roomTypes) {
        setRoomTypes(response.data.roomTypes);
        // Set default room type if form is empty
        if (!formData.roomType && response.data.roomTypes.length > 0) {
          setFormData(prev => ({ ...prev, roomType: response.data.roomTypes[0] }));
        }
      }
    } catch (err) {
      console.error("Error fetching room types:", err);
      // Fallback to default room types
      setRoomTypes(["general", "private", "semi-private", "icu", "ccu", "isolation", "ward", "other"]);
    }
  };

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filters.roomType) params.roomType = filters.roomType;
      if (filters.floor) params.floor = filters.floor;
      if (filters.ward) params.ward = filters.ward;
      if (filters.status) params.status = filters.status;

      const response = await roomAPI.getAll(params);
      if (response.success) {
        setRooms(response.data.rooms);
      } else {
        showError("Failed to fetch rooms");
      }
    } catch (err) {
      showError("Error loading rooms");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await roomAPI.getStats();
      if (response.success && response.data?.stats) {
        setStats(response.data.stats);
      }
    } catch (err) {
      console.error("Error fetching room stats:", err);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const bedsArray = formData.beds
        ? formData.beds.split(",").map((b) => b.trim()).filter(Boolean)
        : [];

      const payload: any = {
        roomNumber: formData.roomNumber,
        roomType: formData.roomType,
        capacity: parseInt(formData.capacity),
        ratePerDay: parseFloat(formData.ratePerDay),
      };

      if (formData.floor) payload.floor = formData.floor;
      if (formData.ward) payload.ward = formData.ward;
      if (formData.amenities) payload.amenities = formData.amenities.split(",").map((a) => a.trim());
      if (formData.notes) payload.notes = formData.notes;
      if (bedsArray.length > 0) payload.beds = bedsArray;

      const response = await roomAPI.create(payload);
      if (response.success) {
        showSuccess("Room created successfully");
        setShowCreateModal(false);
        setFormData({
          roomNumber: "",
          roomType: "general",
          floor: "",
          ward: "",
          capacity: "1",
          ratePerDay: "0",
          amenities: "",
          notes: "",
          beds: "",
        });
        fetchRooms();
        fetchStats();
      } else {
        showError(response.message || "Failed to create room");
      }
    } catch (err: any) {
      showError(err.message || "Error creating room");
    }
  };

  const getBedStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "occupied":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "maintenance":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "reserved":
        return "bg-purple-50 text-purple-700 border-purple-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <div className="flex flex-1 items-center justify-center lg:ml-72">
          <div className="text-center">
            <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
            <p className="text-slate-600">Loading rooms...</p>
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
              <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Room Management</h1>
              <p className="mt-1 text-xs text-slate-600 sm:mt-1.5 sm:text-sm">
                Manage rooms, beds, and occupancy
              </p>
            </div>
            {hasPermission(PERMISSIONS.IPD_EDIT) && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="w-full rounded-xl bg-indigo-700 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-500/30 transition hover:bg-indigo-800 hover:shadow-lg hover:shadow-indigo-500/40 sm:w-auto sm:px-5 sm:py-2.5"
              >
                + Add Room
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {/* Stats */}
          {stats && (
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-600">Total Rooms</p>
                <p className="mt-1 text-3xl font-bold text-slate-900">{stats.totalRooms}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-600">Total Beds</p>
                <p className="mt-1 text-3xl font-bold text-slate-900">{stats.totalBeds}</p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
                <p className="text-sm font-medium text-emerald-700">Available</p>
                <p className="mt-1 text-3xl font-bold text-emerald-900">{stats.availableBeds}</p>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
                <p className="text-sm font-medium text-blue-700">Occupied</p>
                <p className="mt-1 text-3xl font-bold text-blue-900">{stats.occupiedBeds}</p>
                <p className="mt-1 text-xs text-blue-600">Occupancy: {stats.occupancyRate}%</p>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div>
              <select
                value={filters.roomType}
                onChange={(e) => setFilters({ ...filters, roomType: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 px-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 sm:py-3"
              >
                <option value="">All Room Types</option>
                {roomTypes.map((type) => (
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
              <input
                type="text"
                placeholder="Ward"
                value={filters.ward}
                onChange={(e) => setFilters({ ...filters, ward: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 px-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 sm:py-3"
              />
            </div>
            <div>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 px-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 sm:py-3"
              >
                <option value="">All Bed Statuses</option>
                <option value="available">Available</option>
                <option value="occupied">Occupied</option>
                <option value="maintenance">Maintenance</option>
                <option value="reserved">Reserved</option>
              </select>
            </div>
          </div>

          {/* Rooms Grid */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {rooms.map((room) => (
              <div key={room._id} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{room.roomNumber}</h3>
                    <p className="text-xs text-slate-500 capitalize">{room.roomType}</p>
                    {room.floor && <p className="text-xs text-slate-500">Floor: {room.floor}</p>}
                    {room.ward && <p className="text-xs text-slate-500">Ward: {room.ward}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900">₹{room.ratePerDay}/day</p>
                    {room.stats && (
                      <p className="text-xs text-slate-500">
                        {room.stats.occupancyRate}% occupied
                      </p>
                    )}
                  </div>
                </div>

                <div className="mb-4">
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="text-slate-600">Beds: {room.beds.length}</span>
                    {room.stats && (
                      <span className="text-slate-600">
                        {room.stats.occupied} occupied, {room.stats.available} available
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {room.beds.map((bed) => (
                      <div
                        key={bed.bedNumber}
                        className={`rounded-lg border p-2 text-center text-xs font-medium ${getBedStatusColor(
                          bed.status
                        )}`}
                      >
                        <p>Bed {bed.bedNumber}</p>
                        <p className="mt-1 text-[10px] capitalize">{bed.status}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {room.currentPatients && room.currentPatients.length > 0 && (
                  <div className="border-t border-slate-200 pt-3">
                    <p className="mb-2 text-xs font-medium text-slate-600">Current Patients:</p>
                    {room.currentPatients.map((patient, idx) => (
                      <div
                        key={idx}
                        onClick={() => navigate(`/ipd/${patient.ipdId}`)}
                        className="mb-1 cursor-pointer rounded-lg bg-slate-50 p-2 text-xs hover:bg-slate-100"
                      >
                        <p className="font-medium text-slate-900">
                          {patient.patientId.name} ({patient.patientId.patientId})
                        </p>
                        <p className="text-slate-500">Bed {patient.bedNumber}</p>
                      </div>
                    ))}
                  </div>
                )}

                {room.amenities && room.amenities.length > 0 && (
                  <div className="mt-3 border-t border-slate-200 pt-3">
                    <p className="mb-1 text-xs font-medium text-slate-600">Amenities:</p>
                    <div className="flex flex-wrap gap-1">
                      {room.amenities.map((amenity, idx) => (
                        <span
                          key={idx}
                          className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] text-indigo-700"
                        >
                          {amenity}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {rooms.length === 0 && (
            <div className="py-16 text-center">
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
              <p className="text-sm font-medium text-slate-600">No rooms found</p>
              <p className="mt-1 text-xs text-slate-500">Create a new room to get started</p>
            </div>
          )}
        </main>
      </div>

      {/* Create Room Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="px-4 py-3 sm:px-6 sm:py-4">
              <h2 className="text-base font-semibold text-slate-900 sm:text-lg">Create New Room</h2>
            </div>
            <form onSubmit={handleCreateRoom} className="px-4 sm:px-6 sm:pb-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Room Number *</label>
                    <input
                      type="text"
                      required
                      value={formData.roomNumber}
                      onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value.toUpperCase() })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      placeholder="e.g., 101"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Room Type *</label>
                    <select
                      required
                      value={formData.roomType}
                      onChange={(e) => setFormData({ ...formData, roomType: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    >
                      {roomTypes.map((type) => (
                        <option key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1).replace(/-/g, " ")}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Floor</label>
                    <input
                      type="text"
                      value={formData.floor}
                      onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      placeholder="e.g., 1st"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Ward</label>
                    <input
                      type="text"
                      value={formData.ward}
                      onChange={(e) => setFormData({ ...formData, ward: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      placeholder="e.g., A"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Capacity *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.capacity}
                      onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Rate Per Day (₹) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.ratePerDay}
                    onChange={(e) => setFormData({ ...formData, ratePerDay: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Bed Numbers (comma-separated)</label>
                  <input
                    type="text"
                    value={formData.beds}
                    onChange={(e) => setFormData({ ...formData, beds: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="e.g., 1, 2, 3 (leave empty to auto-generate)"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Leave empty to auto-generate bed numbers based on capacity
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Amenities (comma-separated)</label>
                  <input
                    type="text"
                    value={formData.amenities}
                    onChange={(e) => setFormData({ ...formData, amenities: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="e.g., AC, TV, WiFi"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
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
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-800"
                >
                  Create Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Rooms;
