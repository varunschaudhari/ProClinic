import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { patientsAPI } from "../utils/api";
import { canAccessRoute } from "../utils/permissions";
import { showError, showSuccess } from "../utils/toast";

type PatientData = {
  _id: string;
  patientId: string;
  name: string;
  gender: string;
  dateOfBirth: string;
  phone: string;
};

function OPDBillingAdvance() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const patientIdParam = searchParams.get("patientId");

  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<PatientData | null>(null);
  const [formData, setFormData] = useState({
    advanceDate: new Date().toISOString().split("T")[0],
    advanceNumber: "",
    amount: "",
    modeOfPayment: "Cash",
    referenceNo: "",
    advanceNote: "",
  });
  const [saving, setSaving] = useState(false);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    checkAuth();
    if (patientIdParam) {
      fetchPatientDetails();
    }
  }, [patientIdParam]);

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
    if (!patientIdParam) return;

    try {
      setLoading(true);
      const response = await patientsAPI.getById(patientIdParam);
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
        setFormData((prev) => ({
          ...prev,
          advanceNumber: `ADV-${Date.now()}`,
        }));

        const billingResponse = await patientsAPI.getBillingInformation(patientIdParam);
        if (billingResponse.success) {
          setBalance(billingResponse.data.summary?.overall?.pending || 0);
        }
      }
    } catch (err) {
      console.error("Error fetching patient:", err);
      showError("Failed to fetch patient details");
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    if (months < 0) {
      years--;
      months += 12;
    }
    return `${years}y,${months}d`;
  };

  const handleSave = async (print: boolean = false) => {
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      showError("Please enter a valid advance amount");
      return;
    }

    try {
      setSaving(true);

      const res = await patientsAPI.addBillingTransaction(patientIdParam as string, {
        transactionType: "advance",
        amount: parseFloat(formData.amount),
        method: formData.modeOfPayment.toLowerCase(),
        referenceNo: formData.referenceNo || undefined,
        note: formData.advanceNote || undefined,
        transactionDate: formData.advanceDate,
      });

      if (res.success) {
        showSuccess("Advance recorded successfully");
        if (print) window.print();
        navigate(`/opd/billing/patient/${patientIdParam}`);
      } else {
        showError(res.message || "Failed to record advance");
      }
    } catch (err: any) {
      showError(err.message || "An error occurred while saving");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <div className="flex flex-1 items-center justify-center sidebar-content-margin">
          <div className="text-center">
            <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
            <p className="text-slate-600">Loading...</p>
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
                onClick={() => navigate(-1)}
                className="rounded-lg p-1.5 text-slate-600 transition hover:bg-slate-100"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Add Billing Advance</h1>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {patient && (
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
                <div className="rounded-lg border-2 border-indigo-300 bg-indigo-50 px-6 py-4">
                  <p className="text-xs font-medium text-indigo-700">Balance:</p>
                  <p className="mt-1 text-2xl font-bold text-indigo-600">₹{balance.toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-lg font-semibold text-slate-900">Advance Details</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Advance Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={formData.advanceDate}
                        onChange={(e) => setFormData({ ...formData, advanceDate: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Advance Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.advanceNumber}
                        onChange={(e) => setFormData({ ...formData, advanceNumber: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Amount <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        placeholder="0.00"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Mode of Payment <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.modeOfPayment}
                        onChange={(e) => setFormData({ ...formData, modeOfPayment: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      >
                        <option value="Cash">Cash</option>
                        <option value="Card">Card</option>
                        <option value="UPI">UPI</option>
                        <option value="Cheque">Cheque</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Reference No.</label>
                      <input
                        type="text"
                        value={formData.referenceNo}
                        onChange={(e) => setFormData({ ...formData, referenceNo: e.target.value })}
                        placeholder="Reference No."
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Write Advance Note</label>
                    <textarea
                      value={formData.advanceNote}
                      onChange={(e) => setFormData({ ...formData, advanceNote: e.target.value })}
                      rows={6}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      placeholder="Add notes here..."
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-semibold text-slate-900">Summary</h3>
              <div className="space-y-4">
                <div className="border-t border-slate-200 pt-4">
                  <div className="flex justify-between">
                    <span className="text-base font-semibold text-slate-900">Advance Amount</span>
                    <span className="text-xl font-bold text-slate-900">₹{parseFloat(formData.amount || "0").toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={() => navigate(-1)}
              className="rounded-lg border border-slate-300 bg-white px-6 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Discard
            </button>
            <button
              onClick={() => handleSave(false)}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent"></div>
                  Saving...
                </>
              ) : (
                "Save ✓"
              )}
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Save & Print
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}

export default OPDBillingAdvance;
