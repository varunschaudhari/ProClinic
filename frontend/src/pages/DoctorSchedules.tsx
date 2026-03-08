import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { doctorSchedulesAPI, holidaysAPI, usersAPI } from "../utils/api";
import { hasPermission, PERMISSIONS } from "../utils/permissions";
import { showSuccess, showError, showInfo } from "../utils/toast";

type Doctor = {
  _id: string;
  name: string;
};

type Schedule = {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
};

type DaySchedule = {
  isAvailable: boolean;
  morningSlot?: { startTime: string; endTime: string };
  eveningSlot?: { startTime: string; endTime: string };
};

type Holiday = {
  _id: string;
  doctorId: { _id: string; name: string };
  date: string;
  reason: string;
  description?: string;
};

function DoctorSchedules() {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(false);
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [holidayForm, setHolidayForm] = useState({
    date: "",
    reason: "",
    description: "",
  });

  useEffect(() => {
    checkAuth();
    fetchDoctors();
  }, []);

  useEffect(() => {
    if (selectedDoctor) {
      fetchSchedule();
      fetchHolidays();
    }
  }, [selectedDoctor]);

  const checkAuth = () => {
    const token = localStorage.getItem("proclinic_token") || sessionStorage.getItem("proclinic_token");
    if (!token) {
      navigate("/login");
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

  const getDefaultSchedule = (): Schedule => {
    return {
      monday: {
        isAvailable: true,
        morningSlot: { startTime: "09:00", endTime: "12:00" },
        eveningSlot: { startTime: "17:00", endTime: "20:00" },
      },
      tuesday: {
        isAvailable: true,
        morningSlot: { startTime: "09:00", endTime: "12:00" },
        eveningSlot: { startTime: "17:00", endTime: "20:00" },
      },
      wednesday: {
        isAvailable: true,
        morningSlot: { startTime: "09:00", endTime: "12:00" },
        eveningSlot: { startTime: "17:00", endTime: "20:00" },
      },
      thursday: {
        isAvailable: true,
        morningSlot: { startTime: "09:00", endTime: "12:00" },
        eveningSlot: { startTime: "17:00", endTime: "20:00" },
      },
      friday: {
        isAvailable: true,
        morningSlot: { startTime: "09:00", endTime: "12:00" },
        eveningSlot: { startTime: "17:00", endTime: "20:00" },
      },
      saturday: {
        isAvailable: true,
        morningSlot: { startTime: "09:00", endTime: "12:00" },
        eveningSlot: { startTime: "17:00", endTime: "20:00" },
      },
      sunday: {
        isAvailable: false,
      },
    };
  };

  const fetchSchedule = async () => {
    if (!selectedDoctor) return;
    try {
      setLoading(true);
      const response = await doctorSchedulesAPI.getByDoctorId(selectedDoctor);
      if (response.success && response.data.schedule) {
        setSchedule(response.data.schedule);
      } else {
        // Auto-create default schedule if not found
        const defaultSchedule = getDefaultSchedule();
        setSchedule(defaultSchedule);
        // Optionally auto-save the default schedule
        if (hasPermission(PERMISSIONS.APPOINTMENTS_EDIT)) {
          try {
            await doctorSchedulesAPI.createOrUpdate({
              doctorId: selectedDoctor,
              schedule: defaultSchedule,
            });
            showSuccess("Default schedule created automatically");
          } catch (err) {
            console.error("Error auto-creating schedule:", err);
            // Still show the schedule even if save fails
          }
        }
      }
    } catch (err) {
      console.error("Error fetching schedule:", err);
      // If error (like 404), create default schedule
      const defaultSchedule = getDefaultSchedule();
      setSchedule(defaultSchedule);
    } finally {
      setLoading(false);
    }
  };

  const fetchHolidays = async () => {
    if (!selectedDoctor) return;
    try {
      const response = await holidaysAPI.getAll({ doctorId: selectedDoctor });
      if (response.success) {
        setHolidays(response.data.holidays || []);
      }
    } catch (err) {
      console.error("Error fetching holidays:", err);
    }
  };

  const handleScheduleChange = (day: keyof Schedule, field: string, value: any) => {
    if (!schedule) return;
    setSchedule({
      ...schedule,
      [day]: {
        ...schedule[day],
        [field]: value,
      },
    });
  };

  const handleSlotChange = (day: keyof Schedule, slotType: "morningSlot" | "eveningSlot", field: "startTime" | "endTime", value: string) => {
    if (!schedule) return;
    const currentSlot = schedule[day][slotType] || { startTime: "", endTime: "" };
    setSchedule({
      ...schedule,
      [day]: {
        ...schedule[day],
        [slotType]: {
          ...currentSlot,
          [field]: value,
        },
      },
    });
  };

  const handleSaveSchedule = async () => {
    if (!selectedDoctor || !schedule) return;
    try {
      const response = await doctorSchedulesAPI.createOrUpdate({
        doctorId: selectedDoctor,
        schedule,
      });
      if (response.success) {
        showSuccess("Schedule saved successfully");
      } else {
        showError(response.message || "Failed to save schedule");
      }
    } catch (err) {
      showError("Error saving schedule");
      console.error(err);
    }
  };

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor || !holidayForm.date) {
      showError("Please select a date");
      return;
    }
    try {
      const response = await holidaysAPI.create({
        doctorId: selectedDoctor,
        ...holidayForm,
      });
      if (response.success) {
        showSuccess("Holiday added successfully");
        setShowHolidayModal(false);
        setHolidayForm({ date: "", reason: "", description: "" });
        fetchHolidays();
      } else {
        showError(response.message || "Failed to add holiday");
      }
    } catch (err) {
      showError("Error adding holiday");
      console.error(err);
    }
  };

  const handleDeleteHoliday = async (holidayId: string) => {
    if (!window.confirm("Are you sure you want to delete this holiday?")) return;
    try {
      const response = await holidaysAPI.delete(holidayId);
      if (response.success) {
        showSuccess("Holiday deleted successfully");
        fetchHolidays();
      } else {
        showError(response.message || "Failed to delete holiday");
      }
    } catch (err) {
      showError("Error deleting holiday");
      console.error(err);
    }
  };

  const days = [
    { key: "monday", label: "Monday" },
    { key: "tuesday", label: "Tuesday" },
    { key: "wednesday", label: "Wednesday" },
    { key: "thursday", label: "Thursday" },
    { key: "friday", label: "Friday" },
    { key: "saturday", label: "Saturday" },
    { key: "sunday", label: "Sunday" },
  ] as const;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-4 sm:p-6 sidebar-content-margin">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Doctor Schedules</h1>
            <p className="mt-1 text-sm text-slate-600">Manage doctor availability and holidays</p>
          </div>

          {/* Doctor Selection */}
          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <label className="block text-sm font-medium text-slate-700 mb-2">Select Doctor</label>
            <select
              value={selectedDoctor}
              onChange={(e) => setSelectedDoctor(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 sm:w-auto"
            >
              <option value="">Select Doctor</option>
              {doctors.map((doctor) => (
                <option key={doctor._id} value={doctor._id}>
                  {doctor.name}
                </option>
              ))}
            </select>
          </div>

          {selectedDoctor && schedule && (
            <>
              {/* Schedule */}
              <div className="mb-6 rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-4 py-3 sm:px-6 sm:py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">Weekly Schedule</h2>
                      <p className="mt-1 text-xs text-slate-600">
                        Default slots: Morning 9:00 AM - 12:00 PM, Evening 5:00 PM - 8:00 PM (Monday-Saturday). Schedule is auto-created when selecting a doctor.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {hasPermission(PERMISSIONS.APPOINTMENTS_EDIT) && (
                        <>
                          <button
                            onClick={() => {
                              const defaultSchedule = getDefaultSchedule();
                              setSchedule(defaultSchedule);
                              showInfo("Default schedule loaded. Click 'Save Schedule' to apply.");
                            }}
                            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                          >
                            Reset to Default
                          </button>
                          <button
                            onClick={handleSaveSchedule}
                            className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-800"
                          >
                            Save Schedule
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="p-4 sm:p-6">
                  <div className="space-y-4">
                    {days.map((day) => {
                      const daySchedule = schedule?.[day.key as keyof Schedule];
                      if (!daySchedule) return null;
                      return (
                      <div key={day.key} className="rounded-lg border border-slate-200 p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={daySchedule.isAvailable || false}
                              onChange={(e) => handleScheduleChange(day.key, "isAvailable", e.target.checked)}
                              disabled={!hasPermission(PERMISSIONS.APPOINTMENTS_EDIT)}
                              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-sm font-semibold text-slate-900">{day.label}</span>
                          </label>
                        </div>
                        {daySchedule.isAvailable && (
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">Morning Slot</label>
                              <div className="flex gap-2">
                                <input
                                  type="time"
                                  value={daySchedule.morningSlot?.startTime || ""}
                                  onChange={(e) => handleSlotChange(day.key, "morningSlot", "startTime", e.target.value)}
                                  disabled={!hasPermission(PERMISSIONS.APPOINTMENTS_EDIT)}
                                  className="flex-1 rounded-lg border border-slate-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:opacity-50"
                                />
                                <span className="self-center text-xs text-slate-500">to</span>
                                <input
                                  type="time"
                                  value={daySchedule.morningSlot?.endTime || ""}
                                  onChange={(e) => handleSlotChange(day.key, "morningSlot", "endTime", e.target.value)}
                                  disabled={!hasPermission(PERMISSIONS.APPOINTMENTS_EDIT)}
                                  className="flex-1 rounded-lg border border-slate-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:opacity-50"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">Evening Slot</label>
                              <div className="flex gap-2">
                                <input
                                  type="time"
                                  value={daySchedule.eveningSlot?.startTime || ""}
                                  onChange={(e) => handleSlotChange(day.key, "eveningSlot", "startTime", e.target.value)}
                                  disabled={!hasPermission(PERMISSIONS.APPOINTMENTS_EDIT)}
                                  className="flex-1 rounded-lg border border-slate-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:opacity-50"
                                />
                                <span className="self-center text-xs text-slate-500">to</span>
                                <input
                                  type="time"
                                  value={daySchedule.eveningSlot?.endTime || ""}
                                  onChange={(e) => handleSlotChange(day.key, "eveningSlot", "endTime", e.target.value)}
                                  disabled={!hasPermission(PERMISSIONS.APPOINTMENTS_EDIT)}
                                  className="flex-1 rounded-lg border border-slate-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:opacity-50"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Holidays */}
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-4 py-3 sm:px-6 sm:py-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-slate-900">Holidays</h2>
                    {hasPermission(PERMISSIONS.APPOINTMENTS_EDIT) && (
                      <button
                        onClick={() => setShowHolidayModal(true)}
                        className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-800"
                      >
                        + Add Holiday
                      </button>
                    )}
                  </div>
                </div>
                <div className="p-4 sm:p-6">
                  {holidays.length === 0 ? (
                    <p className="text-sm text-slate-500">No holidays scheduled</p>
                  ) : (
                    <div className="space-y-2">
                      {holidays.map((holiday) => (
                        <div key={holiday._id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                          <div>
                            <div className="text-sm font-semibold text-slate-900">
                              {new Date(holiday.date).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-slate-600">{holiday.reason}</div>
                            {holiday.description && (
                              <div className="text-xs text-slate-500">{holiday.description}</div>
                            )}
                          </div>
                          {hasPermission(PERMISSIONS.APPOINTMENTS_DELETE) && (
                            <button
                              onClick={() => handleDeleteHoliday(holiday._id)}
                              className="text-rose-600 hover:text-rose-800 text-sm"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {!selectedDoctor && (
            <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
              <p className="text-slate-600">Please select a doctor to manage their schedule</p>
            </div>
          )}
        </div>
      </main>

      {/* Add Holiday Modal */}
      {showHolidayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-200 px-4 py-3 sm:px-6 sm:py-4">
              <h2 className="text-base font-semibold text-slate-900 sm:text-lg">Add Holiday</h2>
            </div>
            <form onSubmit={handleAddHoliday} className="px-4 py-4 sm:px-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Date *</label>
                  <input
                    type="date"
                    required
                    value={holidayForm.date}
                    onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Reason *</label>
                  <input
                    type="text"
                    required
                    value={holidayForm.reason}
                    onChange={(e) => setHolidayForm({ ...holidayForm, reason: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="e.g., Public Holiday, Personal Leave"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Description</label>
                  <textarea
                    value={holidayForm.description}
                    onChange={(e) => setHolidayForm({ ...holidayForm, description: e.target.value })}
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="Optional description..."
                  />
                </div>
              </div>
              <div className="mt-6 flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowHolidayModal(false);
                    setHolidayForm({ date: "", reason: "", description: "" });
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:w-auto"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-800 sm:w-auto"
                >
                  Add Holiday
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default DoctorSchedules;
