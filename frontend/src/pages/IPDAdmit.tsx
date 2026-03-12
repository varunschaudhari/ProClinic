import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { ipdAPI, patientsAPI, usersAPI, roomAPI } from "../utils/api";
import { canAccessRoute } from "../utils/permissions";
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

type AvailableBed = {
  roomId: string;
  roomNumber: string;
  roomType: string;
  floor?: string;
  ward?: string;
  bedNumber: string;
  ratePerDay: number;
};

function IPDAdmit() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [availableBeds, setAvailableBeds] = useState<AvailableBed[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNewPatient, setIsNewPatient] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [formData, setFormData] = useState({
    patientId: "",
    name: "",
    dateOfBirth: "",
    gender: "",
    phone: "",
    email: "",
    doctorId: "",
    admissionDate: new Date().toISOString().split("T")[0],
    admissionTime: new Date().toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    admissionType: "planned",
    admissionReason: "",
    diagnosisOnAdmission: "",
    roomId: "",
    bedNumber: "",
    treatmentPlan: "",
    notes: "",
  });

  useEffect(() => {
    checkAuth();
    fetchPatients();
    fetchDoctors();
    fetchAvailableBeds();
  }, []);

  useEffect(() => {
    if (searchQuery.length > 0) {
      const filtered = patients.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.patientId.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.phone.includes(searchQuery)
      );
      setFilteredPatients(filtered);
    } else {
      setFilteredPatients([]);
    }
  }, [searchQuery, patients]);

  const checkAuth = () => {
    const token =
      localStorage.getItem("proclinic_token") ||
      sessionStorage.getItem("proclinic_token");
    if (!token) {
      navigate("/login");
      return;
    }
    if (!canAccessRoute("/ipd/admit")) {
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
        if (doctorList.length === 1) {
          setFormData((prev) => ({ ...prev, doctorId: doctorList[0]._id }));
        }
      }
    } catch (err) {
      console.error("Error fetching doctors:", err);
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

  const handleSelectPatient = (patient: Patient) => {
    setFormData((prev) => ({
      ...prev,
      patientId: patient._id,
      name: patient.name,
    }));
    setSearchQuery("");
    setFilteredPatients([]);
    setIsNewPatient(false);
  };

  const handleBedChange = (roomId: string, bedNumber: string) => {
    setFormData((prev) => ({
      ...prev,
      roomId,
      bedNumber,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!isNewPatient && !formData.patientId) {
        showError("Please select a patient or create a new one");
        setIsSubmitting(false);
        return;
      }

      if (isNewPatient) {
        if (!formData.name || !formData.dateOfBirth || !formData.gender || !formData.phone) {
          showError("Please fill all required patient details");
          setIsSubmitting(false);
          return;
        }
      }

      if (!formData.doctorId) {
        showError("Please select a doctor");
        setIsSubmitting(false);
        return;
      }

      const payload: any = {
        doctorId: formData.doctorId,
        admissionDate: formData.admissionDate,
        admissionTime: formData.admissionTime,
        admissionType: formData.admissionType,
        admissionReason: formData.admissionReason || null,
        diagnosisOnAdmission: formData.diagnosisOnAdmission || null,
        treatmentPlan: formData.treatmentPlan || null,
        notes: formData.notes || null,
      };

      if (!isNewPatient) {
        payload.patientId = formData.patientId;
      } else {
        payload.name = formData.name;
        payload.dateOfBirth = formData.dateOfBirth;
        payload.gender = formData.gender;
        payload.phone = formData.phone;
        payload.email = formData.email || null;
      }

      if (formData.roomId && formData.bedNumber) {
        payload.roomId = formData.roomId;
        payload.bedNumber = formData.bedNumber;
      }

      const response = await ipdAPI.create(payload);

      if (response.success) {
        showSuccess("Patient admitted successfully!");
        setTimeout(() => {
          navigate("/ipd/dashboard");
        }, 1000);
      } else {
        showError(response.message || "Failed to admit patient");
      }
    } catch (err: any) {
      showError(err.message || "An error occurred");
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
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm shadow-sm">
          <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4 lg:px-8">
            <div>
              <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Admit Patient</h1>
              <p className="mt-1 text-xs text-slate-600 sm:mt-1.5 sm:text-sm">
                Register a new inpatient admission
              </p>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 lg:p-8">
              {/* Patient Selection */}
              <div className="mb-6">
                <div className="mb-4 flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsNewPatient(false);
                      setFormData((prev) => ({
                        ...prev,
                        name: "",
                        dateOfBirth: "",
                        gender: "",
                        phone: "",
                        email: "",
                      }));
                    }}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                      !isNewPatient
                        ? "bg-indigo-600 text-white shadow-md"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    Existing Patient
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsNewPatient(true);
                      setFormData((prev) => ({ ...prev, patientId: "" }));
                      setSearchQuery("");
                    }}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                      isNewPatient
                        ? "bg-indigo-600 text-white shadow-md"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    New Patient
                  </button>
                </div>

                {!isNewPatient ? (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Search Patient
                    </label>
                    <input
                      type="text"
                      placeholder="Search by name, patient ID, or phone"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                    {filteredPatients.length > 0 && (
                      <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                        {filteredPatients.map((patient) => (
                          <div
                            key={patient._id}
                            onClick={() => handleSelectPatient(patient)}
                            className="cursor-pointer px-4 py-2 text-sm hover:bg-indigo-50"
                          >
                            <p className="font-medium text-slate-900">
                              {patient.name} ({patient.patientId})
                            </p>
                            <p className="text-xs text-slate-500">{patient.phone}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {formData.patientId && (
                      <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                        Selected: <span className="font-semibold">{formData.name}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Date of Birth *
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.dateOfBirth}
                        onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Gender *
                      </label>
                      <select
                        required
                        value={formData.gender}
                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      >
                        <option value="">Select Gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Phone *
                      </label>
                      <input
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Admission Details */}
              <h2 className="mb-4 text-lg font-semibold text-slate-900">Admission Details</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Attending Doctor *
                  </label>
                  <select
                    required
                    value={formData.doctorId}
                    onChange={(e) => setFormData({ ...formData, doctorId: e.target.value })}
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
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Admission Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.admissionDate}
                    onChange={(e) => setFormData({ ...formData, admissionDate: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Admission Time
                  </label>
                  <input
                    type="time"
                    value={formData.admissionTime}
                    onChange={(e) => setFormData({ ...formData, admissionTime: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Admission Type *
                  </label>
                  <select
                    required
                    value={formData.admissionType}
                    onChange={(e) => setFormData({ ...formData, admissionType: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  >
                    <option value="planned">Planned</option>
                    <option value="emergency">Emergency</option>
                    <option value="transfer">Transfer</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {/* Room/Bed Assignment */}
              <h2 className="mt-6 mb-4 text-lg font-semibold text-slate-900">Room/Bed Assignment</h2>
              {availableBeds.length > 0 ? (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Select Room & Bed
                  </label>
                  <select
                    value={`${formData.roomId}-${formData.bedNumber}`}
                    onChange={(e) => {
                      const [roomId, bedNumber] = e.target.value.split("-");
                      handleBedChange(roomId, bedNumber);
                    }}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  >
                    <option value="">Not Assigned</option>
                    {availableBeds.map((bed) => (
                      <option key={`${bed.roomId}-${bed.bedNumber}`} value={`${bed.roomId}-${bed.bedNumber}`}>
                        {bed.roomNumber} - Bed {bed.bedNumber} ({bed.roomType}) - ₹{bed.ratePerDay}/day
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <p className="text-sm text-slate-600">No available beds. Patient can be admitted without room assignment.</p>
              )}

              {/* Medical Information */}
              <h2 className="mt-6 mb-4 text-lg font-semibold text-slate-900">Medical Information</h2>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Admission Reason
                  </label>
                  <textarea
                    value={formData.admissionReason}
                    onChange={(e) => setFormData({ ...formData, admissionReason: e.target.value })}
                    rows={2}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="Reason for admission..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Diagnosis on Admission
                  </label>
                  <textarea
                    value={formData.diagnosisOnAdmission}
                    onChange={(e) => setFormData({ ...formData, diagnosisOnAdmission: e.target.value })}
                    rows={2}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="Initial diagnosis..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Treatment Plan
                  </label>
                  <textarea
                    value={formData.treatmentPlan}
                    onChange={(e) => setFormData({ ...formData, treatmentPlan: e.target.value })}
                    rows={3}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="Treatment plan..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="Additional notes..."
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className="mt-6 flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-end sm:gap-3 sm:pt-6">
                <button
                  type="button"
                  onClick={() => navigate("/ipd/dashboard")}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:w-auto"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  {isSubmitting ? "Admitting..." : "Admit Patient"}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}

export default IPDAdmit;
