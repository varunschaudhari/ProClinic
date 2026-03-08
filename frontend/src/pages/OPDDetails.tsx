import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { opdAPI } from "../utils/api";
import { hasPermission, PERMISSIONS } from "../utils/permissions";
import { showSuccess, showError } from "../utils/toast";

type OPDRecord = {
  _id: string;
  opdNumber: string;
  patientId: {
    _id: string;
    name: string;
    patientId: string;
    phone: string;
    email?: string;
  };
  doctorId: {
    _id: string;
    name: string;
  };
  visitDate: string;
  visitTime: string;
  status: string;
  queueNumber: number;
  chiefComplaint?: string;
  diagnosis?: string;
  treatment?: string;
  prescription?: string;
  notes?: string;
  consultationFee: number;
  additionalCharges: number;
  discount: number;
  totalAmount: number;
  paidAmount: number;
  paymentStatus: string;
  paymentMethod?: string;
  paymentDate?: string;
  followUpRequired: boolean;
  followUpDate?: string;
  labTests?: Array<{
    testName: string;
    testFee: number;
    status: string;
  }>;
};

function OPDDetails() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [opdRecord, setOpdRecord] = useState<OPDRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [formData, setFormData] = useState({
    diagnosis: "",
    treatment: "",
    prescription: "",
    notes: "",
    followUpRequired: false,
    followUpDate: "",
  });
  const [paymentData, setPaymentData] = useState({
    paidAmount: "",
    paymentMethod: "cash",
  });

  useEffect(() => {
    if (id) {
      fetchOPDRecord();
    }
  }, [id]);

  const fetchOPDRecord = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const response = await opdAPI.getById(id);
      if (response.success) {
        const record = response.data.opdRecord;
        setOpdRecord(record);
        setFormData({
          diagnosis: record.diagnosis || "",
          treatment: record.treatment || "",
          prescription: record.prescription || "",
          notes: record.notes || "",
          followUpRequired: record.followUpRequired || false,
          followUpDate: record.followUpDate
            ? new Date(record.followUpDate).toISOString().split("T")[0]
            : "",
        });
        setPaymentData({
          paidAmount: record.totalAmount.toString(),
          paymentMethod: record.paymentMethod || "cash",
        });
      } else {
        showError("Failed to fetch OPD record");
        setTimeout(() => navigate("/opd/dashboard"), 2000);
      }
    } catch (err) {
      showError("Error loading OPD record");
      console.error(err);
      setTimeout(() => navigate("/opd/dashboard"), 2000);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    try {
      const response = await opdAPI.update(id, {
        ...formData,
        followUpDate: formData.followUpDate || undefined,
      });

      if (response.success) {
        showSuccess("OPD record updated successfully");
        setIsEditing(false);
        fetchOPDRecord();
      } else {
        showError(response.message || "Failed to update OPD record");
      }
    } catch (err) {
      showError("Error updating OPD record");
      console.error(err);
    }
  };

  const handleStatusUpdate = async (status: string) => {
    if (!id) return;
    try {
      const response = await opdAPI.updateStatus(id, status);
      if (response.success) {
        showSuccess("Status updated successfully");
        fetchOPDRecord();
      } else {
        showError(response.message || "Failed to update status");
      }
    } catch (err) {
      showError("Error updating status");
      console.error(err);
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    try {
      const response = await opdAPI.processPayment(id, {
        paidAmount: parseFloat(paymentData.paidAmount),
        paymentMethod: paymentData.paymentMethod,
      });

      if (response.success) {
        showSuccess("Payment processed successfully");
        setShowPaymentModal(false);
        fetchOPDRecord();
      } else {
        showError(response.message || "Failed to process payment");
      }
    } catch (err) {
      showError("Error processing payment");
      console.error(err);
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

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <div className="flex flex-1 items-center justify-center sidebar-content-margin">
          <div className="text-center">
            <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
            <p className="text-slate-600">Loading OPD record...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!opdRecord) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <div className="flex flex-1 items-center justify-center sidebar-content-margin">
          <div className="text-center">
            <p className="text-slate-600">OPD record not found</p>
            <Link
              to="/opd/dashboard"
              className="mt-4 inline-block text-indigo-600 hover:text-indigo-700"
            >
              Back to OPD Dashboard
            </Link>
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
            <div className="flex items-center gap-2 sm:gap-4">
              <Link
                to="/opd/dashboard"
                className="rounded-lg p-1.5 text-slate-600 transition hover:bg-slate-100 sm:p-2"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
              </Link>
              <div>
                <h1 className="text-lg font-bold text-slate-900 sm:text-xl lg:text-2xl">
                  {opdRecord.opdNumber}
                </h1>
                <p className="mt-0.5 text-xs text-slate-600 sm:mt-1.5 sm:text-sm">
                  {opdRecord.patientId.name} • {opdRecord.doctorId.name}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              {!isEditing && hasPermission(PERMISSIONS.OPD_EDIT) && (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="w-full rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100 sm:w-auto sm:px-5 sm:py-2.5 sm:text-sm"
                  >
                    Edit
                  </button>
                  {opdRecord.status !== "completed" && opdRecord.status !== "cancelled" && (
                    <div className="flex gap-2">
                      {opdRecord.status === "registered" && (
                        <button
                          onClick={() => handleStatusUpdate("waiting")}
                          className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-2 text-xs font-semibold text-yellow-700 transition hover:border-yellow-300 hover:bg-yellow-100 sm:px-5 sm:py-2.5 sm:text-sm"
                        >
                          Move to Waiting
                        </button>
                      )}
                      {opdRecord.status === "waiting" && (
                        <button
                          onClick={() => handleStatusUpdate("in-progress")}
                          className="rounded-xl border border-purple-200 bg-purple-50 px-4 py-2 text-xs font-semibold text-purple-700 transition hover:border-purple-300 hover:bg-purple-100 sm:px-5 sm:py-2.5 sm:text-sm"
                        >
                          Start Consultation
                        </button>
                      )}
                      {opdRecord.status === "in-progress" && (
                        <button
                          onClick={() => handleStatusUpdate("completed")}
                          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100 sm:px-5 sm:py-2.5 sm:text-sm"
                        >
                          Complete
                        </button>
                      )}
                    </div>
                  )}
                  {opdRecord.paymentStatus !== "paid" && hasPermission(PERMISSIONS.OPD_BILLING) && (
                    <button
                      onClick={() => setShowPaymentModal(true)}
                      className="w-full rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white shadow-md transition hover:bg-emerald-800 sm:w-auto sm:px-5 sm:py-2.5 sm:text-sm"
                    >
                      Process Payment
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Main Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Patient & Visit Info */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-slate-900">Visit Information</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium text-slate-600">Patient</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {opdRecord.patientId.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {opdRecord.patientId.patientId} • {opdRecord.patientId.phone}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-600">Doctor</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {opdRecord.doctorId.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-600">Visit Date</p>
                    <p className="mt-1 text-sm text-slate-900">
                      {new Date(opdRecord.visitDate).toLocaleDateString("en-IN", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-600">Visit Time</p>
                    <p className="mt-1 text-sm text-slate-900">{opdRecord.visitTime}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-600">Queue Number</p>
                    <p className="mt-1 text-sm font-semibold text-indigo-700">
                      {opdRecord.queueNumber ? `#${opdRecord.queueNumber}` : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-600">Status</p>
                    <span
                      className={`mt-1 inline-flex rounded-lg border px-2.5 py-1 text-xs font-semibold ${getStatusColor(
                        opdRecord.status
                      )}`}
                    >
                      {opdRecord.status.replace("-", " ")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Chief Complaint */}
              {opdRecord.chiefComplaint && (
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="mb-2 text-lg font-semibold text-slate-900">Chief Complaint</h2>
                  <p className="text-sm text-slate-700">{opdRecord.chiefComplaint}</p>
                </div>
              )}

              {/* Medical Details */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">Medical Details</h2>
                  {!isEditing && hasPermission(PERMISSIONS.OPD_EDIT) && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="text-xs text-indigo-600 hover:text-indigo-700"
                    >
                      Edit
                    </button>
                  )}
                </div>
                {isEditing ? (
                  <form onSubmit={handleUpdate} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Diagnosis
                      </label>
                      <textarea
                        value={formData.diagnosis}
                        onChange={(e) =>
                          setFormData({ ...formData, diagnosis: e.target.value })
                        }
                        rows={3}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        placeholder="Enter diagnosis..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Treatment
                      </label>
                      <textarea
                        value={formData.treatment}
                        onChange={(e) =>
                          setFormData({ ...formData, treatment: e.target.value })
                        }
                        rows={3}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        placeholder="Enter treatment details..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Prescription
                      </label>
                      <textarea
                        value={formData.prescription}
                        onChange={(e) =>
                          setFormData({ ...formData, prescription: e.target.value })
                        }
                        rows={4}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        placeholder="Enter prescription..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
                      <textarea
                        value={formData.notes}
                        onChange={(e) =>
                          setFormData({ ...formData, notes: e.target.value })
                        }
                        rows={3}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        placeholder="Additional notes..."
                      />
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.followUpRequired}
                          onChange={(e) =>
                            setFormData({ ...formData, followUpRequired: e.target.checked })
                          }
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-200"
                        />
                        <span className="text-sm text-slate-700">Follow-up Required</span>
                      </label>
                      {formData.followUpRequired && (
                        <input
                          type="date"
                          value={formData.followUpDate}
                          onChange={(e) =>
                            setFormData({ ...formData, followUpDate: e.target.value })
                          }
                          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        />
                      )}
                    </div>
                    <div className="flex gap-2 pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditing(false);
                          fetchOPDRecord();
                        }}
                        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-800"
                      >
                        Save Changes
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    {opdRecord.diagnosis && (
                      <div>
                        <p className="text-xs font-medium text-slate-600">Diagnosis</p>
                        <p className="mt-1 text-sm text-slate-900">{opdRecord.diagnosis}</p>
                      </div>
                    )}
                    {opdRecord.treatment && (
                      <div>
                        <p className="text-xs font-medium text-slate-600">Treatment</p>
                        <p className="mt-1 text-sm text-slate-900 whitespace-pre-wrap">
                          {opdRecord.treatment}
                        </p>
                      </div>
                    )}
                    {opdRecord.prescription && (
                      <div>
                        <p className="text-xs font-medium text-slate-600">Prescription</p>
                        <p className="mt-1 text-sm text-slate-900 whitespace-pre-wrap">
                          {opdRecord.prescription}
                        </p>
                      </div>
                    )}
                    {opdRecord.notes && (
                      <div>
                        <p className="text-xs font-medium text-slate-600">Notes</p>
                        <p className="mt-1 text-sm text-slate-900 whitespace-pre-wrap">
                          {opdRecord.notes}
                        </p>
                      </div>
                    )}
                    {opdRecord.followUpRequired && (
                      <div>
                        <p className="text-xs font-medium text-slate-600">Follow-up Date</p>
                        <p className="mt-1 text-sm text-slate-900">
                          {opdRecord.followUpDate
                            ? new Date(opdRecord.followUpDate).toLocaleDateString("en-IN")
                            : "Not set"}
                        </p>
                      </div>
                    )}
                    {!opdRecord.diagnosis &&
                      !opdRecord.treatment &&
                      !opdRecord.prescription &&
                      !opdRecord.notes && (
                        <p className="text-sm text-slate-500">No medical details recorded yet</p>
                      )}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar - Billing & Actions */}
            <div className="space-y-6">
              {/* Billing Card */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-slate-900">Billing</h2>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Consultation Fee</span>
                    <span className="font-semibold text-slate-900">
                      ₹{opdRecord.consultationFee.toLocaleString()}
                    </span>
                  </div>
                  {opdRecord.additionalCharges > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Additional Charges</span>
                      <span className="font-semibold text-slate-900">
                        ₹{opdRecord.additionalCharges.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {opdRecord.discount > 0 && (
                    <div className="flex justify-between text-sm text-emerald-600">
                      <span>Discount</span>
                      <span className="font-semibold">-₹{opdRecord.discount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="border-t border-slate-200 pt-3">
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-900">Total Amount</span>
                      <span className="text-lg font-bold text-slate-900">
                        ₹{opdRecord.totalAmount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="border-t border-slate-200 pt-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Paid Amount</span>
                      <span className="font-semibold text-slate-900">
                        ₹{opdRecord.paidAmount.toLocaleString()}
                      </span>
                    </div>
                    {opdRecord.totalAmount > opdRecord.paidAmount && (
                      <div className="mt-2 flex justify-between text-sm">
                        <span className="text-rose-600">Pending</span>
                        <span className="font-semibold text-rose-600">
                          ₹{(opdRecord.totalAmount - opdRecord.paidAmount).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="mt-4">
                    <span
                      className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                        opdRecord.paymentStatus === "paid"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : opdRecord.paymentStatus === "partial"
                          ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                          : "bg-rose-50 text-rose-700 border-rose-200"
                      }`}
                    >
                      {opdRecord.paymentStatus.toUpperCase()}
                    </span>
                    {opdRecord.paymentMethod && (
                      <p className="mt-2 text-xs text-slate-500">
                        Method: {opdRecord.paymentMethod}
                      </p>
                    )}
                    {opdRecord.paymentDate && (
                      <p className="text-xs text-slate-500">
                        Date: {new Date(opdRecord.paymentDate).toLocaleDateString("en-IN")}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-slate-900">Quick Actions</h2>
                <div className="space-y-2">
                  <Link
                    to={`/patients/${opdRecord.patientId._id}`}
                    className="block w-full rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-center text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
                  >
                    View Patient
                  </Link>
                  {opdRecord.paymentStatus !== "paid" && hasPermission(PERMISSIONS.OPD_BILLING) && (
                    <button
                      onClick={() => setShowPaymentModal(true)}
                      className="w-full rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
                    >
                      Process Payment
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && opdRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-200 px-4 py-3 sm:px-6 sm:py-4">
              <h2 className="text-base font-semibold text-slate-900 sm:text-lg">
                Process Payment
              </h2>
            </div>
            <form onSubmit={handlePayment} className="px-4 py-4 sm:px-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Total Amount
                  </label>
                  <p className="text-lg font-bold text-slate-900">
                    ₹{opdRecord.totalAmount.toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Paid Amount *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    max={opdRecord.totalAmount}
                    step="0.01"
                    value={paymentData.paidAmount}
                    onChange={(e) =>
                      setPaymentData({ ...paymentData, paidAmount: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Payment Method *
                  </label>
                  <select
                    required
                    value={paymentData.paymentMethod}
                    onChange={(e) =>
                      setPaymentData({ ...paymentData, paymentMethod: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="upi">UPI</option>
                    <option value="cheque">Cheque</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:w-auto"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 sm:w-auto"
                >
                  Process Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default OPDDetails;
