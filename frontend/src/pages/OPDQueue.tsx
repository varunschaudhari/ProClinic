import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { opdAPI, usersAPI } from "../utils/api";
import { canAccessRoute } from "../utils/permissions";
import { showSuccess, showError } from "../utils/toast";

type QueueItem = {
  _id: string;
  opdNumber: string;
  patientId: {
    _id: string;
    name: string;
    patientId: string;
    phone: string;
  };
  doctorId: {
    _id: string;
    name: string;
  };
  visitDate: string;
  visitTime: string;
  status: string;
  queueNumber: number;
};

function OPDQueue() {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState<Array<{ _id: string; name: string }>>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<string>("");
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    checkAuth();
    fetchDoctors();
  }, []);

  useEffect(() => {
    if (selectedDoctor) {
      fetchQueue();
      // Auto-refresh queue every 10 seconds
      const interval = setInterval(fetchQueue, 10000);
      return () => clearInterval(interval);
    }
  }, [selectedDoctor, selectedDate]);

  const checkAuth = () => {
    const token =
      localStorage.getItem("proclinic_token") ||
      sessionStorage.getItem("proclinic_token");
    if (!token) {
      navigate("/login");
      return;
    }
    if (!canAccessRoute("/opd")) {
      navigate("/dashboard");
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
          setSelectedDoctor(doctorList[0]._id);
        }
      }
    } catch (err) {
      console.error("Error fetching doctors:", err);
    }
  };

  const fetchQueue = async () => {
    if (!selectedDoctor) return;
    try {
      setLoading(true);
      const response = await opdAPI.getQueue(selectedDoctor, selectedDate);
      if (response.success) {
        setQueue(response.data.queue);
      } else {
        showError("Failed to fetch queue");
      }
    } catch (err) {
      showError("Error loading queue");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (opdId: string, newStatus: string) => {
    try {
      const response = await opdAPI.updateStatus(opdId, newStatus);
      if (response.success) {
        showSuccess("Status updated successfully");
        fetchQueue();
      } else {
        showError(response.message || "Failed to update status");
      }
    } catch (err) {
      showError("Error updating status");
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
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  if (loading && queue.length === 0) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <div className="flex flex-1 items-center justify-center lg:ml-72">
          <div className="text-center">
            <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
            <p className="text-slate-600">Loading queue...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <div className="flex flex-1 flex-col lg:ml-72">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm shadow-sm">
          <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4 lg:px-8">
            <div>
              <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">OPD Queue</h1>
              <p className="mt-1 text-xs text-slate-600 sm:mt-1.5 sm:text-sm">
                Manage patient queue for doctors
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
              {doctors.length > 0 && (
                <select
                  value={selectedDoctor}
                  onChange={(e) => setSelectedDoctor(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                >
                  <option value="">Select Doctor</option>
                  {doctors.map((doctor) => (
                    <option key={doctor._id} value={doctor._id}>
                      {doctor.name}
                    </option>
                  ))}
                </select>
              )}
              <button
                onClick={() => navigate("/opd/dashboard")}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:w-auto sm:px-5 sm:py-2.5"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {!selectedDoctor ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
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
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                <p className="text-sm font-medium text-slate-600">Please select a doctor to view queue</p>
              </div>
            </div>
          ) : queue.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
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
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                <p className="text-sm font-medium text-slate-600">No patients in queue</p>
                <p className="mt-1 text-xs text-slate-500">Queue will update automatically</p>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {queue.map((item, index) => (
                <div
                  key={item._id}
                  className={`rounded-xl border-2 p-4 shadow-sm transition ${
                    item.status === "in-progress"
                      ? "border-purple-300 bg-purple-50"
                      : item.status === "waiting" && index === 0
                      ? "border-yellow-300 bg-yellow-50"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-indigo-700">
                          #{item.queueNumber}
                        </span>
                        <span
                          className={`inline-flex rounded-lg border px-2 py-1 text-xs font-semibold ${getStatusColor(
                            item.status
                          )}`}
                        >
                          {item.status.replace("-", " ")}
                        </span>
                      </div>
                      <div className="mt-1 text-xs font-semibold text-indigo-700">
                        {item.opdNumber}
                      </div>
                    </div>
                    <div className="text-xs text-slate-500">{item.visitTime}</div>
                  </div>
                  <div className="mb-3">
                    <p className="font-semibold text-slate-900">{item.patientId.name}</p>
                    <p className="text-xs text-slate-500">
                      {item.patientId.patientId} • {item.patientId.phone}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {item.status === "registered" && (
                      <button
                        onClick={() => handleStatusUpdate(item._id, "waiting")}
                        className="flex-1 rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-1.5 text-xs font-semibold text-yellow-700 transition hover:bg-yellow-100"
                      >
                        Move to Waiting
                      </button>
                    )}
                    {item.status === "waiting" && (
                      <button
                        onClick={() => handleStatusUpdate(item._id, "in-progress")}
                        className="flex-1 rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700 transition hover:bg-purple-100"
                      >
                        Start Consultation
                      </button>
                    )}
                    {item.status === "in-progress" && (
                      <button
                        onClick={() => handleStatusUpdate(item._id, "completed")}
                        className="flex-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                      >
                        Complete
                      </button>
                    )}
                    <button
                      onClick={() => navigate(`/opd/${item._id}`)}
                      className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default OPDQueue;
