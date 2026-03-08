import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { appointmentsAPI, patientsAPI, usersAPI } from "../utils/api";
import { hasPermission, PERMISSIONS } from "../utils/permissions";
import { showSuccess, showError } from "../utils/toast";

type Appointment = {
  _id: string;
  appointmentNumber?: string;
  patientId: {
    _id: string;
    name: string;
    phone: string;
    patientId: string;
    email?: string;
  };
  doctorId: {
    _id: string;
    name: string;
    email: string;
  };
  appointmentDate: string;
  appointmentTime: string;
  appointmentType: "booked" | "walk-in";
  status: "scheduled" | "completed" | "cancelled" | "no-show" | "rescheduled";
  priority?: "low" | "normal" | "high" | "urgent";
  duration?: number;
  estimatedEndTime?: string;
  chiefComplaint?: string;
  notes?: string;
  reminderEnabled?: boolean;
  reminderSent?: boolean;
  convertedToOPD?: boolean;
  opdId?: {
    _id: string;
    opdNumber: string;
    status: string;
  };
  cancellationReason?: string;
  cancelledBy?: {
    _id: string;
    name: string;
    email: string;
  };
  cancelledAt?: string;
  rescheduledFrom?: {
    date: string;
    time: string;
  };
  rescheduledBy?: {
    _id: string;
    name: string;
    email: string;
  };
  rescheduledAt?: string;
  followUpAppointmentId?: {
    _id: string;
    appointmentNumber: string;
    appointmentDate: string;
    appointmentTime: string;
  };
  history?: Array<{
    action: string;
    changedBy: {
      _id: string;
      name: string;
      email: string;
    };
    changedAt: string;
    previousValues?: any;
    notes?: string;
  }>;
  createdAt: string;
  updatedAt: string;
};

type Patient = {
  _id: string;
  name: string;
  patientId: string;
};

type Doctor = {
  _id: string;
  name: string;
};

type AppointmentStats = {
  total: number;
  scheduled: number;
  completed: number;
  cancelled: number;
  noShow: number;
  todayAppointments: number;
  upcomingAppointments: number;
  overdueAppointments: number;
};

type ViewMode = "dashboard" | "calendar" | "list";

function Appointments() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<AppointmentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("dashboard");
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterDoctor, setFilterDoctor] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterType, setFilterType] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotMessage, setSlotMessage] = useState("");
  const [bookingForm, setBookingForm] = useState({
    patientId: "",
    doctorId: "",
    appointmentDate: new Date().toISOString().split('T')[0],
    appointmentTime: "",
    appointmentType: "booked" as "booked" | "walk-in",
    priority: "normal" as "low" | "normal" | "high" | "urgent",
    duration: 30,
    chiefComplaint: "",
    notes: "",
    reminderEnabled: true,
  });
  const [rescheduleForm, setRescheduleForm] = useState({
    appointmentDate: "",
    appointmentTime: "",
    reason: "",
  });
  const [cancelReason, setCancelReason] = useState("");

  useEffect(() => {
    checkAuth();
    fetchPatients();
    fetchDoctors();
    if (viewMode === "dashboard") {
      fetchStats();
    }
    fetchAppointments();
  }, [filterDate, filterDoctor, filterStatus, filterPriority, filterType, searchQuery, startDate, endDate, viewMode]);

  const checkAuth = () => {
    const token = localStorage.getItem("proclinic_token") || sessionStorage.getItem("proclinic_token");
    if (!token) {
      navigate("/login");
    }
  };

  const fetchStats = async () => {
    try {
      setLoadingStats(true);
      const params: any = {};
      if (filterDoctor) params.doctorId = filterDoctor;
      if (startDate && endDate) {
        params.startDate = startDate;
        params.endDate = endDate;
      }
      const response = await appointmentsAPI.getStats(params);
      if (response.success) {
        setStats(response.data);
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filterDate) params.date = filterDate;
      if (filterDoctor) params.doctorId = filterDoctor;
      if (filterStatus) params.status = filterStatus;
      if (filterPriority) params.priority = filterPriority;
      if (filterType) params.appointmentType = filterType;
      if (startDate && endDate) {
        params.startDate = startDate;
        params.endDate = endDate;
      }
      if (searchQuery) params.search = searchQuery;
      const response = await appointmentsAPI.getAll(params);
      if (response.success) {
        setAppointments(response.data.appointments || []);
      } else {
        showError(response.message || "Failed to fetch appointments");
      }
    } catch (err) {
      showError("Error fetching appointments");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const response = await patientsAPI.getAll();
      if (response.success) {
        setPatients(response.data.patients || []);
      }
    } catch (err) {
      console.error("Error fetching patients:", err);
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
        setDoctors(doctorUsers.map((user: any) => ({ _id: user._id, name: user.name })));
      }
    } catch (err) {
      console.error("Error fetching doctors:", err);
    }
  };

  const fetchAvailableSlots = async (doctorId: string, date: string) => {
    if (!doctorId || !date) {
      setAvailableSlots([]);
      setSlotMessage("");
      return;
    }
    try {
      setLoadingSlots(true);
      setSlotMessage("");
      const response = await appointmentsAPI.getAvailableSlots(doctorId, date);
      if (response.success) {
        setAvailableSlots(response.data.availableSlots || []);
        if (response.message) {
          setSlotMessage(response.message);
        } else if (response.data.availableSlots && response.data.availableSlots.length === 0) {
          setSlotMessage("No slots available for this date");
        }
      } else {
        setAvailableSlots([]);
        setSlotMessage(response.message || "Unable to fetch slots");
      }
    } catch (err) {
      console.error("Error fetching available slots:", err);
      setAvailableSlots([]);
      setSlotMessage("Error loading slots. Please try again.");
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleBookingFormChange = (field: string, value: any) => {
    setBookingForm(prev => ({ ...prev, [field]: value }));
    if (field === "doctorId" || field === "appointmentDate") {
      const doctorId = field === "doctorId" ? value : bookingForm.doctorId;
      const date = field === "appointmentDate" ? value : bookingForm.appointmentDate;
      if (doctorId && date) {
        fetchAvailableSlots(doctorId, date);
      }
    }
  };

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingForm.patientId || !bookingForm.doctorId || !bookingForm.appointmentDate || !bookingForm.appointmentTime) {
      showError("Please fill all required fields");
      return;
    }
    try {
      const response = await appointmentsAPI.create(bookingForm);
      if (response.success) {
        showSuccess("Appointment booked successfully");
        setShowBookingModal(false);
        setBookingForm({
          patientId: "",
          doctorId: "",
          appointmentDate: new Date().toISOString().split('T')[0],
          appointmentTime: "",
          appointmentType: "booked",
          priority: "normal",
          duration: 30,
          chiefComplaint: "",
          notes: "",
          reminderEnabled: true,
        });
        setAvailableSlots([]);
        fetchAppointments();
      } else {
        showError(response.message || "Failed to book appointment");
      }
    } catch (err) {
      showError("Error booking appointment");
      console.error(err);
    }
  };

  const handleStatusChange = async (appointmentId: string, newStatus: string) => {
    try {
      const response = await appointmentsAPI.update(appointmentId, { status: newStatus as any });
      if (response.success) {
        showSuccess("Appointment status updated");
        fetchAppointments();
        if (viewMode === "dashboard") fetchStats();
      } else {
        showError(response.message || "Failed to update status");
      }
    } catch (err) {
      showError("Error updating appointment");
      console.error(err);
    }
  };

  const handleDelete = async (appointmentId: string) => {
    if (!window.confirm("Are you sure you want to delete this appointment?")) return;
    try {
      const response = await appointmentsAPI.delete(appointmentId);
      if (response.success) {
        showSuccess("Appointment deleted successfully");
        fetchAppointments();
        if (viewMode === "dashboard") fetchStats();
        setShowDetailsModal(false);
      } else {
        showError(response.message || "Failed to delete appointment");
      }
    } catch (err) {
      showError("Error deleting appointment");
      console.error(err);
    }
  };

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppointment || !rescheduleForm.appointmentDate || !rescheduleForm.appointmentTime) {
      showError("Please fill all required fields");
      return;
    }
    try {
      const response = await appointmentsAPI.reschedule(selectedAppointment._id, rescheduleForm);
      if (response.success) {
        showSuccess("Appointment rescheduled successfully");
        setShowRescheduleModal(false);
        setRescheduleForm({ appointmentDate: "", appointmentTime: "", reason: "" });
        fetchAppointments();
        if (viewMode === "dashboard") fetchStats();
        setShowDetailsModal(false);
      } else {
        showError(response.message || "Failed to reschedule appointment");
      }
    } catch (err) {
      showError("Error rescheduling appointment");
      console.error(err);
    }
  };

  const handleCancel = async () => {
    if (!selectedAppointment) return;
    try {
      const response = await appointmentsAPI.cancel(selectedAppointment._id, cancelReason);
      if (response.success) {
        showSuccess("Appointment cancelled successfully");
        setShowCancelModal(false);
        setCancelReason("");
        fetchAppointments();
        if (viewMode === "dashboard") fetchStats();
        setShowDetailsModal(false);
      } else {
        showError(response.message || "Failed to cancel appointment");
      }
    } catch (err) {
      showError("Error cancelling appointment");
      console.error(err);
    }
  };

  const handleConvertToOPD = async () => {
    if (!selectedAppointment) return;
    if (!window.confirm("Convert this appointment to an OPD visit? This action cannot be undone.")) return;
    try {
      const response = await appointmentsAPI.convertToOPD(selectedAppointment._id);
      if (response.success) {
        showSuccess("Appointment converted to OPD successfully");
        fetchAppointments();
        if (viewMode === "dashboard") fetchStats();
        setShowDetailsModal(false);
        if (response.data?.opd?._id) {
          navigate(`/opd/${response.data.opd._id}`);
        }
      } else {
        showError(response.message || "Failed to convert appointment to OPD");
      }
    } catch (err) {
      showError("Error converting appointment to OPD");
      console.error(err);
    }
  };

  const openDetailsModal = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowDetailsModal(true);
  };

  const openRescheduleModal = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setRescheduleForm({
      appointmentDate: appointment.appointmentDate.split('T')[0],
      appointmentTime: appointment.appointmentTime,
      reason: "",
    });
    setShowRescheduleModal(true);
  };

  const openCancelModal = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setCancelReason("");
    setShowCancelModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "completed":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "cancelled":
        return "bg-rose-100 text-rose-800 border-rose-200";
      case "no-show":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "rescheduled":
        return "bg-purple-100 text-purple-800 border-purple-200";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case "urgent":
        return "bg-rose-100 text-rose-800 border-rose-200";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "normal":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "low":
        return "bg-slate-100 text-slate-800 border-slate-200";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  if (loading && appointments.length === 0) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <div className="flex flex-1 items-center justify-center sidebar-content-margin">
          <div className="text-center">
            <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
            <p className="text-slate-600">Loading appointments...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-4 sm:p-6 sidebar-content-margin">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Appointments</h1>
              <p className="mt-1 text-sm text-slate-600">Manage patient appointments</p>
            </div>
            {hasPermission(PERMISSIONS.APPOINTMENTS_CREATE) && (
              <button
                onClick={() => setShowBookingModal(true)}
                className="w-full rounded-xl bg-indigo-700 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-500/30 transition hover:bg-indigo-800 hover:shadow-lg hover:shadow-indigo-500/40 sm:w-auto"
              >
                + Book Appointment
              </button>
            )}
          </div>

          {/* View Mode Switcher */}
          <div className="mb-6 flex gap-2 rounded-xl border border-slate-200 bg-white p-1">
            <button
              onClick={() => setViewMode("dashboard")}
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${
                viewMode === "dashboard"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${
                viewMode === "calendar"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              Calendar
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${
                viewMode === "list"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              List
            </button>
          </div>

          {/* Dashboard View */}
          {viewMode === "dashboard" && (
            <>
              {/* Statistics Cards */}
              {loadingStats ? (
                <div className="mb-6 flex items-center justify-center rounded-xl border border-slate-200 bg-white p-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-r-transparent"></div>
                </div>
              ) : stats && (
                <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-medium text-slate-600">Total</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">{stats.total}</p>
                  </div>
                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                    <p className="text-xs font-medium text-blue-600">Scheduled</p>
                    <p className="mt-1 text-2xl font-bold text-blue-900">{stats.scheduled}</p>
                  </div>
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-xs font-medium text-emerald-600">Completed</p>
                    <p className="mt-1 text-2xl font-bold text-emerald-900">{stats.completed}</p>
                  </div>
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                    <p className="text-xs font-medium text-rose-600">Cancelled</p>
                    <p className="mt-1 text-2xl font-bold text-rose-900">{stats.cancelled}</p>
                  </div>
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-xs font-medium text-amber-600">No Show</p>
                    <p className="mt-1 text-2xl font-bold text-amber-900">{stats.noShow}</p>
                  </div>
                  <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
                    <p className="text-xs font-medium text-indigo-600">Today</p>
                    <p className="mt-1 text-2xl font-bold text-indigo-900">{stats.todayAppointments}</p>
                  </div>
                  <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
                    <p className="text-xs font-medium text-purple-600">Upcoming</p>
                    <p className="mt-1 text-2xl font-bold text-purple-900">{stats.upcomingAppointments}</p>
                  </div>
                  <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
                    <p className="text-xs font-medium text-orange-600">Overdue</p>
                    <p className="mt-1 text-2xl font-bold text-orange-900">{stats.overdueAppointments}</p>
                  </div>
                </div>
              )}

              {/* Today's Appointments */}
              <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6">
                <h2 className="mb-4 text-lg font-semibold text-slate-900">Today's Appointments</h2>
                {appointments.filter(apt => {
                  const aptDate = new Date(apt.appointmentDate).toDateString();
                  const today = new Date().toDateString();
                  return aptDate === today;
                }).length === 0 ? (
                  <p className="text-center text-sm text-slate-600 py-8">No appointments scheduled for today</p>
                ) : (
                  <div className="space-y-3">
                    {appointments.filter(apt => {
                      const aptDate = new Date(apt.appointmentDate).toDateString();
                      const today = new Date().toDateString();
                      return aptDate === today;
                    }).map((apt) => (
                      <div
                        key={apt._id}
                        onClick={() => openDetailsModal(apt)}
                        className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 bg-slate-50/50 p-4 transition hover:border-indigo-300 hover:bg-indigo-50/50"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-slate-900">{apt.appointmentTime}</span>
                            <span className={`rounded-lg border px-2 py-1 text-xs font-semibold ${getStatusColor(apt.status)}`}>
                              {apt.status}
                            </span>
                            {apt.priority && apt.priority !== "normal" && (
                              <span className={`rounded-lg border px-2 py-1 text-xs font-semibold ${getPriorityColor(apt.priority)}`}>
                                {apt.priority}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-sm font-medium text-slate-900">{apt.patientId.name}</p>
                          <p className="text-xs text-slate-600">Dr. {apt.doctorId.name}</p>
                        </div>
                        {apt.appointmentNumber && (
                          <span className="text-xs font-medium text-slate-600">{apt.appointmentNumber}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Calendar View - Placeholder */}
          {viewMode === "calendar" && (
            <div className="mb-6 rounded-xl border border-slate-200 bg-white p-8 text-center">
              <p className="text-slate-600">Calendar view coming soon</p>
            </div>
          )}

          {/* Filters - Show for List and Calendar views */}
          {(viewMode === "list" || viewMode === "calendar") && (
            <div className="mb-6 grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Date</label>
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Doctor</label>
                <select
                  value={filterDoctor}
                  onChange={(e) => setFilterDoctor(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                >
                  <option value="">All Doctors</option>
                  {doctors.map((doctor) => (
                    <option key={doctor._id} value={doctor._id}>
                      {doctor.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                >
                  <option value="">All Status</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="no-show">No Show</option>
                  <option value="rescheduled">Rescheduled</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Priority</label>
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                >
                  <option value="">All Priorities</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="normal">Normal</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Type</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                >
                  <option value="">All Types</option>
                  <option value="booked">Booked</option>
                  <option value="walk-in">Walk-in</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Search</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Appointment number..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>
            </div>
          )}

          {/* Appointments List - Show for List view */}
          {viewMode === "list" && (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {appointments.length === 0 ? (
              <div className="px-6 py-16 text-center">
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
                <p className="text-slate-600">No appointments found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-slate-200 bg-slate-50/80">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 sm:px-6">Appt #</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 sm:px-6">Date & Time</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 sm:px-6">Patient</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 sm:px-6">Doctor</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 sm:px-6">Priority</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 sm:px-6">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-600 sm:px-6">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {appointments.map((apt) => (
                      <tr key={apt._id} className="hover:bg-slate-50/50 cursor-pointer" onClick={() => openDetailsModal(apt)}>
                        <td className="whitespace-nowrap px-4 py-3 sm:px-6">
                          <span className="text-xs font-medium text-slate-600">{apt.appointmentNumber || "N/A"}</span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 sm:px-6">
                          <div className="text-sm font-semibold text-slate-900">
                            {new Date(apt.appointmentDate).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-slate-500">{apt.appointmentTime}</div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 sm:px-6">
                          <div className="text-sm font-semibold text-slate-900">{apt.patientId.name}</div>
                          <div className="text-xs text-slate-500">{apt.patientId.patientId}</div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 sm:px-6">
                          <div className="text-sm text-slate-900">{apt.doctorId.name}</div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 sm:px-6">
                          {apt.priority && apt.priority !== "normal" ? (
                            <span className={`inline-flex rounded-lg border px-2 py-1 text-xs font-semibold ${getPriorityColor(apt.priority)}`}>
                              {apt.priority}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500">Normal</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 sm:px-6">
                          <select
                            value={apt.status}
                            onChange={(e) => handleStatusChange(apt._id, e.target.value)}
                            disabled={!hasPermission(PERMISSIONS.APPOINTMENTS_EDIT)}
                            className={`rounded-lg border px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-2 ${
                              apt.status === "completed"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : apt.status === "cancelled"
                                ? "border-rose-200 bg-rose-50 text-rose-700"
                                : apt.status === "no-show"
                                ? "border-amber-200 bg-amber-50 text-amber-700"
                                : "border-indigo-200 bg-indigo-50 text-indigo-700"
                            } ${!hasPermission(PERMISSIONS.APPOINTMENTS_EDIT) ? "cursor-not-allowed opacity-50" : ""}`}
                          >
                            <option value="scheduled">Scheduled</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="no-show">No Show</option>
                            <option value="rescheduled">Rescheduled</option>
                          </select>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium sm:px-6" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            {hasPermission(PERMISSIONS.APPOINTMENTS_EDIT) && apt.status === "scheduled" && (
                              <>
                                <button
                                  onClick={() => openRescheduleModal(apt)}
                                  className="text-indigo-600 hover:text-indigo-800"
                                  title="Reschedule"
                                >
                                  Reschedule
                                </button>
                                <button
                                  onClick={() => openCancelModal(apt)}
                                  className="text-amber-600 hover:text-amber-800"
                                  title="Cancel"
                                >
                                  Cancel
                                </button>
                              </>
                            )}
                            {hasPermission(PERMISSIONS.APPOINTMENTS_DELETE) && (
                              <button
                                onClick={() => handleDelete(apt._id)}
                                className="text-rose-600 hover:text-rose-800"
                                title="Delete"
                              >
                                Delete
                              </button>
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
          )}

          {/* Appointments List - Show for Dashboard view (upcoming) */}
          {viewMode === "dashboard" && appointments.filter(apt => {
            const aptDate = new Date(apt.appointmentDate);
            return aptDate > new Date() && apt.status === "scheduled";
          }).length > 0 && (
            <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Upcoming Appointments</h2>
              <div className="space-y-3">
                {appointments.filter(apt => {
                  const aptDate = new Date(apt.appointmentDate);
                  return aptDate > new Date() && apt.status === "scheduled";
                }).slice(0, 5).map((apt) => (
                  <div
                    key={apt._id}
                    onClick={() => openDetailsModal(apt)}
                    className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 bg-slate-50/50 p-4 transition hover:border-indigo-300 hover:bg-indigo-50/50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-slate-900">
                          {new Date(apt.appointmentDate).toLocaleDateString()} {apt.appointmentTime}
                        </span>
                        <span className={`rounded-lg border px-2 py-1 text-xs font-semibold ${getStatusColor(apt.status)}`}>
                          {apt.status}
                        </span>
                        {apt.priority && apt.priority !== "normal" && (
                          <span className={`rounded-lg border px-2 py-1 text-xs font-semibold ${getPriorityColor(apt.priority)}`}>
                            {apt.priority}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm font-medium text-slate-900">{apt.patientId.name}</p>
                      <p className="text-xs text-slate-600">Dr. {apt.doctorId.name}</p>
                    </div>
                    {apt.appointmentNumber && (
                      <span className="text-xs font-medium text-slate-600">{apt.appointmentNumber}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-xl my-auto max-h-[90vh] overflow-y-auto">
            <div className="border-b border-slate-200 px-4 py-3 sm:px-6 sm:py-4 sticky top-0 bg-white">
              <h2 className="text-base font-semibold text-slate-900 sm:text-lg">Book Appointment</h2>
            </div>
            <form onSubmit={handleBookAppointment} className="px-4 py-4 sm:px-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Patient *</label>
                    <select
                      required
                      value={bookingForm.patientId}
                      onChange={(e) => handleBookingFormChange("patientId", e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    >
                      <option value="">Select Patient</option>
                      {patients.map((patient) => (
                        <option key={patient._id} value={patient._id}>
                          {patient.name} ({patient.patientId})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Doctor *</label>
                    <select
                      required
                      value={bookingForm.doctorId}
                      onChange={(e) => handleBookingFormChange("doctorId", e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    >
                      <option value="">Select Doctor</option>
                      {doctors.map((doctor) => (
                        <option key={doctor._id} value={doctor._id}>
                          {doctor.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Date *</label>
                    <input
                      type="date"
                      required
                      value={bookingForm.appointmentDate}
                      onChange={(e) => handleBookingFormChange("appointmentDate", e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Time *</label>
                    {loadingSlots ? (
                      <div className="mt-1 text-sm text-slate-500">Loading slots...</div>
                    ) : availableSlots.length === 0 ? (
                      <div className="mt-1 space-y-2">
                        {slotMessage && (
                          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                            <p className="text-sm font-medium text-amber-800">
                              {slotMessage}
                            </p>
                            {slotMessage.includes("No schedule found") && (
                              <p className="mt-2 text-xs text-amber-700">
                                You can set up the doctor's schedule in{" "}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowBookingModal(false);
                                    navigate("/doctor-schedules");
                                  }}
                                  className="font-semibold underline hover:text-amber-900"
                                >
                                  Doctor Schedules
                                </button>
                                {" "}or use manual time entry below.
                              </p>
                            )}
                            {slotMessage.includes("not available on this day") && (
                              <p className="mt-2 text-xs text-amber-700">
                                You can select a different date, update the schedule in{" "}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowBookingModal(false);
                                    navigate("/doctor-schedules");
                                  }}
                                  className="font-semibold underline hover:text-amber-900"
                                >
                                  Doctor Schedules
                                </button>
                                {" "}or use manual time entry below.
                              </p>
                            )}
                            {slotMessage.includes("holiday") && (
                              <p className="mt-2 text-xs text-amber-700">
                                You can select a different date or use manual time entry below to book anyway.
                              </p>
                            )}
                          </div>
                        )}
                        <div className="mt-2">
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            {bookingForm.appointmentType === "walk-in" ? "Walk-in Time (manual entry)" : "Manual Time Entry"}
                          </label>
                          <input
                            type="time"
                            required
                            value={bookingForm.appointmentTime}
                            onChange={(e) => handleBookingFormChange("appointmentTime", e.target.value)}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                          />
                          <p className="mt-1 text-xs text-slate-500">
                            {bookingForm.appointmentType === "walk-in" 
                              ? "Enter the time for this walk-in appointment."
                              : "Enter time manually. The system will check for conflicts when booking."}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <select
                          value={bookingForm.appointmentTime}
                          onChange={(e) => handleBookingFormChange("appointmentTime", e.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        >
                          <option value="">Select from available slots</option>
                          {availableSlots.map((slot) => (
                            <option key={slot} value={slot}>
                              {slot}
                            </option>
                          ))}
                        </select>
                        <div className="relative">
                          <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-300"></div>
                          </div>
                          <div className="relative flex justify-center text-xs">
                            <span className="bg-white px-2 text-slate-500">OR</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            Manual Time Entry
                          </label>
                          <input
                            type="time"
                            value={bookingForm.appointmentTime}
                            onChange={(e) => handleBookingFormChange("appointmentTime", e.target.value)}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                          />
                          <p className="mt-1 text-xs text-slate-500">
                            Enter a custom time if needed
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Type</label>
                    <select
                      value={bookingForm.appointmentType}
                      onChange={(e) => handleBookingFormChange("appointmentType", e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    >
                      <option value="booked">Booked</option>
                      <option value="walk-in">Walk-in</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Priority</label>
                    <select
                      value={bookingForm.priority}
                      onChange={(e) => handleBookingFormChange("priority", e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    >
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Duration (minutes)</label>
                    <input
                      type="number"
                      min="5"
                      step="5"
                      value={bookingForm.duration}
                      onChange={(e) => handleBookingFormChange("duration", parseInt(e.target.value) || 30)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={bookingForm.reminderEnabled}
                      onChange={(e) => handleBookingFormChange("reminderEnabled", e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    Enable Reminder
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Chief Complaint</label>
                  <textarea
                    value={bookingForm.chiefComplaint}
                    onChange={(e) => handleBookingFormChange("chiefComplaint", e.target.value)}
                    rows={2}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="Patient's main complaint..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Notes</label>
                  <textarea
                    value={bookingForm.notes}
                    onChange={(e) => handleBookingFormChange("notes", e.target.value)}
                    rows={2}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="Additional notes..."
                  />
                </div>
              </div>
              <div className="mt-6 flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowBookingModal(false);
                    setBookingForm({
                      patientId: "",
                      doctorId: "",
                      appointmentDate: new Date().toISOString().split('T')[0],
                      appointmentTime: "",
                      appointmentType: "booked",
                      priority: "normal",
                      duration: 30,
                      chiefComplaint: "",
                      notes: "",
                      reminderEnabled: true,
                    });
                    setAvailableSlots([]);
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:w-auto"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-800 sm:w-auto"
                >
                  Book Appointment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Appointment Details Modal */}
      {showDetailsModal && selectedAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="w-full max-w-3xl rounded-xl border border-slate-200 bg-white shadow-xl my-auto max-h-[90vh] overflow-y-auto">
            <div className="border-b border-slate-200 px-4 py-3 sm:px-6 sm:py-4 sticky top-0 bg-white flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900 sm:text-lg">Appointment Details</h2>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-4 py-4 sm:px-6 sm:py-6">
              <div className="space-y-6">
                {/* Header Info */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium text-slate-600">Appointment Number</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{selectedAppointment.appointmentNumber || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-600">Status</p>
                    <span className={`mt-1 inline-flex rounded-lg border px-2 py-1 text-xs font-semibold ${getStatusColor(selectedAppointment.status)}`}>
                      {selectedAppointment.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-600">Date & Time</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {new Date(selectedAppointment.appointmentDate).toLocaleDateString()} at {selectedAppointment.appointmentTime}
                    </p>
                    {selectedAppointment.estimatedEndTime && (
                      <p className="text-xs text-slate-500">Estimated end: {selectedAppointment.estimatedEndTime}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-600">Priority</p>
                    <span className={`mt-1 inline-flex rounded-lg border px-2 py-1 text-xs font-semibold ${getPriorityColor(selectedAppointment.priority)}`}>
                      {selectedAppointment.priority || "normal"}
                    </span>
                  </div>
                </div>

                {/* Patient Info */}
                <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                  <h3 className="mb-3 text-sm font-semibold text-slate-900">Patient Information</h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-medium text-slate-600">Name</p>
                      <p className="mt-1 text-sm text-slate-900">{selectedAppointment.patientId.name}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-600">Patient ID</p>
                      <p className="mt-1 text-sm text-slate-900">{selectedAppointment.patientId.patientId}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-600">Phone</p>
                      <p className="mt-1 text-sm text-slate-900">{selectedAppointment.patientId.phone}</p>
                    </div>
                    <button
                      onClick={() => {
                        setShowDetailsModal(false);
                        navigate(`/patients/${selectedAppointment.patientId._id}`);
                      }}
                      className="text-sm text-indigo-600 hover:text-indigo-800"
                    >
                      View Patient Details →
                    </button>
                  </div>
                </div>

                {/* Doctor Info */}
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-slate-900">Doctor</h3>
                  <p className="text-sm text-slate-900">Dr. {selectedAppointment.doctorId.name}</p>
                  <p className="text-xs text-slate-600">{selectedAppointment.doctorId.email}</p>
                </div>

                {/* Additional Info */}
                {selectedAppointment.chiefComplaint && (
                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-slate-900">Chief Complaint</h3>
                    <p className="text-sm text-slate-700">{selectedAppointment.chiefComplaint}</p>
                  </div>
                )}

                {selectedAppointment.notes && (
                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-slate-900">Notes</h3>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedAppointment.notes}</p>
                  </div>
                )}

                {/* Conversion Status */}
                {selectedAppointment.convertedToOPD && selectedAppointment.opdId && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
                    <p className="text-sm font-semibold text-emerald-900">Converted to OPD</p>
                    <p className="mt-1 text-xs text-emerald-700">OPD Number: {selectedAppointment.opdId.opdNumber}</p>
                    <button
                      onClick={() => {
                        setShowDetailsModal(false);
                        navigate(`/opd/${selectedAppointment.opdId?._id}`);
                      }}
                      className="mt-2 text-sm text-emerald-700 hover:text-emerald-900"
                    >
                      View OPD Record →
                    </button>
                  </div>
                )}

                {/* History */}
                {selectedAppointment.history && selectedAppointment.history.length > 0 && (
                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-slate-900">History</h3>
                    <div className="space-y-2">
                      {selectedAppointment.history.map((entry, idx) => (
                        <div key={idx} className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-900">{entry.action}</span>
                            <span className="text-xs text-slate-600">
                              {new Date(entry.changedAt).toLocaleString()}
                            </span>
                          </div>
                          {entry.changedBy && (
                            <p className="mt-1 text-xs text-slate-600">By: {entry.changedBy.name}</p>
                          )}
                          {entry.notes && (
                            <p className="mt-1 text-xs text-slate-700">{entry.notes}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
                  {hasPermission(PERMISSIONS.APPOINTMENTS_EDIT) && selectedAppointment.status === "scheduled" && (
                    <>
                      <button
                        onClick={() => {
                          setShowDetailsModal(false);
                          openRescheduleModal(selectedAppointment);
                        }}
                        className="rounded-lg border border-indigo-300 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100"
                      >
                        Reschedule
                      </button>
                      <button
                        onClick={() => {
                          setShowDetailsModal(false);
                          openCancelModal(selectedAppointment);
                        }}
                        className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-100"
                      >
                        Cancel
                      </button>
                      {!selectedAppointment.convertedToOPD && (
                        <button
                          onClick={handleConvertToOPD}
                          className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
                        >
                          Convert to OPD
                        </button>
                      )}
                    </>
                  )}
                  {hasPermission(PERMISSIONS.APPOINTMENTS_DELETE) && (
                    <button
                      onClick={() => handleDelete(selectedAppointment._id)}
                      className="rounded-lg border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {showRescheduleModal && selectedAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-xl my-auto max-h-[90vh] overflow-y-auto">
            <div className="border-b border-slate-200 px-4 py-3 sm:px-6 sm:py-4 sticky top-0 bg-white">
              <h2 className="text-base font-semibold text-slate-900 sm:text-lg">Reschedule Appointment</h2>
            </div>
            <form onSubmit={handleReschedule} className="px-4 py-4 sm:px-6">
              <div className="space-y-4">
                <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3">
                  <p className="text-xs font-medium text-amber-900">Current Schedule</p>
                  <p className="mt-1 text-sm text-amber-800">
                    {new Date(selectedAppointment.appointmentDate).toLocaleDateString()} at {selectedAppointment.appointmentTime}
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">New Date *</label>
                    <input
                      type="date"
                      required
                      value={rescheduleForm.appointmentDate}
                      onChange={(e) => setRescheduleForm({ ...rescheduleForm, appointmentDate: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">New Time *</label>
                    <input
                      type="time"
                      required
                      value={rescheduleForm.appointmentTime}
                      onChange={(e) => setRescheduleForm({ ...rescheduleForm, appointmentTime: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Reason (Optional)</label>
                  <textarea
                    value={rescheduleForm.reason}
                    onChange={(e) => setRescheduleForm({ ...rescheduleForm, reason: e.target.value })}
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="Reason for rescheduling..."
                  />
                </div>
              </div>
              <div className="mt-6 flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowRescheduleModal(false);
                    setRescheduleForm({ appointmentDate: "", appointmentTime: "", reason: "" });
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:w-auto"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-800 sm:w-auto"
                >
                  Reschedule Appointment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && selectedAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-xl my-auto max-h-[90vh] overflow-y-auto">
            <div className="border-b border-slate-200 px-4 py-3 sm:px-6 sm:py-4 sticky top-0 bg-white">
              <h2 className="text-base font-semibold text-slate-900 sm:text-lg">Cancel Appointment</h2>
            </div>
            <div className="px-4 py-4 sm:px-6">
              <div className="space-y-4">
                <div className="rounded-lg border border-rose-200 bg-rose-50/50 p-3">
                  <p className="text-xs font-medium text-rose-900">Appointment Details</p>
                  <p className="mt-1 text-sm text-rose-800">
                    {selectedAppointment.appointmentNumber || "N/A"} - {selectedAppointment.patientId.name}
                  </p>
                  <p className="text-xs text-rose-700">
                    {new Date(selectedAppointment.appointmentDate).toLocaleDateString()} at {selectedAppointment.appointmentTime}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Cancellation Reason (Optional)</label>
                  <textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    rows={4}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="Enter reason for cancellation..."
                  />
                </div>
              </div>
              <div className="mt-6 flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCancelModal(false);
                    setCancelReason("");
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:w-auto"
                >
                  Keep Appointment
                </button>
                <button
                  onClick={handleCancel}
                  className="w-full rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 sm:w-auto"
                >
                  Cancel Appointment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Appointments;
