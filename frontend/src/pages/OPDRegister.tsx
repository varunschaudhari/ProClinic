import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { opdAPI, patientsAPI, usersAPI } from "../utils/api";
import { canAccessRoute, hasPermission, PERMISSIONS } from "../utils/permissions";
import { showSuccess, showError } from "../utils/toast";

type Patient = {
  _id: string;
  name: string;
  patientId: string;
  phone: string;
};

type Doctor = {
  _id: string;
  name: string;
};

function OPDRegister() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    patientId: "",
    doctorId: "",
    visitDate: new Date().toISOString().split("T")[0],
    visitTime: new Date().toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    chiefComplaint: "",
    consultationFee: "",
    additionalCharges: "",
    discount: "",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [showPatientModal, setShowPatientModal] = useState(false);

  useEffect(() => {
    checkAuth();
    fetchPatients();
    fetchDoctors();
  }, []);

  const checkAuth = () => {
    const token =
      localStorage.getItem("proclinic_token") ||
      sessionStorage.getItem("proclinic_token");
    if (!token) {
      navigate("/login");
      return;
    }
    if (!canAccessRoute("/opd/register")) {
      navigate("/dashboard");
    }
  };

  const fetchPatients = async () => {
    try {
      const response = await patientsAPI.getAll();
      if (response.success) {
        setPatients(response.data.patients);
      }
    } catch (err) {
      console.error("Error fetching patients:", err);
    } finally {
      setLoading(false);
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
        // Auto-select if only one doctor
        if (doctorList.length === 1) {
          setFormData((prev) => ({ ...prev, doctorId: doctorList[0]._id }));
        }
      }
    } catch (err) {
      console.error("Error fetching doctors:", err);
    }
  };

  const filteredPatients = patients.filter((patient) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      patient.name.toLowerCase().includes(query) ||
      patient.patientId.toLowerCase().includes(query) ||
      patient.phone.toLowerCase().includes(query)
    );
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!formData.patientId || !formData.doctorId) {
        showError("Please select patient and doctor");
        setIsSubmitting(false);
        return;
      }

      const opdData = {
        patientId: formData.patientId,
        doctorId: formData.doctorId,
        visitDate: formData.visitDate,
        visitTime: formData.visitTime,
        chiefComplaint: formData.chiefComplaint || undefined,
        consultationFee: formData.consultationFee ? parseFloat(formData.consultationFee) : 0,
        additionalCharges: formData.additionalCharges ? parseFloat(formData.additionalCharges) : 0,
        discount: formData.discount ? parseFloat(formData.discount) : 0,
      };

      const response = await opdAPI.create(opdData);

      if (response.success) {
        showSuccess("OPD registration successful");
        setTimeout(() => {
          navigate("/opd/dashboard");
        }, 1000);
      } else {
        showError(response.message || "Failed to register OPD");
      }
    } catch (err) {
      showError("Error registering OPD");
      console.error(err);
    } finally {
      setIsSubmitting(false);
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
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm shadow-sm">
          <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4 lg:px-8">
            <div>
              <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">OPD Registration</h1>
              <p className="mt-1 text-xs text-slate-600 sm:mt-1.5 sm:text-sm">
                Register a new outpatient visit
              </p>
            </div>
            <button
              onClick={() => navigate("/opd/dashboard")}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:w-auto sm:px-5 sm:py-2.5"
            >
              Back to Dashboard
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div className="mx-auto max-w-2xl">
            <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="space-y-4">
                {/* Patient Selection */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Patient *
                  </label>
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Search patient by name, ID, or phone..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => setShowPatientModal(true)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                    {showPatientModal && (
                      <div className="max-h-60 overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                        {filteredPatients.length === 0 ? (
                          <div className="p-4 text-center text-sm text-slate-500">
                            No patients found
                          </div>
                        ) : (
                          filteredPatients.slice(0, 10).map((patient) => (
                            <button
                              key={patient._id}
                              type="button"
                              onClick={() => {
                                setFormData({ ...formData, patientId: patient._id });
                                setSearchQuery(patient.name);
                                setShowPatientModal(false);
                              }}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-indigo-50 transition-colors"
                            >
                              <div className="font-medium text-slate-900">{patient.name}</div>
                              <div className="text-xs text-slate-500">
                                {patient.patientId} • {patient.phone}
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                    {formData.patientId && (
                      <button
                        type="button"
                        onClick={() => navigate("/patients")}
                        className="text-xs text-indigo-600 hover:text-indigo-700"
                      >
                        + Add New Patient
                      </button>
                    )}
                  </div>
                </div>

                {/* Doctor Selection */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Doctor *
                  </label>
                  <select
                    required
                    value={formData.doctorId}
                    onChange={(e) =>
                      setFormData({ ...formData, doctorId: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  >
                    <option value="">Select Doctor</option>
                    {doctors.map((doctor) => (
                      <option key={doctor._id} value={doctor._id}>
                        {doctor.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Visit Date */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Visit Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.visitDate}
                      onChange={(e) =>
                        setFormData({ ...formData, visitDate: e.target.value })
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>

                  {/* Visit Time */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Visit Time
                    </label>
                    <input
                      type="time"
                      value={formData.visitTime}
                      onChange={(e) =>
                        setFormData({ ...formData, visitTime: e.target.value })
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>
                </div>

                {/* Chief Complaint */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Chief Complaint
                  </label>
                  <textarea
                    value={formData.chiefComplaint}
                    onChange={(e) =>
                      setFormData({ ...formData, chiefComplaint: e.target.value })
                    }
                    rows={3}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="Patient's main complaint..."
                  />
                </div>

                {/* Billing Section */}
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <h3 className="mb-3 text-sm font-semibold text-slate-900">Billing Information</h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Consultation Fee
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.consultationFee}
                        onChange={(e) =>
                          setFormData({ ...formData, consultationFee: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Additional Charges
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.additionalCharges}
                        onChange={(e) =>
                          setFormData({ ...formData, additionalCharges: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Discount
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.discount}
                        onChange={(e) =>
                          setFormData({ ...formData, discount: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
                <button
                  type="button"
                  onClick={() => navigate("/opd/dashboard")}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:w-auto"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  {isSubmitting ? "Registering..." : "Register OPD"}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}

export default OPDRegister;
