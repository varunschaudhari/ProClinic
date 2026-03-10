import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { patientsAPI } from "../utils/api";
import { canAccessRoute, hasPermission, PERMISSIONS } from "../utils/permissions";
import { getCityStateFromPincode } from "../utils/pincodeData";
import { filterCities, filterStates, getCitiesByState } from "../utils/indianCitiesStates";
import { showSuccess, showError } from "../utils/toast";

type Patient = {
  _id: string;
  patientId: string;
  name: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup?: string | null;
  phone: string;
  email?: string | null;
  address?: {
    street?: string;
    village?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  emergencyContact?: {
    name?: string;
    relationship?: string;
    phone?: string;
  };
  medicalHistory?: string | null;
  allergies?: string[];
  tags?: string[];
  profileImage?: string | null;
  status: string;
  statusNotes?: string | null;
  statusChangedDate?: string | null;
  statusChangedBy?: {
    _id: string;
    name: string;
  };
  isActive: boolean;
  createdAt: string;
  visitCount?: number;
  opdCount?: number;
  ipdCount?: number;
};

type PatientForm = {
  name: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup: string;
  phone: string;
  email: string;
  address: {
    street: string;
    village: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  medicalHistory: string;
  allergies: string;
  chronicConditions: string;
  notes: string;
  tags: string;
  profileImage: File | null;
};

function Patients() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<PatientForm>({
    name: "",
    dateOfBirth: "",
    gender: "",
    bloodGroup: "",
    phone: "",
    email: "",
    address: {
      street: "",
      village: "",
      city: "",
      state: "",
      zipCode: "",
      country: "India",
    },
    emergencyContact: {
      name: "",
      relationship: "",
      phone: "",
    },
    medicalHistory: "",
    allergies: "",
    chronicConditions: "",
    notes: "",
    tags: "",
    profileImage: null,
  });
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [citySuggestions, setCitySuggestions] = useState<Array<{ city: string; state: string }>>([]);
  const [stateSuggestions, setStateSuggestions] = useState<string[]>([]);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const cityInputRef = useRef<HTMLInputElement>(null);
  const stateInputRef = useRef<HTMLInputElement>(null);
  const cityDropdownRef = useRef<HTMLDivElement>(null);
  const stateDropdownRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [statusFormData, setStatusFormData] = useState({
    status: "",
    statusNotes: "",
  });

  // Filter patients based on search query and status
  const filteredPatients = patients.filter((patient) => {
    // Status filter - handle patients without status field (default to "active")
    const patientStatus = patient.status || "active";
    if (statusFilter && patientStatus !== statusFilter) {
      return false;
    }
    // Search query filter
    if (!searchQuery.trim()) {
      return true;
    }
    const query = searchQuery.toLowerCase().trim();
    const nameMatch = patient.name.toLowerCase().includes(query);
    const phoneMatch = patient.phone.toLowerCase().includes(query);
    const patientIdMatch = patient.patientId.toLowerCase().includes(query);
    const tagsMatch = patient.tags?.some(tag => tag.toLowerCase().includes(query)) || false;
    return nameMatch || phoneMatch || patientIdMatch || tagsMatch;
  });

  useEffect(() => {
    checkAuth();
    fetchPatients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAuth = () => {
    const token =
      localStorage.getItem("proclinic_token") ||
      sessionStorage.getItem("proclinic_token");
    if (!token) {
      navigate("/login");
      return;
    }
    if (!canAccessRoute("/patients")) {
      navigate("/dashboard");
    }
  };

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      const response = await patientsAPI.getAll(params);
      if (response.success) {
        // Debug: Log visit counts to verify data
        if (response.data.patients && response.data.patients.length > 0) {
          const samplePatient = response.data.patients[0];
          console.log("Sample patient with visit counts:", {
            name: samplePatient.name,
            patientId: samplePatient.patientId,
            visitCount: samplePatient.visitCount,
            opdCount: samplePatient.opdCount,
            ipdCount: samplePatient.ipdCount,
            visitCountType: typeof samplePatient.visitCount,
            hasVisitCount: 'visitCount' in samplePatient
          });
          console.log("All patient visit counts:", response.data.patients.map((p: Patient) => ({
            name: p.name,
            patientId: p.patientId,
            visitCount: p.visitCount,
            opdCount: p.opdCount,
            ipdCount: p.ipdCount
          })));
        }
        setPatients(response.data.patients);
      } else {
        showError("Failed to fetch patients");
      }
    } catch (err) {
      showError("Error loading patients");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, [statusFilter]);

  const handleOpenModal = () => {
    setFormData({
      name: "",
      dateOfBirth: "",
      gender: "",
      bloodGroup: "",
      phone: "",
      email: "",
      address: {
        street: "",
        village: "",
        city: "",
        state: "",
        zipCode: "",
        country: "India",
      },
      emergencyContact: {
        name: "",
        relationship: "",
        phone: "",
      },
      medicalHistory: "",
      allergies: "",
      chronicConditions: "",
      notes: "",
      tags: "",
      profileImage: null,
    });
    setPreviewImage(null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({
      name: "",
      dateOfBirth: "",
      gender: "",
      bloodGroup: "",
      phone: "",
      email: "",
      address: {
        street: "",
        village: "",
        city: "",
        state: "",
        zipCode: "",
        country: "India",
      },
      emergencyContact: {
        name: "",
        relationship: "",
        phone: "",
      },
      medicalHistory: "",
      allergies: "",
      chronicConditions: "",
      notes: "",
      tags: "",
      profileImage: null,
    });
    setPreviewImage(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, profileImage: file });
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!formData.name || !formData.dateOfBirth || !formData.gender || !formData.phone) {
        showError("Please fill all required fields");
        setIsSubmitting(false);
        return;
      }

      // Create FormData for file upload
      const formDataToSend = new FormData();
      formDataToSend.append("name", formData.name);
      formDataToSend.append("dateOfBirth", formData.dateOfBirth);
      formDataToSend.append("gender", formData.gender);
      if (formData.bloodGroup) {
        formDataToSend.append("bloodGroup", formData.bloodGroup);
      }
      formDataToSend.append("phone", formData.phone);
      if (formData.email) {
        formDataToSend.append("email", formData.email);
      }
      if (formData.address.street || formData.address.city || formData.address.state || formData.address.zipCode) {
        formDataToSend.append("address[street]", formData.address.street);
        formDataToSend.append("address[village]", formData.address.village);
        formDataToSend.append("address[city]", formData.address.city);
        formDataToSend.append("address[state]", formData.address.state);
        formDataToSend.append("address[zipCode]", formData.address.zipCode);
        formDataToSend.append("address[country]", formData.address.country);
      }
      if (formData.emergencyContact.name || formData.emergencyContact.phone) {
        formDataToSend.append("emergencyContact[name]", formData.emergencyContact.name);
        formDataToSend.append("emergencyContact[relationship]", formData.emergencyContact.relationship);
        formDataToSend.append("emergencyContact[phone]", formData.emergencyContact.phone);
      }
      if (formData.medicalHistory) {
        formDataToSend.append("medicalHistory", formData.medicalHistory);
      }
      if (formData.allergies) {
        formDataToSend.append("allergies", formData.allergies);
      }
      if (formData.chronicConditions) {
        formDataToSend.append("chronicConditions", formData.chronicConditions);
      }
      if (formData.notes) {
        formDataToSend.append("notes", formData.notes);
      }
      if (formData.tags) {
        formDataToSend.append("tags", formData.tags);
      }
      if (formData.profileImage) {
        formDataToSend.append("profileImage", formData.profileImage);
      }

      const response = await patientsAPI.create(formDataToSend);

      if (response.success) {
        showSuccess("Patient created successfully");
        fetchPatients();
        setTimeout(() => {
          handleCloseModal();
        }, 1000);
      } else {
        showError(response.message || "Failed to create patient");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      showError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "inactive":
        return "bg-slate-50 text-slate-700 border-slate-200";
      case "discharged":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "transferred":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "deceased":
        return "bg-red-50 text-red-700 border-red-200";
      case "absconded":
        return "bg-orange-50 text-orange-700 border-orange-200";
      case "on-leave":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "follow-up":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;

    try {
      const response = await patientsAPI.updateStatus(selectedPatient._id, {
        status: statusFormData.status,
        statusNotes: statusFormData.statusNotes || undefined,
      });

      if (response.success) {
        showSuccess("Patient status updated successfully");
        setShowStatusModal(false);
        setSelectedPatient(null);
        fetchPatients();
      } else {
        showError(response.message || "Failed to update patient status");
      }
    } catch (err: any) {
      console.error("Error updating patient status:", err);
      showError(err.message || "Failed to update patient status");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <div className="flex flex-1 items-center justify-center sidebar-content-margin">
          <div className="text-center">
            <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
            <p className="text-slate-600">Loading patients...</p>
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
              <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Patients</h1>
              <p className="mt-1 text-xs text-slate-600 sm:mt-1.5 sm:text-sm">
                Manage patient records and information
              </p>
            </div>
            {hasPermission(PERMISSIONS.PATIENTS_CREATE) && (
              <button
                onClick={handleOpenModal}
                className="w-full rounded-xl bg-indigo-700 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-500/30 transition hover:bg-indigo-800 hover:shadow-lg hover:shadow-indigo-500/40 sm:w-auto sm:px-5 sm:py-2.5"
              >
                + Add Patient
              </button>
            )}
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {/* Search and Filter Bar */}
          <div className="mb-4 sm:mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <svg
                  className="h-5 w-5 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search by name, mobile, or patient ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 sm:py-3"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                >
                  <svg
                    className="h-5 w-5 text-slate-400 hover:text-slate-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 px-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 sm:py-3"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="discharged">Discharged</option>
                <option value="transferred">Transferred</option>
                <option value="deceased">Deceased</option>
                <option value="absconded">Absconded</option>
                <option value="on-leave">On Leave</option>
                <option value="follow-up">Follow-up</option>
              </select>
            </div>
          </div>
          {(searchQuery || statusFilter) && (
            <p className="mb-4 text-xs text-slate-500">
              {filteredPatients.length === 0
                ? "No patients found"
                : `Found ${filteredPatients.length} patient${filteredPatients.length !== 1 ? "s" : ""}`}
            </p>
          )}

          {/* Patients Table */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full min-w-[640px]">
                <thead className="border-b border-slate-200 bg-slate-50/80">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 sm:px-6 sm:py-4">
                      Patient ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 sm:px-6 sm:py-4">
                      Name
                    </th>
                    <th className="hidden px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 sm:table-cell sm:px-6 sm:py-4">
                      Age/Gender
                    </th>
                    <th className="hidden px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 md:table-cell sm:px-6 sm:py-4">
                      Phone
                    </th>
                    <th className="hidden px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 lg:table-cell sm:px-6 sm:py-4">
                      Blood Group
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 sm:px-6 sm:py-4">
                      Total Visits
                    </th>
                    <th className="hidden px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 lg:table-cell sm:px-6 sm:py-4">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-600 sm:px-6 sm:py-4">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredPatients.length === 0 && !searchQuery && !statusFilter ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <svg
                            className="mb-4 h-12 w-12 text-slate-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17 20h5v-2a3 3 0 00-3-3h-4a3 3 0 00-3 3v2zM9 10a3 3 0 100-6 3 3 0 000 6zm7 0a3 3 0 100-6 3 3 0 000 6z"
                            />
                          </svg>
                          <p className="text-sm font-medium text-slate-600">
                            No patients found
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Get started by adding your first patient
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredPatients.length === 0 && (searchQuery || statusFilter) ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <svg
                            className="mb-4 h-12 w-12 text-slate-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            />
                          </svg>
                          <p className="text-sm font-medium text-slate-600">
                            No patients found matching "{searchQuery}"
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Try searching by name, mobile number, or patient ID
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredPatients.map((patient) => (
                      <tr
                        key={patient._id}
                        className="cursor-pointer transition-colors hover:bg-slate-50/50"
                        onClick={() => navigate(`/patients/${patient._id}`)}
                      >
                        <td className="whitespace-nowrap px-4 py-3 sm:px-6 sm:py-4">
                          <div className="text-xs font-semibold text-indigo-700 sm:text-sm">
                            {patient.patientId}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 sm:px-6 sm:py-4">
                          <div className="flex items-center gap-2 sm:gap-3">
                            {patient.profileImage ? (
                              <img
                                src={`http://localhost:5000${patient.profileImage}`}
                                alt={patient.name}
                                className="h-8 w-8 rounded-full object-cover sm:h-10 sm:w-10"
                              />
                            ) : (
                              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-sm sm:h-10 sm:w-10">
                                <span className="text-xs font-bold text-white sm:text-sm">
                                  {patient.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <div className="text-xs font-semibold text-slate-900 sm:text-sm">
                                  {patient.name}
                                </div>
                                {patient.tags && patient.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {patient.tags.slice(0, 2).map((tag, idx) => (
                                      <span
                                        key={idx}
                                        className="inline-flex rounded border border-purple-200 bg-purple-50 px-1.5 py-0.5 text-[10px] font-semibold text-purple-700"
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                    {patient.tags.length > 2 && (
                                      <span className="text-[10px] text-slate-500">
                                        +{patient.tags.length - 2}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="mt-0.5 text-xs text-slate-500 sm:hidden">
                                {calculateAge(patient.dateOfBirth)} yrs, {patient.gender}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="hidden whitespace-nowrap px-4 py-3 text-xs text-slate-600 sm:table-cell sm:px-6 sm:py-4">
                          <div className="text-xs text-slate-600 sm:text-sm">
                            {calculateAge(patient.dateOfBirth)} yrs, {patient.gender}
                          </div>
                        </td>
                        <td className="hidden whitespace-nowrap px-4 py-3 text-xs text-slate-600 md:table-cell sm:px-6 sm:py-4">
                          <div className="text-xs text-slate-600 sm:text-sm">
                            {patient.phone}
                          </div>
                        </td>
                        <td className="hidden whitespace-nowrap px-4 py-3 lg:table-cell sm:px-6 sm:py-4">
                          {patient.bloodGroup ? (
                            <span className="inline-flex rounded-lg border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 sm:px-2.5 sm:py-1 sm:text-xs">
                              {patient.bloodGroup}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 sm:px-6 sm:py-4">
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                            <span className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700">
                              <svg
                                className="h-3.5 w-3.5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                              </svg>
                              {patient.visitCount !== undefined ? patient.visitCount : 0}
                            </span>
                            {(patient.opdCount || patient.ipdCount) ? (
                              <div className="flex flex-wrap gap-1 text-[10px] text-slate-500">
                                {patient.opdCount > 0 && (
                                  <span className="rounded bg-blue-50 px-1 py-0.5 text-blue-700">
                                    OPD: {patient.opdCount}
                                  </span>
                                )}
                                {patient.ipdCount > 0 && (
                                  <span className="rounded bg-purple-50 px-1 py-0.5 text-purple-700">
                                    IPD: {patient.ipdCount}
                                  </span>
                                )}
                              </div>
                            ) : null}
                          </div>
                        </td>
                        <td className="hidden whitespace-nowrap px-4 py-3 lg:table-cell sm:px-6 sm:py-4">
                          <span
                            className={`inline-flex rounded-lg border px-2 py-1 text-[10px] font-semibold capitalize sm:text-xs ${getStatusColor(
                              patient.status || "active"
                            )}`}
                          >
                            {(patient.status || "active").replace("-", " ")}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right sm:px-6 sm:py-4">
                          <div className="flex items-center justify-end gap-2">
                            {hasPermission(PERMISSIONS.PATIENTS_EDIT) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedPatient(patient);
                                  setStatusFormData({
                                    status: patient.status || "active",
                                    statusNotes: patient.statusNotes || "",
                                  });
                                  setShowStatusModal(true);
                                }}
                                className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 sm:px-3 sm:py-1.5 sm:text-xs"
                                title="Update Status"
                              >
                                Status
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/patients/${patient._id}`);
                              }}
                              className="rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1 text-[10px] font-semibold text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100 sm:px-3 sm:py-1.5 sm:text-xs"
                            >
                              View
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* Add Patient Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-xl my-auto max-h-[90vh] overflow-y-auto">
            <div className="border-b border-slate-200 px-4 py-3 sm:px-6 sm:py-4 sticky top-0 bg-white">
              <h2 className="text-base font-semibold text-slate-900 sm:text-lg">
                Add New Patient
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="px-4 py-4 sm:px-6">
              <div className="space-y-4">
                {/* Profile Image */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Profile Image
                  </label>
                  {previewImage ? (
                    <div className="mb-2">
                      <img
                        src={previewImage}
                        alt="Preview"
                        className="h-20 w-20 rounded-full object-cover border-2 border-slate-300"
                      />
                    </div>
                  ) : null}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Date of Birth */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700">
                      Date of Birth *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.dateOfBirth}
                      onChange={(e) =>
                        setFormData({ ...formData, dateOfBirth: e.target.value })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700">
                      Gender *
                    </label>
                    <select
                      required
                      value={formData.gender}
                      onChange={(e) =>
                        setFormData({ ...formData, gender: e.target.value })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    >
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Blood Group */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700">
                      Blood Group
                    </label>
                    <select
                      value={formData.bloodGroup}
                      onChange={(e) =>
                        setFormData({ ...formData, bloodGroup: e.target.value })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    >
                      <option value="">Select Blood Group</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700">
                      Phone *
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                </div>

                {/* Address */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Address
                  </label>
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Street"
                      value={formData.address.street}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          address: { ...formData.address, street: e.target.value },
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative">
                        <input
                          ref={cityInputRef}
                          type="text"
                          placeholder="City"
                          value={formData.address.city}
                          onChange={(e) => {
                            const cityValue = e.target.value;
                            setFormData({
                              ...formData,
                              address: { ...formData.address, city: cityValue },
                            });
                            if (cityValue.length > 0) {
                              const suggestions = filterCities(cityValue);
                              setCitySuggestions(suggestions.slice(0, 10));
                              setShowCityDropdown(true);
                            } else {
                              setShowCityDropdown(false);
                            }
                          }}
                          onFocus={() => {
                            if (formData.address.city.length > 0) {
                              const suggestions = filterCities(formData.address.city);
                              setCitySuggestions(suggestions.slice(0, 10));
                              setShowCityDropdown(true);
                            }
                          }}
                          onBlur={() => {
                            // Delay to allow click on dropdown item
                            setTimeout(() => setShowCityDropdown(false), 200);
                          }}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        />
                        {showCityDropdown && citySuggestions.length > 0 && (
                          <div
                            ref={cityDropdownRef}
                            className="absolute z-[100] mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg"
                          >
                            {citySuggestions.map((item, index) => (
                              <div
                                key={index}
                                onClick={() => {
                                  setFormData({
                                    ...formData,
                                    address: {
                                      ...formData.address,
                                      city: item.city,
                                      state: item.state,
                                    },
                                  });
                                  setShowCityDropdown(false);
                                }}
                                className="cursor-pointer px-4 py-2 text-sm hover:bg-indigo-50"
                              >
                                <div className="font-medium text-slate-900">{item.city}</div>
                                <div className="text-xs text-slate-500">{item.state}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="relative">
                        <input
                          ref={stateInputRef}
                          type="text"
                          placeholder="State"
                          value={formData.address.state}
                          onChange={(e) => {
                            const stateValue = e.target.value;
                            setFormData({
                              ...formData,
                              address: { ...formData.address, state: stateValue },
                            });
                            if (stateValue.length > 0) {
                              const suggestions = filterStates(stateValue);
                              setStateSuggestions(suggestions.slice(0, 10));
                              setShowStateDropdown(true);
                            } else {
                              setShowStateDropdown(false);
                            }
                          }}
                          onFocus={() => {
                            if (formData.address.state.length > 0) {
                              const suggestions = filterStates(formData.address.state);
                              setStateSuggestions(suggestions.slice(0, 10));
                              setShowStateDropdown(true);
                            }
                          }}
                          onBlur={() => {
                            // Delay to allow click on dropdown item
                            setTimeout(() => setShowStateDropdown(false), 200);
                          }}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        />
                        {showStateDropdown && stateSuggestions.length > 0 && (
                          <div
                            ref={stateDropdownRef}
                            className="absolute z-[100] mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg"
                          >
                            {stateSuggestions.map((state, index) => (
                              <div
                                key={index}
                                onClick={() => {
                                  setFormData({
                                    ...formData,
                                    address: {
                                      ...formData.address,
                                      state: state,
                                      // Auto-populate city if state is selected and city is empty
                                      city: formData.address.city || (getCitiesByState(state)[0] || ""),
                                    },
                                  });
                                  setShowStateDropdown(false);
                                }}
                                className="cursor-pointer px-4 py-2 text-sm hover:bg-indigo-50"
                              >
                                {state}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Zip Code"
                        maxLength={6}
                        value={formData.address.zipCode}
                        onChange={(e) => {
                          const zipCode = e.target.value.replace(/\D/g, ""); // Only allow digits
                          const newAddress = { ...formData.address, zipCode };
                          
                          // Auto-populate city and state when zip code is 6 digits
                          if (zipCode.length === 6) {
                            const locationData = getCityStateFromPincode(zipCode);
                            if (locationData) {
                              newAddress.city = locationData.city;
                              newAddress.state = locationData.state;
                            }
                          }
                          
                          setFormData({
                            ...formData,
                            address: newAddress,
                          });
                        }}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      />
                      <input
                        type="text"
                        placeholder="Country"
                        value={formData.address.country}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            address: { ...formData.address, country: e.target.value },
                          })
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      />
                    </div>
                  </div>
                </div>

                {/* Emergency Contact */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Emergency Contact
                  </label>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <input
                      type="text"
                      placeholder="Name"
                      value={formData.emergencyContact.name}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          emergencyContact: { ...formData.emergencyContact, name: e.target.value },
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                    <input
                      type="text"
                      placeholder="Relationship"
                      value={formData.emergencyContact.relationship}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          emergencyContact: { ...formData.emergencyContact, relationship: e.target.value },
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                    <input
                      type="tel"
                      placeholder="Phone"
                      value={formData.emergencyContact.phone}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          emergencyContact: { ...formData.emergencyContact, phone: e.target.value },
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>
                </div>

                {/* Medical History */}
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Medical History
                  </label>
                  <textarea
                    value={formData.medicalHistory}
                    onChange={(e) =>
                      setFormData({ ...formData, medicalHistory: e.target.value })
                    }
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="Previous medical conditions, surgeries, etc."
                  />
                </div>

                {/* Allergies */}
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Allergies (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={formData.allergies}
                    onChange={(e) =>
                      setFormData({ ...formData, allergies: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="e.g., Penicillin, Peanuts, Dust"
                  />
                </div>

                {/* Chronic Conditions */}
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Chronic Conditions (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={formData.chronicConditions}
                    onChange={(e) =>
                      setFormData({ ...formData, chronicConditions: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="e.g., Diabetes, Hypertension, Asthma"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="Additional notes about the patient..."
                  />
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) =>
                      setFormData({ ...formData, tags: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="e.g., Senior Citizen, VIP, Frequent No-Show"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Separate multiple tags with commas
                  </p>
                </div>

              </div>

              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:w-auto"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  {isSubmitting ? "Creating..." : "Create Patient"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update Status Modal */}
      {showStatusModal && selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-200">
              <h2 className="text-base font-semibold text-slate-900 sm:text-lg">
                Update Patient Status
              </h2>
              <p className="mt-1 text-xs text-slate-600 sm:text-sm">
                {selectedPatient.name} ({selectedPatient.patientId})
              </p>
            </div>
            <form onSubmit={handleStatusUpdate} className="px-4 py-4 sm:px-6 sm:pb-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Status *
                  </label>
                  <select
                    required
                    value={statusFormData.status}
                    onChange={(e) =>
                      setStatusFormData({ ...statusFormData, status: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="discharged">Discharged</option>
                    <option value="transferred">Transferred</option>
                    <option value="deceased">Deceased</option>
                    <option value="absconded">Absconded</option>
                    <option value="on-leave">On Leave</option>
                    <option value="follow-up">Follow-up</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Status Notes
                  </label>
                  <textarea
                    value={statusFormData.statusNotes}
                    onChange={(e) =>
                      setStatusFormData({ ...statusFormData, statusNotes: e.target.value })
                    }
                    rows={3}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="Optional notes about the status change..."
                  />
                </div>
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowStatusModal(false);
                    setSelectedPatient(null);
                    setStatusFormData({ status: "", statusNotes: "" });
                  }}
                  className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-indigo-700 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-800"
                >
                  Update Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Patients;
