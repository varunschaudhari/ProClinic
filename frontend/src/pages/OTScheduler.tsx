import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { otSchedulerAPI, otAPI, patientsAPI, usersAPI, ipdAPI } from "../utils/api";
import { canAccessRoute, hasPermission, PERMISSIONS } from "../utils/permissions";
import { showSuccess, showError } from "../utils/toast";

type Patient = {
  _id: string;
  name: string;
  patientId: string;
  phone: string;
};

type IPDRecord = {
  _id: string;
  ipdNumber: string;
  patientId: {
    _id: string;
    name: string;
    patientId: string;
  };
};

type OperationTheater = {
  _id: string;
  otNumber: string;
  otName: string;
  otType: string;
};

type Doctor = {
  _id: string;
  name: string;
};

type Schedule = {
  _id: string;
  scheduleNumber: string;
  patientId: {
    _id: string;
    name: string;
    patientId: string;
  };
  ipdId?: {
    ipdNumber: string;
  };
  otId: {
    otNumber: string;
    otName: string;
  };
  surgeonId: {
    name: string;
  };
  anesthetistId?: {
    name: string;
  };
  operationType: string;
  operationName: string;
  scheduledDate: string;
  scheduledTime: string;
  estimatedDuration: number;
  status: string;
  priority: string;
};

function OTScheduler() {
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [ipdRecords, setIpdRecords] = useState<IPDRecord[]>([]);
  const [operationTheaters, setOperationTheaters] = useState<OperationTheater[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [filters, setFilters] = useState({
    otId: "",
    surgeonId: "",
    status: "",
    scheduledDate: "",
    priority: "",
  });
  const [formData, setFormData] = useState({
    patientId: "",
    ipdId: "",
    otId: "",
    surgeonId: "",
    anesthetistId: "",
    operationType: "",
    operationName: "",
    scheduledDate: new Date().toISOString().split("T")[0],
    scheduledTime: "",
    estimatedDuration: "60",
    priority: "routine",
    preoperativeNotes: "",
  });

  useEffect(() => {
    checkAuth();
    fetchSchedules();
    fetchPatients();
    fetchIPDRecords();
    fetchOperationTheaters();
    fetchDoctors();
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [filters]);

  useEffect(() => {
    if (searchQuery.length > 0) {
      const filtered = patients.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.patientId.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.phone.includes(searchQuery)
      );
      setFilteredPatients(filtered);
    } else {
      setFilteredPatients([]);
    }
  }, [searchQuery, patients]);

  const checkAuth = () => {
    const token =
      localStorage.getItem("proclinic_token") ||
      sessionStorage.getItem("proclinic_token");
    if (!token) {
      navigate("/login");
      return;
    }
    if (!canAccessRoute("/ipd/ot/scheduler")) {
      navigate("/dashboard");
    }
  };

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filters.otId) params.otId = filters.otId;
      if (filters.surgeonId) params.surgeonId = filters.surgeonId;
      if (filters.status) params.status = filters.status;
      if (filters.scheduledDate) params.scheduledDate = filters.scheduledDate;
      if (filters.priority) params.priority = filters.priority;

      const response = await otSchedulerAPI.getAll(params);
      if (response.success) {
        setSchedules(response.data.schedules);
      }
    } catch (err) {
      console.error("Error fetching schedules:", err);
      showError("Failed to fetch schedules");
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const response = await patientsAPI.getAll();
      if (response.success) {
        setPatients(response.data.patients);
      }
    } catch (err) {
      console.error("Error fetching patients:", err);
    }
  };

  const fetchIPDRecords = async () => {
    try {
      const response = await ipdAPI.getAll({ status: "admitted" });
      if (response.success) {
        setIpdRecords(response.data.ipdRecords);
      }
    } catch (err) {
      console.error("Error fetching IPD records:", err);
    }
  };

  const fetchOperationTheaters = async () => {
    try {
      const response = await otAPI.getAll({ isActive: true });
      if (response.success) {
        setOperationTheaters(response.data.operationTheaters);
      }
    } catch (err) {
      console.error("Error fetching operation theaters:", err);
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

  const handleSelectPatient = (patient: Patient) => {
    setFormData((prev) => ({
      ...prev,
      patientId: patient._id,
    }));
    setSearchQuery("");
    setFilteredPatients([]);
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!formData.patientId) {
        showError("Please select a patient");
        setIsSubmitting(false);
        return;
      }
      if (!formData.otId) {
        showError("Please select an operation theater");
        setIsSubmitting(false);
        return;
      }
      if (!formData.surgeonId) {
        showError("Please select a surgeon");
        setIsSubmitting(false);
        return;
      }
      if (!formData.operationType || !formData.operationName) {
        showError("Please provide operation type and name");
        setIsSubmitting(false);
        return;
      }
      if (!formData.scheduledDate || !formData.scheduledTime) {
        showError("Please provide scheduled date and time");
        setIsSubmitting(false);
        return;
      }

      const payload: any = {
        patientId: formData.patientId,
        otId: formData.otId,
        surgeonId: formData.surgeonId,
        operationType: formData.operationType,
        operationName: formData.operationName,
        scheduledDate: formData.scheduledDate,
        scheduledTime: formData.scheduledTime,
        estimatedDuration: parseInt(formData.estimatedDuration),
        priority: formData.priority,
        preoperativeNotes: formData.preoperativeNotes || null,
      };

      if (formData.ipdId) {
        payload.ipdId = formData.ipdId;
      }
      if (formData.anesthetistId) {
        payload.anesthetistId = formData.anesthetistId;
      }

      const response = await otSchedulerAPI.create(payload);

      if (response.success) {
        showSuccess("OT schedule created successfully!");
        setShowCreateModal(false);
        setFormData({
          patientId: "",
          ipdId: "",
          otId: "",
          surgeonId: "",
          anesthetistId: "",
          operationType: "",
          operationName: "",
          scheduledDate: new Date().toISOString().split("T")[0],
          scheduledTime: "",
          estimatedDuration: "60",
          priority: "routine",
          preoperativeNotes: "",
        });
        fetchSchedules();
      } else {
        showError(response.message || "Failed to create schedule");
      }
    } catch (err: any) {
      showError(err.message || "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "in-progress":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "completed":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "cancelled":
        return "bg-red-50 text-red-700 border-red-200";
      case "postponed":
        return "bg-amber-50 text-amber-700 border-amber-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "emergency":
        return "bg-red-50 text-red-700 border-red-200";
      case "urgent":
        return "bg-orange-50 text-orange-700 border-orange-200";
      case "routine":
        return "bg-blue-50 text-blue-700 border-blue-200";
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
            <p className="text-slate-600">Loading schedules...</p>
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
              <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">OT Scheduler</h1>
              <p className="mt-1 text-xs text-slate-600 sm:mt-1.5 sm:text-sm">
                Schedule and manage operations
              </p>
            </div>
            {hasPermission(PERMISSIONS.OT_SCHEDULE_CREATE) && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="w-full rounded-xl bg-indigo-700 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-500/30 transition hover:bg-indigo-800 hover:shadow-lg hover:shadow-indigo-500/40 sm:w-auto sm:px-5 sm:py-2.5"
              >
                + Schedule Operation
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {/* Filters */}
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-5">
            <div>
              <select
                value={filters.otId}
                onChange={(e) => setFilters({ ...filters, otId: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 px-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 sm:py-3"
              >
                <option value="">All OTs</option>
                {operationTheaters.map((ot) => (
                  <option key={ot._id} value={ot._id}>
                    {ot.otNumber} - {ot.otName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <select
                value={filters.surgeonId}
                onChange={(e) => setFilters({ ...filters, surgeonId: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 px-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 sm:py-3"
              >
                <option value="">All Surgeons</option>
                {doctors.map((doctor) => (
                  <option key={doctor._id} value={doctor._id}>
                    {doctor.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 px-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 sm:py-3"
              >
                <option value="">All Status</option>
                <option value="scheduled">Scheduled</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="postponed">Postponed</option>
              </select>
            </div>
            <div>
              <input
                type="date"
                value={filters.scheduledDate}
                onChange={(e) => setFilters({ ...filters, scheduledDate: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 px-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 sm:py-3"
              />
            </div>
            <div>
              <select
                value={filters.priority}
                onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 px-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 sm:py-3"
              >
                <option value="">All Priorities</option>
                <option value="routine">Routine</option>
                <option value="urgent">Urgent</option>
                <option value="emergency">Emergency</option>
              </select>
            </div>
          </div>

          {/* Schedules Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Schedule #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Patient
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Operation
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                    OT
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Surgeon
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Date & Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Priority
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {schedules.map((schedule) => (
                  <tr key={schedule._id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">
                      {schedule.scheduleNumber}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900">
                      <div>
                        <p className="font-medium">{schedule.patientId.name}</p>
                        <p className="text-xs text-slate-500">{schedule.patientId.patientId}</p>
                        {schedule.ipdId && (
                          <p className="text-xs text-indigo-600">IPD: {schedule.ipdId.ipdNumber}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900">
                      <div>
                        <p className="font-medium">{schedule.operationName}</p>
                        <p className="text-xs text-slate-500">{schedule.operationType}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900">
                      <div>
                        <p className="font-medium">{schedule.otId.otNumber}</p>
                        <p className="text-xs text-slate-500">{schedule.otId.otName}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900">
                      <div>
                        <p className="font-medium">{schedule.surgeonId.name}</p>
                        {schedule.anesthetistId && (
                          <p className="text-xs text-slate-500">Anesthetist: {schedule.anesthetistId.name}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900">
                      <div>
                        <p className="font-medium">
                          {new Date(schedule.scheduledDate).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-slate-500">{schedule.scheduledTime}</p>
                        <p className="text-xs text-slate-500">Duration: {schedule.estimatedDuration} min</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${getStatusColor(
                          schedule.status
                        )}`}
                      >
                        {schedule.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${getPriorityColor(
                          schedule.priority
                        )}`}
                      >
                        {schedule.priority}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {schedules.length === 0 && (
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
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p className="text-sm font-medium text-slate-600">No schedules found</p>
              <p className="mt-1 text-xs text-slate-500">Create a new schedule to get started</p>
            </div>
          )}
        </main>
      </div>

      {/* Create Schedule Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="px-4 py-3 sm:px-6 sm:py-4">
              <h2 className="text-base font-semibold text-slate-900 sm:text-lg">Schedule Operation</h2>
            </div>
            <form onSubmit={handleCreateSchedule} className="px-4 sm:px-6 sm:pb-6">
              <div className="space-y-4">
                {/* Patient Selection */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Patient *</label>
                  <input
                    type="text"
                    placeholder="Search by name, patient ID, or phone"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                  {filteredPatients.length > 0 && (
                    <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                      {filteredPatients.map((patient) => (
                        <div
                          key={patient._id}
                          onClick={() => handleSelectPatient(patient)}
                          className="cursor-pointer px-4 py-2 text-sm hover:bg-indigo-50"
                        >
                          <p className="font-medium text-slate-900">
                            {patient.name} ({patient.patientId})
                          </p>
                          <p className="text-xs text-slate-500">{patient.phone}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {formData.patientId && (
                    <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-800">
                      Selected:{" "}
                      <span className="font-semibold">
                        {patients.find((p) => p._id === formData.patientId)?.name}
                      </span>
                    </div>
                  )}
                </div>

                {/* IPD Selection (Optional) */}
                {formData.patientId && ipdRecords.filter((ipd) => ipd.patientId._id === formData.patientId).length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">IPD Record (Optional)</label>
                    <select
                      value={formData.ipdId}
                      onChange={(e) => setFormData({ ...formData, ipdId: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    >
                      <option value="">None</option>
                      {ipdRecords
                        .filter((ipd) => ipd.patientId._id === formData.patientId)
                        .map((ipd) => (
                          <option key={ipd._id} value={ipd._id}>
                            {ipd.ipdNumber}
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                {/* Operation Theater */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Operation Theater *</label>
                  <select
                    required
                    value={formData.otId}
                    onChange={(e) => setFormData({ ...formData, otId: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  >
                    <option value="">Select OT</option>
                    {operationTheaters.map((ot) => (
                      <option key={ot._id} value={ot._id}>
                        {ot.otNumber} - {ot.otName} ({ot.otType})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Surgeon */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Surgeon *</label>
                  <select
                    required
                    value={formData.surgeonId}
                    onChange={(e) => setFormData({ ...formData, surgeonId: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  >
                    <option value="">Select Surgeon</option>
                    {doctors.map((doctor) => (
                      <option key={doctor._id} value={doctor._id}>
                        {doctor.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Anesthetist (Optional) */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Anesthetist (Optional)</label>
                  <select
                    value={formData.anesthetistId}
                    onChange={(e) => setFormData({ ...formData, anesthetistId: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  >
                    <option value="">Select Anesthetist</option>
                    {doctors.map((doctor) => (
                      <option key={doctor._id} value={doctor._id}>
                        {doctor.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Operation Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Operation Type *</label>
                    <input
                      type="text"
                      required
                      value={formData.operationType}
                      onChange={(e) => setFormData({ ...formData, operationType: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      placeholder="e.g., General Surgery"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Operation Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.operationName}
                      onChange={(e) => setFormData({ ...formData, operationName: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      placeholder="e.g., Appendectomy"
                    />
                  </div>
                </div>

                {/* Schedule Details */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Scheduled Date *</label>
                    <input
                      type="date"
                      required
                      value={formData.scheduledDate}
                      onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                      min={new Date().toISOString().split("T")[0]}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Scheduled Time *</label>
                    <input
                      type="time"
                      required
                      value={formData.scheduledTime}
                      onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Duration (minutes) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.estimatedDuration}
                      onChange={(e) => setFormData({ ...formData, estimatedDuration: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Priority *</label>
                  <select
                    required
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  >
                    <option value="routine">Routine</option>
                    <option value="urgent">Urgent</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>

                {/* Preoperative Notes */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Preoperative Notes</label>
                  <textarea
                    value={formData.preoperativeNotes}
                    onChange={(e) => setFormData({ ...formData, preoperativeNotes: e.target.value })}
                    rows={3}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="Any preoperative instructions or notes..."
                  />
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 rounded-lg bg-indigo-700 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-800 disabled:opacity-50"
                >
                  {isSubmitting ? "Scheduling..." : "Schedule Operation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default OTScheduler;
