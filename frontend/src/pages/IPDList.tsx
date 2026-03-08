import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { ipdAPI, usersAPI } from "../utils/api";
import { canAccessRoute, hasPermission, PERMISSIONS } from "../utils/permissions";
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
  dischargeDate?: string;
  status: string;
  totalAmount: number;
  paidAmount: number;
  paymentStatus: string;
};

function IPDList() {
  const navigate = useNavigate();
  const [ipdRecords, setIpdRecords] = useState<IPDRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState<Array<{ _id: string; name: string }>>([]);
  const [filters, setFilters] = useState({
    doctorId: "",
    status: "",
    startDate: "",
    endDate: "",
    paymentStatus: "",
  });
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    checkAuth();
    fetchDoctors();
    fetchIPDRecords();
  }, [filters]);

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

  const fetchIPDRecords = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filters.doctorId) params.doctorId = filters.doctorId;
      if (filters.status) params.status = filters.status;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.paymentStatus) params.paymentStatus = filters.paymentStatus;

      const response = await ipdAPI.getAll(params);
      if (response.success) {
        setIpdRecords(response.data.ipdRecords);
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

  const filteredRecords = ipdRecords.filter((record) => {
    const query = searchQuery.toLowerCase().trim();
    return (
      record.ipdNumber.toLowerCase().includes(query) ||
      record.patientId.name.toLowerCase().includes(query) ||
      record.patientId.patientId.toLowerCase().includes(query) ||
      record.patientId.phone.includes(query) ||
      (record.doctorId.name && record.doctorId.name.toLowerCase().includes(query)) ||
      (record.roomNumber && record.roomNumber.toLowerCase().includes(query))
    );
  });

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
            <p className="text-slate-600">Loading IPD records...</p>
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
              <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">IPD Records</h1>
              <p className="mt-1 text-xs text-slate-600 sm:mt-1.5 sm:text-sm">
                View and manage all Inpatient Department records
              </p>
            </div>
            {hasPermission(PERMISSIONS.IPD_CREATE) && (
              <button
                onClick={() => navigate("/ipd/admit")}
                className="w-full rounded-xl bg-indigo-700 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-500/30 transition hover:bg-indigo-800 hover:shadow-lg hover:shadow-indigo-500/40 sm:w-auto sm:px-5 sm:py-2.5"
              >
                + Admit Patient
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {/* Filters and Search */}
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <div className="relative lg:col-span-2">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <svg
                  className="h-5 w-5 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search by IPD No., patient name, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 sm:py-3"
              />
            </div>
            <div>
              <select
                value={filters.doctorId}
                onChange={(e) => setFilters({ ...filters, doctorId: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 px-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 sm:py-3"
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
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 px-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 sm:py-3"
              >
                <option value="">All Statuses</option>
                <option value="admitted">Admitted</option>
                <option value="under-treatment">Under Treatment</option>
                <option value="discharged">Discharged</option>
                <option value="transferred">Transferred</option>
                <option value="deceased">Deceased</option>
                <option value="absconded">Absconded</option>
              </select>
            </div>
            <div>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                placeholder="Start Date"
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 px-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 sm:py-3"
              />
            </div>
            <div>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                placeholder="End Date"
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 px-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 sm:py-3"
              />
            </div>
          </div>

          {/* IPD Records Table */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full min-w-[800px]">
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
                    <th className="hidden px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 md:table-cell sm:px-6 sm:py-4">
                      Room/Bed
                    </th>
                    <th className="hidden px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 sm:table-cell sm:px-6 sm:py-4">
                      Admission Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 sm:px-6 sm:py-4">
                      Status
                    </th>
                    <th className="hidden px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-600 lg:table-cell sm:px-6 sm:py-4">
                      Payment
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-600 sm:px-6 sm:py-4">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredRecords.length === 0 ? (
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
                          <p className="text-sm font-medium text-slate-600">No IPD records found</p>
                          <p className="mt-1 text-xs text-slate-500">
                            Try adjusting your filters or admit a new patient
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((record) => (
                      <tr
                        key={record._id}
                        className="cursor-pointer transition-colors hover:bg-slate-50/50"
                        onClick={() => navigate(`/ipd/${record._id}`)}
                      >
                        <td className="whitespace-nowrap px-4 py-3 sm:px-6 sm:py-4">
                          <div className="text-sm font-semibold text-indigo-700">
                            {record.ipdNumber}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 sm:px-6 sm:py-4">
                          <div className="text-sm font-medium text-slate-900">
                            {record.patientId.name} ({record.patientId.patientId})
                          </div>
                          <div className="text-xs text-slate-500">{record.patientId.phone}</div>
                        </td>
                        <td className="hidden whitespace-nowrap px-4 py-3 text-sm text-slate-600 sm:table-cell sm:px-6 sm:py-4">
                          {record.doctorId.name}
                        </td>
                        <td className="hidden whitespace-nowrap px-4 py-3 text-sm text-slate-600 md:table-cell sm:px-6 sm:py-4">
                          {record.roomNumber && record.bedNumber
                            ? `${record.roomNumber} / ${record.bedNumber}`
                            : "Not Assigned"}
                        </td>
                        <td className="hidden whitespace-nowrap px-4 py-3 text-sm text-slate-600 sm:table-cell sm:px-6 sm:py-4">
                          {new Date(record.admissionDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 sm:px-6 sm:py-4">
                          <span
                            className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-semibold ${getStatusColor(
                              record.status
                            )}`}
                          >
                            {record.status.replace("-", " ").toUpperCase()}
                          </span>
                        </td>
                        <td className="hidden whitespace-nowrap px-4 py-3 text-right lg:table-cell sm:px-6 sm:py-4">
                          <div className="text-sm font-medium text-slate-900">
                            ₹{record.totalAmount.toFixed(2)}
                          </div>
                          <span
                            className={`inline-flex rounded-lg border px-2 py-0.5 text-[10px] font-semibold ${getPaymentStatusColor(
                              record.paymentStatus
                            )}`}
                          >
                            {record.paymentStatus.toUpperCase()}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right sm:px-6 sm:py-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/ipd/${record._id}`);
                            }}
                            className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
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

export default IPDList;
