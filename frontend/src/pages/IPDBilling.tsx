import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { ipdAPI, usersAPI } from "../utils/api";
import { canAccessRoute, hasPermission, PERMISSIONS } from "../utils/permissions";
import { showSuccess, showError } from "../utils/toast";

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
    roomNumber: string;
    roomType: string;
  };
  admissionDate: string;
  dischargeDate?: string;
  status: string;
  roomCharges: number;
  medicationCharges: number;
  procedureCharges: number;
  labCharges: number;
  otherCharges: number;
  discount: number;
  totalAmount: number;
  paidAmount: number;
  paymentStatus: string;
  paymentMethod?: string;
  paymentDate?: string;
};

function IPDBilling() {
  const navigate = useNavigate();
  const [ipdRecords, setIpdRecords] = useState<IPDRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState<Array<{ _id: string; name: string }>>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<IPDRecord | null>(null);
  const [filters, setFilters] = useState({
    doctorId: "",
    paymentStatus: "",
    status: "",
    startDate: "",
    endDate: "",
  });
  const [paymentData, setPaymentData] = useState({
    paidAmount: "",
    paymentMethod: "cash",
  });
  const [stats, setStats] = useState({
    totalRevenue: 0,
    pendingAmount: 0,
    paidAmount: 0,
    totalRecords: 0,
  });

  useEffect(() => {
    checkAuth();
    fetchDoctors();
    fetchIPDRecords();
  }, []);

  useEffect(() => {
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
    if (!canAccessRoute("/ipd/billing")) {
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
      if (filters.paymentStatus) params.paymentStatus = filters.paymentStatus;
      if (filters.status) params.status = filters.status;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const response = await ipdAPI.getAll(params);
      if (response.success) {
        const records = response.data.ipdRecords || [];
        setIpdRecords(records);

        // Calculate statistics
        const totalRevenue = records.reduce((sum: number, r: IPDRecord) => sum + (r.totalAmount || 0), 0);
        const paidAmount = records.reduce((sum: number, r: IPDRecord) => sum + (r.paidAmount || 0), 0);
        const pendingAmount = records.reduce(
          (sum: number, r: IPDRecord) =>
            sum + ((r.totalAmount || 0) - (r.paidAmount || 0)),
          0
        );

        setStats({
          totalRevenue,
          pendingAmount,
          paidAmount,
          totalRecords: records.length,
        });
      }
    } catch (err) {
      console.error("Error fetching IPD records:", err);
      showError("Failed to fetch IPD records");
    } finally {
      setLoading(false);
    }
  };

  const handleProcessPayment = async () => {
    if (!selectedRecord) return;

    const paidAmount = parseFloat(paymentData.paidAmount);
    if (isNaN(paidAmount) || paidAmount <= 0) {
      showError("Please enter a valid payment amount");
      return;
    }

    if (paidAmount > selectedRecord.totalAmount - selectedRecord.paidAmount) {
      showError("Payment amount cannot exceed the remaining balance");
      return;
    }

    try {
      const newPaidAmount = selectedRecord.paidAmount + paidAmount;
      const response = await ipdAPI.processPayment(selectedRecord._id, {
        paidAmount: newPaidAmount,
        paymentMethod: paymentData.paymentMethod,
      });

      if (response.success) {
        showSuccess("Payment processed successfully");
        setShowPaymentModal(false);
        setSelectedRecord(null);
        setPaymentData({ paidAmount: "", paymentMethod: "cash" });
        fetchIPDRecords();
      } else {
        showError(response.message || "Failed to process payment");
      }
    } catch (err: any) {
      showError(err.message || "An error occurred");
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "partial":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "pending":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
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
            <p className="text-slate-600">Loading billing records...</p>
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
              <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">IPD Billing</h1>
              <p className="mt-1 text-xs text-slate-600 sm:mt-1.5 sm:text-sm">
                Manage IPD billing and payments
              </p>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {/* Statistics */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-600">Total Revenue</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">₹{stats.totalRevenue.toLocaleString()}</p>
              <p className="mt-1 text-xs text-slate-500">{stats.totalRecords} records</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
              <p className="text-sm font-medium text-emerald-700">Paid Amount</p>
              <p className="mt-1 text-2xl font-bold text-emerald-900">₹{stats.paidAmount.toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-red-200 bg-red-50 p-5 shadow-sm">
              <p className="text-sm font-medium text-red-700">Pending Amount</p>
              <p className="mt-1 text-2xl font-bold text-red-900">₹{stats.pendingAmount.toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
              <p className="text-sm font-medium text-blue-700">Collection Rate</p>
              <p className="mt-1 text-2xl font-bold text-blue-900">
                {stats.totalRevenue > 0
                  ? ((stats.paidAmount / stats.totalRevenue) * 100).toFixed(1)
                  : 0}
                %
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-5">
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
                value={filters.paymentStatus}
                onChange={(e) => setFilters({ ...filters, paymentStatus: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 px-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 sm:py-3"
              >
                <option value="">All Payment Status</option>
                <option value="paid">Paid</option>
                <option value="partial">Partial</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            <div>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 px-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 sm:py-3"
              >
                <option value="">All Status</option>
                <option value="admitted">Admitted</option>
                <option value="under-treatment">Under Treatment</option>
                <option value="discharged">Discharged</option>
                <option value="transferred">Transferred</option>
                <option value="deceased">Deceased</option>
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

          {/* Billing Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                    IPD #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Patient
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Doctor
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Room
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Admission Date
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Total Amount
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Paid Amount
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Balance
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Payment Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Status
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {ipdRecords.map((record) => {
                  const balance = record.totalAmount - record.paidAmount;
                  return (
                    <tr key={record._id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">
                        <Link
                          to={`/ipd/${record._id}`}
                          className="text-indigo-600 hover:text-indigo-800 hover:underline"
                        >
                          {record.ipdNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900">
                        <div>
                          <p className="font-medium">{record.patientId.name}</p>
                          <p className="text-xs text-slate-500">{record.patientId.patientId}</p>
                          <p className="text-xs text-slate-500">{record.patientId.phone}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900">{record.doctorId.name}</td>
                      <td className="px-4 py-3 text-sm text-slate-900">
                        {record.roomId ? (
                          <div>
                            <p className="font-medium">{record.roomId.roomNumber}</p>
                            <p className="text-xs text-slate-500 capitalize">{record.roomId.roomType}</p>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900">
                        {new Date(record.admissionDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                        ₹{record.totalAmount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-slate-900">
                        ₹{record.paidAmount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900">
                        ₹{balance.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${getPaymentStatusColor(
                            record.paymentStatus
                          )}`}
                        >
                          {record.paymentStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${getStatusColor(
                            record.status
                          )}`}
                        >
                          {record.status.replace("-", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {hasPermission(PERMISSIONS.IPD_BILLING) && balance > 0 && (
                          <button
                            onClick={() => {
                              setSelectedRecord(record);
                              setPaymentData({
                                paidAmount: balance.toString(),
                                paymentMethod: "cash",
                              });
                              setShowPaymentModal(true);
                            }}
                            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
                          >
                            Pay
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {ipdRecords.length === 0 && (
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
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="text-sm font-medium text-slate-600">No billing records found</p>
            </div>
          )}
        </main>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="px-4 py-3 sm:px-6 sm:py-4">
              <h2 className="text-base font-semibold text-slate-900 sm:text-lg">Process Payment</h2>
            </div>
            <div className="px-4 sm:px-6 sm:pb-6">
              <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="mb-2 flex justify-between text-sm">
                  <span className="text-slate-600">IPD Number:</span>
                  <span className="font-medium text-slate-900">{selectedRecord.ipdNumber}</span>
                </div>
                <div className="mb-2 flex justify-between text-sm">
                  <span className="text-slate-600">Patient:</span>
                  <span className="font-medium text-slate-900">{selectedRecord.patientId.name}</span>
                </div>
                <div className="mb-2 flex justify-between text-sm">
                  <span className="text-slate-600">Total Amount:</span>
                  <span className="font-medium text-slate-900">₹{selectedRecord.totalAmount.toLocaleString()}</span>
                </div>
                <div className="mb-2 flex justify-between text-sm">
                  <span className="text-slate-600">Paid Amount:</span>
                  <span className="font-medium text-slate-900">₹{selectedRecord.paidAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold">
                  <span className="text-slate-900">Balance:</span>
                  <span className="text-indigo-600">
                    ₹{(selectedRecord.totalAmount - selectedRecord.paidAmount).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Payment Amount *</label>
                  <input
                    type="number"
                    required
                    min="0.01"
                    max={selectedRecord.totalAmount - selectedRecord.paidAmount}
                    step="0.01"
                    value={paymentData.paidAmount}
                    onChange={(e) => setPaymentData({ ...paymentData, paidAmount: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="Enter payment amount"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Payment Method *</label>
                  <select
                    required
                    value={paymentData.paymentMethod}
                    onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="upi">UPI</option>
                    <option value="netbanking">Net Banking</option>
                    <option value="cheque">Cheque</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSelectedRecord(null);
                    setPaymentData({ paidAmount: "", paymentMethod: "cash" });
                  }}
                  className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleProcessPayment}
                  className="flex-1 rounded-lg bg-indigo-700 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-800"
                >
                  Process Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default IPDBilling;
