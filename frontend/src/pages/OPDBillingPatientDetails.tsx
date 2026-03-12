import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { patientsAPI, opdAPI, usersAPI } from "../utils/api";
import { canAccessRoute } from "../utils/permissions";
import { showError } from "../utils/toast";

type Transaction = {
  _id: string;
  type: string;
  number: string;
  date: string;
  createdBy: string;
  amount: number;
  modeOfPayment?: string;
  refNo?: string;
};

type PatientData = {
  _id: string;
  patientId: string;
  name: string;
  gender: string;
  dateOfBirth: string;
  phone: string;
};

function OPDBillingPatientDetails() {
  const navigate = useNavigate();
  const { patientId } = useParams<{ patientId: string }>();
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<PatientData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [financialSummary, setFinancialSummary] = useState({
    netAmount: 0,
    amountPaid: 0,
    creditNotes: 0,
    refund: 0,
    balanceToPay: 0,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  useEffect(() => {
    if (patientId) {
      checkAuth();
      fetchPatientDetails();
      fetchTransactions();
    }
  }, [patientId]);

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

  const fetchPatientDetails = async () => {
    if (!patientId) return;
    
    try {
      const response = await patientsAPI.getById(patientId);
      if (response.success && response.data?.patient) {
        const patientData = response.data.patient;
        setPatient({
          _id: patientData._id,
          patientId: patientData.patientId,
          name: patientData.name,
          gender: patientData.gender,
          dateOfBirth: patientData.dateOfBirth,
          phone: patientData.phone,
        });
      }
    } catch (err) {
      console.error("Error fetching patient:", err);
      showError("Failed to fetch patient details");
    }
  };

  const fetchTransactions = async () => {
    if (!patientId) return;

    try {
      setLoading(true);
      
      const [opdResponse, usersResponse, billingResponse] = await Promise.all([
        opdAPI.getAll({ patientId }),
        usersAPI.getAll(),
        patientsAPI.getBillingInformation(patientId, { type: "all" }),
      ]);

      const opdRecords = opdResponse.success ? (opdResponse.data?.opdRecords || []) : [];

      const users = usersResponse.success ? (usersResponse.data?.users || []) : [];
      const userMap = new Map<string, string>(
        users.map((u: any) => [String(u._id), String(u.name || "")])
      );

      const billingInfo = billingResponse?.success ? billingResponse.data : null;

      // Convert OPD records to transactions
      const transactionList: Transaction[] = [];
      
      opdRecords.forEach((opd: any) => {
        // Cash Memo / Invoice transaction
        if (opd.totalAmount > 0) {
          const isCashMemo =
            opd.billingDocumentType === "cash_memo" || !!opd.cashMemoNumber;

          transactionList.push({
            _id: opd._id,
            type: isCashMemo ? "Cash Memo" : "Invoice",
            number:
              (isCashMemo ? opd.cashMemoNumber : opd.invoiceNumber) ||
              opd.opdNumber ||
              `${isCashMemo ? "CM" : "INV"}-${opd._id.slice(-6)}`,
            date: opd.visitDate,
            createdBy: opd.createdBy
              ? userMap.get(String(opd.createdBy?._id || opd.createdBy)) || "N/A"
              : "N/A",
            amount: opd.totalAmount,
            modeOfPayment: opd.paymentMethod || "-",
            refNo: opd.paymentDate ? new Date(opd.paymentDate).toISOString().split('T')[0] : "-",
          });
        }

        // Payment transaction (if paid)
        if (opd.paidAmount > 0) {
          transactionList.push({
            _id: `${opd._id}-payment`,
            type: "Receipt",
            number: `RCP-${opd.opdNumber?.slice(-6) || opd._id.slice(-6)}`,
            date: opd.paymentDate || opd.visitDate,
            createdBy: opd.updatedBy
              ? userMap.get(String(opd.updatedBy?._id || opd.updatedBy)) || "N/A"
              : "N/A",
            amount: opd.paidAmount,
            modeOfPayment: opd.paymentMethod || "-",
            refNo: opd.paymentDate ? new Date(opd.paymentDate).toISOString().split('T')[0] : "-",
          });
        }

        // Refunds (if any)
        if (Array.isArray(opd.refunds) && opd.refunds.length > 0) {
          opd.refunds.forEach((r: any, idx: number) => {
            transactionList.push({
              _id: `${opd._id}-refund-${idx}`,
              type: "Refund",
              number: `RF-${opd.opdNumber?.slice(-6) || opd._id.slice(-6)}`,
              date: r.refundedAt || opd.visitDate,
              createdBy: r.refundedBy
                ? userMap.get(String(r.refundedBy?._id || r.refundedBy)) || "N/A"
                : "N/A",
              amount: -(Number(r.amount || 0)),
              modeOfPayment: r.method || "-",
              refNo: r.referenceNo || "-",
            });
          });
        }
      });

      // Patient-level transactions (Advance / Credit Note)
      const patientTransactions = billingInfo?.patientTransactions || [];
      patientTransactions.forEach((t: any, idx: number) => {
        const isAdvance = t.transactionType === "advance";
        transactionList.push({
          _id: t._id || `patient-tx-${idx}`,
          type: isAdvance ? "Billing Advance" : "Credit Notes",
          number: t.referenceNo || (isAdvance ? `ADV-${String(t._id || idx).slice(-6)}` : `CN-${String(t._id || idx).slice(-6)}`),
          date: t.transactionDate || t.createdAt || new Date().toISOString(),
          createdBy: t.createdBy?.name || "N/A",
          amount: isAdvance ? Number(t.amount || 0) : -Number(t.amount || 0),
          modeOfPayment: t.method || "-",
          refNo: t.referenceNo || "-",
        });
      });

      // Sort by date (newest first)
      transactionList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setTransactions(transactionList);

      // Calculate financial summary
      const overall = billingInfo?.summary?.overall;
      const netAmount = Number(overall?.total || 0);
      const creditNotes = Number(overall?.creditNoteTotal || 0);
      const advanceTotal = Number(overall?.advanceTotal || 0);
      const amountPaid = Number(overall?.paid || 0) + advanceTotal;
      const refund = opdRecords.reduce(
        (sum: number, opd: any) =>
          sum + (Array.isArray(opd.refunds) ? opd.refunds.reduce((s: number, r: any) => s + Number(r.amount || 0), 0) : 0),
        0
      );
      const balanceToPay = Number(overall?.pending || 0);

      setFinancialSummary({
        netAmount,
        amountPaid,
        creditNotes,
        refund,
        balanceToPay,
      });
    } catch (err) {
      console.error("Error fetching transactions:", err);
      showError("Failed to fetch transaction history");
    } finally {
      setLoading(false);
    }
  };

  const transactionTypeCards = useMemo(() => {
    const defs = [
      { key: "Cash Memo", label: "Cash Memo", tone: "green" as const },
      { key: "Invoice", label: "Invoice", tone: "indigo" as const },
      { key: "Receipt", label: "Receipt", tone: "blue" as const },
      { key: "Billing Advance", label: "Billing Advance", tone: "emerald" as const },
      { key: "Credit Notes", label: "Credit Notes", tone: "orange" as const },
      { key: "Refund", label: "Refund", tone: "rose" as const },
    ];

    const grouped = new Map<string, { count: number; total: number }>();
    defs.forEach((d) => grouped.set(d.key, { count: 0, total: 0 }));

    transactions.forEach((t) => {
      const bucket = grouped.get(t.type);
      if (!bucket) return;
      bucket.count += 1;
      bucket.total += Math.abs(Number(t.amount || 0));
    });

    const toneClasses: Record<
      string,
      { border: string; bg: string; text: string; value: string }
    > = {
      green: { border: "border-green-200", bg: "bg-green-50", text: "text-green-700", value: "text-green-600" },
      indigo: { border: "border-indigo-200", bg: "bg-indigo-50", text: "text-indigo-700", value: "text-indigo-600" },
      blue: { border: "border-blue-200", bg: "bg-blue-50", text: "text-blue-700", value: "text-blue-600" },
      emerald: { border: "border-emerald-200", bg: "bg-emerald-50", text: "text-emerald-700", value: "text-emerald-600" },
      orange: { border: "border-orange-200", bg: "bg-orange-50", text: "text-orange-700", value: "text-orange-600" },
      rose: { border: "border-rose-200", bg: "bg-rose-50", text: "text-rose-700", value: "text-rose-600" },
    };

    return defs.map((d) => {
      const data = grouped.get(d.key) || { count: 0, total: 0 };
      const cls = toneClasses[d.tone];
      return { ...d, ...data, cls };
    });
  }, [transactions]);

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    let days = today.getDate() - birthDate.getDate();

    if (days < 0) {
      months--;
      const lastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      days += lastMonth.getDate();
    }

    if (months < 0) {
      years--;
      months += 12;
    }

    return `${years}y,${months}d`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const handlePrint = () => {
    window.print();
  };

  const paginatedTransactions = transactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(transactions.length / itemsPerPage);

  if (loading && !patient) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <div className="flex flex-1 items-center justify-center sidebar-content-margin">
          <div className="text-center">
            <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
            <p className="text-slate-600">Loading patient details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <div className="flex flex-1 items-center justify-center sidebar-content-margin">
          <div className="text-center">
            <p className="text-slate-600">Patient not found</p>
            <button
              onClick={() => navigate("/opd/billing/overview")}
              className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
            >
              Back to Overview
            </button>
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
                onClick={() => navigate("/opd/billing/overview")}
                className="rounded-lg p-1.5 text-slate-600 transition hover:bg-slate-100"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">View Details</h1>
                <p className="mt-0.5 text-sm text-slate-600">
                  {patient.name}, {patient.patientId}
                </p>
              </div>
            </div>
            {/* Actions moved below Balance To Pay */}
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {/* Patient Information Card */}
          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1">
                <h2 className="text-lg font-bold text-slate-900">
                  {patient.name} | {patient.gender === "male" ? "Male" : patient.gender === "female" ? "Female" : "Other"} • {calculateAge(patient.dateOfBirth)}
                </h2>
                <div className="mt-2 flex items-center gap-2 text-slate-600">
                  <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span className="text-sm">{patient.phone}</span>
                </div>
              </div>
              <div className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-4">
                <p className="text-xs font-medium text-slate-600">Balance To Pay:</p>
                <p className="mt-1 text-2xl font-bold text-indigo-600">
                  ₹{financialSummary.balanceToPay.toFixed(2)}
                </p>
                {/* Add Transaction Row (all types visible) */}
                {/* <div className="mt-4 border-t border-slate-200 pt-4">
                  <p className="text-xs font-semibold text-slate-700 mb-2">Add Transaction:</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => navigate(`/opd/billing/cash-memo?patientId=${patientId}&action=add`)}
                      className="rounded-full bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 ring-1 ring-green-200 transition hover:bg-green-100"
                    >
                      + Cash Memo
                    </button>
                    <button
                      onClick={() => navigate(`/opd/billing/invoice?patientId=${patientId}&action=add`)}
                      className="rounded-full bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700 ring-1 ring-orange-200 transition hover:bg-orange-100"
                    >
                      + Invoice
                    </button>
                    <button
                      onClick={() => navigate(`/opd/billing/receipt?patientId=${patientId}&action=add`)}
                      className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 ring-1 ring-blue-200 transition hover:bg-blue-100"
                    >
                      + Receipt
                    </button>
                    <button
                      onClick={() => navigate(`/opd/billing/advance?patientId=${patientId}&action=add`)}
                      className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 transition hover:bg-emerald-100"
                    >
                      + Advance
                    </button>
                    <button
                      onClick={() => navigate(`/opd/billing/credit-notes?patientId=${patientId}&action=add`)}
                      className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-200 transition hover:bg-amber-100"
                    >
                      + Credit Note
                    </button>
                    <button
                      onClick={() => navigate(`/opd/billing/refund?patientId=${patientId}&action=add`)}
                      className="rounded-full bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 ring-1 ring-rose-200 transition hover:bg-rose-100"
                    >
                      + Refund
                    </button>
                  </div>
                </div> */}
              </div>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5">
              <p className="text-sm font-medium text-indigo-700">Net Amount</p>
              <p className="mt-2 text-2xl font-bold text-indigo-600">
                ₹{financialSummary.netAmount.toFixed(2)}
              </p>
            </div>
            <div className="rounded-xl border border-green-200 bg-green-50 p-5">
              <p className="text-sm font-medium text-green-700">Amount Paid</p>
              <p className="mt-2 text-2xl font-bold text-green-600">
                ₹{financialSummary.amountPaid.toFixed(2)}
              </p>
            </div>
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-5">
              <p className="text-sm font-medium text-orange-700">Credit Notes</p>
              <p className="mt-2 text-2xl font-bold text-orange-600">
                ₹{financialSummary.creditNotes.toFixed(2)}
              </p>
            </div>
            <div className="rounded-xl border border-pink-200 bg-pink-50 p-5">
              <p className="text-sm font-medium text-pink-700">Refund</p>
              <p className="mt-2 text-2xl font-bold text-red-600">
                ₹{financialSummary.refund.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Transaction Type Summary */}
          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-900">Transaction Type Summary</h3>
              <p className="text-xs text-slate-500">Count + total per type</p>
            </div>
            <div className="-mx-4 overflow-x-auto px-4">
              <div className="flex min-w-max gap-3 pb-1">
                {transactionTypeCards.map((c) => (
                  <div
                    key={c.key}
                    className={`w-56 shrink-0 rounded-xl border ${c.cls.border} ${c.cls.bg} p-4`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className={`text-sm font-medium ${c.cls.text}`}>{c.label}</p>
                        <p className={`mt-2 text-xl font-bold ${c.cls.value}`}>₹{c.total.toFixed(2)}</p>
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${c.cls.bg} ${c.cls.text} ${c.cls.border}`}
                      >
                        {c.count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Transaction History */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-lg font-bold text-slate-900">Transaction History</h3>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    <span>Filter By</span>
                  </div>
                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Print
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-indigo-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                      No. #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                      No
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                      Created By
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-700">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                      Mode of Payment
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-700">
                      Ref No
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-700">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {paginatedTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-sm text-slate-600">
                        No transactions found
                      </td>
                    </tr>
                  ) : (
                    paginatedTransactions.map((transaction, index) => (
                      (() => {
                        const isNegative =
                          transaction.amount < 0 ||
                          transaction.type === "Refund" ||
                          transaction.type === "Credit Notes";
                        const isPositive =
                          transaction.amount > 0 &&
                          (transaction.type === "Receipt" || transaction.type === "Billing Advance");

                        const amountClass = isNegative
                          ? "text-red-600"
                          : isPositive
                          ? "text-green-600"
                          : "text-slate-900";

                        const pillClass = isNegative
                          ? "bg-red-50 text-red-700 ring-red-200"
                          : isPositive
                          ? "bg-green-50 text-green-700 ring-green-200"
                          : "bg-slate-50 text-slate-700 ring-slate-200";

                        return (
                      <tr key={transaction._id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm text-slate-900">
                          {(currentPage - 1) * itemsPerPage + index + 1}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-900">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${pillClass}`}>
                            {transaction.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-slate-900">{transaction.number}</td>
                        <td className="px-4 py-3 text-sm text-slate-900">{formatDate(transaction.date)}</td>
                        <td className="px-4 py-3 text-sm text-slate-900">{transaction.createdBy}</td>
                        <td className={`px-4 py-3 text-right text-sm font-semibold ${amountClass}`}>
                          {transaction.amount < 0 ? "-" : ""}₹{Math.abs(transaction.amount).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-900 capitalize">
                          {transaction.modeOfPayment || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-900">{transaction.refNo || "-"}</td>
                        <td className="px-4 py-3 text-center">
                          <button className="rounded-lg p-1.5 text-slate-600 transition hover:bg-slate-100">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                        );
                      })()
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {transactions.length > 0 && (
              <div className="border-t border-slate-200 px-6 py-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-slate-600">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                    {Math.min(currentPage * itemsPerPage, transactions.length)} of {transactions.length} entries
                  </div>
                  <div className="flex items-center gap-3">
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Previous
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                            currentPage === page
                              ? "bg-indigo-600 text-white"
                              : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                      <button
                        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default OPDBillingPatientDetails;
