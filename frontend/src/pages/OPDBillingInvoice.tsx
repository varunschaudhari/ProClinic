import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { patientsAPI, opdAPI, usersAPI } from "../utils/api";
import { canAccessRoute } from "../utils/permissions";
import { showError, showSuccess } from "../utils/toast";

type ServiceLine = {
  _id: string;
  date: string;
  service: string;
  description: string;
  qty: number;
  amount: number;
  discount: number;
  totalAmount: number;
};

type PatientData = {
  _id: string;
  patientId: string;
  name: string;
  gender: string;
  dateOfBirth: string;
  phone: string;
};

function OPDBillingInvoice() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const patientIdParam = searchParams.get("patientId");

  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState<PatientData | null>(null);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [balance, setBalance] = useState(0);
  const [formData, setFormData] = useState({
    doctorId: "",
    taxation: "Non-Gst",
    patientId: "",
    category: "",
    package: "",
    account: "",
    invoiceDate: new Date().toISOString().split("T")[0],
    dueDate: "",
    modeOfPayment: "",
    referenceNo: "",
    invoiceNote: "",
    overallDiscountType: "AMT",
    overallDiscountValue: "",
  });
  const [serviceLines, setServiceLines] = useState<ServiceLine[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    checkAuth();
    fetchDoctors();
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
          patientId: patientData.patientId,
        }));

        const billingResponse = await patientsAPI.getBillingInformation(patientIdParam);
        if (billingResponse.success) {
          const balanceToPay = billingResponse.data.summary?.overall?.pending || 0;
          setBalance(balanceToPay);
        }
      }
    } catch (err) {
      console.error("Error fetching patient:", err);
      showError("Failed to fetch patient details");
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctors = async () => {
    try {
      const response = await usersAPI.getAll();
      if (response.success && response.data?.users) {
        const doctorUsers = response.data.users.filter((user: any) => {
          const role = user.role || user.roles?.[0];
          return role === "doctor" || role === "Doctor";
        });
        setDoctors(doctorUsers.length ? doctorUsers : response.data.users);
      }
    } catch (err) {
      console.error("Error fetching doctors:", err);
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

  const handleAddServiceLine = () => {
    const newServiceLine: ServiceLine = {
      _id: `service-${Date.now()}`,
      date: formData.invoiceDate,
      service: "",
      description: "",
      qty: 1,
      amount: 0,
      discount: 0,
      totalAmount: 0,
    };
    setServiceLines([...serviceLines, newServiceLine]);
  };

  const handleUpdateServiceLine = (id: string, field: keyof ServiceLine, value: any) => {
    setServiceLines(
      serviceLines.map((line) => {
        if (line._id === id) {
          const updated = { ...line, [field]: value };
          const total = (updated.amount * updated.qty) - updated.discount;
          updated.totalAmount = Math.max(0, total);
          return updated;
        }
        return line;
      })
    );
  };

  const handleRemoveServiceLine = (id: string) => {
    setServiceLines(serviceLines.filter((line) => line._id !== id));
  };

  const calculateSubtotal = () => {
    return serviceLines.reduce((sum, line) => sum + line.totalAmount, 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discountValue = parseFloat(formData.overallDiscountValue) || 0;
    if (formData.overallDiscountType === "AMT") {
      return Math.max(0, subtotal - discountValue);
    } else {
      return Math.max(0, subtotal - (subtotal * discountValue) / 100);
    }
  };

  const handleSave = async (print: boolean = false) => {
    if (!formData.patientId || !formData.doctorId || !formData.category || !formData.account || serviceLines.length === 0) {
      showError("Please fill all required fields and add at least one service");
      return;
    }

    const resolvedPatientId = patient?._id || patientIdParam;
    if (!resolvedPatientId) {
      showError("Patient is required");
      return;
    }

    try {
      setSaving(true);
      const opdData = {
        patientId: resolvedPatientId,
        doctorId: formData.doctorId,
        visitDate: formData.invoiceDate,
        consultationFee: 0,
        additionalCharges: calculateSubtotal(),
        discount: parseFloat(formData.overallDiscountValue) || 0,
        totalAmount: calculateTotal(),
        paidAmount: 0,
        paymentStatus: "pending",
        notes: formData.invoiceNote,
        invoiceNumber: `INV-${Date.now()}`,
        billingDocumentType: "invoice",
        taxation: formData.taxation,
        category: formData.category,
        package: formData.package,
        account: formData.account,
        dueDate: formData.dueDate,
        serviceLines: serviceLines,
      };

      const response = await opdAPI.create(opdData);
      
      if (response.success) {
        showSuccess("Invoice created successfully");
        if (print) window.print();
        navigate(`/opd/billing/patient/${patient?._id || patientIdParam}`);
      } else {
        showError(response.message || "Failed to create invoice");
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
              <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Add Outpatient Invoice</h1>
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

          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">Invoice Details</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Doctor <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.doctorId}
                  onChange={(e) => setFormData({ ...formData, doctorId: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                >
                  <option value="">Select</option>
                  {doctors.map((d: any) => (
                    <option key={d._id} value={d._id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Taxation <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.taxation}
                  onChange={(e) => setFormData({ ...formData, taxation: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                >
                  <option value="Non-Gst">Non-Gst</option>
                  <option value="GST">GST</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Patient Id <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.patientId}
                  onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                >
                  <option value="">Select</option>
                  <option value="consultation">Consultation</option>
                  <option value="procedure">Procedure</option>
                  <option value="lab">Lab Test</option>
                  <option value="pharmacy">Pharmacy</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Package</label>
                <select
                  value={formData.package}
                  onChange={(e) => setFormData({ ...formData, package: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                >
                  <option value="">Select</option>
                  <option value="basic">Basic</option>
                  <option value="premium">Premium</option>
                  <option value="deluxe">Deluxe</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Account <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.account}
                  onChange={(e) => setFormData({ ...formData, account: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                >
                  <option value="">Select</option>
                  <option value="cash">Cash Account</option>
                  <option value="bank">Bank Account</option>
                  <option value="credit">Credit Account</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Invoice Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.invoiceDate}
                  onChange={(e) => {
                    setFormData({ ...formData, invoiceDate: e.target.value });
                    setServiceLines(serviceLines.map((line) => ({ ...line, date: e.target.value })));
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>
            </div>
          </div>

          <div className="mb-6 rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="bg-indigo-600 px-6 py-3">
              <div className="grid grid-cols-7 gap-2 text-xs font-semibold text-white">
                <div>Date</div>
                <div>Services</div>
                <div>Description</div>
                <div>Qty</div>
                <div>Amount</div>
                <div>Discount</div>
                <div>Total Amount</div>
              </div>
            </div>
            <div className="p-6">
              {serviceLines.length === 0 ? (
                <div className="border-2 border-dashed border-slate-300 p-8 text-center">
                  <p className="text-sm text-slate-500">No services added</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {serviceLines.map((line) => (
                    <div key={line._id} className="grid grid-cols-7 gap-2 items-center border-b border-slate-200 pb-2">
                      <input
                        type="date"
                        value={line.date}
                        onChange={(e) => handleUpdateServiceLine(line._id, "date", e.target.value)}
                        className="rounded border border-slate-300 px-2 py-1 text-xs"
                      />
                      <input
                        type="text"
                        value={line.service}
                        onChange={(e) => handleUpdateServiceLine(line._id, "service", e.target.value)}
                        placeholder="Service"
                        className="rounded border border-slate-300 px-2 py-1 text-xs"
                      />
                      <input
                        type="text"
                        value={line.description}
                        onChange={(e) => handleUpdateServiceLine(line._id, "description", e.target.value)}
                        placeholder="Description"
                        className="rounded border border-slate-300 px-2 py-1 text-xs"
                      />
                      <input
                        type="number"
                        value={line.qty}
                        onChange={(e) => handleUpdateServiceLine(line._id, "qty", parseInt(e.target.value) || 1)}
                        min="1"
                        className="rounded border border-slate-300 px-2 py-1 text-xs"
                      />
                      <input
                        type="number"
                        value={line.amount}
                        onChange={(e) => handleUpdateServiceLine(line._id, "amount", parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="rounded border border-slate-300 px-2 py-1 text-xs"
                      />
                      <input
                        type="number"
                        value={line.discount}
                        onChange={(e) => handleUpdateServiceLine(line._id, "discount", parseFloat(e.target.value) || 0)}
                        placeholder="0"
                        className="rounded border border-slate-300 px-2 py-1 text-xs"
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium">₹{line.totalAmount.toFixed(2)}</span>
                        <button
                          onClick={() => handleRemoveServiceLine(line._id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={handleAddServiceLine}
                  className="rounded-lg border-2 border-indigo-300 bg-white px-4 py-2 text-sm font-medium text-indigo-600 transition hover:bg-indigo-50"
                >
                  Create New Service
                </button>
                <button
                  onClick={handleAddServiceLine}
                  className="flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-800"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Service Line
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-lg font-semibold text-slate-900">Payment & Notes</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Mode of Payment</label>
                    <select
                      value={formData.modeOfPayment}
                      onChange={(e) => setFormData({ ...formData, modeOfPayment: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    >
                      <option value="">Select</option>
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
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Write Invoice Note</label>
                    <textarea
                      value={formData.invoiceNote}
                      onChange={(e) => setFormData({ ...formData, invoiceNote: e.target.value })}
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
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Subtotal</span>
                  <span className="font-medium text-slate-900">₹{calculateSubtotal().toFixed(2)}</span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Overall Discount</label>
                  <div className="flex gap-2">
                    <select
                      value={formData.overallDiscountType}
                      onChange={(e) => setFormData({ ...formData, overallDiscountType: e.target.value })}
                      className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    >
                      <option value="AMT">AMT</option>
                      <option value="PER">%</option>
                    </select>
                    <input
                      type="number"
                      value={formData.overallDiscountValue}
                      onChange={(e) => setFormData({ ...formData, overallDiscountValue: e.target.value })}
                      placeholder="0"
                      className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>
                </div>
                <div className="border-t border-slate-200 pt-4">
                  <div className="flex justify-between">
                    <span className="text-base font-semibold text-slate-900">Total</span>
                    <span className="text-xl font-bold text-slate-900">₹{calculateTotal().toFixed(2)}</span>
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

export default OPDBillingInvoice;
