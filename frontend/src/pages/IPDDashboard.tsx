import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { ipdAPI, usersAPI, roomAPI } from "../utils/api";
import { hasPermission, PERMISSIONS, canAccessRoute } from "../utils/permissions";
import { showError } from "../utils/toast";

type IPDRecord = {
  _id: string;
  ipdNumber: string;
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
  roomId?: {
    _id: string;
    roomNumber: string;
    roomType: string;
  };
  roomNumber?: string;
  bedNumber?: string;
  admissionDate: string;
  status: string;
  totalAmount: number;
  paidAmount: number;
  paymentStatus: string;
};

type IPDStats = {
  totalAdmissions: number;
  currentAdmissions: number;
  admitted: number;
  underTreatment: number;
  discharged: number;
  transferred: number;
  deceased: number;
  totalRevenue: number;
  pendingPayments: number;
  averageLengthOfStay: string;
};

type RoomStats = {
  totalRooms: number;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  occupancyRate: string;
  currentAdmissions: number;
};

function IPDDashboard() {
  const navigate = useNavigate();
  const [ipdRecords, setIpdRecords] = useState<IPDRecord[]>([]);
  const [stats, setStats] = useState<IPDStats | null>(null);
  const [roomStats, setRoomStats] = useState<RoomStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState<Array<{ _id: string; name: string }>>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<string>("");

  useEffect(() => {
    checkAuth();
    fetchDoctors();
    fetchCurrentIPD();
    fetchStats();
    fetchRoomStats();
  }, [selectedDoctor]);

  const checkAuth = () => {
    const token =
      localStorage.getItem("proclinic_token") ||
      sessionStorage.getItem("proclinic_token");
    if (!token) {
      navigate("/login");
      return;
    }
    if (!canAccessRoute("/ipd")) {
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

  const fetchCurrentIPD = async () => {
    try {
      setLoading(true);
      const response = await ipdAPI.getCurrent(selectedDoctor || undefined);
      if (response.success) {
        setIpdRecords(response.data.ipdRecords);
        if (response.stats) {
          setStats({
            totalAdmissions: response.stats.total,
            currentAdmissions: response.stats.total,
            admitted: response.stats.admitted,
            underTreatment: response.stats.underTreatment,
            discharged: 0,
            transferred: 0,
            deceased: 0,
            totalRevenue: 0,
            pendingPayments: 0,
            averageLengthOfStay: "0",
          });
        }
      } else {
        showError("Failed to fetch IPD records");
      }
    } catch (err) {
      showError("Error loading IPD records");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await ipdAPI.getStats();
      if (response.success && response.data?.stats) {
        setStats(response.data.stats);
      }
    } catch (err) {
      console.error("Error fetching IPD stats:", err);
    }
  };

  const fetchRoomStats = async () => {
    try {
      const response = await roomAPI.getStats();
      if (response.success && response.data?.stats) {
        setRoomStats(response.data.stats);
      }
    } catch (err) {
      console.error("Error fetching room stats:", err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "admitted":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "under-treatment":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "discharged":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "transferred":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "deceased":
        return "bg-slate-50 text-slate-700 border-slate-200";
      case "absconded":
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
            <p className="text-slate-600">Loading IPD dashboard...</p>
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
              <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">IPD Dashboard</h1>
              <p className="mt-1 text-xs text-slate-600 sm:mt-1.5 sm:text-sm">
                Overview of Inpatient Department activities
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              {doctors.length > 0 && (
                <select
                  value={selectedDoctor}
                  onChange={(e) => setSelectedDoctor(e.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                >
                  <option value="">All Doctors</option>
                  {doctors.map((doctor) => (
                    <option key={doctor._id} value={doctor._id}>
                      {doctor.name}
                    </option>
                  ))}
                </select>
              )}
              {hasPermission(PERMISSIONS.IPD_CREATE) && (
                <button
                  onClick={() => navigate("/ipd/admit")}
                  className="w-full rounded-xl bg-indigo-700 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-500/30 transition hover:bg-indigo-800 hover:shadow-lg hover:shadow-indigo-500/40 sm:w-auto sm:px-5 sm:py-2.5"
                >
                  + Admit Patient
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-600">Current Admissions</p>
              <p className="mt-1 text-3xl font-bold text-slate-900">
                {stats?.currentAdmissions || 0}
              </p>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
              <p className="text-sm font-medium text-blue-700">Admitted</p>
              <p className="mt-1 text-3xl font-bold text-blue-900">{stats?.admitted || 0}</p>
            </div>
            <div className="rounded-xl border border-purple-200 bg-purple-50 p-5 shadow-sm">
              <p className="text-sm font-medium text-purple-700">Under Treatment</p>
              <p className="mt-1 text-3xl font-bold text-purple-900">
                {stats?.underTreatment || 0}
              </p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
              <p className="text-sm font-medium text-emerald-700">Discharged</p>
              <p className="mt-1 text-3xl font-bold text-emerald-900">{stats?.discharged || 0}</p>
            </div>
          </div>

          {/* Room Stats */}
          {roomStats && (
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-600">Total Beds</p>
                <p className="mt-1 text-3xl font-bold text-slate-900">{roomStats.totalBeds}</p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
                <p className="text-sm font-medium text-emerald-700">Available</p>
                <p className="mt-1 text-3xl font-bold text-emerald-900">
                  {roomStats.availableBeds}
                </p>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
                <p className="text-sm font-medium text-blue-700">Occupied</p>
                <p className="mt-1 text-3xl font-bold text-blue-900">{roomStats.occupiedBeds}</p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
                <p className="text-sm font-medium text-amber-700">Occupancy Rate</p>
                <p className="mt-1 text-3xl font-bold text-amber-900">
                  {roomStats.occupancyRate}%
                </p>
              </div>
            </div>
          )}

          {/* Current IPD Admissions */}
          <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Current Admissions</h2>
                <p className="mt-0.5 text-xs text-slate-600 sm:text-sm">
                  Patients currently admitted or under treatment
                </p>
              </div>
              {hasPermission(PERMISSIONS.IPD_VIEW) && (
                <button
                  onClick={() => navigate("/ipd")}
                  className="w-full rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100 sm:w-auto sm:px-5 sm:py-2.5 sm:text-sm"
                >
                  View All IPD Records
                </button>
              )}
            </div>
            <div className="p-4 sm:p-6">
              {ipdRecords.length === 0 ? (
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
                  <p className="text-sm text-slate-600">No current admissions</p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <table className="w-full min-w-[640px]">
                    <thead className="border-b border-slate-200 bg-slate-50/80">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 sm:px-6 sm:py-4">
                          IPD No.
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 sm:px-6 sm:py-4">
                          Patient
                        </th>
                        <th className="hidden px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 sm:table-cell sm:px-6 sm:py-4">
                          Doctor
                        </th>
                        <th className="hidden px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 sm:table-cell sm:px-6 sm:py-4">
                          Room/Bed
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
                      {ipdRecords.map((ipd) => (
                        <tr key={ipd._id} className="transition-colors hover:bg-slate-50/50">
                          <td className="whitespace-nowrap px-4 py-3 sm:px-6 sm:py-4">
                            <div className="text-sm font-medium text-indigo-700">
                              {ipd.ipdNumber}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 sm:px-6 sm:py-4">
                            <div className="text-sm font-medium text-slate-900">
                              {ipd.patientId.name} ({ipd.patientId.patientId})
                            </div>
                            <div className="text-xs text-slate-500">{ipd.patientId.phone}</div>
                          </td>
                          <td className="hidden whitespace-nowrap px-4 py-3 text-sm text-slate-600 sm:table-cell sm:px-6 sm:py-4">
                            {ipd.doctorId.name}
                          </td>
                          <td className="hidden whitespace-nowrap px-4 py-3 text-sm text-slate-600 sm:table-cell sm:px-6 sm:py-4">
                            {ipd.roomNumber && ipd.bedNumber
                              ? `${ipd.roomNumber} / ${ipd.bedNumber}`
                              : "Not Assigned"}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 sm:px-6 sm:py-4">
                            <span
                              className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-semibold ${getStatusColor(
                                ipd.status
                              )}`}
                            >
                              {ipd.status.replace("-", " ").toUpperCase()}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right sm:px-6 sm:py-4">
                            {hasPermission(PERMISSIONS.IPD_VIEW) && (
                              <button
                                onClick={() => navigate(`/ipd/${ipd._id}`)}
                                className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
                              >
                                View
                              </button>
                            )}
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
    </div>
  );
}

export default IPDDashboard;
