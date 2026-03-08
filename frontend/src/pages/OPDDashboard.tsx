import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { opdAPI, usersAPI } from "../utils/api";
import { canAccessRoute } from "../utils/permissions";
import { showError } from "../utils/toast";

type OPDRecord = {
  _id: string;
  opdNumber: string;
  patientId: {
    _id: string;
    name: string;
    patientId: string;
    phone: string;
  };
  doctorId: {
    _id: string;
    name: string;
  };
  visitDate: string;
  visitTime: string;
  status: string;
  queueNumber: number;
  totalAmount: number;
  paidAmount: number;
  paymentStatus: string;
};

type OPDStats = {
  total: number;
  registered: number;
  waiting: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  totalRevenue: number;
};

function OPDDashboard() {
  const navigate = useNavigate();
  const [opdRecords, setOpdRecords] = useState<OPDRecord[]>([]);
  const [stats, setStats] = useState<OPDStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState<Array<{ _id: string; name: string }>>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<string>("");

  useEffect(() => {
    checkAuth();
    fetchDoctors();
    fetchTodayOPD();
  }, [selectedDoctor]);

  const checkAuth = () => {
    const token =
      localStorage.getItem("proclinic_token") ||
      sessionStorage.getItem("proclinic_token");
    if (!token) {
      navigate("/login");
      return;
    }
    if (!canAccessRoute("/opd")) {
      navigate("/dashboard");
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

  const fetchTodayOPD = async () => {
    try {
      setLoading(true);
      const response = await opdAPI.getToday(selectedDoctor || undefined);
      if (response.success) {
        setOpdRecords(response.data.opdRecords);
        setStats(response.stats);
      } else {
        showError("Failed to fetch OPD records");
      }
    } catch (err) {
      showError("Error loading OPD records");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "registered":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "waiting":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "in-progress":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "completed":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "cancelled":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "partial":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "pending":
        return "bg-rose-50 text-rose-700 border-rose-200";
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
            <p className="text-slate-600">Loading OPD dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <div className="flex flex-1 flex-col lg:ml-72">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm shadow-sm">
          <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4 lg:px-8">
            <div>
              <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">OPD Dashboard</h1>
              <p className="mt-1 text-xs text-slate-600 sm:mt-1.5 sm:text-sm">
                Today's Outpatient Department overview
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              {doctors.length > 0 && (
                <select
                  value={selectedDoctor}
                  onChange={(e) => setSelectedDoctor(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                >
                  <option value="">All Doctors</option>
                  {doctors.map((doctor) => (
                    <option key={doctor._id} value={doctor._id}>
                      {doctor.name}
                    </option>
                  ))}
                </select>
              )}
              <button
                onClick={() => navigate("/opd/register")}
                className="w-full rounded-xl bg-indigo-700 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-500/30 transition hover:bg-indigo-800 hover:shadow-lg hover:shadow-indigo-500/40 sm:w-auto sm:px-5 sm:py-2.5"
              >
                + New OPD Registration
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {/* Statistics Cards */}
          {stats && (
            <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium text-slate-600">Total</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{stats.total}</p>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
                <p className="text-xs font-medium text-blue-600">Registered</p>
                <p className="mt-1 text-2xl font-bold text-blue-700">{stats.registered}</p>
              </div>
              <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 shadow-sm">
                <p className="text-xs font-medium text-yellow-600">Waiting</p>
                <p className="mt-1 text-2xl font-bold text-yellow-700">{stats.waiting}</p>
              </div>
              <div className="rounded-xl border border-purple-200 bg-purple-50 p-4 shadow-sm">
                <p className="text-xs font-medium text-purple-600">In Progress</p>
                <p className="mt-1 text-2xl font-bold text-purple-700">{stats.inProgress}</p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
                <p className="text-xs font-medium text-emerald-600">Completed</p>
                <p className="mt-1 text-2xl font-bold text-emerald-700">{stats.completed}</p>
              </div>
              <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 shadow-sm">
                <p className="text-xs font-medium text-indigo-600">Revenue</p>
                <p className="mt-1 text-lg font-bold text-indigo-700">
                  ₹{stats.totalRevenue.toLocaleString()}
                </p>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <button
              onClick={() => navigate("/opd/queue")}
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
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <p className="font-semibold text-slate-900">View Queue</p>
              <p className="mt-1 text-xs text-slate-600">Manage patient queue</p>
            </button>

            <button
              onClick={() => navigate("/opd")}
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
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <p className="font-semibold text-slate-900">All OPD Records</p>
              <p className="mt-1 text-xs text-slate-600">View all OPD visits</p>
            </button>

            <button
              onClick={() => navigate("/opd/register")}
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
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
              </div>
              <p className="font-semibold text-slate-900">New Registration</p>
              <p className="mt-1 text-xs text-slate-600">Register new OPD visit</p>
            </button>

            <button
              onClick={() => navigate("/patients")}
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
                    d="M17 20h5v-2a3 3 0 00-3-3h-4a3 3 0 00-3 3v2zM9 10a3 3 0 100-6 3 3 0 000 6zm7 0a3 3 0 100-6 3 3 0 000 6z"
                  />
                </svg>
              </div>
              <p className="font-semibold text-slate-900">Patients</p>
              <p className="mt-1 text-xs text-slate-600">Manage patients</p>
            </button>
          </div>

          {/* Today's OPD Records */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-3 sm:px-6 sm:py-4">
              <h2 className="text-lg font-semibold text-slate-900">Today's OPD Records</h2>
              <p className="mt-0.5 text-xs text-slate-600 sm:text-sm">
                {new Date().toLocaleDateString("en-IN", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead className="border-b border-slate-200 bg-slate-50/80">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 sm:px-6 sm:py-4">
                      OPD Number
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 sm:px-6 sm:py-4">
                      Patient
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 sm:px-6 sm:py-4">
                      Doctor
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 sm:px-6 sm:py-4">
                      Queue
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 sm:px-6 sm:py-4">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 sm:px-6 sm:py-4">
                      Payment
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-600 sm:px-6 sm:py-4">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {opdRecords.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center">
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
                          <p className="text-sm font-medium text-slate-600">No OPD records today</p>
                          <p className="mt-1 text-xs text-slate-500">
                            Start by registering a new OPD visit
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    opdRecords.map((record) => (
                      <tr
                        key={record._id}
                        className="cursor-pointer transition-colors hover:bg-slate-50/50"
                        onClick={() => navigate(`/opd/${record._id}`)}
                      >
                        <td className="whitespace-nowrap px-4 py-3 sm:px-6 sm:py-4">
                          <div className="text-xs font-semibold text-indigo-700 sm:text-sm">
                            {record.opdNumber}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 sm:px-6 sm:py-4">
                          <div>
                            <div className="text-xs font-semibold text-slate-900 sm:text-sm">
                              {record.patientId.name}
                            </div>
                            <div className="text-xs text-slate-500">
                              {record.patientId.phone}
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600 sm:px-6 sm:py-4">
                          {record.doctorId.name}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600 sm:px-6 sm:py-4">
                          {record.queueNumber ? `#${record.queueNumber}` : "-"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 sm:px-6 sm:py-4">
                          <span
                            className={`inline-flex rounded-lg border px-2 py-1 text-xs font-semibold ${getStatusColor(
                              record.status
                            )}`}
                          >
                            {record.status.replace("-", " ")}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 sm:px-6 sm:py-4">
                          <div>
                            <span
                              className={`inline-flex rounded-lg border px-2 py-1 text-xs font-semibold ${getPaymentStatusColor(
                                record.paymentStatus
                              )}`}
                            >
                              {record.paymentStatus}
                            </span>
                            {record.totalAmount > 0 && (
                              <div className="mt-1 text-xs text-slate-600">
                                ₹{record.paidAmount}/{record.totalAmount}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right sm:px-6 sm:py-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/opd/${record._id}`);
                            }}
                            className="rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1 text-[10px] font-semibold text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100 sm:px-3 sm:py-1.5 sm:text-xs"
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
        </main>
      </div>
    </div>
  );
}

export default OPDDashboard;
