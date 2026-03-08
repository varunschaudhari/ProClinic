const API_BASE_URL = "http://localhost:5000/api";

// Get auth token
const getAuthToken = (): string | null => {
  return (
    localStorage.getItem("proclinic_token") ||
    sessionStorage.getItem("proclinic_token")
  );
};

// Auth API
export const authAPI = {
  getMe: async () => {
    const response = await apiRequest("/auth/me");
    return response.json();
  },
};

// API request helper
const apiRequest = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  const token = getAuthToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  return response;
};

// Users API
export const usersAPI = {
  getAll: async () => {
    const response = await apiRequest("/users");
    return response.json();
  },

  getById: async (id: string) => {
    const response = await apiRequest(`/users/${id}`);
    return response.json();
  },

  create: async (userData: FormData) => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/users`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: userData,
    });
    return response.json();
  },

  update: async (
    id: string,
    userData: FormData
  ) => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/users/${id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: userData,
    });
    return response.json();
  },

  delete: async (id: string) => {
    const response = await apiRequest(`/users/${id}`, {
      method: "DELETE",
    });
    return response.json();
  },
};

// Roles API
export const rolesAPI = {
  getAll: async () => {
    const response = await apiRequest("/roles");
    return response.json();
  },

  getById: async (id: string) => {
    const response = await apiRequest(`/roles/${id}`);
    return response.json();
  },

  getPermissions: async () => {
    const response = await apiRequest("/roles/permissions");
    return response.json();
  },

  create: async (roleData: {
    name: string;
    displayName: string;
    description?: string;
    permissions: string[];
  }) => {
    const response = await apiRequest("/roles", {
      method: "POST",
      body: JSON.stringify(roleData),
    });
    return response.json();
  },

  update: async (
    id: string,
    roleData: {
      name?: string;
      displayName?: string;
      description?: string;
      permissions?: string[];
      isActive?: boolean;
    }
  ) => {
    const response = await apiRequest(`/roles/${id}`, {
      method: "PUT",
      body: JSON.stringify(roleData),
    });
    return response.json();
  },

  delete: async (id: string) => {
    const response = await apiRequest(`/roles/${id}`, {
      method: "DELETE",
    });
    return response.json();
  },
};

// Patients API
export const patientsAPI = {
  getAll: async (params?: { status?: string; isActive?: boolean; search?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append("status", params.status);
    if (params?.isActive !== undefined) queryParams.append("isActive", params.isActive.toString());
    if (params?.search) queryParams.append("search", params.search);
    const queryString = queryParams.toString();
    const response = await apiRequest(`/patients${queryString ? `?${queryString}` : ""}`);
    return response.json();
  },

  getById: async (id: string) => {
    const response = await apiRequest(`/patients/${id}`);
    return response.json();
  },

  create: async (patientData: FormData) => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/patients`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: patientData,
    });
    return response.json();
  },

  update: async (
    id: string,
    patientData: FormData
  ) => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/patients/${id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: patientData,
    });
    return response.json();
  },

  updateStatus: async (
    id: string,
    statusData: { status: string; statusNotes?: string }
  ) => {
    const response = await apiRequest(`/patients/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify(statusData),
    });
    return response.json();
  },

  delete: async (id: string) => {
    const response = await apiRequest(`/patients/${id}`, {
      method: "DELETE",
    });
    return response.json();
  },
};

// Visits API
export const visitsAPI = {
  getByPatientId: async (patientId: string) => {
    const response = await apiRequest(`/visits/patient/${patientId}`);
    return response.json();
  },

  getById: async (id: string) => {
    const response = await apiRequest(`/visits/${id}`);
    return response.json();
  },

  create: async (visitData: {
    patientId: string;
    visitDate?: string;
    visitType?: string;
    chiefComplaint?: string;
    diagnosis?: string;
    treatment?: string;
    notes?: string;
    doctorName?: string;
  }) => {
    const response = await apiRequest("/visits", {
      method: "POST",
      body: JSON.stringify(visitData),
    });
    return response.json();
  },

  update: async (id: string, visitData: {
    visitDate?: string;
    visitType?: string;
    chiefComplaint?: string;
    diagnosis?: string;
    treatment?: string;
    notes?: string;
    doctorName?: string;
  }) => {
    const response = await apiRequest(`/visits/${id}`, {
      method: "PUT",
      body: JSON.stringify(visitData),
    });
    return response.json();
  },

  delete: async (id: string) => {
    const response = await apiRequest(`/visits/${id}`, {
      method: "DELETE",
    });
    return response.json();
  },
};

// Documents API
export const documentsAPI = {
  getByPatientId: async (patientId: string) => {
    const response = await apiRequest(`/documents/patient/${patientId}`);
    return response.json();
  },

  getById: async (id: string) => {
    const response = await apiRequest(`/documents/${id}`);
    return response.json();
  },

  create: async (documentData: FormData) => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/documents`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: documentData,
    });
    return response.json();
  },

  update: async (id: string, documentData: {
    documentType?: string;
    title?: string;
    description?: string;
  }) => {
    const response = await apiRequest(`/documents/${id}`, {
      method: "PUT",
      body: JSON.stringify(documentData),
    });
    return response.json();
  },

  delete: async (id: string) => {
    const response = await apiRequest(`/documents/${id}`, {
      method: "DELETE",
    });
    return response.json();
  },
};

// Appointments API
export const appointmentsAPI = {
  getAll: async (params?: {
    doctorId?: string;
    patientId?: string;
    date?: string;
    status?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.doctorId) queryParams.append("doctorId", params.doctorId);
    if (params?.patientId) queryParams.append("patientId", params.patientId);
    if (params?.date) queryParams.append("date", params.date);
    if (params?.status) queryParams.append("status", params.status);
    const queryString = queryParams.toString();
    const response = await apiRequest(`/appointments${queryString ? `?${queryString}` : ""}`);
    return response.json();
  },

  getById: async (id: string) => {
    const response = await apiRequest(`/appointments/${id}`);
    return response.json();
  },

  getAvailableSlots: async (doctorId: string, date: string) => {
    const response = await apiRequest(`/appointments/available-slots?doctorId=${doctorId}&date=${date}`);
    return response.json();
  },

  create: async (appointmentData: {
    patientId: string;
    doctorId: string;
    appointmentDate: string;
    appointmentTime: string;
    appointmentType?: "booked" | "walk-in";
    chiefComplaint?: string;
    notes?: string;
  }) => {
    const response = await apiRequest("/appointments", {
      method: "POST",
      body: JSON.stringify(appointmentData),
    });
    return response.json();
  },

  update: async (
    id: string,
    appointmentData: {
      appointmentDate?: string;
      appointmentTime?: string;
      appointmentType?: "booked" | "walk-in";
      status?: "scheduled" | "completed" | "cancelled" | "no-show";
      chiefComplaint?: string;
      notes?: string;
    }
  ) => {
    const response = await apiRequest(`/appointments/${id}`, {
      method: "PUT",
      body: JSON.stringify(appointmentData),
    });
    return response.json();
  },

  delete: async (id: string) => {
    const response = await apiRequest(`/appointments/${id}`, {
      method: "DELETE",
    });
    return response.json();
  },
};

// Doctor Schedules API
export const doctorSchedulesAPI = {
  getByDoctorId: async (doctorId: string) => {
    const response = await apiRequest(`/doctor-schedules/${doctorId}`);
    return response.json();
  },

  createOrUpdate: async (scheduleData: {
    doctorId: string;
    schedule: any;
  }) => {
    const response = await apiRequest("/doctor-schedules", {
      method: "POST",
      body: JSON.stringify(scheduleData),
    });
    return response.json();
  },
};

// Holidays API
export const holidaysAPI = {
  getAll: async (params?: {
    doctorId?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.doctorId) queryParams.append("doctorId", params.doctorId);
    if (params?.startDate) queryParams.append("startDate", params.startDate);
    if (params?.endDate) queryParams.append("endDate", params.endDate);
    const queryString = queryParams.toString();
    const response = await apiRequest(`/holidays${queryString ? `?${queryString}` : ""}`);
    return response.json();
  },

  create: async (holidayData: {
    doctorId: string;
    date: string;
    reason?: string;
    description?: string;
  }) => {
    const response = await apiRequest("/holidays", {
      method: "POST",
      body: JSON.stringify(holidayData),
    });
    return response.json();
  },

  update: async (
    id: string,
    holidayData: {
      date?: string;
      reason?: string;
      description?: string;
    }
  ) => {
    const response = await apiRequest(`/holidays/${id}`, {
      method: "PUT",
      body: JSON.stringify(holidayData),
    });
    return response.json();
  },

  delete: async (id: string) => {
    const response = await apiRequest(`/holidays/${id}`, {
      method: "DELETE",
    });
    return response.json();
  },
};

// OPD API
export const opdAPI = {
  getAll: async (params?: {
    patientId?: string;
    doctorId?: string;
    status?: string;
    date?: string;
    startDate?: string;
    endDate?: string;
    paymentStatus?: string;
    limit?: number;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.patientId) queryParams.append("patientId", params.patientId);
    if (params?.doctorId) queryParams.append("doctorId", params.doctorId);
    if (params?.status) queryParams.append("status", params.status);
    if (params?.date) queryParams.append("date", params.date);
    if (params?.startDate) queryParams.append("startDate", params.startDate);
    if (params?.endDate) queryParams.append("endDate", params.endDate);
    if (params?.paymentStatus) queryParams.append("paymentStatus", params.paymentStatus);
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    const queryString = queryParams.toString();
    const response = await apiRequest(`/opd${queryString ? `?${queryString}` : ""}`);
    return response.json();
  },

  getToday: async (doctorId?: string) => {
    const queryParams = new URLSearchParams();
    if (doctorId) queryParams.append("doctorId", doctorId);
    const queryString = queryParams.toString();
    const response = await apiRequest(`/opd/today${queryString ? `?${queryString}` : ""}`);
    return response.json();
  },

  getQueue: async (doctorId: string, date?: string) => {
    const queryParams = new URLSearchParams();
    if (date) queryParams.append("date", date);
    const queryString = queryParams.toString();
    const response = await apiRequest(`/opd/queue/${doctorId}${queryString ? `?${queryString}` : ""}`);
    return response.json();
  },

  getById: async (id: string) => {
    const response = await apiRequest(`/opd/${id}`);
    return response.json();
  },

  getStats: async (params?: {
    startDate?: string;
    endDate?: string;
    doctorId?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append("startDate", params.startDate);
    if (params?.endDate) queryParams.append("endDate", params.endDate);
    if (params?.doctorId) queryParams.append("doctorId", params.doctorId);
    const queryString = queryParams.toString();
    const response = await apiRequest(`/opd/stats${queryString ? `?${queryString}` : ""}`);
    return response.json();
  },

  create: async (opdData: {
    patientId: string;
    doctorId: string;
    visitDate?: string;
    visitTime?: string;
    chiefComplaint?: string;
    consultationFee?: number;
    additionalCharges?: number;
    discount?: number;
  }) => {
    const response = await apiRequest("/opd", {
      method: "POST",
      body: JSON.stringify(opdData),
    });
    return response.json();
  },

  update: async (
    id: string,
    opdData: {
      visitDate?: string;
      visitTime?: string;
      status?: string;
      chiefComplaint?: string;
      diagnosis?: string;
      treatment?: string;
      prescription?: string;
      notes?: string;
      consultationFee?: number;
      additionalCharges?: number;
      discount?: number;
      paidAmount?: number;
      paymentMethod?: string;
      paymentDate?: string;
      followUpRequired?: boolean;
      followUpDate?: string;
      labTests?: Array<{
        testName: string;
        testFee: number;
        status?: string;
      }>;
    }
  ) => {
    const response = await apiRequest(`/opd/${id}`, {
      method: "PUT",
      body: JSON.stringify(opdData),
    });
    return response.json();
  },

  updateStatus: async (id: string, status: string) => {
    const response = await apiRequest(`/opd/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    return response.json();
  },

  processPayment: async (id: string, paymentData: {
    paidAmount: number;
    paymentMethod?: string;
  }) => {
    const response = await apiRequest(`/opd/${id}/payment`, {
      method: "PATCH",
      body: JSON.stringify(paymentData),
    });
    return response.json();
  },

  delete: async (id: string) => {
    const response = await apiRequest(`/opd/${id}`, {
      method: "DELETE",
    });
    return response.json();
  },
};

// IPD API
export const ipdAPI = {
  getAll: async (params?: {
    patientId?: string;
    doctorId?: string;
    status?: string;
    admissionDate?: string;
    startDate?: string;
    endDate?: string;
    roomId?: string;
    paymentStatus?: string;
    limit?: number;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.patientId) queryParams.append("patientId", params.patientId);
    if (params?.doctorId) queryParams.append("doctorId", params.doctorId);
    if (params?.status) queryParams.append("status", params.status);
    if (params?.admissionDate) queryParams.append("admissionDate", params.admissionDate);
    if (params?.startDate) queryParams.append("startDate", params.startDate);
    if (params?.endDate) queryParams.append("endDate", params.endDate);
    if (params?.roomId) queryParams.append("roomId", params.roomId);
    if (params?.paymentStatus) queryParams.append("paymentStatus", params.paymentStatus);
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    const queryString = queryParams.toString();
    const response = await apiRequest(`/ipd${queryString ? `?${queryString}` : ""}`);
    return response.json();
  },

  getCurrent: async (doctorId?: string, roomId?: string) => {
    const queryParams = new URLSearchParams();
    if (doctorId) queryParams.append("doctorId", doctorId);
    if (roomId) queryParams.append("roomId", roomId);
    const queryString = queryParams.toString();
    const response = await apiRequest(`/ipd/current${queryString ? `?${queryString}` : ""}`);
    return response.json();
  },

  getById: async (id: string) => {
    const response = await apiRequest(`/ipd/${id}`);
    return response.json();
  },

  getStats: async (params?: {
    startDate?: string;
    endDate?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append("startDate", params.startDate);
    if (params?.endDate) queryParams.append("endDate", params.endDate);
    const queryString = queryParams.toString();
    const response = await apiRequest(`/ipd/stats${queryString ? `?${queryString}` : ""}`);
    return response.json();
  },

  create: async (ipdData: {
    patientId?: string;
    name?: string;
    dateOfBirth?: string;
    gender?: string;
    phone?: string;
    email?: string;
    doctorId: string;
    admissionDate?: string;
    admissionTime?: string;
    admissionType?: string;
    admissionReason?: string;
    diagnosisOnAdmission?: string;
    roomId?: string;
    bedNumber?: string;
    treatmentPlan?: string;
    notes?: string;
  }) => {
    const response = await apiRequest("/ipd", {
      method: "POST",
      body: JSON.stringify(ipdData),
    });
    return response.json();
  },

  update: async (
    id: string,
    ipdData: {
      doctorId?: string;
      admissionDate?: string;
      admissionTime?: string;
      admissionType?: string;
      admissionReason?: string;
      diagnosisOnAdmission?: string;
      roomId?: string;
      bedNumber?: string;
      status?: string;
      treatmentPlan?: string;
      notes?: string;
      roomCharges?: number;
      medicationCharges?: number;
      procedureCharges?: number;
      labCharges?: number;
      otherCharges?: number;
      discount?: number;
      paidAmount?: number;
      paymentMethod?: string;
      paymentDate?: string;
    }
  ) => {
    const response = await apiRequest(`/ipd/${id}`, {
      method: "PUT",
      body: JSON.stringify(ipdData),
    });
    return response.json();
  },

  discharge: async (
    id: string,
    dischargeData: {
      dischargeDate?: string;
      dischargeTime?: string;
      dischargeType?: string;
      dischargeSummary?: string;
      dischargeInstructions?: string;
      followUpRequired?: boolean;
      followUpDate?: string;
      followUpInstructions?: string;
    }
  ) => {
    const response = await apiRequest(`/ipd/${id}/discharge`, {
      method: "PUT",
      body: JSON.stringify(dischargeData),
    });
    return response.json();
  },

  addProgressNote: async (
    id: string,
    noteData: {
      date?: string;
      note: string;
    }
  ) => {
    const response = await apiRequest(`/ipd/${id}/progress-note`, {
      method: "POST",
      body: JSON.stringify(noteData),
    });
    return response.json();
  },

  addPrescription: async (
    id: string,
    prescriptionData: {
      medication: string;
      dosage: string;
      frequency: string;
      duration?: string;
      startDate?: string;
      endDate?: string;
    }
  ) => {
    const response = await apiRequest(`/ipd/${id}/prescription`, {
      method: "POST",
      body: JSON.stringify(prescriptionData),
    });
    return response.json();
  },

  addLabReport: async (
    id: string,
    labData: {
      testName: string;
      testDate?: string;
      result?: string;
      fileUrl?: string;
    }
  ) => {
    const response = await apiRequest(`/ipd/${id}/lab-report`, {
      method: "POST",
      body: JSON.stringify(labData),
    });
    return response.json();
  },

  processPayment: async (
    id: string,
    paymentData: {
      paidAmount: number;
      paymentMethod?: string;
      paymentDate?: string;
    }
  ) => {
    const response = await apiRequest(`/ipd/${id}/payment`, {
      method: "PUT",
      body: JSON.stringify(paymentData),
    });
    return response.json();
  },

  delete: async (id: string) => {
    const response = await apiRequest(`/ipd/${id}`, {
      method: "DELETE",
    });
    return response.json();
  },
};

// Room API
export const roomAPI = {
  getAll: async (params?: {
    roomType?: string;
    floor?: string;
    ward?: string;
    status?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.roomType) queryParams.append("roomType", params.roomType);
    if (params?.floor) queryParams.append("floor", params.floor);
    if (params?.ward) queryParams.append("ward", params.ward);
    if (params?.status) queryParams.append("status", params.status);
    const queryString = queryParams.toString();
    const response = await apiRequest(`/rooms${queryString ? `?${queryString}` : ""}`);
    return response.json();
  },

  getById: async (id: string) => {
    const response = await apiRequest(`/rooms/${id}`);
    return response.json();
  },

  getAvailableBeds: async (roomType?: string) => {
    const queryParams = new URLSearchParams();
    if (roomType) queryParams.append("roomType", roomType);
    const queryString = queryParams.toString();
    const response = await apiRequest(`/rooms/available-beds${queryString ? `?${queryString}` : ""}`);
    return response.json();
  },

  getStats: async () => {
    const response = await apiRequest("/rooms/stats");
    return response.json();
  },

  create: async (roomData: {
    roomNumber: string;
    roomType: string;
    floor?: string;
    ward?: string;
    capacity: number;
    ratePerDay?: number;
    amenities?: string[];
    notes?: string;
    beds?: string[];
  }) => {
    const response = await apiRequest("/rooms", {
      method: "POST",
      body: JSON.stringify(roomData),
    });
    return response.json();
  },

  update: async (
    id: string,
    roomData: {
      roomNumber?: string;
      roomType?: string;
      floor?: string;
      ward?: string;
      capacity?: number;
      ratePerDay?: number;
      amenities?: string[];
      notes?: string;
      beds?: Array<{ bedNumber: string; status?: string }>;
      isActive?: boolean;
    }
  ) => {
    const response = await apiRequest(`/rooms/${id}`, {
      method: "PUT",
      body: JSON.stringify(roomData),
    });
    return response.json();
  },

  delete: async (id: string) => {
    const response = await apiRequest(`/rooms/${id}`, {
      method: "DELETE",
    });
    return response.json();
  },
};

// Settings API
export const settingsAPI = {
  getAll: async (params?: {
    category?: string;
    isActive?: boolean;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.category) queryParams.append("category", params.category);
    if (params?.isActive !== undefined) queryParams.append("isActive", params.isActive.toString());
    const queryString = queryParams.toString();
    const response = await apiRequest(`/settings${queryString ? `?${queryString}` : ""}`);
    return response.json();
  },

  getByKey: async (key: string) => {
    const response = await apiRequest(`/settings/${key}`);
    return response.json();
  },

  getRoomTypes: async () => {
    const response = await apiRequest("/settings/room-types");
    return response.json();
  },

  create: async (settingData: {
    key: string;
    value: any;
    category?: string;
    description?: string;
    isActive?: boolean;
  }) => {
    const response = await apiRequest("/settings", {
      method: "POST",
      body: JSON.stringify(settingData),
    });
    return response.json();
  },

  update: async (
    id: string,
    settingData: {
      value?: any;
      category?: string;
      description?: string;
      isActive?: boolean;
    }
  ) => {
    const response = await apiRequest(`/settings/${id}`, {
      method: "PUT",
      body: JSON.stringify(settingData),
    });
    return response.json();
  },

  delete: async (id: string) => {
    const response = await apiRequest(`/settings/${id}`, {
      method: "DELETE",
    });
    return response.json();
  },

  addRoomType: async (roomTypeData: {
    roomType: string;
    description?: string;
  }) => {
    const response = await apiRequest("/settings/room-types", {
      method: "POST",
      body: JSON.stringify(roomTypeData),
    });
    return response.json();
  },

  getWardTypes: async () => {
    const response = await apiRequest("/settings/ward-types");
    return response.json();
  },

  addWardType: async (wardTypeData: {
    wardType: string;
    description?: string;
  }) => {
    const response = await apiRequest("/settings/ward-types", {
      method: "POST",
      body: JSON.stringify(wardTypeData),
    });
    return response.json();
  },
};

// Ward API
export const wardAPI = {
  getAll: async (params?: {
    wardType?: string;
    floor?: string;
    isActive?: boolean;
    inCharge?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.wardType) queryParams.append("wardType", params.wardType);
    if (params?.floor) queryParams.append("floor", params.floor);
    if (params?.isActive !== undefined) queryParams.append("isActive", params.isActive.toString());
    if (params?.inCharge) queryParams.append("inCharge", params.inCharge);
    const queryString = queryParams.toString();
    const response = await apiRequest(`/wards${queryString ? `?${queryString}` : ""}`);
    return response.json();
  },

  getById: async (id: string) => {
    const response = await apiRequest(`/wards/${id}`);
    return response.json();
  },

  getStats: async (params?: { wardType?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.wardType) queryParams.append("wardType", params.wardType);
    const queryString = queryParams.toString();
    const response = await apiRequest(`/wards/stats${queryString ? `?${queryString}` : ""}`);
    return response.json();
  },

  create: async (wardData: {
    wardName: string;
    wardCode?: string;
    wardType: string;
    floor?: string;
    description?: string;
    capacity?: number;
    inCharge?: string;
    notes?: string;
  }) => {
    const response = await apiRequest("/wards", {
      method: "POST",
      body: JSON.stringify(wardData),
    });
    return response.json();
  },

  update: async (
    id: string,
    wardData: {
      wardName?: string;
      wardCode?: string;
      wardType?: string;
      floor?: string;
      description?: string;
      capacity?: number;
      inCharge?: string;
      notes?: string;
      isActive?: boolean;
    }
  ) => {
    const response = await apiRequest(`/wards/${id}`, {
      method: "PUT",
      body: JSON.stringify(wardData),
    });
    return response.json();
  },

  delete: async (id: string) => {
    const response = await apiRequest(`/wards/${id}`, {
      method: "DELETE",
    });
    return response.json();
  },
};

// OT (Operation Theater) Management API
export const otAPI = {
  getAll: async (params?: {
    otType?: string;
    floor?: string;
    ward?: string;
    isActive?: boolean;
    otComplexId?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.otType) queryParams.append("otType", params.otType);
    if (params?.floor) queryParams.append("floor", params.floor);
    if (params?.ward) queryParams.append("ward", params.ward);
    if (params?.isActive !== undefined) queryParams.append("isActive", params.isActive.toString());
    if (params?.otComplexId) queryParams.append("otComplexId", params.otComplexId);
    const queryString = queryParams.toString();
    const response = await apiRequest(`/ot${queryString ? `?${queryString}` : ""}`);
    return response.json();
  },

  getById: async (id: string) => {
    const response = await apiRequest(`/ot/${id}`);
    return response.json();
  },

  create: async (otData: {
    otNumber: string;
    otName: string;
    otComplexId?: string;
    otType: string;
    floor?: string;
    ward?: string;
    capacity?: number;
    equipment?: Array<{ name: string; status?: string }>;
    amenities?: string[];
    notes?: string;
  }) => {
    const response = await apiRequest("/ot", {
      method: "POST",
      body: JSON.stringify(otData),
    });
    return response.json();
  },

  update: async (
    id: string,
    otData: {
      otNumber?: string;
      otName?: string;
      otComplexId?: string;
      otType?: string;
      floor?: string;
      ward?: string;
      capacity?: number;
      equipment?: Array<{ name: string; status?: string }>;
      amenities?: string[];
      notes?: string;
      isActive?: boolean;
    }
  ) => {
    const response = await apiRequest(`/ot/${id}`, {
      method: "PUT",
      body: JSON.stringify(otData),
    });
    return response.json();
  },

  delete: async (id: string) => {
    const response = await apiRequest(`/ot/${id}`, {
      method: "DELETE",
    });
    return response.json();
  },
};

// OT Scheduler API
export const otSchedulerAPI = {
  getAll: async (params?: {
    patientId?: string;
    otId?: string;
    surgeonId?: string;
    status?: string;
    scheduledDate?: string;
    priority?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.patientId) queryParams.append("patientId", params.patientId);
    if (params?.otId) queryParams.append("otId", params.otId);
    if (params?.surgeonId) queryParams.append("surgeonId", params.surgeonId);
    if (params?.status) queryParams.append("status", params.status);
    if (params?.scheduledDate) queryParams.append("scheduledDate", params.scheduledDate);
    if (params?.priority) queryParams.append("priority", params.priority);
    const queryString = queryParams.toString();
    const response = await apiRequest(`/ot/schedules${queryString ? `?${queryString}` : ""}`);
    return response.json();
  },

  getById: async (id: string) => {
    const response = await apiRequest(`/ot/schedules/${id}`);
    return response.json();
  },

  getStats: async (params?: {
    startDate?: string;
    endDate?: string;
    otId?: string;
    surgeonId?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append("startDate", params.startDate);
    if (params?.endDate) queryParams.append("endDate", params.endDate);
    if (params?.otId) queryParams.append("otId", params.otId);
    if (params?.surgeonId) queryParams.append("surgeonId", params.surgeonId);
    const queryString = queryParams.toString();
    const response = await apiRequest(`/ot/schedules/stats${queryString ? `?${queryString}` : ""}`);
    return response.json();
  },

  create: async (scheduleData: {
    patientId: string;
    ipdId?: string;
    otId: string;
    surgeonId: string;
    anesthetistId?: string;
    operationType: string;
    operationName: string;
    scheduledDate: string;
    scheduledTime: string;
    estimatedDuration?: number;
    priority?: string;
    preoperativeNotes?: string;
  }) => {
    const response = await apiRequest("/ot/schedules", {
      method: "POST",
      body: JSON.stringify(scheduleData),
    });
    return response.json();
  },

  update: async (
    id: string,
    scheduleData: {
      otId?: string;
      surgeonId?: string;
      anesthetistId?: string;
      operationType?: string;
      operationName?: string;
      scheduledDate?: string;
      scheduledTime?: string;
      estimatedDuration?: number;
      priority?: string;
      preoperativeNotes?: string;
      status?: string;
    }
  ) => {
    const response = await apiRequest(`/ot/schedules/${id}`, {
      method: "PUT",
      body: JSON.stringify(scheduleData),
    });
    return response.json();
  },

  updateStatus: async (
    id: string,
    statusData: {
      status: string;
      actualStartTime?: string;
      actualEndTime?: string;
      actualDuration?: number;
      postoperativeNotes?: string;
      complications?: string;
    }
  ) => {
    const response = await apiRequest(`/ot/schedules/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify(statusData),
    });
    return response.json();
  },

  delete: async (id: string) => {
    const response = await apiRequest(`/ot/schedules/${id}`, {
      method: "DELETE",
    });
    return response.json();
  },
};

// OT Complex API
export const otComplexAPI = {
  getAll: async (params?: { isActive?: boolean }) => {
    const queryParams = new URLSearchParams();
    if (params?.isActive !== undefined) queryParams.append("isActive", params.isActive.toString());
    const queryString = queryParams.toString();
    const response = await apiRequest(`/ot/complexes${queryString ? `?${queryString}` : ""}`);
    return response.json();
  },

  getById: async (id: string) => {
    const response = await apiRequest(`/ot/complexes/${id}`);
    return response.json();
  },

  create: async (complexData: {
    complexCode: string;
    complexName: string;
    location?: string;
    floor?: string;
    building?: string;
    description?: string;
    notes?: string;
  }) => {
    const response = await apiRequest("/ot/complexes", {
      method: "POST",
      body: JSON.stringify(complexData),
    });
    return response.json();
  },

  update: async (
    id: string,
    complexData: {
      complexCode?: string;
      complexName?: string;
      location?: string;
      floor?: string;
      building?: string;
      description?: string;
      notes?: string;
      isActive?: boolean;
    }
  ) => {
    const response = await apiRequest(`/ot/complexes/${id}`, {
      method: "PUT",
      body: JSON.stringify(complexData),
    });
    return response.json();
  },

  delete: async (id: string) => {
    const response = await apiRequest(`/ot/complexes/${id}`, {
      method: "DELETE",
    });
    return response.json();
  },
};