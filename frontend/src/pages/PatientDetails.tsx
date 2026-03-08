import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { patientsAPI, visitsAPI, documentsAPI, usersAPI } from "../utils/api";
import { hasPermission, PERMISSIONS } from "../utils/permissions";
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
  chronicConditions?: string[];
  notes?: string | null;
  tags?: string[];
  profileImage?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
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

function PatientDetails() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
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
  const [visits, setVisits] = useState<any[]>([]);
  const [loadingVisits, setLoadingVisits] = useState(false);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [visitForm, setVisitForm] = useState({
    visitDate: new Date().toISOString().split('T')[0],
    visitType: "Consultation",
    chiefComplaint: "",
    diagnosis: "",
    treatment: "",
    notes: "",
    doctorName: "",
  });
  const [documents, setDocuments] = useState<any[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [documentForm, setDocumentForm] = useState({
    documentType: "Report",
    title: "",
    description: "",
    file: null as File | null,
  });
  const [citySuggestions, setCitySuggestions] = useState<Array<{ city: string; state: string }>>([]);
  const [stateSuggestions, setStateSuggestions] = useState<string[]>([]);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const cityInputRef = useRef<HTMLInputElement>(null);
  const stateInputRef = useRef<HTMLInputElement>(null);
  const cityDropdownRef = useRef<HTMLDivElement>(null);
  const stateDropdownRef = useRef<HTMLDivElement>(null);
  const [doctors, setDoctors] = useState<Array<{ _id: string; name: string }>>([]);
  const [doctorSuggestions, setDoctorSuggestions] = useState<Array<{ _id: string; name: string }>>([]);
  const [showDoctorDropdown, setShowDoctorDropdown] = useState(false);
  const doctorInputRef = useRef<HTMLInputElement>(null);
  const doctorDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkAuth();
    if (id) {
      fetchPatient();
    }
    fetchDoctors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Close doctor dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        doctorDropdownRef.current &&
        !doctorDropdownRef.current.contains(event.target as Node) &&
        doctorInputRef.current &&
        !doctorInputRef.current.contains(event.target as Node)
      ) {
        setShowDoctorDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const checkAuth = () => {
    const token =
      localStorage.getItem("proclinic_token") ||
      sessionStorage.getItem("proclinic_token");
    if (!token) {
      navigate("/login");
    }
  };

  const fetchPatient = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const response = await patientsAPI.getById(id);
      if (response.success) {
        const patientData = response.data.patient;
        setPatient(patientData);
        setFormData({
          name: patientData.name,
          dateOfBirth: patientData.dateOfBirth ? new Date(patientData.dateOfBirth).toISOString().split('T')[0] : "",
          gender: patientData.gender,
          bloodGroup: patientData.bloodGroup || "",
          phone: patientData.phone,
          email: patientData.email || "",
          address: {
            street: patientData.address?.street || "",
            village: patientData.address?.village || "",
            city: patientData.address?.city || "",
            state: patientData.address?.state || "",
            zipCode: patientData.address?.zipCode || "",
            country: patientData.address?.country || "India",
          },
          emergencyContact: {
            name: patientData.emergencyContact?.name || "",
            relationship: patientData.emergencyContact?.relationship || "",
            phone: patientData.emergencyContact?.phone || "",
          },
          medicalHistory: patientData.medicalHistory || "",
          allergies: patientData.allergies?.join(", ") || "",
          chronicConditions: patientData.chronicConditions?.join(", ") || "",
          notes: patientData.notes || "",
          profileImage: null,
        });
        fetchVisits();
        fetchDocuments();
        if (patientData.profileImage) {
          setPreviewImage(`http://localhost:5000${patientData.profileImage}`);
        } else {
          setPreviewImage(null);
        }
      } else {
        showError("Failed to fetch patient");
        setTimeout(() => navigate("/patients"), 2000);
      }
    } catch (err) {
      showError("Error loading patient");
      console.error(err);
      setTimeout(() => navigate("/patients"), 2000);
    } finally {
      setLoading(false);
    }
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

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (patient) {
      setFormData({
        name: patient.name,
        dateOfBirth: patient.dateOfBirth ? new Date(patient.dateOfBirth).toISOString().split('T')[0] : "",
        gender: patient.gender,
        bloodGroup: patient.bloodGroup || "",
        phone: patient.phone,
        email: patient.email || "",
        address: {
          street: patient.address?.street || "",
          village: patient.address?.village || "",
          city: patient.address?.city || "",
          state: patient.address?.state || "",
          zipCode: patient.address?.zipCode || "",
          country: patient.address?.country || "India",
        },
        emergencyContact: {
          name: patient.emergencyContact?.name || "",
          relationship: patient.emergencyContact?.relationship || "",
          phone: patient.emergencyContact?.phone || "",
        },
        medicalHistory: patient.medicalHistory || "",
        allergies: patient.allergies?.join(", ") || "",
        chronicConditions: patient.chronicConditions?.join(", ") || "",
        notes: patient.notes || "",
        profileImage: null,
      });
      if (patient.profileImage) {
        setPreviewImage(`http://localhost:5000${patient.profileImage}`);
      } else {
        setPreviewImage(null);
      }
    }
    setIsEditing(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    setIsSubmitting(true);

    try {
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
      if (formData.address.street || formData.address.village || formData.address.city || formData.address.state || formData.address.zipCode) {
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

      const response = await patientsAPI.update(id, formDataToSend);
      if (response.success) {
        showSuccess("Patient updated successfully");
        setIsEditing(false);
        fetchPatient(); // Refresh patient data
      } else {
        showError(response.message || "Failed to update patient");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      showError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!id) return;

    try {
      const response = await patientsAPI.delete(id);
      if (response.success) {
        showSuccess("Patient deleted successfully");
        setTimeout(() => {
          navigate("/patients");
        }, 1000);
      } else {
        showError(response.message || "Failed to delete patient");
        setShowDeleteModal(false);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      showError(errorMessage);
      setShowDeleteModal(false);
    }
  };

  const fetchVisits = async () => {
    if (!id) return;
    try {
      setLoadingVisits(true);
      const response = await visitsAPI.getByPatientId(id);
      if (response.success) {
        setVisits(response.data.visits || []);
      }
    } catch (err) {
      console.error("Error fetching visits:", err);
    } finally {
      setLoadingVisits(false);
    }
  };

  const handleAddVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      const response = await visitsAPI.create({
        patientId: id,
        ...visitForm,
      });
      if (response.success) {
        showSuccess("Visit added successfully");
        setShowVisitModal(false);
        // Auto-select doctor if only one exists
        const defaultDoctorName = doctors.length === 1 ? doctors[0].name : "";
        setVisitForm({
          visitDate: new Date().toISOString().split('T')[0],
          visitType: "Consultation",
          chiefComplaint: "",
          diagnosis: "",
          treatment: "",
          notes: "",
          doctorName: defaultDoctorName,
        });
        fetchVisits();
      } else {
        showError(response.message || "Failed to add visit");
      }
    } catch (err) {
      showError("Error adding visit");
      console.error(err);
    }
  };

  const fetchDocuments = async () => {
    if (!id) return;
    try {
      setLoadingDocuments(true);
      const response = await documentsAPI.getByPatientId(id);
      if (response.success) {
        setDocuments(response.data.documents || []);
      }
    } catch (err) {
      console.error("Error fetching documents:", err);
    } finally {
      setLoadingDocuments(false);
    }
  };

  const fetchDoctors = async () => {
    try {
      const response = await usersAPI.getAll();
      if (response.success && response.data?.users) {
        // Filter users who have doctor role
        const doctorUsers = response.data.users.filter((user: any) => {
          // Check if user has roles array and if any role name contains "doctor" (case-insensitive)
          if (user.roles && Array.isArray(user.roles)) {
            return user.roles.some((role: any) => 
              role.name && role.name.toLowerCase().includes("doctor")
            );
          }
          // Fallback: check if user.role (legacy field) is "doctor"
          return user.role && user.role.toLowerCase().includes("doctor");
        });
        const doctorList = doctorUsers.map((user: any) => ({ _id: user._id, name: user.name }));
        setDoctors(doctorList);
        setDoctorSuggestions(doctorList);
        
        // Auto-select if only one doctor
        if (doctorList.length === 1) {
          setVisitForm(prev => ({ ...prev, doctorName: doctorList[0].name }));
        }
      }
    } catch (err) {
      console.error("Error fetching doctors:", err);
    }
  };

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !documentForm.file) return;
    try {
      const formData = new FormData();
      formData.append("patientId", id);
      formData.append("documentType", documentForm.documentType);
      formData.append("title", documentForm.title || documentForm.file.name);
      if (documentForm.description) {
        formData.append("description", documentForm.description);
      }
      formData.append("file", documentForm.file);

      const response = await documentsAPI.create(formData);
      if (response.success) {
        showSuccess("Document uploaded successfully");
        setShowDocumentModal(false);
        setDocumentForm({
          documentType: "Report",
          title: "",
          description: "",
          file: null,
        });
        fetchDocuments();
      } else {
        showError(response.message || "Failed to upload document");
      }
    } catch (err) {
      showError("Error uploading document");
      console.error(err);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!window.confirm("Are you sure you want to delete this document?")) {
      return;
    }
    try {
      const response = await documentsAPI.delete(documentId);
      if (response.success) {
        showSuccess("Document deleted successfully");
        fetchDocuments();
      } else {
        showError(response.message || "Failed to delete document");
      }
    } catch (err) {
      showError("Error deleting document");
      console.error(err);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
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

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <div className="flex flex-1 items-center justify-center lg:ml-72">
          <div className="text-center">
            <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
            <p className="text-slate-600">Loading patient details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <div className="flex flex-1 items-center justify-center lg:ml-72">
          <div className="text-center">
            <p className="text-slate-600">Patient not found</p>
            <Link
              to="/patients"
              className="mt-4 inline-block text-indigo-600 hover:text-indigo-700"
            >
              Back to Patients
            </Link>
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
            <div className="flex items-center gap-2 sm:gap-4">
              <Link
                to="/patients"
                className="rounded-lg p-1.5 text-slate-600 transition hover:bg-slate-100 sm:p-2"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
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
                  {isEditing ? "Edit Patient" : "Patient Details"}
                </h1>
                <p className="mt-0.5 text-xs text-slate-600 sm:mt-1.5 sm:text-sm">
                  {isEditing
                    ? "Update patient information"
                    : "View and manage patient details"}
                </p>
              </div>
            </div>
            {!isEditing && (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                {hasPermission(PERMISSIONS.PATIENTS_EDIT) && (
                  <button
                    onClick={handleEdit}
                    className="w-full rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100 sm:w-auto sm:px-5 sm:py-2.5 sm:text-sm"
                  >
                    Edit Patient
                  </button>
                )}
                {hasPermission(PERMISSIONS.PATIENTS_DELETE) && (
                  <button
                    onClick={handleDeleteClick}
                    className="w-full rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100 sm:w-auto sm:px-5 sm:py-2.5 sm:text-sm"
                  >
                    Delete Patient
                  </button>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {/* Alerts */}

          {/* Patient Details Form */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 lg:p-8">
              <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
                {/* Profile Image */}
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Profile Image
                  </label>
                  {isEditing ? (
                    <div>
                      {previewImage ? (
                        <div className="mb-2">
                          <img
                            src={previewImage}
                            alt="Preview"
                            className="h-24 w-24 rounded-full object-cover border-2 border-slate-300"
                          />
                        </div>
                      ) : patient.profileImage ? (
                        <div className="mb-2">
                          <img
                            src={`http://localhost:5000${patient.profileImage}`}
                            alt="Current"
                            className="h-24 w-24 rounded-full object-cover border-2 border-slate-300"
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
                  ) : (
                    <div>
                      {patient.profileImage ? (
                        <img
                          src={`http://localhost:5000${patient.profileImage}`}
                          alt={patient.name}
                          className="h-24 w-24 rounded-full object-cover border-2 border-slate-300"
                        />
                      ) : (
                        <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-slate-300 bg-slate-100">
                          <span className="text-2xl font-bold text-slate-400">
                            {patient.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Patient ID */}
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Patient ID
                  </label>
                  <p className="mt-1 text-sm font-semibold text-indigo-700">
                    {patient.patientId}
                  </p>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Name *
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                  ) : (
                    <p className="mt-1 text-sm font-medium text-slate-900">
                      {patient.name}
                    </p>
                  )}
                </div>

                {/* Date of Birth */}
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Date of Birth *
                  </label>
                  {isEditing ? (
                    <input
                      type="date"
                      required
                      value={formData.dateOfBirth}
                      onChange={(e) =>
                        setFormData({ ...formData, dateOfBirth: e.target.value })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                  ) : (
                    <p className="mt-1 text-sm text-slate-900">
                      {patient.dateOfBirth
                        ? new Date(patient.dateOfBirth).toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "Not set"}
                    </p>
                  )}
                </div>

                {/* Age */}
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Age
                  </label>
                  <p className="mt-1 text-sm text-slate-900">
                    {calculateAge(patient.dateOfBirth)} years
                  </p>
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Gender *
                  </label>
                  {isEditing ? (
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
                  ) : (
                    <p className="mt-1 text-sm text-slate-900 capitalize">
                      {patient.gender}
                    </p>
                  )}
                </div>

                {/* Blood Group */}
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Blood Group
                  </label>
                  {isEditing ? (
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
                  ) : (
                    <p className="mt-1 text-sm font-medium text-slate-900">
                      {patient.bloodGroup || "Not set"}
                    </p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Phone *
                  </label>
                  {isEditing ? (
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                  ) : (
                    <p className="mt-1 text-sm text-slate-900">
                      {patient.phone}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Email
                  </label>
                  {isEditing ? (
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                  ) : (
                    <p className="mt-1 text-sm text-slate-900">
                      {patient.email || "Not set"}
                    </p>
                  )}
                </div>

                {/* Address */}
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Address
                  </label>
                  {isEditing ? (
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
                  ) : (
                    <p className="mt-1 text-sm text-slate-900">
                      {patient.address?.street || patient.address?.village || patient.address?.city || patient.address?.state
                        ? `${patient.address.street || ""}${patient.address.street && patient.address.village ? ", " : ""}${patient.address.village || ""}${patient.address.village && patient.address.city ? ", " : ""}${patient.address.street && !patient.address.village && patient.address.city ? ", " : ""}${patient.address.city || ""}${patient.address.city && patient.address.state ? ", " : ""}${patient.address.state || ""}${patient.address.zipCode ? ` ${patient.address.zipCode}` : ""}${patient.address.country ? `, ${patient.address.country}` : ""}`
                        : "Not set"}
                    </p>
                  )}
                </div>

                {/* Emergency Contact */}
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Emergency Contact
                  </label>
                  {isEditing ? (
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
                  ) : (
                    <p className="mt-1 text-sm text-slate-900">
                      {patient.emergencyContact?.name
                        ? `${patient.emergencyContact.name}${patient.emergencyContact.relationship ? ` (${patient.emergencyContact.relationship})` : ""}${patient.emergencyContact.phone ? ` - ${patient.emergencyContact.phone}` : ""}`
                        : "Not set"}
                    </p>
                  )}
                </div>

                {/* Medical History */}
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Medical History
                  </label>
                  {isEditing ? (
                    <textarea
                      value={formData.medicalHistory}
                      onChange={(e) =>
                        setFormData({ ...formData, medicalHistory: e.target.value })
                      }
                      rows={4}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      placeholder="Previous medical conditions, surgeries, etc."
                    />
                  ) : (
                    <p className="mt-1 text-sm text-slate-900 whitespace-pre-wrap">
                      {patient.medicalHistory || "Not set"}
                    </p>
                  )}
                </div>

                {/* Allergies */}
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Allergies
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.allergies}
                      onChange={(e) =>
                        setFormData({ ...formData, allergies: e.target.value })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      placeholder="e.g., Penicillin, Peanuts, Dust"
                    />
                  ) : (
                    <div className="mt-1 flex flex-wrap gap-2">
                      {patient.allergies && patient.allergies.length > 0 ? (
                        patient.allergies.map((allergy, index) => (
                          <span
                            key={index}
                            className="inline-flex rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700"
                          >
                            {allergy}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-slate-500">No allergies recorded</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Chronic Conditions */}
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Chronic Conditions
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.chronicConditions}
                      onChange={(e) =>
                        setFormData({ ...formData, chronicConditions: e.target.value })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      placeholder="e.g., Diabetes, Hypertension, Asthma"
                    />
                  ) : (
                    <div className="mt-1 flex flex-wrap gap-2">
                      {patient.chronicConditions && patient.chronicConditions.length > 0 ? (
                        patient.chronicConditions.map((condition, index) => (
                          <span
                            key={index}
                            className="inline-flex rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700"
                          >
                            {condition}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-slate-500">No chronic conditions recorded</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Notes
                  </label>
                  {isEditing ? (
                    <textarea
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData({ ...formData, notes: e.target.value })
                      }
                      rows={4}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      placeholder="Additional notes about the patient..."
                    />
                  ) : (
                    <p className="mt-1 text-sm text-slate-900 whitespace-pre-wrap">
                      {patient.notes || "No notes recorded"}
                    </p>
                  )}
                </div>

                {/* Tags */}
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Tags
                  </label>
                  {isEditing ? (
                    <div>
                      <input
                        type="text"
                        value={formData.tags}
                        onChange={(e) =>
                          setFormData({ ...formData, tags: e.target.value })
                        }
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                        placeholder="e.g., Senior Citizen, VIP, Frequent No-Show (comma-separated)"
                      />
                      <p className="mt-1 text-xs text-slate-500">
                        Separate multiple tags with commas
                      </p>
                    </div>
                  ) : (
                    <div className="mt-1 flex flex-wrap gap-2">
                      {patient.tags && patient.tags.length > 0 ? (
                        patient.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex rounded-lg border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700"
                          >
                            {tag}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-slate-500">No tags assigned</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Status
                  </label>
                  <span
                    className={`mt-1 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                      patient.isActive
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-slate-50 text-slate-600"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        patient.isActive ? "bg-emerald-500" : "bg-slate-400"
                      }`}
                    />
                    {patient.isActive ? "Active" : "Inactive"}
                  </span>
                </div>

                {/* Created At */}
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Registered Date
                  </label>
                  <p className="mt-1 text-sm text-slate-600">
                    {new Date(patient.createdAt).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>

              {/* Form Actions */}
              {isEditing && (
                <div className="mt-6 flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-end sm:gap-3 sm:pt-6">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:w-auto"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                  >
                    {isSubmitting ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Documents Section */}
          {!isEditing && (
            <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Documents</h2>
                  <p className="mt-0.5 text-xs text-slate-600 sm:text-sm">
                    Reports, prescriptions, and other medical documents
                  </p>
                </div>
                {hasPermission(PERMISSIONS.PATIENTS_EDIT) && (
                  <button
                    onClick={() => setShowDocumentModal(true)}
                    className="w-full rounded-xl bg-indigo-700 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-500/30 transition hover:bg-indigo-800 hover:shadow-lg hover:shadow-indigo-500/40 sm:w-auto sm:px-5 sm:py-2.5 sm:text-sm"
                  >
                    + Upload Document
                  </button>
                )}
              </div>
              <div className="p-4 sm:p-6">
                {loadingDocuments ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-r-transparent"></div>
                  </div>
                ) : documents.length === 0 ? (
                  <div className="py-8 text-center">
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
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <p className="text-sm text-slate-600">No documents uploaded yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {documents.map((doc) => (
                      <div
                        key={doc._id}
                        className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="inline-flex rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                                {doc.documentType}
                              </span>
                            </div>
                            <h3 className="text-sm font-semibold text-slate-900 truncate" title={doc.title}>
                              {doc.title}
                            </h3>
                            {doc.description && (
                              <p className="mt-1 text-xs text-slate-600 line-clamp-2">
                                {doc.description}
                              </p>
                            )}
                            <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                              <span>{formatFileSize(doc.fileSize)}</span>
                              <span>•</span>
                              <span>
                                {new Date(doc.uploadDate).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <a
                            href={`http://localhost:5000${doc.filePath}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100 text-center"
                          >
                            View
                          </a>
                          <a
                            href={`http://localhost:5000${doc.filePath}`}
                            download
                            className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 text-center"
                          >
                            Download
                          </a>
                          {hasPermission(PERMISSIONS.PATIENTS_DELETE) && (
                            <button
                              onClick={() => handleDeleteDocument(doc._id)}
                              className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                            >
                              <svg
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Visit History Section */}
          {!isEditing && (
            <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Visit History</h2>
                  <p className="mt-0.5 text-xs text-slate-600 sm:text-sm">
                    Track all patient visits and consultations
                  </p>
                </div>
                {hasPermission(PERMISSIONS.PATIENTS_EDIT) && (
                  <button
                    onClick={() => {
                      // Auto-select doctor if only one exists
                      const defaultDoctorName = doctors.length === 1 ? doctors[0].name : "";
                      setVisitForm(prev => ({
                        ...prev,
                        visitDate: new Date().toISOString().split('T')[0],
                        visitType: "Consultation",
                        chiefComplaint: "",
                        diagnosis: "",
                        treatment: "",
                        notes: "",
                        doctorName: defaultDoctorName,
                      }));
                      setShowVisitModal(true);
                    }}
                    className="w-full rounded-xl bg-indigo-700 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-500/30 transition hover:bg-indigo-800 hover:shadow-lg hover:shadow-indigo-500/40 sm:w-auto sm:px-5 sm:py-2.5 sm:text-sm"
                  >
                    + Add Visit
                  </button>
                )}
              </div>
              <div className="p-4 sm:p-6">
                {loadingVisits ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-r-transparent"></div>
                  </div>
                ) : visits.length === 0 ? (
                  <div className="py-8 text-center">
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
                    <p className="text-sm text-slate-600">No visits recorded yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {visits.map((visit) => (
                      <div
                        key={visit._id}
                        className="rounded-lg border border-slate-200 bg-slate-50/50 p-4"
                      >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <span className="inline-flex rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                                {visit.visitType}
                              </span>
                              <span className="text-xs text-slate-600">
                                {new Date(visit.visitDate).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </span>
                              {visit.doctorName && (
                                <span className="text-xs text-slate-600">
                                  Dr. {visit.doctorName}
                                </span>
                              )}
                            </div>
                            {visit.chiefComplaint && (
                              <p className="mb-1 text-sm font-medium text-slate-900">
                                Chief Complaint: {visit.chiefComplaint}
                              </p>
                            )}
                            {visit.diagnosis && (
                              <p className="mb-1 text-sm text-slate-700">
                                <span className="font-medium">Diagnosis:</span> {visit.diagnosis}
                              </p>
                            )}
                            {visit.treatment && (
                              <p className="mb-1 text-sm text-slate-700">
                                <span className="font-medium">Treatment:</span> {visit.treatment}
                              </p>
                            )}
                            {visit.notes && (
                              <p className="mt-2 text-sm text-slate-600 whitespace-pre-wrap">
                                {visit.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Add Visit Modal */}
      {showVisitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-xl my-auto max-h-[90vh] overflow-y-auto">
            <div className="border-b border-slate-200 px-4 py-3 sm:px-6 sm:py-4 sticky top-0 bg-white">
              <h2 className="text-base font-semibold text-slate-900 sm:text-lg">
                Add New Visit
              </h2>
            </div>
            <form onSubmit={handleAddVisit} className="px-4 py-4 sm:px-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">
                      Visit Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={visitForm.visitDate}
                      onChange={(e) =>
                        setVisitForm({ ...visitForm, visitDate: e.target.value })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">
                      Visit Type *
                    </label>
                    <select
                      required
                      value={visitForm.visitType}
                      onChange={(e) =>
                        setVisitForm({ ...visitForm, visitType: e.target.value })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    >
                      <option value="Consultation">Consultation</option>
                      <option value="Follow-up">Follow-up</option>
                      <option value="Emergency">Emergency</option>
                      <option value="Check-up">Check-up</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="relative">
                  <label className="block text-sm font-medium text-slate-700">
                    Doctor Name
                  </label>
                  <input
                    ref={doctorInputRef}
                    type="text"
                    value={visitForm.doctorName}
                    onChange={(e) => {
                      const value = e.target.value;
                      setVisitForm({ ...visitForm, doctorName: value });
                      if (value) {
                        const filtered = doctors.filter(doctor =>
                          doctor.name.toLowerCase().includes(value.toLowerCase())
                        );
                        setDoctorSuggestions(filtered);
                        setShowDoctorDropdown(true);
                      } else {
                        setDoctorSuggestions(doctors);
                        setShowDoctorDropdown(true);
                      }
                    }}
                    onFocus={() => {
                      if (visitForm.doctorName) {
                        const filtered = doctors.filter(doctor =>
                          doctor.name.toLowerCase().includes(visitForm.doctorName.toLowerCase())
                        );
                        setDoctorSuggestions(filtered);
                      } else {
                        setDoctorSuggestions(doctors);
                      }
                      setShowDoctorDropdown(true);
                    }}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="Search doctor..."
                  />
                  {showDoctorDropdown && doctorSuggestions.length > 0 && (
                    <div
                      ref={doctorDropdownRef}
                      className="absolute z-[100] mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg"
                    >
                      {doctorSuggestions.map((doctor) => (
                        <button
                          key={doctor._id}
                          type="button"
                          onClick={() => {
                            setVisitForm({ ...visitForm, doctorName: doctor.name });
                            setShowDoctorDropdown(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-indigo-50 transition-colors"
                        >
                          {doctor.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Chief Complaint
                  </label>
                  <textarea
                    value={visitForm.chiefComplaint}
                    onChange={(e) =>
                      setVisitForm({ ...visitForm, chiefComplaint: e.target.value })
                    }
                    rows={2}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="Patient's main complaint..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Diagnosis
                  </label>
                  <textarea
                    value={visitForm.diagnosis}
                    onChange={(e) =>
                      setVisitForm({ ...visitForm, diagnosis: e.target.value })
                    }
                    rows={2}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="Diagnosis..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Treatment
                  </label>
                  <textarea
                    value={visitForm.treatment}
                    onChange={(e) =>
                      setVisitForm({ ...visitForm, treatment: e.target.value })
                    }
                    rows={2}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="Treatment prescribed..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Notes
                  </label>
                  <textarea
                    value={visitForm.notes}
                    onChange={(e) =>
                      setVisitForm({ ...visitForm, notes: e.target.value })
                    }
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="Additional notes..."
                  />
                </div>
              </div>
              <div className="mt-6 flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowVisitModal(false);
                    setVisitForm({
                      visitDate: new Date().toISOString().split('T')[0],
                      visitType: "Consultation",
                      chiefComplaint: "",
                      diagnosis: "",
                      treatment: "",
                      notes: "",
                      doctorName: "",
                    });
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:w-auto"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-800 sm:w-auto"
                >
                  Add Visit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl my-auto">
            <div className="px-4 py-3 sm:px-6 sm:py-4">
              <h2 className="text-base font-semibold text-slate-900 sm:text-lg">
                Delete Patient
              </h2>
              <p className="mt-2 text-xs text-slate-600 sm:text-sm">
                Are you sure you want to delete{" "}
                <span className="font-medium">{patient.name}</span> ({patient.patientId})? This action
                cannot be undone.
              </p>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-end sm:gap-3 sm:px-6 sm:py-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:w-auto"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="w-full rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 sm:w-auto"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Document Modal */}
      {showDocumentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-xl my-auto max-h-[90vh] overflow-y-auto">
            <div className="border-b border-slate-200 px-4 py-3 sm:px-6 sm:py-4 sticky top-0 bg-white">
              <h2 className="text-base font-semibold text-slate-900 sm:text-lg">
                Upload Document
              </h2>
            </div>
            <form onSubmit={handleAddDocument} className="px-4 py-4 sm:px-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Document Type *
                  </label>
                  <select
                    required
                    value={documentForm.documentType}
                    onChange={(e) =>
                      setDocumentForm({ ...documentForm, documentType: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  >
                    <option value="Report">Report</option>
                    <option value="Prescription">Prescription</option>
                    <option value="Lab Result">Lab Result</option>
                    <option value="X-Ray">X-Ray</option>
                    <option value="Scan">Scan</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={documentForm.title}
                    onChange={(e) =>
                      setDocumentForm({ ...documentForm, title: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="Document title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Description
                  </label>
                  <textarea
                    value={documentForm.description}
                    onChange={(e) =>
                      setDocumentForm({ ...documentForm, description: e.target.value })
                    }
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder="Optional description..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    File * (PDF, Images, Documents - Max 10MB)
                  </label>
                  <input
                    type="file"
                    required
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp,.tiff,.dcm"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setDocumentForm({ ...documentForm, file });
                        if (!documentForm.title) {
                          setDocumentForm({ ...documentForm, file, title: file.name });
                        }
                      }
                    }}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                  {documentForm.file && (
                    <p className="mt-1 text-xs text-slate-500">
                      Selected: {documentForm.file.name} ({formatFileSize(documentForm.file.size)})
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-6 flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowDocumentModal(false);
                    setDocumentForm({
                      documentType: "Report",
                      title: "",
                      description: "",
                      file: null,
                    });
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:w-auto"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!documentForm.file}
                  className="w-full rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  Upload Document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default PatientDetails;
