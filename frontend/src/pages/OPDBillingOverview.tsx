import { useEffect, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { patientsAPI, opdAPI } from "../utils/api";
import { canAccessRoute } from "../utils/permissions";
import { showError } from "../utils/toast";

type PatientBilling = {
  _id: string;
  patientId: string;
  name: string;
  phone: string;
  dateOfBirth: string;
  balance: number;
};

function OPDBillingOverview() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<PatientBilling[]>([]);
  const [filter, setFilter] = useState<"all" | "overdue" | "credit">("all");
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");

  useEffect(() => {
    checkAuth();
    fetchPatientBilling();
  }, [filter]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchPatientBilling();
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const checkAuth = () => {
    const token =
      localStorage.getItem("proclinic_token") ||
      sessionStorage.getItem("proclinic_token");
    if (!token) {
      navigate("/login");
      return;
    }
    if (!canAccessRoute("/opd/billing")) {
      navigate("/dashboard");
    }
  };

  const fetchPatientBilling = async () => {
    try {
      setLoading(true);
      
      // Fetch all patients
      const patientsResponse = await patientsAPI.getAll({});
      if (!patientsResponse.success) {
        throw new Error("Failed to fetch patients");
      }

      const allPatients = patientsResponse.data?.patients || [];
      
      // Fetch all OPD records to calculate balances
      const opdResponse = await opdAPI.getAll({});
      const opdRecords = opdResponse.success ? (opdResponse.data?.opdRecords || []) : [];

      // Calculate balance for each patient
      const patientBillingData: PatientBilling[] = allPatients.map((patient: any) => {
        const patientOpdRecords = opdRecords.filter(
          (opd: any) => opd.patientId?._id === patient._id || opd.patientId === patient._id
        );
        
        const totalAmount = patientOpdRecords.reduce(
          (sum: number, opd: any) => sum + (opd.totalAmount || 0),
          0
        );
        const paidAmount = patientOpdRecords.reduce(
          (sum: number, opd: any) => sum + (opd.paidAmount || 0),
          0
        );
        const balance = totalAmount - paidAmount;

        return {
          _id: patient._id,
          patientId: patient.patientId,
          name: patient.name,
          phone: patient.phone,
          dateOfBirth: patient.dateOfBirth,
          balance: balance,
        };
      });

      // Apply filters
      let filteredPatients = patientBillingData;
      
      if (filter === "overdue") {
        filteredPatients = patientBillingData.filter((p) => p.balance > 0);
      } else if (filter === "credit") {
        filteredPatients = patientBillingData.filter((p) => p.balance < 0);
      }

      // Apply search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filteredPatients = filteredPatients.filter(
          (p) =>
            p.patientId.toLowerCase().includes(query) ||
            p.name.toLowerCase().includes(query) ||
            p.phone.includes(query)
        );
      }

      // Sort by balance (overdue first, then by balance descending)
      filteredPatients.sort((a, b) => {
        if (a.balance > 0 && b.balance <= 0) return -1;
        if (a.balance <= 0 && b.balance > 0) return 1;
        return b.balance - a.balance;
      });

      setPatients(filteredPatients);
    } catch (err) {
      console.error("Error fetching patient billing:", err);
      showError("Failed to fetch patient billing data");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    // Create CSV content
    const headers = ["No.", "Patient ID", "Patient Name", "Phone No.", "Date of Birth", "Balance"];
    const rows = patients.map((patient, index) => [
      index + 1,
      patient.patientId,
      patient.name,
      patient.phone,
      new Date(patient.dateOfBirth).toLocaleDateString("en-IN"),
      `₹${patient.balance.toFixed(2)}`,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    // Create blob and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `opd-billing-overview-${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <div className="flex flex-1 items-center justify-center sidebar-content-margin">
          <div className="text-center">
            <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
            <p className="text-slate-600">Loading overview...</p>
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
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/opd/billing")}
                className="rounded-lg p-1.5 text-slate-600 transition hover:bg-slate-100"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Overview</h1>
                <button className="rounded-lg p-1 text-slate-600 transition hover:bg-slate-100">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {/* Filters */}
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <button
              onClick={() => setFilter("all")}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                filter === "all"
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-indigo-600 border border-indigo-300 hover:bg-indigo-50"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("overdue")}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                filter === "overdue"
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-indigo-600 border border-indigo-300 hover:bg-indigo-50"
              }`}
            >
              Over Due Amount
            </button>
            <button
              onClick={() => setFilter("credit")}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                filter === "credit"
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-indigo-600 border border-indigo-300 hover:bg-indigo-50"
              }`}
            >
              Credit Amount
            </button>
          </div>

          {/* Search and Export */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 items-center gap-2">
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSearchParams({ search: e.target.value });
                  }}
                  placeholder="Search by Patient ID, Name, or Phone..."
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 pl-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
                <svg
                  className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
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
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSearchParams({});
                  }}
                  className="rounded-lg border border-slate-300 bg-white p-2 text-slate-600 transition hover:bg-slate-50"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            <button
              onClick={handleExport}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Export
            </button>
          </div>

          {/* Patient Billing Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full">
              <thead className="bg-indigo-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                    No. #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Patient ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Patient Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Phone No.
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Date of Birth
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Balance
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {patients.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-600">
                      No patients found
                    </td>
                  </tr>
                ) : (
                  patients.map((patient, index) => (
                    <tr key={patient._id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-900">{index + 1}</td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">{patient.patientId}</td>
                      <td className="px-4 py-3 text-sm text-slate-900">{patient.name}</td>
                      <td className="px-4 py-3 text-sm text-slate-900">{patient.phone}</td>
                      <td className="px-4 py-3 text-sm text-slate-900">{formatDate(patient.dateOfBirth)}</td>
                      <td className="px-4 py-3 text-right text-sm font-medium">
                        <span
                          className={patient.balance > 0 ? "text-red-600" : patient.balance < 0 ? "text-green-600" : "text-slate-900"}
                        >
                          ₹{patient.balance.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Link
                          to={`/opd/billing/patient/${patient._id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-700"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                          View
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  );
}

export default OPDBillingOverview;
