import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { usersAPI, rolesAPI } from "../utils/api";
import { showSuccess, showError } from "../utils/toast";

type Role = {
  _id: string;
  name: string;
  displayName: string;
  permissions: string[];
  isActive: boolean;
};

type User = {
  _id: string;
  name: string;
  email: string;
  role: string;
  roles?: Role[];
  isActive: boolean;
  profileImage?: string | null;
  dateOfBirth?: string | null;
  yearsOfExperience?: number;
  designation?: string | null;
  gender?: string | null;
  bloodGroup?: string | null;
  createdAt: string;
  updatedAt?: string;
};

type UserForm = {
  name: string;
  email: string;
  password: string;
  role: string;
  roles: string[];
  profileImage?: File | null;
  dateOfBirth: string;
  yearsOfExperience: string;
  designation: string;
  gender: string;
  bloodGroup: string;
};

function UserDetails() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isNewUser = id === "new";
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(isNewUser);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [formData, setFormData] = useState<UserForm>({
    name: "",
    email: "",
    password: "",
    role: "receptionist",
    roles: [],
    profileImage: null,
    dateOfBirth: "",
    yearsOfExperience: "",
    designation: "",
    gender: "",
    bloodGroup: "",
  });
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    checkAuth();
    fetchRoles();
    if (id && !isNewUser) {
      fetchUser();
    } else if (isNewUser) {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const checkAuth = () => {
    const token =
      localStorage.getItem("proclinic_token") ||
      sessionStorage.getItem("proclinic_token");
    if (!token) {
      navigate("/login");
    }
  };

  const fetchUser = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const response = await usersAPI.getById(id);
      if (response.success) {
        const userData = response.data.user;
        setUser(userData);
        setFormData({
          name: userData.name,
          email: userData.email,
          password: "",
          role: userData.role,
          roles: userData.roles?.map((r) => r._id) || [],
          profileImage: null,
          dateOfBirth: userData.dateOfBirth ? new Date(userData.dateOfBirth).toISOString().split('T')[0] : "",
          yearsOfExperience: userData.yearsOfExperience?.toString() || "",
          designation: userData.designation || "",
          gender: userData.gender || "",
          bloodGroup: userData.bloodGroup || "",
        });
        if (userData.profileImage) {
          setPreviewImage(`http://localhost:5000${userData.profileImage}`);
        } else {
          setPreviewImage(null);
        }
      } else {
        showError("Failed to fetch user");
        setTimeout(() => navigate("/users"), 2000);
      }
    } catch (err) {
      showError("Error loading user");
      console.error(err);
      setTimeout(() => navigate("/users"), 2000);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await rolesAPI.getAll();
      if (response.success) {
        setRoles(response.data.roles.filter((r: Role) => r.isActive));
      }
    } catch (err) {
      console.error("Error loading roles:", err);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
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

  const handleCancel = () => {
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        password: "",
        role: user.role,
        roles: user.roles?.map((r) => r._id) || [],
        profileImage: null,
        dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : "",
        yearsOfExperience: user.yearsOfExperience?.toString() || "",
        designation: user.designation || "",
        gender: user.gender || "",
        bloodGroup: user.bloodGroup || "",
      });
      if (user.profileImage) {
        setPreviewImage(`http://localhost:5000${user.profileImage}`);
      } else {
        setPreviewImage(null);
      }
    }
    setIsEditing(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);

    try {
      // Validate required fields for new user
      if (isNewUser && !formData.password) {
        showError("Password is required");
        setIsSubmitting(false);
        return;
      }

      // Create FormData for file upload
      const formDataToSend = new FormData();
      formDataToSend.append("name", formData.name);
      formDataToSend.append("email", formData.email);
      formDataToSend.append("role", formData.role);
      if (formData.roles.length > 0) {
        formData.roles.forEach((roleId) => {
          formDataToSend.append("roles[]", roleId);
        });
      }
      if (isNewUser) {
        formDataToSend.append("password", formData.password);
      } else if (formData.password) {
        formDataToSend.append("password", formData.password);
      }
      if (formData.profileImage) {
        formDataToSend.append("profileImage", formData.profileImage);
      }
      if (formData.dateOfBirth) {
        formDataToSend.append("dateOfBirth", formData.dateOfBirth);
      }
      if (formData.yearsOfExperience) {
        formDataToSend.append("yearsOfExperience", formData.yearsOfExperience);
      }
      if (formData.designation) {
        formDataToSend.append("designation", formData.designation);
      }
      if (formData.gender) {
        formDataToSend.append("gender", formData.gender);
      }
      if (formData.bloodGroup) {
        formDataToSend.append("bloodGroup", formData.bloodGroup);
      }

      if (isNewUser) {
        // Create new user
        const response = await usersAPI.create(formDataToSend);
        if (response.success) {
          showSuccess("User created successfully");
          // Navigate to the new user's detail page
          setTimeout(() => {
            navigate(`/users/${response.data.user._id}`);
          }, 1000);
        } else {
          showError(response.message || "Failed to create user");
        }
      } else {
        // Update existing user
        if (!id) return;
        const response = await usersAPI.update(id, formDataToSend);
        if (response.success) {
          showSuccess("User updated successfully");
          setIsEditing(false);
          fetchUser(); // Refresh user data
        } else {
          showError(response.message || "Failed to update user");
        }
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      showError(errorMessage);
      console.error("Submit error:", err);
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
      const response = await usersAPI.delete(id);
      if (response.success) {
        showSuccess("User deleted successfully");
        setTimeout(() => {
          navigate("/users");
        }, 1000);
      } else {
        showError(response.message || "Failed to delete user");
        setShowDeleteModal(false);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      showError(errorMessage);
      setShowDeleteModal(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-purple-100 text-purple-700 border-purple-200";
      case "doctor":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "nurse":
        return "bg-cyan-100 text-cyan-700 border-cyan-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <div className="flex flex-1 items-center justify-center sidebar-content-margin">
          <div className="text-center">
            <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
            <p className="text-slate-600">Loading user details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isNewUser && !user) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <div className="flex flex-1 items-center justify-center sidebar-content-margin">
          <div className="text-center">
            <p className="text-slate-600">User not found</p>
            <Link
              to="/users"
              className="mt-4 inline-block text-indigo-600 hover:text-indigo-700"
            >
              Back to Users
            </Link>
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
            <div className="flex items-center gap-2 sm:gap-4">
              <Link
                to="/users"
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
                  {isNewUser ? "Add New User" : isEditing ? "Edit User" : "User Details"}
                </h1>
                <p className="mt-0.5 text-xs text-slate-600 sm:mt-1.5 sm:text-sm">
                  {isNewUser
                    ? "Create a new user account"
                    : isEditing
                    ? "Update user information"
                    : "View and manage user details"}
                </p>
              </div>
            </div>
            {!isNewUser && !isEditing && (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <button
                  onClick={handleEdit}
                  className="w-full rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100 sm:w-auto sm:px-5 sm:py-2.5 sm:text-sm"
                >
                  Edit User
                </button>
                <button
                  onClick={handleDeleteClick}
                  className="w-full rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100 sm:w-auto sm:px-5 sm:py-2.5 sm:text-sm"
                >
                  Delete User
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {/* Alerts */}

          {/* User Details Form */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 lg:p-8">
              <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
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
                      {user?.name || ""}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Email *
                  </label>
                  {isEditing ? (
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                  ) : (
                    <p className="mt-1 text-sm font-medium text-slate-900">
                      {user?.email || ""}
                    </p>
                  )}
                </div>

                {/* Legacy Role */}
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Legacy Role
                  </label>
                  {isEditing ? (
                    <select
                      value={formData.role}
                      onChange={(e) =>
                        setFormData({ ...formData, role: e.target.value })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    >
                      <option value="receptionist">Receptionist</option>
                      <option value="doctor">Doctor</option>
                      <option value="nurse">Nurse</option>
                      <option value="admin">Admin</option>
                    </select>
                  ) : (
                    <span
                      className={`mt-1 inline-flex rounded-lg border px-2.5 py-1 text-xs font-semibold capitalize ${getRoleBadgeColor(
                        user?.role || "receptionist"
                      )}`}
                    >
                      {user?.role || ""}
                    </span>
                  )}
                </div>

                {/* Status - Only show for existing users */}
                {!isNewUser && user && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700">
                      Status
                    </label>
                    <span
                      className={`mt-1 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                        user.isActive
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-slate-50 text-slate-600"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          user.isActive ? "bg-emerald-500" : "bg-slate-400"
                        }`}
                      />
                      {user.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                )}

                {/* Roles (RBAC) */}
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Roles (RBAC)
                  </label>
                  {isEditing ? (
                    <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-slate-300 p-2 space-y-1.5 sm:max-h-48 sm:p-3 sm:space-y-2">
                      {roles.length === 0 ? (
                        <p className="text-sm text-slate-500">No roles available</p>
                      ) : (
                        roles.map((role) => (
                          <label
                            key={role._id}
                            className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded"
                          >
                            <input
                              type="checkbox"
                              checked={formData.roles.includes(role._id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData({
                                    ...formData,
                                    roles: [...formData.roles, role._id],
                                  });
                                } else {
                                  setFormData({
                                    ...formData,
                                    roles: formData.roles.filter(
                                      (id) => id !== role._id
                                    ),
                                  });
                                }
                              }}
                              className="h-4 w-4 rounded border-slate-300 text-indigo-700 accent-indigo-700"
                            />
                            <span className="text-sm text-slate-700">
                              {role.displayName}
                            </span>
                            {role.permissions && (
                              <span className="text-xs text-slate-500">
                                ({role.permissions.length} permissions)
                              </span>
                            )}
                          </label>
                        ))
                      )}
                    </div>
                  ) : (
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {user && user.roles && user.roles.length > 0 ? (
                        user.roles.map((role) => (
                          <span
                            key={role._id}
                            className="inline-flex rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700"
                          >
                            {role.displayName}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-slate-500">
                          No roles assigned
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Profile Image */}
                {isEditing && (
                  <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-slate-700">
                      Profile Image
                    </label>
                    <div className="mt-1">
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
                  </div>
                )}

                {/* Date of Birth */}
                {isEditing && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) =>
                        setFormData({ ...formData, dateOfBirth: e.target.value })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>
                )}

                {/* Years of Experience */}
                {isEditing && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700">
                      Years of Experience
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.yearsOfExperience}
                      onChange={(e) =>
                        setFormData({ ...formData, yearsOfExperience: e.target.value })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>
                )}

                {/* Designation */}
                {isEditing && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700">
                      Designation
                    </label>
                    <input
                      type="text"
                      value={formData.designation}
                      onChange={(e) =>
                        setFormData({ ...formData, designation: e.target.value })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      placeholder="e.g., Senior Doctor, Head Nurse"
                    />
                  </div>
                )}

                {/* Gender */}
                {isEditing && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700">
                      Gender
                    </label>
                    <select
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
                )}

                {/* Blood Group */}
                {isEditing && (
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
                )}

                {/* Created At - Only show for existing users */}
                {!isNewUser && user && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700">
                      Created At
                    </label>
                    <p className="mt-1 text-sm text-slate-600">
                      {new Date(user.createdAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                )}

                {/* Password */}
                {isEditing && (
                  <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-slate-700">
                      {isNewUser ? "Password *" : "Password (leave blank to keep current)"}
                    </label>
                    <input
                      type="password"
                      required={isNewUser}
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      placeholder={isNewUser ? "Enter password" : "Enter new password"}
                    />
                  </div>
                )}
              </div>

              {/* Form Actions */}
              {isEditing && (
                <div className="mt-6 flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-end sm:gap-3 sm:pt-6">
                  <button
                    type="button"
                    onClick={isNewUser ? () => navigate("/users") : handleCancel}
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:w-auto"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                  >
                    {isSubmitting
                      ? isNewUser
                        ? "Creating..."
                        : "Saving..."
                      : isNewUser
                      ? "Create User"
                      : "Save Changes"}
                  </button>
                </div>
              )}
            </form>
          </div>
        </main>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl my-auto">
            <div className="px-4 py-3 sm:px-6 sm:py-4">
              <h2 className="text-base font-semibold text-slate-900 sm:text-lg">
                Delete User
              </h2>
              <p className="mt-2 text-xs text-slate-600 sm:text-sm">
                Are you sure you want to delete{" "}
                <span className="font-medium">{user.name}</span>? This action
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
    </div>
  );
}

export default UserDetails;
