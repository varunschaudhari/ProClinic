import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { ipdAPI, usersAPI, roomAPI } from "../utils/api";
import { hasPermission, PERMISSIONS } from "../utils/permissions";
import { showSuccess, showError } from "../utils/toast";

type IPDRecord = {
  _id: string;
  ipdNumber: string;
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
  roomId?: {
    _id: string;
    roomNumber: string;
    roomType: string;
  };
  roomNumber?: string;
  bedNumber?: string;
  admissionDate: string;
  admissionTime?: string;
  admissionType: string;
  admissionReason?: string;
  diagnosisOnAdmission?: string;
  status: string;
  dischargeDate?: string;
  dischargeTime?: string;
  dischargeType?: string;
  dischargeSummary?: string;
  dischargeInstructions?: string;
  treatmentPlan?: string;
  notes?: string;
  dailyProgressNotes?: Array<{
    _id: string;
    date: string;
    note: string;
    recordedBy: {
      _id: string;
      name: string;
    };
  }>;
  prescriptions?: Array<{
    _id: string;
    medication: string;
    dosage: string;
    frequency: string;
    duration?: string;
    startDate: string;
    endDate?: string;
    prescribedBy: {
      _id: string;
      name: string;
    };
  }>;
  labReports?: Array<{
    _id: string;
    testName: string;
    testDate: string;
    result?: string;
    fileUrl?: string;
  }>;
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
  followUpRequired: boolean;
  followUpDate?: string;
  followUpInstructions?: string;
};

function IPDDetails() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [ipdRecord, setIpdRecord] = useState<IPDRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showDischargeModal, setShowDischargeModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showProgressNoteModal, setShowProgressNoteModal] = useState(false);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [showLabReportModal, setShowLabReportModal] = useState(false);
  const [availableBeds, setAvailableBeds] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<Array<{ _id: string; name: string }>>([]);
  const [formData, setFormData] = useState({
    treatmentPlan: "",
    notes: "",
    roomId: "",
    bedNumber: "",
  });
  const [dischargeData, setDischargeData] = useState({
    dischargeDate: new Date().toISOString().split("T")[0],
    dischargeTime: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
    dischargeType: "normal",
    dischargeSummary: "",
    dischargeInstructions: "",
    followUpRequired: false,
    followUpDate: "",
    followUpInstructions: "",
  });
  const [paymentData, setPaymentData] = useState({
    paidAmount: "",
    paymentMethod: "cash",
  });
  const [progressNoteData, setProgressNoteData] = useState({
    date: new Date().toISOString().split("T")[0],
    note: "",
  });
  const [prescriptionData, setPrescriptionData] = useState({
    medication: "",
    dosage: "",
    frequency: "",
    duration: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
  });
  const [labReportData, setLabReportData] = useState({
    testName: "",
    testDate: new Date().toISOString().split("T")[0],
    result: "",
    fileUrl: "",
  });

  useEffect(() => {
    if (id) {
      fetchIPDRecord();
      fetchAvailableBeds();
      fetchDoctors();
    }
  }, [id]);

  const fetchIPDRecord = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const response = await ipdAPI.getById(id);
      if (response.success) {
        const record = response.data.ipdRecord;
        setIpdRecord(record);
        setFormData({
          treatmentPlan: record.treatmentPlan || "",
          notes: record.notes || "",
          roomId: record.roomId?._id || "",
          bedNumber: record.bedNumber || "",
        });
      } else {
        showError("Failed to fetch IPD record");
        setTimeout(() => navigate("/ipd/dashboard"), 2000);
      }
    } catch (err) {
      showError("Error loading IPD record");
      console.error(err);
      setTimeout(() => navigate("/ipd/dashboard"), 2000);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableBeds = async () => {
    try {
      const response = await roomAPI.getAvailableBeds();
      if (response.success) {
        setAvailableBeds(response.data.availableBeds);
      }
    } catch (err) {
      console.error("Error fetching available beds:", err);
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

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    try {
      const response = await ipdAPI.update(id, formData);
      if (response.success) {
        showSuccess("IPD record updated successfully");
        setIsEditing(false);
        fetchIPDRecord();
      } else {
        showError(response.message || "Failed to update IPD record");
      }
    } catch (err) {
      showError("Error updating IPD record");
      console.error(err);
    }
  };

  const handleDischarge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    try {
      const response = await ipdAPI.discharge(id, dischargeData);
      if (response.success) {
        showSuccess("Patient discharged successfully");
        setShowDischargeModal(false);
        fetchIPDRecord();
      } else {
        showError(response.message || "Failed to discharge patient");
      }
    } catch (err) {
      showError("Error discharging patient");
      console.error(err);
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    try {
      const response = await ipdAPI.processPayment(id, {
        paidAmount: parseFloat(paymentData.paidAmount),
        paymentMethod: paymentData.paymentMethod,
      });
      if (response.success) {
        showSuccess("Payment processed successfully");
        setShowPaymentModal(false);
        fetchIPDRecord();
      } else {
        showError(response.message || "Failed to process payment");
      }
    } catch (err) {
      showError("Error processing payment");
      console.error(err);
    }
  };

  const handleAddProgressNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    try {
      const response = await ipdAPI.addProgressNote(id, progressNoteData);
      if (response.success) {
        showSuccess("Progress note added successfully");
        setShowProgressNoteModal(false);
        setProgressNoteData({ date: new Date().toISOString().split("T")[0], note: "" });
        fetchIPDRecord();
      } else {
        showError(response.message || "Failed to add progress note");
      }
    } catch (err) {
      showError("Error adding progress note");
      console.error(err);
    }
  };

  const handleAddPrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    try {
      const response = await ipdAPI.addPrescription(id, prescriptionData);
      if (response.success) {
        showSuccess("Prescription added successfully");
        setShowPrescriptionModal(false);
        setPrescriptionData({
          medication: "",
          dosage: "",
          frequency: "",
          duration: "",
          startDate: new Date().toISOString().split("T")[0],
          endDate: "",
        });
        fetchIPDRecord();
      } else {
        showError(response.message || "Failed to add prescription");
      }
    } catch (err) {
      showError("Error adding prescription");
      console.error(err);
    }
  };

  const handleAddLabReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    try {
      const response = await ipdAPI.addLabReport(id, labReportData);
      if (response.success) {
        showSuccess("Lab report added successfully");
        setShowLabReportModal(false);
        setLabReportData({
          testName: "",
          testDate: new Date().toISOString().split("T")[0],
          result: "",
          fileUrl: "",
        });
        fetchIPDRecord();
      } else {
        showError(response.message || "Failed to add lab report");
      }
    } catch (err) {
      showError("Error adding lab report");
      console.error(err);
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

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <div className="flex flex-1 items-center justify-center lg:ml-72">
          <div className="text-center">
            <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
            <p className="text-slate-600">Loading IPD record...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!ipdRecord) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <div className="flex flex-1 items-center justify-center lg:ml-72">
          <div className="text-center">
            <p className="text-slate-600">IPD record not found</p>
            <Link to="/ipd/dashboard" className="mt-4 inline-block text-indigo-600 hover:text-indigo-700">
              Back to IPD Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isDischarged = ipdRecord.status === "discharged" || ipdRecord.status === "deceased" || ipdRecord.status === "absconded";

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <div className="flex flex-1 flex-col lg:ml-72">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm shadow-sm">
          <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4 lg:px-8">
            <div className="flex items-center gap-2 sm:gap-4">
              <Link
                to="/ipd/dashboard"
                className="rounded-lg p-1.5 text-slate-600 transition hover:bg-slate-100 sm:p-2"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div>
                <h1 className="text-lg font-bold text-slate-900 sm:text-xl lg:text-2xl">
                  {ipdRecord.ipdNumber}
                </h1>
                <p className="mt-0.5 text-xs text-slate-600 sm:mt-1.5 sm:text-sm">
                  {ipdRecord.patientId.name} • {ipdRecord.doctorId.name}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {!isDischarged && hasPermission(PERMISSIONS.IPD_EDIT) && (
                <>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100 sm:px-5 sm:py-2.5 sm:text-sm"
                  >
                    {isEditing ? "Cancel Edit" : "Edit Record"}
                  </button>
                  <button
                    onClick={() => setShowDischargeModal(true)}
                    className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100 sm:px-5 sm:py-2.5 sm:text-sm"
                  >
                    Discharge
                  </button>
                </>
              )}
              {ipdRecord.paymentStatus !== "paid" && hasPermission(PERMISSIONS.IPD_BILLING) && (
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-700 transition hover:border-amber-300 hover:bg-amber-100 sm:px-5 sm:py-2.5 sm:text-sm"
                >
                  Process Payment
                </button>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Patient & Admission Info */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-slate-900">Patient & Admission Information</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Patient</p>
                    <Link
                      to={`/patients/${ipdRecord.patientId._id}`}
                      className="mt-1 text-sm font-semibold text-indigo-700 hover:underline"
                    >
                      {ipdRecord.patientId.name} ({ipdRecord.patientId.patientId})
                    </Link>
                    <p className="text-xs text-slate-500">{ipdRecord.patientId.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-600">Attending Doctor</p>
                    <p className="mt-1 text-sm text-slate-900">{ipdRecord.doctorId.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-600">Admission Date</p>
                    <p className="mt-1 text-sm text-slate-900">
                      {new Date(ipdRecord.admissionDate).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                      {ipdRecord.admissionTime && ` at ${ipdRecord.admissionTime}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-600">Admission Type</p>
                    <p className="mt-1 text-sm text-slate-900 capitalize">{ipdRecord.admissionType}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-600">Room/Bed</p>
                    <p className="mt-1 text-sm text-slate-900">
                      {ipdRecord.roomNumber && ipdRecord.bedNumber
                        ? `${ipdRecord.roomNumber} / Bed ${ipdRecord.bedNumber}`
                        : "Not Assigned"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-600">Status</p>
                    <span
                      className={`mt-1 inline-flex rounded-lg border px-2.5 py-1 text-xs font-semibold ${getStatusColor(
                        ipdRecord.status
                      )}`}
                    >
                      {ipdRecord.status.replace("-", " ").toUpperCase()}
                    </span>
                  </div>
                  {ipdRecord.dischargeDate && (
                    <div>
                      <p className="text-sm font-medium text-slate-600">Discharge Date</p>
                      <p className="mt-1 text-sm text-slate-900">
                        {new Date(ipdRecord.dischargeDate).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                        {ipdRecord.dischargeTime && ` at ${ipdRecord.dischargeTime}`}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Medical Information */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-slate-900">Medical Information</h2>
                {isEditing ? (
                  <form onSubmit={handleUpdate} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Admission Reason
                      </label>
                      <p className="text-sm text-slate-900">{ipdRecord.admissionReason || "Not recorded"}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Diagnosis on Admission
                      </label>
                      <p className="text-sm text-slate-900">{ipdRecord.diagnosisOnAdmission || "Not recorded"}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Treatment Plan</label>
                      <textarea
                        value={formData.treatmentPlan}
                        onChange={(e) => setFormData({ ...formData, treatmentPlan: e.target.value })}
                        rows={4}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        placeholder="Treatment plan..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
                      <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        rows={3}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        placeholder="Additional notes..."
                      />
                    </div>
                    {!isDischarged && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Room/Bed Assignment</label>
                        <select
                          value={`${formData.roomId}-${formData.bedNumber}`}
                          onChange={(e) => {
                            const [roomId, bedNumber] = e.target.value.split("-");
                            setFormData({ ...formData, roomId, bedNumber });
                          }}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        >
                          <option value="-">Not Assigned</option>
                          {availableBeds.map((bed) => (
                            <option key={`${bed.roomId}-${bed.bedNumber}`} value={`${bed.roomId}-${bed.bedNumber}`}>
                              {bed.roomNumber} - Bed {bed.bedNumber}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
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
                    {ipdRecord.admissionReason && (
                      <div>
                        <p className="text-sm font-medium text-slate-600">Admission Reason</p>
                        <p className="mt-1 text-sm text-slate-900">{ipdRecord.admissionReason}</p>
                      </div>
                    )}
                    {ipdRecord.diagnosisOnAdmission && (
                      <div>
                        <p className="text-sm font-medium text-slate-600">Diagnosis on Admission</p>
                        <p className="mt-1 text-sm text-slate-900">{ipdRecord.diagnosisOnAdmission}</p>
                      </div>
                    )}
                    {ipdRecord.treatmentPlan && (
                      <div>
                        <p className="text-sm font-medium text-slate-600">Treatment Plan</p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-900">{ipdRecord.treatmentPlan}</p>
                      </div>
                    )}
                    {ipdRecord.notes && (
                      <div>
                        <p className="text-sm font-medium text-slate-600">Notes</p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-900">{ipdRecord.notes}</p>
                      </div>
                    )}
                    {ipdRecord.dischargeSummary && (
                      <div>
                        <p className="text-sm font-medium text-slate-600">Discharge Summary</p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-900">{ipdRecord.dischargeSummary}</p>
                      </div>
                    )}
                    {ipdRecord.dischargeInstructions && (
                      <div>
                        <p className="text-sm font-medium text-slate-600">Discharge Instructions</p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-900">{ipdRecord.dischargeInstructions}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Progress Notes */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">Daily Progress Notes</h2>
                  {!isDischarged && hasPermission(PERMISSIONS.IPD_EDIT) && (
                    <button
                      onClick={() => setShowProgressNoteModal(true)}
                      className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
                    >
                      + Add Note
                    </button>
                  )}
                </div>
                {ipdRecord.dailyProgressNotes && ipdRecord.dailyProgressNotes.length > 0 ? (
                  <div className="space-y-3">
                    {ipdRecord.dailyProgressNotes.map((note) => (
                      <div key={note._id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <div className="mb-1 flex items-center justify-between">
                          <p className="text-xs font-medium text-slate-600">
                            {new Date(note.date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                          {note.recordedBy && (
                            <p className="text-xs text-slate-500">By: {note.recordedBy.name}</p>
                          )}
                        </div>
                        <p className="text-sm text-slate-900">{note.note}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No progress notes recorded</p>
                )}
              </div>

              {/* Prescriptions */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">Prescriptions</h2>
                  {!isDischarged && hasPermission(PERMISSIONS.IPD_EDIT) && (
                    <button
                      onClick={() => setShowPrescriptionModal(true)}
                      className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
                    >
                      + Add Prescription
                    </button>
                  )}
                </div>
                {ipdRecord.prescriptions && ipdRecord.prescriptions.length > 0 ? (
                  <div className="space-y-3">
                    {ipdRecord.prescriptions.map((prescription) => (
                      <div key={prescription._id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-sm font-semibold text-slate-900">{prescription.medication}</p>
                          {prescription.prescribedBy && (
                            <p className="text-xs text-slate-500">By: {prescription.prescribedBy.name}</p>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                          <p>Dosage: {prescription.dosage}</p>
                          <p>Frequency: {prescription.frequency}</p>
                          {prescription.duration && <p>Duration: {prescription.duration}</p>}
                          <p>
                            Start: {new Date(prescription.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No prescriptions recorded</p>
                )}
              </div>

              {/* Lab Reports */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">Lab Reports</h2>
                  {!isDischarged && hasPermission(PERMISSIONS.IPD_EDIT) && (
                    <button
                      onClick={() => setShowLabReportModal(true)}
                      className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
                    >
                      + Add Lab Report
                    </button>
                  )}
                </div>
                {ipdRecord.labReports && ipdRecord.labReports.length > 0 ? (
                  <div className="space-y-3">
                    {ipdRecord.labReports.map((report) => (
                      <div key={report._id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-sm font-semibold text-slate-900">{report.testName}</p>
                          <p className="text-xs text-slate-500">
                            {new Date(report.testDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                        {report.result && <p className="text-sm text-slate-700">{report.result}</p>}
                        {report.fileUrl && (
                          <a
                            href={report.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-block text-xs text-indigo-600 hover:underline"
                          >
                            View Report
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No lab reports recorded</p>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Billing Summary */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-slate-900">Billing Summary</h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Room Charges</span>
                    <span className="font-medium text-slate-900">₹{ipdRecord.roomCharges.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Medication</span>
                    <span className="font-medium text-slate-900">₹{ipdRecord.medicationCharges.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Procedures</span>
                    <span className="font-medium text-slate-900">₹{ipdRecord.procedureCharges.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Lab Tests</span>
                    <span className="font-medium text-slate-900">₹{ipdRecord.labCharges.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Other Charges</span>
                    <span className="font-medium text-slate-900">₹{ipdRecord.otherCharges.toFixed(2)}</span>
                  </div>
                  {ipdRecord.discount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Discount</span>
                      <span className="font-medium">-₹{ipdRecord.discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t border-slate-200 pt-2">
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-900">Total Amount</span>
                      <span className="font-bold text-slate-900">₹{ipdRecord.totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Paid Amount</span>
                    <span className="font-medium text-slate-900">₹{ipdRecord.paidAmount.toFixed(2)}</span>
                  </div>
                  {ipdRecord.totalAmount > ipdRecord.paidAmount && (
                    <div className="flex justify-between text-rose-600">
                      <span className="font-medium">Balance</span>
                      <span className="font-semibold">
                        ₹{(ipdRecord.totalAmount - ipdRecord.paidAmount).toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="pt-2">
                    <span
                      className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                        ipdRecord.paymentStatus === "paid"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : ipdRecord.paymentStatus === "partial"
                          ? "border-yellow-200 bg-yellow-50 text-yellow-700"
                          : "border-rose-200 bg-rose-50 text-rose-700"
                      }`}
                    >
                      {ipdRecord.paymentStatus.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Follow-up */}
              {ipdRecord.followUpRequired && (
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="mb-4 text-lg font-semibold text-slate-900">Follow-up</h2>
                  {ipdRecord.followUpDate && (
                    <p className="text-sm text-slate-600">
                      Date: {new Date(ipdRecord.followUpDate).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  )}
                  {ipdRecord.followUpInstructions && (
                    <p className="mt-2 text-sm text-slate-900">{ipdRecord.followUpInstructions}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Discharge Modal */}
      {showDischargeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="px-4 py-3 sm:px-6 sm:py-4">
              <h2 className="text-base font-semibold text-slate-900 sm:text-lg">Discharge Patient</h2>
            </div>
            <form onSubmit={handleDischarge} className="px-4 sm:px-6 sm:pb-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Discharge Date *</label>
                    <input
                      type="date"
                      required
                      value={dischargeData.dischargeDate}
                      onChange={(e) => setDischargeData({ ...dischargeData, dischargeDate: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Discharge Time</label>
                    <input
                      type="time"
                      value={dischargeData.dischargeTime}
                      onChange={(e) => setDischargeData({ ...dischargeData, dischargeTime: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Discharge Type *</label>
                  <select
                    required
                    value={dischargeData.dischargeType}
                    onChange={(e) => setDischargeData({ ...dischargeData, dischargeType: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  >
                    <option value="normal">Normal</option>
                    <option value="against-medical-advice">Against Medical Advice</option>
                    <option value="transfer">Transfer</option>
                    <option value="deceased">Deceased</option>
                    <option value="absconded">Absconded</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Discharge Summary</label>
                  <textarea
                    value={dischargeData.dischargeSummary}
                    onChange={(e) => setDischargeData({ ...dischargeData, dischargeSummary: e.target.value })}
                    rows={4}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="Discharge summary..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Discharge Instructions</label>
                  <textarea
                    value={dischargeData.dischargeInstructions}
                    onChange={(e) => setDischargeData({ ...dischargeData, dischargeInstructions: e.target.value })}
                    rows={3}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="Instructions for patient..."
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="followUpRequired"
                    checked={dischargeData.followUpRequired}
                    onChange={(e) => setDischargeData({ ...dischargeData, followUpRequired: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="followUpRequired" className="text-sm text-slate-700">
                    Follow-up Required
                  </label>
                </div>
                {dischargeData.followUpRequired && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Follow-up Date</label>
                      <input
                        type="date"
                        value={dischargeData.followUpDate}
                        onChange={(e) => setDischargeData({ ...dischargeData, followUpDate: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Follow-up Instructions</label>
                      <textarea
                        value={dischargeData.followUpInstructions}
                        onChange={(e) => setDischargeData({ ...dischargeData, followUpInstructions: e.target.value })}
                        rows={2}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        placeholder="Follow-up instructions..."
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDischargeModal(false)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                >
                  Discharge Patient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="px-4 py-3 sm:px-6 sm:py-4">
              <h2 className="text-base font-semibold text-slate-900 sm:text-lg">Process Payment</h2>
              <p className="mt-1 text-sm text-slate-600">
                Total Amount: ₹{ipdRecord.totalAmount.toFixed(2)} | Paid: ₹{ipdRecord.paidAmount.toFixed(2)} | Balance: ₹
                {(ipdRecord.totalAmount - ipdRecord.paidAmount).toFixed(2)}
              </p>
            </div>
            <form onSubmit={handlePayment} className="px-4 sm:px-6 sm:pb-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Amount to Pay *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    max={ipdRecord.totalAmount - ipdRecord.paidAmount}
                    value={paymentData.paidAmount}
                    onChange={(e) => setPaymentData({ ...paymentData, paidAmount: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
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
                    <option value="cheque">Cheque</option>
                    <option value="insurance">Insurance</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700"
                >
                  Process Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Progress Note Modal */}
      {showProgressNoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="px-4 py-3 sm:px-6 sm:py-4">
              <h2 className="text-base font-semibold text-slate-900 sm:text-lg">Add Progress Note</h2>
            </div>
            <form onSubmit={handleAddProgressNote} className="px-4 sm:px-6 sm:pb-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Date *</label>
                  <input
                    type="date"
                    required
                    value={progressNoteData.date}
                    onChange={(e) => setProgressNoteData({ ...progressNoteData, date: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Note *</label>
                  <textarea
                    required
                    value={progressNoteData.note}
                    onChange={(e) => setProgressNoteData({ ...progressNoteData, note: e.target.value })}
                    rows={5}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="Enter progress note..."
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowProgressNoteModal(false)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
                >
                  Add Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Prescription Modal */}
      {showPrescriptionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="px-4 py-3 sm:px-6 sm:py-4">
              <h2 className="text-base font-semibold text-slate-900 sm:text-lg">Add Prescription</h2>
            </div>
            <form onSubmit={handleAddPrescription} className="px-4 sm:px-6 sm:pb-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Medication *</label>
                  <input
                    type="text"
                    required
                    value={prescriptionData.medication}
                    onChange={(e) => setPrescriptionData({ ...prescriptionData, medication: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="Medication name..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Dosage *</label>
                    <input
                      type="text"
                      required
                      value={prescriptionData.dosage}
                      onChange={(e) => setPrescriptionData({ ...prescriptionData, dosage: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      placeholder="e.g., 500mg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Frequency *</label>
                    <input
                      type="text"
                      required
                      value={prescriptionData.frequency}
                      onChange={(e) => setPrescriptionData({ ...prescriptionData, frequency: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      placeholder="e.g., Twice daily"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Duration</label>
                    <input
                      type="text"
                      value={prescriptionData.duration}
                      onChange={(e) => setPrescriptionData({ ...prescriptionData, duration: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      placeholder="e.g., 7 days"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Start Date</label>
                    <input
                      type="date"
                      value={prescriptionData.startDate}
                      onChange={(e) => setPrescriptionData({ ...prescriptionData, startDate: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">End Date</label>
                  <input
                    type="date"
                    value={prescriptionData.endDate}
                    onChange={(e) => setPrescriptionData({ ...prescriptionData, endDate: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPrescriptionModal(false)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
                >
                  Add Prescription
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lab Report Modal */}
      {showLabReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="px-4 py-3 sm:px-6 sm:py-4">
              <h2 className="text-base font-semibold text-slate-900 sm:text-lg">Add Lab Report</h2>
            </div>
            <form onSubmit={handleAddLabReport} className="px-4 sm:px-6 sm:pb-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Test Name *</label>
                  <input
                    type="text"
                    required
                    value={labReportData.testName}
                    onChange={(e) => setLabReportData({ ...labReportData, testName: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="Test name..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Test Date</label>
                  <input
                    type="date"
                    value={labReportData.testDate}
                    onChange={(e) => setLabReportData({ ...labReportData, testDate: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Result</label>
                  <textarea
                    value={labReportData.result}
                    onChange={(e) => setLabReportData({ ...labReportData, result: e.target.value })}
                    rows={4}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="Test results..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">File URL</label>
                  <input
                    type="url"
                    value={labReportData.fileUrl}
                    onChange={(e) => setLabReportData({ ...labReportData, fileUrl: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="https://..."
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowLabReportModal(false)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
                >
                  Add Lab Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default IPDDetails;
