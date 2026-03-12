import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { appointmentsAPI, opdAPI, ipdAPI, authAPI } from "../utils/api";
import { showError } from "../utils/toast";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  roles?: Array<{ name: string; displayName?: string }>;
};

type Appointment = {
  _id: string;
  appointmentNumber: string;
  patientId: {
    _id: string;
    name: string;
    patientId: string;
    phone: string;
  };
  appointmentDate: string;
  appointmentTime: string;
  status: string;
  priority?: string;
};

type OPDRecord = {
  _id: string;
  opdNumber: string;
  patientId: {
    _id: string;
    name: string;
    patientId: string;
    phone: string;
  };
  visitDate: string;
  visitTime: string;
  status: string;
  queueNumber: number;
};

type IPDRecord = {
  _id: string;
  ipdNumber: string;
  patientId: {
    _id: string;
    name: string;
    patientId: string;
    phone: string;
  };
  roomNumber?: string;
  bedNumber?: string;
  admissionDate: string;
  status: string;
};

function DoctorDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [opdRecords, setOpdRecords] = useState<OPDRecord[]>([]);
  const [ipdRecords, setIpdRecords] = useState<IPDRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    todayAppointments: 0,
    todayOPD: 0,
    currentIPD: 0,
    waitingOPD: 0,
  });

  useEffect(() => {
    checkAuth();
    fetchUserData();
  }, []);

  useEffect(() => {
    if (user?.id) {
      // Redirect non-doctors to regular dashboard
      // Check both role field and roles array
      const simpleRole = user.role?.toLowerCase();
      const hasSimpleDoctorRole = simpleRole === "doctor";
      const hasDoctorInRoles = (user as any).roles?.some((role: any) => {
        const roleName = typeof role === "string" ? role : role?.name;
        return roleName?.toLowerCase().includes("doctor");
      }) || false;
      const isDoctor = hasSimpleDoctorRole || hasDoctorInRoles;
      
      if (!isDoctor) {
        navigate("/dashboard");
        return;
      }
      fetchDashboardData();
    }
  }, [user, navigate]);

  const checkAuth = () => {
    const token =
      localStorage.getItem("proclinic_token") ||
      sessionStorage.getItem("proclinic_token");
    if (!token) {
      navigate("/login");
      return;
    }
  };

  const fetchUserData = async () => {
    try {
      const response = await authAPI.getMe();
      if (response.success && response.data?.user) {
        const userData = {
          id: response.data.user.id,
          name: response.data.user.name,
          email: response.data.user.email,
          role: response.data.user.role,
          roles: response.data.user.roles || [],
        };
        setUser(userData);
      } else {
        // Fallback to localStorage
        const userData =
          localStorage.getItem("proclinic_user") ||
          sessionStorage.getItem("proclinic_user");
        if (userData) {
          const parsedUser = JSON.parse(userData);
          setUser({
            id: parsedUser.id,
            name: parsedUser.name,
            email: parsedUser.email,
            role: parsedUser.role,
            roles: parsedUser.roles || [],
          });
        }
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      // Fallback to localStorage
      const userData =
        localStorage.getItem("proclinic_user") ||
        sessionStorage.getItem("proclinic_user");
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUser({
          id: parsedUser.id,
          name: parsedUser.name,
          email: parsedUser.email,
          role: parsedUser.role,
          roles: parsedUser.roles || [],
        });
      }
    }
  };

  const fetchDashboardData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const today = new Date().toISOString().split("T")[0];

      // Fetch today's appointments
      const appointmentsResponse = await appointmentsAPI.getAll({
        doctorId: user.id,
        date: today,
      });

      // Fetch today's OPD records
      const opdResponse = await opdAPI.getToday(user.id);

      // Fetch current IPD records
      const ipdResponse = await ipdAPI.getCurrent(user.id);

      if (appointmentsResponse.success) {
        setAppointments(appointmentsResponse.data?.appointments || []);
      }

      if (opdResponse.success) {
        setOpdRecords(opdResponse.data?.opdRecords || []);
      }

      if (ipdResponse.success) {
        setIpdRecords(ipdResponse.data?.ipdRecords || []);
      }

      // Calculate stats
      const waitingOPD = opdResponse.data?.opdRecords?.filter(
        (r: OPDRecord) => r.status === "waiting" || r.status === "registered"
      ).length || 0;

      setStats({
        todayAppointments: appointmentsResponse.data?.appointments?.length || 0,
        todayOPD: opdResponse.data?.opdRecords?.length || 0,
        currentIPD: ipdResponse.data?.ipdRecords?.length || 0,
        waitingOPD,
      });
    } catch (err) {
      showError("Error loading dashboard data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "scheduled":
      case "registered":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "waiting":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "in-progress":
      case "confirmed":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "completed":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "cancelled":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "admitted":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "under-treatment":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "discharged":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  const formatTime = (time: string) => {
    if (!time) return "";
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <div className="flex flex-1 items-center justify-center sidebar-content-margin">
          <div className="text-center">
            <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
            <p className="text-slate-600">Loading dashboard...</p>
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
              <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
                Doctor's Dashboard
              </h1>
              <p className="mt-1 text-xs text-slate-600 sm:mt-1.5 sm:text-sm">
                Welcome back, Dr. {user?.name}! Here's your overview for today.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <button
                onClick={() => navigate("/opd/queue")}
                className="w-full rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100 sm:w-auto sm:px-5 sm:py-2.5"
              >
                View OPD Queue
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {/* Statistics Cards */}
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-indigo-600">
                    Today's Appointments
                  </p>
                  <p className="mt-2 text-2xl font-bold text-indigo-900 sm:text-3xl">
                    {stats.todayAppointments}
                  </p>
                </div>
                <div className="rounded-full bg-indigo-100 p-2 sm:p-3">
                  <svg
                    className="h-5 w-5 text-indigo-600 sm:h-6 sm:w-6"
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
              </div>
            </div>

            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-blue-600">
                    Today's OPD Cases
                  </p>
                  <p className="mt-2 text-2xl font-bold text-blue-900 sm:text-3xl">
                    {stats.todayOPD}
                  </p>
                </div>
                <div className="rounded-full bg-blue-100 p-2 sm:p-3">
                  <svg
                    className="h-5 w-5 text-blue-600 sm:h-6 sm:w-6"
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
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-yellow-600">
                    Waiting in Queue
                  </p>
                  <p className="mt-2 text-2xl font-bold text-yellow-900 sm:text-3xl">
                    {stats.waitingOPD}
                  </p>
                </div>
                <div className="rounded-full bg-yellow-100 p-2 sm:p-3">
                  <svg
                    className="h-5 w-5 text-yellow-600 sm:h-6 sm:w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-purple-200 bg-purple-50 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-purple-600">
                    Current IPD Cases
                  </p>
                  <p className="mt-2 text-2xl font-bold text-purple-900 sm:text-3xl">
                    {stats.currentIPD}
                  </p>
                </div>
                <div className="rounded-full bg-purple-100 p-2 sm:p-3">
                  <svg
                    className="h-5 w-5 text-purple-600 sm:h-6 sm:w-6"
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
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <button
              onClick={() => navigate("/appointments/dashboard")}
              className="rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-indigo-300 hover:shadow-md"
            >
              <div className="mb-2 rounded-lg bg-indigo-100 p-2 w-fit">
                <svg
                  className="h-5 w-5 text-indigo-600"
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
              <p className="font-semibold text-slate-900">Appointments</p>
              <p className="mt-1 text-xs text-slate-600">View all appointments</p>
            </button>

            <button
              onClick={() => navigate("/opd/queue")}
              className="rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-indigo-300 hover:shadow-md"
            >
              <div className="mb-2 rounded-lg bg-blue-100 p-2 w-fit">
                <svg
                  className="h-5 w-5 text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <p className="font-semibold text-slate-900">OPD Queue</p>
              <p className="mt-1 text-xs text-slate-600">Manage patient queue</p>
            </button>

            <button
              onClick={() => navigate("/ipd")}
              className="rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-indigo-300 hover:shadow-md"
            >
              <div className="mb-2 rounded-lg bg-purple-100 p-2 w-fit">
                <svg
                  className="h-5 w-5 text-purple-600"
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
              </div>
              <p className="font-semibold text-slate-900">IPD Cases</p>
              <p className="mt-1 text-xs text-slate-600">View IPD patients</p>
            </button>

            <button
              onClick={() => navigate("/patients")}
              className="rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-indigo-300 hover:shadow-md"
            >
              <div className="mb-2 rounded-lg bg-emerald-100 p-2 w-fit">
                <svg
                  className="h-5 w-5 text-emerald-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-3-3h-4a3 3 0 00-3 3v2zM9 10a3 3 0 100-6 3 3 0 000 6zm7 0a3 3 0 100-6 3 3 0 000 6z"
                  />
                </svg>
              </div>
              <p className="font-semibold text-slate-900">Patients</p>
              <p className="mt-1 text-xs text-slate-600">View all patients</p>
            </button>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Today's Appointments */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-4 py-3 sm:px-6 sm:py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      Today's Appointments
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-600 sm:text-sm">
                      {new Date().toLocaleDateString("en-IN", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <button
                    onClick={() => navigate("/appointments/dashboard")}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    View All
                  </button>
                </div>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {appointments.length === 0 ? (
                  <div className="px-6 py-8 text-center">
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
                    <p className="text-sm font-medium text-slate-600">
                      No appointments today
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {appointments.slice(0, 5).map((appointment) => (
                      <div
                        key={appointment._id}
                        className="cursor-pointer px-4 py-3 transition-colors hover:bg-slate-50 sm:px-6"
                        onClick={() => navigate(`/appointments/${appointment._id}`)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-slate-900">
                              {appointment.patientId.name}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              {appointment.patientId.phone} • {formatTime(appointment.appointmentTime)}
                            </p>
                          </div>
                          <div className="ml-4 flex flex-col items-end gap-1">
                            <span
                              className={`inline-flex rounded-lg border px-2 py-1 text-xs font-semibold ${getStatusColor(
                                appointment.status
                              )}`}
                            >
                              {appointment.status}
                            </span>
                            {appointment.priority && (
                              <span className="text-xs text-slate-500">
                                {appointment.priority}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Today's OPD Queue */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-4 py-3 sm:px-6 sm:py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      Today's OPD Queue
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-600 sm:text-sm">
                      Patients waiting for consultation
                    </p>
                  </div>
                  <button
                    onClick={() => navigate("/opd/queue")}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    View All
                  </button>
                </div>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {opdRecords.length === 0 ? (
                  <div className="px-6 py-8 text-center">
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
                      No OPD cases today
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {opdRecords
                      .filter((r) => r.status === "waiting" || r.status === "registered")
                      .sort((a, b) => (a.queueNumber || 0) - (b.queueNumber || 0))
                      .slice(0, 5)
                      .map((record) => (
                        <div
                          key={record._id}
                          className="cursor-pointer px-4 py-3 transition-colors hover:bg-slate-50 sm:px-6"
                          onClick={() => navigate(`/opd/${record._id}`)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-indigo-600">
                                  #{record.queueNumber || "-"}
                                </span>
                                <p className="text-sm font-semibold text-slate-900">
                                  {record.patientId.name}
                                </p>
                              </div>
                              <p className="mt-0.5 text-xs text-slate-500">
                                {record.patientId.phone} • {formatTime(record.visitTime)}
                              </p>
                            </div>
                            <span
                              className={`ml-4 inline-flex rounded-lg border px-2 py-1 text-xs font-semibold ${getStatusColor(
                                record.status
                              )}`}
                            >
                              {record.status}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Current IPD Cases */}
          <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-3 sm:px-6 sm:py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Current IPD Cases
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-600 sm:text-sm">
                    Patients currently admitted or under treatment
                  </p>
                </div>
                <button
                  onClick={() => navigate("/ipd")}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  View All
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              {ipdRecords.length === 0 ? (
                <div className="px-6 py-8 text-center">
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
                  <p className="text-sm font-medium text-slate-600">
                    No current IPD cases
                  </p>
                </div>
              ) : (
                <table className="w-full min-w-[640px]">
                  <thead className="border-b border-slate-200 bg-slate-50/80">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 sm:px-6 sm:py-4">
                        IPD Number
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 sm:px-6 sm:py-4">
                        Patient
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 sm:px-6 sm:py-4">
                        Room/Bed
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 sm:px-6 sm:py-4">
                        Admission Date
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
                    {ipdRecords.slice(0, 5).map((ipd) => (
                      <tr
                        key={ipd._id}
                        className="cursor-pointer transition-colors hover:bg-slate-50/50"
                        onClick={() => navigate(`/ipd/${ipd._id}`)}
                      >
                        <td className="whitespace-nowrap px-4 py-3 sm:px-6 sm:py-4">
                          <div className="text-sm font-medium text-indigo-700">
                            {ipd.ipdNumber}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 sm:px-6 sm:py-4">
                          <div className="text-sm font-medium text-slate-900">
                            {ipd.patientId.name}
                          </div>
                          <div className="text-xs text-slate-500">
                            {ipd.patientId.phone}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600 sm:px-6 sm:py-4">
                          {ipd.roomNumber && ipd.bedNumber
                            ? `${ipd.roomNumber} / ${ipd.bedNumber}`
                            : "Not Assigned"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600 sm:px-6 sm:py-4">
                          {new Date(ipd.admissionDate).toLocaleDateString("en-IN")}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 sm:px-6 sm:py-4">
                          <span
                            className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-semibold ${getStatusColor(
                              ipd.status
                            )}`}
                          >
                            {ipd.status.replace("-", " ")}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right sm:px-6 sm:py-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/ipd/${ipd._id}`);
                            }}
                            className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default DoctorDashboard;
