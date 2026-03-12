import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { appointmentsAPI, patientsAPI, usersAPI, authAPI, doctorSchedulesAPI } from "../utils/api";
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
    gender?: string;
    dateOfBirth?: string;
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
  originalAppointmentId?: {
    _id: string;
    appointmentNumber: string;
    appointmentDate: string;
    appointmentTime: string;
  };
  isFollowUp?: boolean;
  visitId?: {
    _id: string;
    visitDate: string;
    visitType: string;
    diagnosis?: string;
    treatment?: string;
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
  phone?: string;
  gender?: string;
  dateOfBirth?: string;
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

type AppointmentsProps = {
  viewMode?: ViewMode;
};

function Appointments({ viewMode: propViewMode }: AppointmentsProps = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<AppointmentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(false);
  
  // Determine view mode from URL or prop
  const getViewModeFromPath = (): ViewMode => {
    if (propViewMode) return propViewMode;
    const path = location.pathname;
    if (path.includes("/list")) return "list";
    if (path.includes("/calendar")) return "calendar";
    return "dashboard";
  };
  
  const [viewMode, setViewMode] = useState<ViewMode>(getViewModeFromPath());
  const isListViewActive = viewMode === "list";
  const isCalendarViewActive = viewMode === "calendar";
  
  // Update view mode when route changes
  useEffect(() => {
    const newViewMode = getViewModeFromPath();
    setViewMode(newViewMode);
  }, [location.pathname]);
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
  const [showMyAppointments, setShowMyAppointments] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; role: string; roles?: Array<{ name: string }> } | null>(null);
  const [doctorSchedule, setDoctorSchedule] = useState<any>(null);
  const [showAvailability, setShowAvailability] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedAppointmentsForTransfer, setSelectedAppointmentsForTransfer] = useState<string[]>([]);
  const [transferToDoctor, setTransferToDoctor] = useState("");
  const [isFollowUpFilter, setIsFollowUpFilter] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMonth, setDatePickerMonth] = useState(new Date());
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
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarViewType, setCalendarViewType] = useState<"month" | "week" | "day">("month");
  const [selectedDoctorForView, setSelectedDoctorForView] = useState<string>("");
  const doctorDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkAuth();
    fetchCurrentUser();
    fetchPatients();
    fetchDoctors();
    if (viewMode === "dashboard") {
      fetchStats();
    }
    fetchAppointments();
  }, [filterDate, filterDoctor, filterStatus, filterPriority, filterType, searchQuery, startDate, endDate, viewMode, currentMonth, showMyAppointments, isFollowUpFilter]);

  useEffect(() => {
    if (currentUser && showMyAppointments) {
      // Check if user is a doctor
      const isDoctor = currentUser.role?.toLowerCase() === "doctor" || 
        currentUser.roles?.some((r) => r.name?.toLowerCase().includes("doctor"));
      if (isDoctor) {
        setFilterDoctor(currentUser.id);
        fetchDoctorSchedule(currentUser.id);
      }
    } else if (!showMyAppointments) {
      setFilterDoctor("");
    }
  }, [showMyAppointments, currentUser]);

  // Close doctor dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (doctorDropdownRef.current && !doctorDropdownRef.current.contains(event.target as Node)) {
        setSelectedDoctorForView("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const checkAuth = () => {
    const token = localStorage.getItem("proclinic_token") || sessionStorage.getItem("proclinic_token");
    if (!token) {
      navigate("/login");
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const response = await authAPI.getMe();
      if (response.success && response.data?.user) {
        setCurrentUser({
          id: response.data.user.id,
          role: response.data.user.role,
          roles: response.data.user.roles || [],
        });
      } else {
        // Fallback to localStorage
        const userData = localStorage.getItem("proclinic_user") || sessionStorage.getItem("proclinic_user");
        if (userData) {
          const parsedUser = JSON.parse(userData);
          setCurrentUser({
            id: parsedUser.id,
            role: parsedUser.role,
            roles: parsedUser.roles || [],
          });
        }
      }
    } catch (error) {
      console.error("Error fetching current user:", error);
    }
  };

  const fetchDoctorSchedule = async (doctorId: string) => {
    try {
      const response = await doctorSchedulesAPI.getByDoctorId(doctorId);
      if (response.success && response.data?.schedule) {
        setDoctorSchedule(response.data.schedule);
      }
    } catch (error) {
      console.error("Error fetching doctor schedule:", error);
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
      if (isFollowUpFilter) params.isFollowUp = true;
      if (startDate && endDate) {
        params.startDate = startDate;
        params.endDate = endDate;
      } else if (viewMode === "calendar") {
        // For calendar view, fetch appointments for the current month
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        params.startDate = firstDay.toISOString().split('T')[0];
        params.endDate = lastDay.toISOString().split('T')[0];
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

  // Helper function to generate calendar days for the current month
  const getCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Add previous month's trailing days
    const prevMonth = new Date(year, month - 1, 0);
    const daysInPrevMonth = prevMonth.getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: daysInPrevMonth - i,
        month: month - 1,
        year: month === 0 ? year - 1 : year,
        isCurrentMonth: false,
      });
    }

    // Add current month's days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: i,
        month: month,
        year: year,
        isCurrentMonth: true,
      });
    }

    // Add next month's leading days to fill the grid
    const remainingDays = 42 - days.length; // 6 rows × 7 days
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: i,
        month: month + 1,
        year: month === 11 ? year + 1 : year,
        isCurrentMonth: false,
      });
    }

    return days;
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

  const handleAddMyAppointment = () => {
    if (!currentUser) {
      showError("User information not available");
      return;
    }
    // Check if user is a doctor
    const isDoctor = currentUser.role?.toLowerCase() === "doctor" || 
      currentUser.roles?.some((r) => r.name?.toLowerCase().includes("doctor"));
    if (!isDoctor) {
      showError("Only doctors can add their own appointments");
      return;
    }
    setBookingForm(prev => ({
      ...prev,
      doctorId: currentUser.id,
      appointmentDate: new Date().toISOString().split('T')[0],
      appointmentTime: "",
    }));
    setShowBookingModal(true);
    if (currentUser.id) {
      fetchAvailableSlots(currentUser.id, new Date().toISOString().split('T')[0]);
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

  // Close date picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showDatePicker && !target.closest('.date-picker-container')) {
        setShowDatePicker(false);
      }
    };
    if (showDatePicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDatePicker]);

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
          {/* Header Section - Matching Design */}
          <div className="mb-6">
            {/* Title and Doctor Filter Row */}
            <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1">
                <h1 className="text-3xl font-bold text-slate-900 mb-3">Appointments</h1>
            </div>
            </div>

            {/* Filters and Actions Row */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              {/* Date/View Filters */}
              <div className="flex items-center gap-2.5 flex-nowrap">
                {/* Date Picker Dropdown */}
                <div className="relative date-picker-container">
                  <button
                    onClick={() => setShowDatePicker(!showDatePicker)}
                    className={`flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium transition-colors h-10 whitespace-nowrap ${
                      filterDate && !startDate && !endDate && !isFollowUpFilter
                        ? "border-indigo-500 bg-indigo-600 text-white"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {filterDate && !startDate && !endDate ? (
                      filterDate === new Date().toISOString().split('T')[0] ? (
                        "Today"
                      ) : (
                        new Date(filterDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                      )
                    ) : (
                      "Today"
                    )}
                    <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {/* Calendar Dropdown */}
                  {showDatePicker && (
                    <div className="absolute top-full left-0 mt-2 z-50 w-80 rounded-xl border border-slate-200 bg-white shadow-xl p-4">
                      {/* Calendar Header */}
                      <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => {
                            const prevMonth = new Date(datePickerMonth);
                            prevMonth.setMonth(prevMonth.getMonth() - 1);
                            setDatePickerMonth(prevMonth);
                          }}
                          className="rounded-lg p-1.5 hover:bg-slate-100 transition-colors"
                        >
                          <svg className="h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <div className="flex items-center gap-2">
                          <select
                            value={datePickerMonth.getMonth()}
                            onChange={(e) => {
                              const newDate = new Date(datePickerMonth);
                              newDate.setMonth(parseInt(e.target.value));
                              setDatePickerMonth(newDate);
                            }}
                            className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          >
                            {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((month, idx) => (
                              <option key={idx} value={idx}>{month}</option>
                            ))}
                          </select>
                          <select
                            value={datePickerMonth.getFullYear()}
                            onChange={(e) => {
                              const newDate = new Date(datePickerMonth);
                              newDate.setFullYear(parseInt(e.target.value));
                              setDatePickerMonth(newDate);
                            }}
                            className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          >
                            {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 2 + i).map((year) => (
                              <option key={year} value={year}>{year}</option>
                            ))}
                          </select>
                        </div>
                        <button
                          onClick={() => {
                            const nextMonth = new Date(datePickerMonth);
                            nextMonth.setMonth(nextMonth.getMonth() + 1);
                            setDatePickerMonth(nextMonth);
                          }}
                          className="rounded-lg p-1.5 hover:bg-slate-100 transition-colors"
                        >
                          <svg className="h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>

                      {/* Calendar Grid */}
                      <div className="grid grid-cols-7 gap-1 mb-2">
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                          <div key={day} className="text-center text-xs font-semibold text-slate-600 py-1">
                            {day}
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {(() => {
                          const year = datePickerMonth.getFullYear();
                          const month = datePickerMonth.getMonth();
                          const firstDay = new Date(year, month, 1);
                          const lastDay = new Date(year, month + 1, 0);
                          const daysInMonth = lastDay.getDate();
                          const startingDayOfWeek = firstDay.getDay();
                          const days = [];

                          // Previous month's trailing days
                          const prevMonth = new Date(year, month - 1, 0);
                          const daysInPrevMonth = prevMonth.getDate();
                          for (let i = startingDayOfWeek - 1; i >= 0; i--) {
                            days.push({
                              date: daysInPrevMonth - i,
                              month: month - 1,
                              year: month === 0 ? year - 1 : year,
                              isCurrentMonth: false,
                            });
                          }

                          // Current month's days
                          for (let i = 1; i <= daysInMonth; i++) {
                            days.push({
                              date: i,
                              month: month,
                              year: year,
                              isCurrentMonth: true,
                            });
                          }

                          // Next month's leading days
                          const remainingDays = 42 - days.length;
                          for (let i = 1; i <= remainingDays; i++) {
                            days.push({
                              date: i,
                              month: month + 1,
                              year: month === 11 ? year + 1 : year,
                              isCurrentMonth: false,
                            });
                          }

                          return days.map((day, idx) => {
                            const dayDate = new Date(day.year, day.month, day.date);
                            const dayDateString = dayDate.toISOString().split('T')[0];
                            const isToday = dayDateString === new Date().toISOString().split('T')[0];
                            const isSelected = filterDate === dayDateString && !startDate && !endDate;
                            const hasAppointments = appointments.some(apt => {
                              const aptDate = new Date(apt.appointmentDate).toISOString().split('T')[0];
                              return aptDate === dayDateString;
                            });
                            const appointmentCount = appointments.filter(apt => {
                              const aptDate = new Date(apt.appointmentDate).toISOString().split('T')[0];
                              return aptDate === dayDateString;
                            }).length;

                            return (
                              <div key={idx} className="relative">
                                <button
                                  onClick={() => {
                                    if (day.isCurrentMonth) {
                                      setFilterDate(dayDateString);
                                      setStartDate("");
                                      setEndDate("");
                                      setIsFollowUpFilter(false);
                                      setShowDatePicker(false);
                                    }
                                  }}
                                  className={`h-8 w-8 rounded-lg text-xs font-medium transition-all relative ${
                                    !day.isCurrentMonth
                                      ? "text-slate-300 cursor-not-allowed"
                                      : isSelected
                                      ? "bg-indigo-600 text-white"
                                      : isToday
                                      ? "bg-indigo-100 text-indigo-700 font-semibold"
                                      : hasAppointments
                                      ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                      : "text-slate-700 hover:bg-slate-50"
                                  }`}
                                  disabled={!day.isCurrentMonth}
                                  title={hasAppointments && day.isCurrentMonth ? `${appointmentCount} appointment(s)` : ""}
                                >
                                  {day.date}
                </button>
                                {hasAppointments && day.isCurrentMonth && (
                                  <span className={`absolute bottom-0.5 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 rounded-full ${
                                    isSelected ? "bg-white" : "bg-indigo-500"
                                  }`}></span>
                                )}
                              </div>
                            );
                          });
                        })()}
                      </div>

                      {/* Quick Actions */}
                      <div className="mt-4 pt-4 border-t border-slate-200 flex gap-2">
                        <button
                          onClick={() => {
                            const today = new Date().toISOString().split('T')[0];
                            setFilterDate(today);
                            setStartDate("");
                            setEndDate("");
                            setIsFollowUpFilter(false);
                            setShowDatePicker(false);
                          }}
                          className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          Today
                        </button>
                        <button
                          onClick={() => {
                            setFilterDate("");
                            setStartDate("");
                            setEndDate("");
                            setIsFollowUpFilter(false);
                            setShowDatePicker(false);
                          }}
                          className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    // Show all appointments for the selected date (or today if no date selected)
                    const dateToUse = filterDate || new Date().toISOString().split('T')[0];
                    setFilterDate(dateToUse);
                    setStartDate("");
                    setEndDate("");
                    setFilterStatus("");
                    setIsFollowUpFilter(false);
                    setShowDatePicker(false);
                  }}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap h-10 flex-shrink-0 ${
                    filterDate && !startDate && !filterStatus && !isFollowUpFilter
                      ? "border-indigo-500 bg-indigo-600 text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  All Appointments
                </button>
                <button
                  onClick={() => {
                    setIsFollowUpFilter(true);
                    setFilterDate("");
                    setStartDate("");
                    setEndDate("");
                    setFilterStatus("");
                    setShowDatePicker(false);
                  }}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap h-10 flex-shrink-0 ${
                    isFollowUpFilter
                      ? "border-indigo-500 bg-indigo-600 text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Follow Up
                </button>
              </div>

              {/* Search and Action Buttons */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Search Bar */}
                <div className="relative flex-1 min-w-[200px]">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search Name or Mobile n"
                    className="w-full rounded-lg border border-slate-300 bg-white pl-10 pr-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                {/* Action Buttons */}
                <button
                  onClick={() => setShowTransferModal(true)}
                  className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  Transfer Appointments
                </button>
                {hasPermission(PERMISSIONS.APPOINTMENTS_CREATE) && (
                  <button
                    onClick={() => setShowBookingModal(true)}
                    className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Appointment
                  </button>
                )}
                {/* View Mode Toggle */}
                <div className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white p-1">
                  <span className="px-2 text-xs font-medium text-slate-600">View as:</span>
                <button
                  onClick={() => {
                    navigate("/appointments/calendar");
                    setViewMode("calendar");
                  }}
                    className={`rounded px-2 py-1 transition-colors ${
                    viewMode === "calendar"
                        ? "bg-indigo-600 text-white"
                        : "text-slate-600 hover:bg-slate-100"
                  }`}
                  title="Calendar view"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                </button>
                <button
                  onClick={() => {
                    navigate("/appointments/list");
                    setViewMode("list");
                  }}
                    className={`rounded px-2 py-1 transition-colors ${
                    viewMode === "list"
                        ? "bg-indigo-600 text-white"
                        : "text-slate-600 hover:bg-slate-100"
                  }`}
                  title="List view"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
              </div>
                {/* Filter Toggle Button */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`rounded-lg border p-2 transition-colors ${
                    showFilters || filterDate || filterDoctor || filterStatus || filterPriority || filterType || startDate || endDate
                      ? "border-indigo-500 bg-indigo-50 text-indigo-600"
                      : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                </button>

                <button
                  onClick={() => setShowMyAppointments((v) => !v)}
                  className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                    showMyAppointments
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                  title="Toggle My Appointments"
                >
                  My Appointments
                </button>

                {showMyAppointments ? (
                  <button
                    onClick={handleAddMyAppointment}
                    className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                    title="Add appointment for me"
                  >
                    + Add (Me)
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          {/* Doctor Availability Card - Show when viewing My Appointments */}
          {showMyAppointments && currentUser && doctorSchedule && (
            <div className="mb-6 rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-indigo-100/50 p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="text-lg font-semibold text-indigo-900">My Availability</h3>
                  </div>
                  {doctorSchedule.schedule && typeof doctorSchedule.schedule === 'object' ? (
                    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-7">
                      {Object.entries(doctorSchedule.schedule).map(([day, schedule]: [string, any]) => (
                        <div key={day} className="rounded-lg border border-indigo-200 bg-white p-3">
                          <p className="text-xs font-bold text-indigo-700 uppercase">{day}</p>
                          {schedule && schedule.length > 0 ? (
                            <div className="mt-2 space-y-1">
                              {schedule.map((slot: any, idx: number) => (
                                <p key={idx} className="text-xs text-slate-700">
                                  {slot.startTime} - {slot.endTime}
                                </p>
                              ))}
                            </div>
                          ) : (
                            <p className="mt-2 text-xs text-slate-500">Not available</p>
              )}
            </div>
                      ))}
          </div>
                  ) : (
                    <p className="mt-2 text-sm text-slate-600">Schedule not configured. <button onClick={() => navigate("/doctor-schedules")} className="text-indigo-600 hover:text-indigo-800 font-semibold underline">Set up schedule</button></p>
                  )}
                </div>
                <button
                  onClick={() => setShowAvailability(!showAvailability)}
                  className="ml-4 rounded-lg border border-indigo-300 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-50"
                >
                  {showAvailability ? "Hide" : "Show"} Details
                </button>
              </div>
            </div>
          )}

          {/* Dashboard View */}
          {viewMode === "dashboard" && (
            <>
              {/* Professional Statistics Cards */}
              {loadingStats ? (
                <div className="mb-6 flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 shadow-sm">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-r-transparent"></div>
                </div>
              ) : stats && (
                <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
                  {/* Total */}
                  <div className="group relative overflow-hidden rounded-lg border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-2.5 shadow-sm transition-all hover:border-indigo-300 hover:shadow-md">
                    <div className="absolute top-0 right-0 h-12 w-12 rounded-bl-full bg-slate-100/50"></div>
                    <div className="relative">
                      <div className="mb-1 flex items-center gap-1">
                        <div className="rounded bg-slate-100 p-1">
                          <svg className="h-3 w-3 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                  </div>
                  </div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Total</p>
                      <p className="mt-1 text-xl font-bold text-slate-900">{stats.total}</p>
                  </div>
                  </div>

                  {/* Scheduled */}
                  <div className="group relative overflow-hidden rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50 p-2.5 shadow-sm transition-all hover:border-blue-400 hover:shadow-md">
                    <div className="absolute top-0 right-0 h-12 w-12 rounded-bl-full bg-blue-200/30"></div>
                    <div className="relative">
                      <div className="mb-1 flex items-center gap-1">
                        <div className="rounded bg-blue-200/50 p-1">
                          <svg className="h-3 w-3 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                  </div>
                  </div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-700">Scheduled</p>
                      <p className="mt-1 text-xl font-bold text-blue-900">{stats.scheduled}</p>
                  </div>
                  </div>

                  {/* Completed */}
                  <div className="group relative overflow-hidden rounded-lg border border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-2.5 shadow-sm transition-all hover:border-emerald-400 hover:shadow-md">
                    <div className="absolute top-0 right-0 h-12 w-12 rounded-bl-full bg-emerald-200/30"></div>
                    <div className="relative">
                      <div className="mb-1 flex items-center gap-1">
                        <div className="rounded bg-emerald-200/50 p-1">
                          <svg className="h-3 w-3 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">Completed</p>
                      <p className="mt-1 text-xl font-bold text-emerald-900">{stats.completed}</p>
                    </div>
                  </div>

                  {/* Cancelled */}
                  <div className="group relative overflow-hidden rounded-lg border border-rose-200 bg-gradient-to-br from-rose-50 to-rose-100/50 p-2.5 shadow-sm transition-all hover:border-rose-400 hover:shadow-md">
                    <div className="absolute top-0 right-0 h-12 w-12 rounded-bl-full bg-rose-200/30"></div>
                    <div className="relative">
                      <div className="mb-1 flex items-center gap-1">
                        <div className="rounded bg-rose-200/50 p-1">
                          <svg className="h-3 w-3 text-rose-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                      </div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-rose-700">Cancelled</p>
                      <p className="mt-1 text-xl font-bold text-rose-900">{stats.cancelled}</p>
                    </div>
                  </div>

                  {/* No Show */}
                  <div className="group relative overflow-hidden rounded-lg border border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100/50 p-2.5 shadow-sm transition-all hover:border-amber-400 hover:shadow-md">
                    <div className="absolute top-0 right-0 h-12 w-12 rounded-bl-full bg-amber-200/30"></div>
                    <div className="relative">
                      <div className="mb-1 flex items-center gap-1">
                        <div className="rounded bg-amber-200/50 p-1">
                          <svg className="h-3 w-3 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                      </div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">No Show</p>
                      <p className="mt-1 text-xl font-bold text-amber-900">{stats.noShow}</p>
                    </div>
                  </div>

                  {/* Today */}
                  <div className="group relative overflow-hidden rounded-lg border border-indigo-200 bg-gradient-to-br from-indigo-50 to-indigo-100/50 p-2.5 shadow-sm transition-all hover:border-indigo-400 hover:shadow-md">
                    <div className="absolute top-0 right-0 h-12 w-12 rounded-bl-full bg-indigo-200/30"></div>
                    <div className="relative">
                      <div className="mb-1 flex items-center gap-1">
                        <div className="rounded bg-indigo-200/50 p-1">
                          <svg className="h-3 w-3 text-indigo-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      </div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-700">Today</p>
                      <p className="mt-1 text-xl font-bold text-indigo-900">{stats.todayAppointments}</p>
                    </div>
                  </div>

                  {/* Upcoming */}
                  <div className="group relative overflow-hidden rounded-lg border border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100/50 p-2.5 shadow-sm transition-all hover:border-purple-400 hover:shadow-md">
                    <div className="absolute top-0 right-0 h-12 w-12 rounded-bl-full bg-purple-200/30"></div>
                    <div className="relative">
                      <div className="mb-1 flex items-center gap-1">
                        <div className="rounded bg-purple-200/50 p-1">
                          <svg className="h-3 w-3 text-purple-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          </svg>
                        </div>
                      </div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-purple-700">Upcoming</p>
                      <p className="mt-1 text-xl font-bold text-purple-900">{stats.upcomingAppointments}</p>
                    </div>
                  </div>

                  {/* Overdue */}
                  <div className="group relative overflow-hidden rounded-lg border border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100/50 p-2.5 shadow-sm transition-all hover:border-orange-400 hover:shadow-md">
                    <div className="absolute top-0 right-0 h-12 w-12 rounded-bl-full bg-orange-200/30"></div>
                    <div className="relative">
                      <div className="mb-1 flex items-center gap-1">
                        <div className="rounded bg-orange-200/50 p-1">
                          <svg className="h-3 w-3 text-orange-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        </div>
                      </div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-orange-700">Overdue</p>
                      <p className="mt-1 text-xl font-bold text-orange-900">{stats.overdueAppointments}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Collapsible Filter Section - Only show when toggled or filters are active */}
              {(showFilters || filterDate || filterDoctor || filterStatus || filterPriority || filterType || startDate || endDate) && (
              <div className="mb-4 rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
                {/* Filter Header - Collapsible */}
                <div 
                  onClick={() => setShowFilters(!showFilters)}
                  className="border-b border-slate-200 bg-slate-50 px-3 py-2 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <svg className={`h-4 w-4 text-indigo-600 transition-transform ${showFilters ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                      <h2 className="text-xs font-semibold text-slate-900">Filters</h2>
                      {(filterDate || filterDoctor || filterStatus || filterPriority || filterType || startDate || endDate) && (
                        <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-medium text-indigo-700">
                          {[filterDate, filterDoctor, filterStatus, filterPriority, filterType, startDate, endDate].filter(Boolean).length} active
                              </span>
                            )}
                          </div>
                    {(filterDate || filterDoctor || filterStatus || filterPriority || filterType || startDate || endDate) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setFilterDate(new Date().toISOString().split('T')[0]);
                          setFilterDoctor("");
                          setFilterStatus("");
                          setFilterPriority("");
                          setFilterType("");
                          setStartDate("");
                          setEndDate("");
                        }}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
                      >
                        Clear All
                      </button>
                        )}
                      </div>
                </div>

                {/* Filter Content - Collapsible */}
                {showFilters && (
                <div className="p-3">
                  {/* Filter Grid - Compact Single Row */}
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                    {/* Date Filter */}
                    <div>
                      <label className="block text-[10px] font-medium text-slate-600 mb-1">Date</label>
                      <input
                        type="date"
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                        className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/20"
                      />
                    </div>

                    {/* Doctor Filter */}
                    <div>
                      <label className="block text-[10px] font-medium text-slate-600 mb-1">Doctor</label>
                      <select
                        value={filterDoctor}
                        onChange={(e) => setFilterDoctor(e.target.value)}
                        className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/20"
                      >
                        <option value="">All</option>
                        {doctors.map((doctor) => (
                          <option key={doctor._id} value={doctor._id}>
                            {doctor.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Status Filter */}
                    <div>
                      <label className="block text-[10px] font-medium text-slate-600 mb-1">Status</label>
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/20"
                      >
                        <option value="">All</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="no-show">No Show</option>
                      </select>
                    </div>

                    {/* Priority Filter */}
                    <div>
                      <label className="block text-[10px] font-medium text-slate-600 mb-1">Priority</label>
                      <select
                        value={filterPriority}
                        onChange={(e) => setFilterPriority(e.target.value)}
                        className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/20"
                      >
                        <option value="">All</option>
                        <option value="urgent">Urgent</option>
                        <option value="high">High</option>
                        <option value="normal">Normal</option>
                        <option value="low">Low</option>
                      </select>
                    </div>

                    {/* Type Filter */}
                    <div>
                      <label className="block text-[10px] font-medium text-slate-600 mb-1">Type</label>
                      <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/20"
                      >
                        <option value="">All</option>
                        <option value="booked">Booked</option>
                        <option value="walk-in">Walk-in</option>
                      </select>
                    </div>

                    {/* Start Date Filter */}
                    <div>
                      <label className="block text-[10px] font-medium text-slate-600 mb-1">Start Date</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/20"
                      />
                    </div>

                    {/* End Date Filter */}
                    <div>
                      <label className="block text-[10px] font-medium text-slate-600 mb-1">End Date</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-[11px] text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/20"
                      />
                    </div>
                  </div>

                  {/* Quick Filter Chips - Compact */}
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <div className="flex items-center gap-1.5 mb-2">
                      <svg className="h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      <span className="text-xs font-medium text-slate-700">Quick Filters</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => {
                          const today = new Date().toISOString().split('T')[0];
                          setFilterDate(today);
                          setStartDate("");
                          setEndDate("");
                        }}
                        className={`rounded-full px-3 py-1.5 text-[11px] font-medium transition-all ${
                          filterDate === new Date().toISOString().split('T')[0] && !startDate && !endDate
                            ? "bg-indigo-600 text-white shadow-sm"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        Today
                      </button>
                      <button
                        onClick={() => {
                          const tomorrow = new Date();
                          tomorrow.setDate(tomorrow.getDate() + 1);
                          setFilterDate(tomorrow.toISOString().split('T')[0]);
                          setStartDate("");
                          setEndDate("");
                        }}
                        className={`rounded-full px-3 py-1.5 text-[11px] font-medium transition-all ${
                          filterDate === new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0] && !startDate && !endDate
                            ? "bg-indigo-600 text-white shadow-sm"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        Tomorrow
                      </button>
                      <button
                        onClick={() => {
                          const start = new Date();
                          const end = new Date();
                          end.setDate(end.getDate() + 7);
                          setStartDate(start.toISOString().split('T')[0]);
                          setEndDate(end.toISOString().split('T')[0]);
                          setFilterDate("");
                        }}
                        className={`rounded-full px-3 py-1.5 text-[11px] font-medium transition-all ${
                          startDate && endDate && !filterDate
                            ? "bg-indigo-600 text-white shadow-sm"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        Next 7 Days
                      </button>
                      <button
                        onClick={() => {
                          setFilterStatus("scheduled");
                        }}
                        className={`rounded-full px-3 py-1.5 text-[11px] font-medium transition-all ${
                          filterStatus === "scheduled"
                            ? "bg-blue-600 text-white shadow-sm"
                            : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                        }`}
                      >
                        Scheduled
                      </button>
                      <button
                        onClick={() => {
                          setFilterStatus("completed");
                        }}
                        className={`rounded-full px-3 py-1.5 text-[11px] font-medium transition-all ${
                          filterStatus === "completed"
                            ? "bg-emerald-600 text-white shadow-sm"
                            : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                        }`}
                      >
                        Completed
                      </button>
                      <button
                        onClick={() => {
                          setFilterPriority("urgent");
                        }}
                        className={`rounded-full px-3 py-1.5 text-[11px] font-medium transition-all ${
                          filterPriority === "urgent"
                            ? "bg-rose-600 text-white shadow-sm"
                            : "bg-rose-100 text-rose-700 hover:bg-rose-200"
                        }`}
                      >
                        Urgent
                      </button>
                    </div>
                  </div>
                  </div>
                )}
              </div>
              )}

            </>
          )}

          {/* Calendar View */}
          {viewMode === "calendar" && (
            <div className="space-y-6">
              {/* Top Header - Appointments Title and Doctor Dropdown */}
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-slate-900">Appointments</h1>
                  <div className="mt-2 relative" ref={doctorDropdownRef}>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDoctorForView(selectedDoctorForView ? "" : "open");
                      }}
                      className="flex items-center gap-2 text-base font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      {filterDoctor ? (
                        <>
                          {doctors.find(d => d._id === filterDoctor)?.name || "Select Doctor"}
                          <span className="text-sm text-slate-500">, General Practice</span>
                        </>
                      ) : (
                        "All Doctors"
                      )}
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {selectedDoctorForView === "open" && (
                      <div className="absolute top-full left-0 mt-2 z-50 w-64 rounded-lg border border-slate-200 bg-white shadow-lg max-h-60 overflow-y-auto">
                        <button
                          onClick={() => {
                            setFilterDoctor("");
                            setSelectedDoctorForView("");
                          }}
                          className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-50 transition-colors ${
                            !filterDoctor ? "bg-indigo-50 text-indigo-700 font-medium" : ""
                          }`}
                        >
                          All Doctors
                        </button>
                        {doctors.map((doctor) => (
                          <button
                            key={doctor._id}
                            onClick={() => {
                              setFilterDoctor(doctor._id);
                              setSelectedDoctorForView("");
                            }}
                            className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-50 transition-colors ${
                              filterDoctor === doctor._id ? "bg-indigo-50 text-indigo-700 font-medium" : ""
                            }`}
                          >
                            {doctor.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Calendar View Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h2 className="text-xl font-bold text-slate-900">Calendar View</h2>
                  <button
                    onClick={() => setCurrentMonth(new Date())}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Today
                  </button>
                </div>

                {/* Top Right Controls */}
                <div className="flex items-center gap-4">
                  {/* Month Navigation with Clock Icon */}
                  <div className="flex items-center gap-2">
                    <svg className="h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <button
                      onClick={() => {
                        const newDate = new Date(currentMonth);
                        newDate.setMonth(newDate.getMonth() - 1);
                        setCurrentMonth(newDate);
                      }}
                      className="p-1 hover:bg-slate-100 rounded transition-colors"
                    >
                      <svg className="h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <span className="text-base font-semibold text-slate-900 min-w-[140px] text-center">
                        {new Date(currentMonth).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                    </span>
                    <button
                      onClick={() => {
                        const newDate = new Date(currentMonth);
                        newDate.setMonth(newDate.getMonth() + 1);
                        setCurrentMonth(newDate);
                      }}
                      className="p-1 hover:bg-slate-100 rounded transition-colors"
                    >
                      <svg className="h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                  
                  {/* Status Legend */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full bg-blue-500"></div>
                      <span className="text-xs text-slate-600">Queue</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full bg-orange-500"></div>
                      <span className="text-xs text-slate-600">Arrived/Engaged</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full bg-emerald-500"></div>
                      <span className="text-xs text-slate-600">Finished</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full bg-red-500"></div>
                      <span className="text-xs text-slate-600">Cancelled</span>
                    </div>
                  </div>


                  {/* View As Toggle */}
                  <div className="flex items-center gap-1 border border-slate-300 rounded-lg p-1 bg-white">
                    <button
                      onClick={() => setViewMode("list")}
                      className={`p-1.5 rounded transition-colors ${
                        isListViewActive ? "bg-slate-100" : "hover:bg-slate-50"
                      }`}
                      title="List View"
                    >
                      <svg className="h-4 w-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                    </button>
                      <button
                      onClick={() => setViewMode("calendar")}
                      className={`p-1.5 rounded transition-colors ${
                        isCalendarViewActive ? "bg-slate-100" : "hover:bg-slate-50"
                      }`}
                      title="Calendar View"
                    >
                      <svg className="h-4 w-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      </button>
                </div>

                  {/* Month/Week/Day Segmented Control */}
                  <div className="flex items-center border border-slate-300 rounded-lg bg-white overflow-hidden">
                    <button
                      onClick={() => setCalendarViewType("month")}
                      className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                        calendarViewType === "month"
                          ? "bg-indigo-600 text-white"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      Month
                    </button>
                    <button
                      onClick={() => setCalendarViewType("week")}
                      className={`px-3 py-1.5 text-sm font-medium transition-colors border-l border-slate-300 ${
                        calendarViewType === "week"
                          ? "bg-indigo-600 text-white"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      Week
                    </button>
                    <button
                      onClick={() => setCalendarViewType("day")}
                      className={`px-3 py-1.5 text-sm font-medium transition-colors border-l border-slate-300 ${
                        calendarViewType === "day"
                          ? "bg-indigo-600 text-white"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      Day
                    </button>
                        </div>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                {/* Day Headers - SUN in red */}
                <div className="grid grid-cols-7 border-b border-slate-200 bg-white">
                  {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((day, idx) => (
                    <div 
                      key={day} 
                      className="p-3 text-center border-r border-slate-200 last:border-r-0"
                    >
                      <div className={`text-xs font-bold uppercase tracking-wider ${
                        idx === 0 ? "text-red-600" : "text-slate-600"
                      }`}>
                        {day}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Calendar Days */}
                <div className="grid grid-cols-7 divide-x divide-y divide-slate-200">
                  {getCalendarDays().map((day, idx) => {
                    const dayDate = new Date(day.year, day.month, day.date);
                    const dayString = dayDate.toISOString().split('T')[0];
                    const dayAppointments = appointments.filter(apt => {
                      const aptDate = new Date(apt.appointmentDate).toISOString().split('T')[0];
                      return aptDate === dayString;
                    });
                    const isToday = dayString === new Date().toISOString().split('T')[0];
                    const isCurrentMonth = day.isCurrentMonth;
                    const isSunday = dayDate.getDay() === 0;

                    // Get status color for appointments
                    const getStatusColor = (status: string) => {
                      switch (status) {
                        case "scheduled":
                          return "bg-blue-50 border-blue-200 text-blue-900";
                        case "completed":
                          return "bg-emerald-50 border-emerald-200 text-emerald-900";
                        case "cancelled":
                          return "bg-red-50 border-red-200 text-red-900";
                        case "no-show":
                          return "bg-orange-50 border-orange-200 text-orange-900";
                        default:
                          return "bg-blue-50 border-blue-200 text-blue-900";
                      }
                    };

                    return (
                      <div
                        key={idx}
                        className={`relative min-h-[120px] p-2 transition-colors ${
                          !isCurrentMonth 
                            ? "bg-slate-50/50" 
                            : "bg-white"
                        } ${isToday ? "bg-indigo-50/50" : ""} hover:bg-slate-50`}
                      >
                        {/* Date Number - Red for Sundays */}
                        <div className="mb-1">
                          <span className={`text-sm font-semibold ${
                            !isCurrentMonth 
                              ? "text-slate-400" 
                              : isSunday
                              ? "text-red-600"
                              : isToday 
                              ? "flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white inline-flex"
                              : "text-slate-900"
                          }`}>
                            {day.date}
                          </span>
                        </div>

                        {/* Appointments List */}
                        <div className="space-y-1">
                          {dayAppointments.slice(0, 2).map((apt) => (
                              <div
                                key={apt._id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openDetailsModal(apt);
                                }}
                              className={`cursor-pointer rounded border px-2 py-1 text-xs transition-all hover:shadow-sm ${getStatusColor(apt.status)}`}
                              title={`${apt.appointmentTime} - ${apt.patientId?.name || "N/A"}`}
                            >
                              <div className="font-semibold truncate">{apt.patientId?.name || "N/A"}</div>
                              <div className="text-[10px] opacity-75">{apt.appointmentTime}</div>
                                </div>
                          ))}
                          {dayAppointments.length > 2 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setFilterDate(dayString);
                                setViewMode("list");
                              }}
                              className="w-full rounded border border-dashed border-slate-300 bg-slate-50 px-2 py-1 text-[10px] font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                            >
                              +{dayAppointments.length - 2} more
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Appointments List - Show for List view */}
          {viewMode === "list" && (
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            {appointments.length === 0 ? (
                <div className="px-6 py-20 text-center">
                  <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100">
                <svg
                      className="h-10 w-10 text-slate-400"
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
                  </div>
                  <p className="text-base font-semibold text-slate-700">No appointments found</p>
                  <p className="mt-1 text-sm text-slate-500">Try adjusting your filters or create a new appointment</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="border-b border-slate-200 bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-700">No.#</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-700">Patient</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-700">Age</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-700">Gender</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-700">
                          <div className="flex items-center gap-1">
                            Case
                            <button className="text-slate-400 hover:text-slate-600">
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                              </svg>
                            </button>
                          </div>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-700">Category</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-700">Dr. Name</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-700">Time</th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-700">
                          <div className="flex items-center gap-1">
                            Status
                            <button className="text-slate-400 hover:text-slate-600">
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                              </svg>
                            </button>
                          </div>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-700">Remarks</th>
                        <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-700">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                      {appointments.map((apt, index) => {
                        // Calculate age from dateOfBirth if available
                        const calculateAge = (dateOfBirth: string | Date | null | undefined) => {
                          if (!dateOfBirth) return "N/A";
                          const dob = new Date(dateOfBirth);
                          const today = new Date();
                          const years = today.getFullYear() - dob.getFullYear();
                          const months = today.getMonth() - dob.getMonth();
                          const days = today.getDate() - dob.getDate();
                          
                          if (years > 0) {
                            if (months > 0 || (months === 0 && days >= 0)) {
                              return `${years}y`;
                            } else {
                              return `${years - 1}y`;
                            }
                          } else if (months > 0) {
                            return `${months}m`;
                          } else {
                            return `${days}d`;
                          }
                        };

                        const age = calculateAge(apt.patientId.dateOfBirth);
                        const gender = apt.patientId.gender || "N/A";
                        const caseType = "New"; // Default to "New" as shown in image

                        return (
                          <tr 
                            key={apt._id} 
                            className="hover:bg-slate-50 transition-colors cursor-pointer"
                            onClick={() => openDetailsModal(apt)}
                          >
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="text-sm font-medium text-slate-900">{index + 1}</span>
                        </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
                                  <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                  </svg>
                          </div>
                                <div>
                                  <div className="text-sm font-semibold text-slate-900">{apt.patientId?.name || "N/A"}</div>
                                  <div className="text-xs text-slate-500">{apt.patientId.patientId || "N/A"}</div>
                                </div>
                              </div>
                        </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="text-sm text-slate-700">{age}</span>
                        </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="text-sm text-slate-700">{gender}</span>
                        </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="text-sm text-slate-700">{caseType}</span>
                        </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="text-sm text-slate-400">-</span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm text-slate-700">{apt.doctorId?.name || "N/A"}</div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="text-sm font-medium text-slate-900">{apt.appointmentTime}</span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                                apt.status === "completed"
                                  ? "bg-emerald-100 text-emerald-700"
                                : apt.status === "cancelled"
                                  ? "bg-rose-100 text-rose-700"
                                : apt.status === "no-show"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-blue-100 text-blue-700"
                              }`}>
                                {apt.status === "completed" ? "Finished" : apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                              </span>
                        </td>
                            <td className="px-4 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                <button
                                onClick={() => {
                                  // Handle remarks - could open a modal
                                  console.log("Remarks for appointment:", apt._id);
                                }}
                                className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                              >
                                Remarks
                                </button>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center" onClick={(e) => e.stopPropagation()}>
                              <div className="relative">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Handle action menu
                                    console.log("Action menu for appointment:", apt._id);
                                  }}
                                  className="rounded-lg p-1 text-slate-600 hover:bg-slate-100 transition-colors"
                                >
                                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                  </svg>
                                </button>
                          </div>
                        </td>
                      </tr>
                        );
                      })}
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
                      <p className="mt-1 text-sm font-medium text-slate-900">{apt.patientId?.name || "N/A"}</p>
                      <p className="text-xs text-slate-600">Dr. {apt.doctorId?.name || "N/A"}</p>
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

                {/* Visit Status */}
                {selectedAppointment.visitId && (
                  <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-4">
                    <p className="text-sm font-semibold text-indigo-900">Visit Record Created</p>
                    <p className="mt-1 text-xs text-indigo-700">
                      Visit Type: {selectedAppointment.visitId.visitType}
                    </p>
                    <p className="text-xs text-indigo-700">
                      Visit Date: {new Date(selectedAppointment.visitId.visitDate).toLocaleDateString()}
                    </p>
                    {selectedAppointment.visitId.diagnosis && (
                      <p className="mt-1 text-xs text-indigo-700">
                        Diagnosis: {selectedAppointment.visitId.diagnosis}
                      </p>
                    )}
                    {selectedAppointment.isFollowUp && selectedAppointment.originalAppointmentId && (
                      <p className="mt-2 text-xs text-indigo-600">
                        This is a follow-up visit linked to appointment: {selectedAppointment.originalAppointmentId.appointmentNumber || "N/A"}
                      </p>
                    )}
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

      {/* Transfer Appointments Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-xl my-auto max-h-[90vh] overflow-y-auto">
            <div className="border-b border-slate-200 px-4 py-3 sm:px-6 sm:py-4 sticky top-0 bg-white">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-900 sm:text-lg">Transfer Appointments</h2>
                <button
                  onClick={() => {
                    setShowTransferModal(false);
                    setSelectedAppointmentsForTransfer([]);
                    setTransferToDoctor("");
                  }}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
    </div>
            </div>
            <div className="px-4 py-4 sm:px-6">
              <div className="space-y-4">
                {/* Select Appointments */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Select Appointments to Transfer</label>
                  <div className="max-h-60 overflow-y-auto rounded-lg border border-slate-300 bg-white">
                    {appointments.filter(apt => apt.status === "scheduled").length === 0 ? (
                      <div className="p-4 text-center text-sm text-slate-500">
                        No scheduled appointments available to transfer
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-200">
                        {appointments.filter(apt => apt.status === "scheduled").map((apt) => (
                          <label
                            key={apt._id}
                            className="flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedAppointmentsForTransfer.includes(apt._id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedAppointmentsForTransfer([...selectedAppointmentsForTransfer, apt._id]);
                                } else {
                                  setSelectedAppointmentsForTransfer(selectedAppointmentsForTransfer.filter(id => id !== apt._id));
                                }
                              }}
                              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <div className="flex-1">
                              <div className="text-sm font-medium text-slate-900">{apt.patientId?.name || "N/A"}</div>
                              <div className="text-xs text-slate-500">
                                {new Date(apt.appointmentDate).toLocaleDateString()} at {apt.appointmentTime} - Dr. {apt.doctorId?.name || "N/A"}
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedAppointmentsForTransfer.length > 0 && (
                    <p className="mt-2 text-xs text-slate-600">
                      {selectedAppointmentsForTransfer.length} appointment(s) selected
                    </p>
                  )}
                </div>

                {/* Select Doctor */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Transfer To Doctor *</label>
                  <select
                    value={transferToDoctor}
                    onChange={(e) => setTransferToDoctor(e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  >
                    <option value="">Select a doctor</option>
                    {doctors.map((doctor) => (
                      <option key={doctor._id} value={doctor._id}>
                        {doctor.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
                  <button
                    onClick={async () => {
                      if (!transferToDoctor || selectedAppointmentsForTransfer.length === 0) {
                        showError("Please select appointments and a doctor");
                        return;
                      }
                      try {
                        setLoading(true);
                        const transferPromises = selectedAppointmentsForTransfer.map(appointmentId =>
                          appointmentsAPI.update(appointmentId, { doctorId: transferToDoctor })
                        );
                        await Promise.all(transferPromises);
                        showSuccess(`Successfully transferred ${selectedAppointmentsForTransfer.length} appointment(s)`);
                        setShowTransferModal(false);
                        setSelectedAppointmentsForTransfer([]);
                        setTransferToDoctor("");
                        fetchAppointments();
                      } catch (err: any) {
                        showError(err.message || "Failed to transfer appointments");
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={!transferToDoctor || selectedAppointmentsForTransfer.length === 0 || loading}
                    className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed sm:flex-none"
                  >
                    {loading ? "Transferring..." : `Transfer ${selectedAppointmentsForTransfer.length || ""} Appointment(s)`}
                  </button>
                  <button
                    onClick={() => {
                      setShowTransferModal(false);
                      setSelectedAppointmentsForTransfer([]);
                      setTransferToDoctor("");
                    }}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Appointments;
