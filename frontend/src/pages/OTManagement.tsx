import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { otAPI, otComplexAPI } from "../utils/api";
import { canAccessRoute, hasPermission, PERMISSIONS } from "../utils/permissions";
import { showSuccess, showError } from "../utils/toast";

type OperationTheater = {
  _id: string;
  otNumber: string;
  otName: string;
  otComplexId?: {
    _id: string;
    complexCode: string;
    complexName: string;
  };
  otType: string;
  floor?: string;
  ward?: string;
  capacity: number;
  equipment: Array<{
    name: string;
    status: string;
  }>;
  amenities: string[];
  isActive: boolean;
  notes?: string;
};

type OTComplex = {
  _id: string;
  complexCode: string;
  complexName: string;
  location?: string;
  floor?: string;
  building?: string;
  description?: string;
  isActive: boolean;
  otCount?: number;
  ots?: OperationTheater[];
};

function OTManagement() {
  const navigate = useNavigate();
  const [operationTheaters, setOperationTheaters] = useState<OperationTheater[]>([]);
  const [otComplexes, setOtComplexes] = useState<OTComplex[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateOTModal, setShowCreateOTModal] = useState(false);
  const [showCreateComplexModal, setShowCreateComplexModal] = useState(false);
  const [expandedComplexes, setExpandedComplexes] = useState<Set<string>>(new Set());
  const [selectedComplex, setSelectedComplex] = useState<string>("");
  const [filters, setFilters] = useState({
    otType: "",
    otComplexId: "",
    floor: "",
    ward: "",
    isActive: "",
  });
  const [otFormData, setOtFormData] = useState({
    otNumber: "",
    otName: "",
    otComplexId: "",
    otType: "general",
    floor: "",
    ward: "",
    capacity: "1",
    equipment: "",
    amenities: "",
    notes: "",
  });
  const [complexFormData, setComplexFormData] = useState({
    complexCode: "",
    complexName: "",
    location: "",
    floor: "",
    building: "",
    description: "",
    notes: "",
  });

  useEffect(() => {
    checkAuth();
    fetchData();
  }, [filters]);

  const checkAuth = () => {
    const token =
      localStorage.getItem("proclinic_token") ||
      sessionStorage.getItem("proclinic_token");
    if (!token) {
      navigate("/login");
      return;
    }
    if (!canAccessRoute("/ipd/ot")) {
      navigate("/dashboard");
    }
  };

  const fetchData = async () => {
    await Promise.all([fetchOperationTheaters(), fetchOTComplexes()]);
  };

  const fetchOperationTheaters = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filters.otType) params.otType = filters.otType;
      if (filters.otComplexId) params.otComplexId = filters.otComplexId;
      if (filters.floor) params.floor = filters.floor;
      if (filters.ward) params.ward = filters.ward;
      if (filters.isActive !== "") params.isActive = filters.isActive === "true";

      const response = await otAPI.getAll(params);
      if (response.success) {
        setOperationTheaters(response.data.operationTheaters);
      }
    } catch (err) {
      console.error("Error fetching operation theaters:", err);
      showError("Failed to fetch operation theaters");
    } finally {
      setLoading(false);
    }
  };

  const fetchOTComplexes = async () => {
    try {
      const response = await otComplexAPI.getAll();
      if (response.success) {
        const complexes = response.data.complexes || [];
        setOtComplexes(complexes);

        // Auto-expand complexes that have OTs
        const complexesWithOTs = complexes.filter((c: OTComplex) => (c.otCount || 0) > 0);
        setExpandedComplexes(new Set(complexesWithOTs.map((c: OTComplex) => c._id)));
      }
    } catch (err) {
      console.error("Error fetching OT complexes:", err);
    }
  };

  const fetchComplexDetails = async (complexId: string) => {
    try {
      const response = await otComplexAPI.getById(complexId);
      if (response.success && response.data.complex) {
        const complex = response.data.complex;
        setOtComplexes((prev) =>
          prev.map((c) => (c._id === complexId ? { ...c, ots: complex.ots || [] } : c))
        );
      }
    } catch (err) {
      console.error("Error fetching complex details:", err);
    }
  };

  const toggleComplex = (complexId: string) => {
    setExpandedComplexes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(complexId)) {
        newSet.delete(complexId);
      } else {
        newSet.add(complexId);
        // Fetch OTs for this complex if not already loaded
        const complex = otComplexes.find((c) => c._id === complexId);
        if (complex && !complex.ots) {
          fetchComplexDetails(complexId);
        }
      }
      return newSet;
    });
  };

  const handleCreateComplex = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await otComplexAPI.create({
        complexCode: complexFormData.complexCode,
        complexName: complexFormData.complexName,
        location: complexFormData.location || undefined,
        floor: complexFormData.floor || undefined,
        building: complexFormData.building || undefined,
        description: complexFormData.description || undefined,
        notes: complexFormData.notes || undefined,
      });

      if (response.success) {
        showSuccess("OT Complex created successfully");
        setShowCreateComplexModal(false);
        setComplexFormData({
          complexCode: "",
          complexName: "",
          location: "",
          floor: "",
          building: "",
          description: "",
          notes: "",
        });
        fetchOTComplexes();
      } else {
        showError(response.message || "Failed to create OT complex");
      }
    } catch (err: any) {
      console.error("Error creating OT complex:", err);
      showError(err.message || "Failed to create OT complex");
    }
  };

  const handleCreateOT = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const equipmentArray = otFormData.equipment
        ? otFormData.equipment.split(",").map((eq) => ({
            name: eq.trim(),
            status: "available",
          }))
        : [];
      const amenitiesArray = otFormData.amenities
        ? otFormData.amenities.split(",").map((a) => a.trim())
        : [];

      const response = await otAPI.create({
        otNumber: otFormData.otNumber,
        otName: otFormData.otName,
        otComplexId: otFormData.otComplexId || undefined,
        otType: otFormData.otType,
        floor: otFormData.floor || undefined,
        ward: otFormData.ward || undefined,
        capacity: parseInt(otFormData.capacity),
        equipment: equipmentArray,
        amenities: amenitiesArray,
        notes: otFormData.notes || undefined,
      });

      if (response.success) {
        showSuccess("Operation theater created successfully");
        setShowCreateOTModal(false);
        setOtFormData({
          otNumber: "",
          otName: "",
          otComplexId: selectedComplex || "",
          otType: "general",
          floor: "",
          ward: "",
          capacity: "1",
          equipment: "",
          amenities: "",
          notes: "",
        });
        fetchData();
      } else {
        showError(response.message || "Failed to create operation theater");
      }
    } catch (err: any) {
      console.error("Error creating operation theater:", err);
      showError(err.message || "Failed to create operation theater");
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const response = await otAPI.update(id, { isActive: !currentStatus });
      if (response.success) {
        showSuccess(`Operation theater ${!currentStatus ? "activated" : "deactivated"} successfully`);
        fetchData();
      } else {
        showError(response.message || "Failed to update operation theater");
      }
    } catch (err: any) {
      console.error("Error updating operation theater:", err);
      showError(err.message || "Failed to update operation theater");
    }
  };

  const getOTTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "major":
        return "bg-red-50 text-red-700 border-red-200";
      case "minor":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "emergency":
        return "bg-orange-50 text-orange-700 border-orange-200";
      case "cardiac":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "neuro":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "orthopedic":
        return "bg-green-50 text-green-700 border-green-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  // Group OTs by complex
  const standaloneOTs = operationTheaters.filter((ot) => !ot.otComplexId);
  const otsByComplex = otComplexes.map((complex) => ({
    complex,
    ots: operationTheaters.filter((ot) => ot.otComplexId?._id === complex._id),
  }));

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <div className="flex flex-1 items-center justify-center sidebar-content-margin">
          <div className="text-center">
            <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
            <p className="text-slate-600">Loading operation theaters...</p>
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
              <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">OT Management</h1>
              <p className="mt-1 text-xs text-slate-600 sm:mt-1.5 sm:text-sm">
                Manage OT complexes and operation theaters
              </p>
            </div>
            <div className="flex gap-2">
              {hasPermission(PERMISSIONS.OT_CREATE) && (
                <>
                  <button
                    onClick={() => setShowCreateComplexModal(true)}
                    className="rounded-xl bg-slate-700 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-slate-800 sm:px-5 sm:py-2.5"
                  >
                    + Add OT Complex
                  </button>
                  <button
                    onClick={() => {
                      setSelectedComplex("");
                      setShowCreateOTModal(true);
                    }}
                    className="rounded-xl bg-indigo-700 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-500/30 transition hover:bg-indigo-800 hover:shadow-lg hover:shadow-indigo-500/40 sm:px-5 sm:py-2.5"
                  >
                    + Add OT
                  </button>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {/* Stats */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-600">Total OTs</p>
              <p className="mt-1 text-3xl font-bold text-slate-900">{operationTheaters.length}</p>
            </div>
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5 shadow-sm">
              <p className="text-sm font-medium text-indigo-700">OT Complexes</p>
              <p className="mt-1 text-3xl font-bold text-indigo-900">{otComplexes.length}</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
              <p className="text-sm font-medium text-emerald-700">Active OTs</p>
              <p className="mt-1 text-3xl font-bold text-emerald-900">
                {operationTheaters.filter((ot) => ot.isActive).length}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-600">Standalone OTs</p>
              <p className="mt-1 text-3xl font-bold text-slate-900">{standaloneOTs.length}</p>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-5">
            <div>
              <select
                value={filters.otComplexId}
                onChange={(e) => setFilters({ ...filters, otComplexId: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 px-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 sm:py-3"
              >
                <option value="">All Complexes</option>
                {otComplexes.map((complex) => (
                  <option key={complex._id} value={complex._id}>
                    {complex.complexCode} - {complex.complexName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <select
                value={filters.otType}
                onChange={(e) => setFilters({ ...filters, otType: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 px-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 sm:py-3"
              >
                <option value="">All OT Types</option>
                <option value="major">Major</option>
                <option value="minor">Minor</option>
                <option value="emergency">Emergency</option>
                <option value="cardiac">Cardiac</option>
                <option value="neuro">Neuro</option>
                <option value="orthopedic">Orthopedic</option>
                <option value="general">General</option>
                <option value="other">Other</option>
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

          {/* OT Complexes */}
          {otsByComplex.map(({ complex, ots }) => (
            <div key={complex._id} className="mb-6 rounded-xl border border-slate-200 bg-white shadow-sm">
              <button
                onClick={() => toggleComplex(complex._id)}
                className="w-full px-6 py-4 text-left hover:bg-slate-50"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-slate-900">
                        {complex.complexCode} - {complex.complexName}
                      </h3>
                      <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                        {ots.length} OT{ots.length !== 1 ? "s" : ""}
                      </span>
                      {complex.location && (
                        <span className="text-xs text-slate-500">📍 {complex.location}</span>
                      )}
                    </div>
                    {complex.description && (
                      <p className="mt-1 text-sm text-slate-600">{complex.description}</p>
                    )}
                    <div className="mt-2 flex gap-4 text-xs text-slate-500">
                      {complex.floor && <span>Floor: {complex.floor}</span>}
                      {complex.building && <span>Building: {complex.building}</span>}
                    </div>
                  </div>
                  <svg
                    className={`h-5 w-5 text-slate-400 transition-transform ${
                      expandedComplexes.has(complex._id) ? "rotate-90" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>

              {expandedComplexes.has(complex._id) && (
                <div className="border-t border-slate-200 px-6 py-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-700">Operation Theaters in this Complex</p>
                    {hasPermission(PERMISSIONS.OT_CREATE) && (
                      <button
                        onClick={() => {
                          setSelectedComplex(complex._id);
                          setOtFormData((prev) => ({ ...prev, otComplexId: complex._id }));
                          setShowCreateOTModal(true);
                        }}
                        className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
                      >
                        + Add OT to Complex
                      </button>
                    )}
                  </div>
                  {ots.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {ots.map((ot) => (
                        <OTCard
                          key={ot._id}
                          ot={ot}
                          onToggleActive={handleToggleActive}
                          getOTTypeColor={getOTTypeColor}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="py-4 text-center text-sm text-slate-500">No OTs in this complex yet</p>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Standalone OTs */}
          {standaloneOTs.length > 0 && (
            <div className="mb-6 rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="px-6 py-4">
                <h3 className="text-lg font-semibold text-slate-900">
                  Standalone Operation Theaters ({standaloneOTs.length})
                </h3>
                <p className="mt-1 text-sm text-slate-600">OTs not assigned to any complex</p>
              </div>
              <div className="border-t border-slate-200 px-6 py-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {standaloneOTs.map((ot) => (
                    <OTCard
                      key={ot._id}
                      ot={ot}
                      onToggleActive={handleToggleActive}
                      getOTTypeColor={getOTTypeColor}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {operationTheaters.length === 0 && otComplexes.length === 0 && (
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
              <p className="text-sm font-medium text-slate-600">No operation theaters found</p>
              <p className="mt-1 text-xs text-slate-500">Create an OT complex or operation theater to get started</p>
            </div>
          )}
        </main>
      </div>

      {/* Create OT Complex Modal */}
      {showCreateComplexModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="px-4 py-3 sm:px-6 sm:py-4">
              <h2 className="text-base font-semibold text-slate-900 sm:text-lg">Create OT Complex</h2>
            </div>
            <form onSubmit={handleCreateComplex} className="px-4 sm:px-6 sm:pb-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Complex Code *</label>
                    <input
                      type="text"
                      required
                      value={complexFormData.complexCode}
                      onChange={(e) =>
                        setComplexFormData({ ...complexFormData, complexCode: e.target.value.toUpperCase() })
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      placeholder="e.g., OTC-01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Complex Name *</label>
                    <input
                      type="text"
                      required
                      value={complexFormData.complexName}
                      onChange={(e) => setComplexFormData({ ...complexFormData, complexName: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      placeholder="e.g., Main OT Complex"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Location</label>
                    <input
                      type="text"
                      value={complexFormData.location}
                      onChange={(e) => setComplexFormData({ ...complexFormData, location: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      placeholder="e.g., Building A"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Floor</label>
                    <input
                      type="text"
                      value={complexFormData.floor}
                      onChange={(e) => setComplexFormData({ ...complexFormData, floor: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      placeholder="e.g., 2nd"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Building</label>
                    <input
                      type="text"
                      value={complexFormData.building}
                      onChange={(e) => setComplexFormData({ ...complexFormData, building: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      placeholder="e.g., Main Building"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                  <textarea
                    value={complexFormData.description}
                    onChange={(e) => setComplexFormData({ ...complexFormData, description: e.target.value })}
                    rows={2}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="Complex description..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
                  <textarea
                    value={complexFormData.notes}
                    onChange={(e) => setComplexFormData({ ...complexFormData, notes: e.target.value })}
                    rows={2}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="Additional notes..."
                  />
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateComplexModal(false)}
                  className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-indigo-700 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-800"
                >
                  Create Complex
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create OT Modal */}
      {showCreateOTModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="px-4 py-3 sm:px-6 sm:py-4">
              <h2 className="text-base font-semibold text-slate-900 sm:text-lg">Create Operation Theater</h2>
            </div>
            <form onSubmit={handleCreateOT} className="px-4 sm:px-6 sm:pb-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">OT Complex (Optional)</label>
                  <select
                    value={otFormData.otComplexId}
                    onChange={(e) => setOtFormData({ ...otFormData, otComplexId: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  >
                    <option value="">None (Standalone OT)</option>
                    {otComplexes.map((complex) => (
                      <option key={complex._id} value={complex._id}>
                        {complex.complexCode} - {complex.complexName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">OT Number *</label>
                    <input
                      type="text"
                      required
                      value={otFormData.otNumber}
                      onChange={(e) => setOtFormData({ ...otFormData, otNumber: e.target.value.toUpperCase() })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      placeholder="e.g., OT-01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">OT Name *</label>
                    <input
                      type="text"
                      required
                      value={otFormData.otName}
                      onChange={(e) => setOtFormData({ ...otFormData, otName: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      placeholder="e.g., Main Operation Theater"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">OT Type *</label>
                    <select
                      required
                      value={otFormData.otType}
                      onChange={(e) => setOtFormData({ ...otFormData, otType: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    >
                      <option value="major">Major</option>
                      <option value="minor">Minor</option>
                      <option value="emergency">Emergency</option>
                      <option value="cardiac">Cardiac</option>
                      <option value="neuro">Neuro</option>
                      <option value="orthopedic">Orthopedic</option>
                      <option value="general">General</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Floor</label>
                    <input
                      type="text"
                      value={otFormData.floor}
                      onChange={(e) => setOtFormData({ ...otFormData, floor: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      placeholder="e.g., 1st"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Ward</label>
                    <input
                      type="text"
                      value={otFormData.ward}
                      onChange={(e) => setOtFormData({ ...otFormData, ward: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      placeholder="e.g., A"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Capacity *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={otFormData.capacity}
                    onChange={(e) => setOtFormData({ ...otFormData, capacity: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Equipment (comma-separated)</label>
                  <input
                    type="text"
                    value={otFormData.equipment}
                    onChange={(e) => setOtFormData({ ...otFormData, equipment: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="e.g., Ventilator, Monitor, Anesthesia Machine"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Amenities (comma-separated)</label>
                  <input
                    type="text"
                    value={otFormData.amenities}
                    onChange={(e) => setOtFormData({ ...otFormData, amenities: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="e.g., AC, Emergency Power, Sterile Environment"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
                  <textarea
                    value={otFormData.notes}
                    onChange={(e) => setOtFormData({ ...otFormData, notes: e.target.value })}
                    rows={3}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="Additional notes..."
                  />
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateOTModal(false);
                    setSelectedComplex("");
                  }}
                  className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-indigo-700 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-800"
                >
                  Create OT
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// OT Card Component
function OTCard({
  ot,
  onToggleActive,
  getOTTypeColor,
}: {
  ot: OperationTheater;
  onToggleActive: (id: string, currentStatus: boolean) => void;
  getOTTypeColor: (type: string) => string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h4 className="text-base font-semibold text-slate-900">{ot.otNumber}</h4>
          <p className="text-sm text-slate-600">{ot.otName}</p>
          {ot.floor && <p className="text-xs text-slate-500">Floor: {ot.floor}</p>}
          {ot.ward && <p className="text-xs text-slate-500">Ward: {ot.ward}</p>}
        </div>
        <div className="text-right">
          <span
            className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold capitalize ${getOTTypeColor(
              ot.otType
            )}`}
          >
            {ot.otType}
          </span>
          <p className={`mt-1 text-xs font-medium ${ot.isActive ? "text-emerald-600" : "text-slate-400"}`}>
            {ot.isActive ? "Active" : "Inactive"}
          </p>
        </div>
      </div>

      <div className="mb-3">
        <p className="text-xs text-slate-600">Capacity: {ot.capacity}</p>
      </div>

      {ot.equipment && ot.equipment.length > 0 && (
        <div className="mb-3 border-t border-slate-200 pt-3">
          <p className="mb-1 text-xs font-medium text-slate-600">Equipment:</p>
          <div className="flex flex-wrap gap-1">
            {ot.equipment.slice(0, 3).map((eq, idx) => (
              <span
                key={idx}
                className={`rounded-full px-2 py-0.5 text-[10px] ${
                  eq.status === "available"
                    ? "bg-emerald-50 text-emerald-700"
                    : eq.status === "in-use"
                    ? "bg-blue-50 text-blue-700"
                    : eq.status === "maintenance"
                    ? "bg-orange-50 text-orange-700"
                    : "bg-slate-50 text-slate-700"
                }`}
              >
                {eq.name}
              </span>
            ))}
            {ot.equipment.length > 3 && (
              <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[10px] text-slate-700">
                +{ot.equipment.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}

      <div className="mt-3 flex gap-2 border-t border-slate-200 pt-3">
        <button
          onClick={() => onToggleActive(ot._id, ot.isActive)}
          className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
            ot.isActive
              ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
              : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
          }`}
        >
          {ot.isActive ? "Deactivate" : "Activate"}
        </button>
      </div>
    </div>
  );
}

export default OTManagement;
