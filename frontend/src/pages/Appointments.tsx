import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { appointmentsAPI, patientsAPI, usersAPI } from "../utils/api";
import { hasPermission, PERMISSIONS } from "../utils/permissions";
import { showSuccess, showError } from "../utils/toast";

type Appointment = {
  _id: string;
  patientId: {
    _id: string;
    name: string;
    phone: string;
    patientId: string;
  };
  doctorId: {
    _id: string;
    name: string;
    email: string;
  };
  appointmentDate: string;
  appointmentTime: string;
  appointmentType: "booked" | "walk-in";
  status: "scheduled" | "completed" | "cancelled" | "no-show";
  chiefComplaint?: string;
  notes?: string;
  createdAt: string;
};

type Patient = {
  _id: string;
  name: string;
  patientId: string;
};

type Doctor = {
  _id: string;
  name: string;
};

function Appointments() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterDoctor, setFilterDoctor] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotMessage, setSlotMessage] = useState("");
  const [bookingForm, setBookingForm] = useState({
    patientId: "",
    doctorId: "",
    appointmentDate: new Date().toISOString().split('T')[0],
    appointmentTime: "",
    appointmentType: "booked" as "booked" | "walk-in",
    chiefComplaint: "",
    notes: "",
  });

  useEffect(() => {
    checkAuth();
    fetchAppointments();
    fetchPatients();
    fetchDoctors();
  }, [filterDate, filterDoctor, filterStatus]);

  const checkAuth = () => {
    const token = localStorage.getItem("proclinic_token") || sessionStorage.getItem("proclinic_token");
    if (!token) {
      navigate("/login");
    }
  };

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filterDate) params.date = filterDate;
      if (filterDoctor) params.doctorId = filterDoctor;
      if (filterStatus) params.status = filterStatus;
      const response = await appointmentsAPI.getAll(params);
      if (response.success) {
        setAppointments(response.data.appointments || []);
      } else {
        showError(response.message || "Failed to fetch appointments");
      }
    } catch (err) {
      showError("Error fetching appointments");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const response = await patientsAPI.getAll();
      if (response.success) {
        setPatients(response.data.patients || []);
      }
    } catch (err) {
      console.error("Error fetching patients:", err);
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
        setDoctors(doctorUsers.map((user: any) => ({ _id: user._id, name: user.name })));
      }
    } catch (err) {
      console.error("Error fetching doctors:", err);
    }
  };

  const fetchAvailableSlots = async (doctorId: string, date: string) => {
    if (!doctorId || !date) {
      setAvailableSlots([]);
      setSlotMessage("");
      return;
    }
    try {
      setLoadingSlots(true);
      setSlotMessage("");
      const response = await appointmentsAPI.getAvailableSlots(doctorId, date);
      if (response.success) {
        setAvailableSlots(response.data.availableSlots || []);
        if (response.message) {
          setSlotMessage(response.message);
        } else if (response.data.availableSlots && response.data.availableSlots.length === 0) {
          setSlotMessage("No slots available for this date");
        }
      } else {
        setAvailableSlots([]);
        setSlotMessage(response.message || "Unable to fetch slots");
      }
    } catch (err) {
      console.error("Error fetching available slots:", err);
      setAvailableSlots([]);
      setSlotMessage("Error loading slots. Please try again.");
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleBookingFormChange = (field: string, value: any) => {
    setBookingForm(prev => ({ ...prev, [field]: value }));
    if (field === "doctorId" || field === "appointmentDate") {
      const doctorId = field === "doctorId" ? value : bookingForm.doctorId;
      const date = field === "appointmentDate" ? value : bookingForm.appointmentDate;
      if (doctorId && date) {
        fetchAvailableSlots(doctorId, date);
      }
    }
  };

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingForm.patientId || !bookingForm.doctorId || !bookingForm.appointmentDate || !bookingForm.appointmentTime) {
      showError("Please fill all required fields");
      return;
    }
    try {
      const response = await appointmentsAPI.create(bookingForm);
      if (response.success) {
        showSuccess("Appointment booked successfully");
        setShowBookingModal(false);
        setBookingForm({
          patientId: "",
          doctorId: "",
          appointmentDate: new Date().toISOString().split('T')[0],
          appointmentTime: "",
          appointmentType: "booked",
          chiefComplaint: "",
          notes: "",
        });
        setAvailableSlots([]);
        fetchAppointments();
      } else {
        showError(response.message || "Failed to book appointment");
      }
    } catch (err) {
      showError("Error booking appointment");
      console.error(err);
    }
  };

  const handleStatusChange = async (appointmentId: string, newStatus: string) => {
    try {
      const response = await appointmentsAPI.update(appointmentId, { status: newStatus as any });
      if (response.success) {
        showSuccess("Appointment status updated");
        fetchAppointments();
      } else {
        showError(response.message || "Failed to update status");
      }
    } catch (err) {
      showError("Error updating appointment");
      console.error(err);
    }
  };

  const handleDelete = async (appointmentId: string) => {
    if (!window.confirm("Are you sure you want to delete this appointment?")) return;
    try {
      const response = await appointmentsAPI.delete(appointmentId);
      if (response.success) {
        showSuccess("Appointment deleted successfully");
        fetchAppointments();
      } else {
        showError(response.message || "Failed to delete appointment");
      }
    } catch (err) {
      showError("Error deleting appointment");
      console.error(err);
    }
  };

  if (loading && appointments.length === 0) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <div className="flex flex-1 items-center justify-center sidebar-content-margin">
          <div className="text-center">
            <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
            <p className="text-slate-600">Loading appointments...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-4 sm:p-6 sidebar-content-margin">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Appointments</h1>
              <p className="mt-1 text-sm text-slate-600">Manage patient appointments</p>
            </div>
            {hasPermission(PERMISSIONS.APPOINTMENTS_CREATE) && (
              <button
                onClick={() => setShowBookingModal(true)}
                className="w-full rounded-xl bg-indigo-700 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-500/30 transition hover:bg-indigo-800 hover:shadow-lg hover:shadow-indigo-500/40 sm:w-auto"
              >
                + Book Appointment
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="mb-6 grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Date</label>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Doctor</label>
              <select
                value={filterDoctor}
                onChange={(e) => setFilterDoctor(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
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
              <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <option value="">All Status</option>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="no-show">No Show</option>
              </select>
            </div>
          </div>

          {/* Appointments List */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {appointments.length === 0 ? (
              <div className="px-6 py-16 text-center">
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
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <p className="text-slate-600">No appointments found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-slate-200 bg-slate-50/80">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 sm:px-6">Date & Time</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 sm:px-6">Patient</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 sm:px-6">Doctor</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 sm:px-6">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 sm:px-6">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-600 sm:px-6">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {appointments.map((apt) => (
                      <tr key={apt._id} className="hover:bg-slate-50/50">
                        <td className="whitespace-nowrap px-4 py-3 sm:px-6">
                          <div className="text-sm font-semibold text-slate-900">
                            {new Date(apt.appointmentDate).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-slate-500">{apt.appointmentTime}</div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 sm:px-6">
                          <div className="text-sm font-semibold text-slate-900">{apt.patientId.name}</div>
                          <div className="text-xs text-slate-500">{apt.patientId.patientId}</div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 sm:px-6">
                          <div className="text-sm text-slate-900">{apt.doctorId.name}</div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 sm:px-6">
                          <span className={`inline-flex rounded-lg border px-2 py-1 text-xs font-semibold ${
                            apt.appointmentType === "booked"
                              ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                              : "border-amber-200 bg-amber-50 text-amber-700"
                          }`}>
                            {apt.appointmentType === "booked" ? "Booked" : "Walk-in"}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 sm:px-6">
                          <select
                            value={apt.status}
                            onChange={(e) => handleStatusChange(apt._id, e.target.value)}
                            disabled={!hasPermission(PERMISSIONS.APPOINTMENTS_EDIT)}
                            className={`rounded-lg border px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-2 ${
                              apt.status === "completed"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : apt.status === "cancelled"
                                ? "border-rose-200 bg-rose-50 text-rose-700"
                                : apt.status === "no-show"
                                ? "border-amber-200 bg-amber-50 text-amber-700"
                                : "border-indigo-200 bg-indigo-50 text-indigo-700"
                            } ${!hasPermission(PERMISSIONS.APPOINTMENTS_EDIT) ? "cursor-not-allowed opacity-50" : ""}`}
                          >
                            <option value="scheduled">Scheduled</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="no-show">No Show</option>
                          </select>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium sm:px-6">
                          {hasPermission(PERMISSIONS.APPOINTMENTS_DELETE) && (
                            <button
                              onClick={() => handleDelete(apt._id)}
                              className="text-rose-600 hover:text-rose-800"
                            >
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-xl my-auto max-h-[90vh] overflow-y-auto">
            <div className="border-b border-slate-200 px-4 py-3 sm:px-6 sm:py-4 sticky top-0 bg-white">
              <h2 className="text-base font-semibold text-slate-900 sm:text-lg">Book Appointment</h2>
            </div>
            <form onSubmit={handleBookAppointment} className="px-4 py-4 sm:px-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Patient *</label>
                    <select
                      required
                      value={bookingForm.patientId}
                      onChange={(e) => handleBookingFormChange("patientId", e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    >
                      <option value="">Select Patient</option>
                      {patients.map((patient) => (
                        <option key={patient._id} value={patient._id}>
                          {patient.name} ({patient.patientId})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Doctor *</label>
                    <select
                      required
                      value={bookingForm.doctorId}
                      onChange={(e) => handleBookingFormChange("doctorId", e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    >
                      <option value="">Select Doctor</option>
                      {doctors.map((doctor) => (
                        <option key={doctor._id} value={doctor._id}>
                          {doctor.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Date *</label>
                    <input
                      type="date"
                      required
                      value={bookingForm.appointmentDate}
                      onChange={(e) => handleBookingFormChange("appointmentDate", e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Time *</label>
                    {loadingSlots ? (
                      <div className="mt-1 text-sm text-slate-500">Loading slots...</div>
                    ) : availableSlots.length === 0 ? (
                      <div className="mt-1 space-y-2">
                        {slotMessage && (
                          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                            <p className="text-sm font-medium text-amber-800">
                              {slotMessage}
                            </p>
                            {slotMessage.includes("No schedule found") && (
                              <p className="mt-2 text-xs text-amber-700">
                                You can set up the doctor's schedule in{" "}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowBookingModal(false);
                                    navigate("/doctor-schedules");
                                  }}
                                  className="font-semibold underline hover:text-amber-900"
                                >
                                  Doctor Schedules
                                </button>
                                {" "}or use manual time entry below.
                              </p>
                            )}
                            {slotMessage.includes("not available on this day") && (
                              <p className="mt-2 text-xs text-amber-700">
                                You can select a different date, update the schedule in{" "}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowBookingModal(false);
                                    navigate("/doctor-schedules");
                                  }}
                                  className="font-semibold underline hover:text-amber-900"
                                >
                                  Doctor Schedules
                                </button>
                                {" "}or use manual time entry below.
                              </p>
                            )}
                            {slotMessage.includes("holiday") && (
                              <p className="mt-2 text-xs text-amber-700">
                                You can select a different date or use manual time entry below to book anyway.
                              </p>
                            )}
                          </div>
                        )}
                        <div className="mt-2">
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            {bookingForm.appointmentType === "walk-in" ? "Walk-in Time (manual entry)" : "Manual Time Entry"}
                          </label>
                          <input
                            type="time"
                            required
                            value={bookingForm.appointmentTime}
                            onChange={(e) => handleBookingFormChange("appointmentTime", e.target.value)}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                          />
                          <p className="mt-1 text-xs text-slate-500">
                            {bookingForm.appointmentType === "walk-in" 
                              ? "Enter the time for this walk-in appointment."
                              : "Enter time manually. The system will check for conflicts when booking."}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <select
                          value={bookingForm.appointmentTime}
                          onChange={(e) => handleBookingFormChange("appointmentTime", e.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        >
                          <option value="">Select from available slots</option>
                          {availableSlots.map((slot) => (
                            <option key={slot} value={slot}>
                              {slot}
                            </option>
                          ))}
                        </select>
                        <div className="relative">
                          <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-300"></div>
                          </div>
                          <div className="relative flex justify-center text-xs">
                            <span className="bg-white px-2 text-slate-500">OR</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            Manual Time Entry
                          </label>
                          <input
                            type="time"
                            value={bookingForm.appointmentTime}
                            onChange={(e) => handleBookingFormChange("appointmentTime", e.target.value)}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                          />
                          <p className="mt-1 text-xs text-slate-500">
                            Enter a custom time if needed
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Type</label>
                  <select
                    value={bookingForm.appointmentType}
                    onChange={(e) => handleBookingFormChange("appointmentType", e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  >
                    <option value="booked">Booked</option>
                    <option value="walk-in">Walk-in</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Chief Complaint</label>
                  <textarea
                    value={bookingForm.chiefComplaint}
                    onChange={(e) => handleBookingFormChange("chiefComplaint", e.target.value)}
                    rows={2}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="Patient's main complaint..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Notes</label>
                  <textarea
                    value={bookingForm.notes}
                    onChange={(e) => handleBookingFormChange("notes", e.target.value)}
                    rows={2}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="Additional notes..."
                  />
                </div>
              </div>
              <div className="mt-6 flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowBookingModal(false);
                    setBookingForm({
                      patientId: "",
                      doctorId: "",
                      appointmentDate: new Date().toISOString().split('T')[0],
                      appointmentTime: "",
                      appointmentType: "booked",
                      chiefComplaint: "",
                      notes: "",
                    });
                    setAvailableSlots([]);
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:w-auto"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-800 sm:w-auto"
                >
                  Book Appointment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Appointments;
