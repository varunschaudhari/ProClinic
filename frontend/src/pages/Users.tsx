import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { usersAPI } from "../utils/api";
import { showError, showSuccess } from "../utils/toast";

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
};

function Users() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "email" | "createdAt">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  
  // Advanced filters
  const [dateRangeStart, setDateRangeStart] = useState("");
  const [dateRangeEnd, setDateRangeEnd] = useState("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Bulk selection
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  useEffect(() => {
    checkAuth();
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAuth = () => {
    const token =
      localStorage.getItem("proclinic_token") ||
      sessionStorage.getItem("proclinic_token");
    if (!token) {
      navigate("/login");
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await usersAPI.getAll();
      if (response.success) {
        setUsers(response.data.users);
      } else {
        showError("Failed to fetch users");
      }
    } catch (err) {
      showError("Error loading users");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };


  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-purple-100 text-purple-700";
      case "doctor":
        return "bg-blue-100 text-blue-700";
      case "nurse":
        return "bg-cyan-100 text-cyan-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  // Filter and sort users
  const filteredAndSortedUsers = useMemo(() => {
    let filtered = [...users];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          user.name.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query) ||
          user.role.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (user) => user.isActive === (statusFilter === "active")
      );
    }

    // Role filter
    if (roleFilter !== "all") {
      filtered = filtered.filter((user) => user.role === roleFilter);
    }

    // Date range filter
    if (dateRangeStart) {
      const startDate = new Date(dateRangeStart);
      filtered = filtered.filter((user) => {
        const userDate = new Date(user.createdAt);
        return userDate >= startDate;
      });
    }
    if (dateRangeEnd) {
      const endDate = new Date(dateRangeEnd);
      endDate.setHours(23, 59, 59, 999); // End of day
      filtered = filtered.filter((user) => {
        const userDate = new Date(user.createdAt);
        return userDate <= endDate;
      });
    }

    // Sorting
    filtered.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortBy) {
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "email":
          aValue = a.email.toLowerCase();
          bValue = b.email.toLowerCase();
          break;
        case "createdAt":
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [users, searchQuery, statusFilter, roleFilter, sortBy, sortOrder, dateRangeStart, dateRangeEnd]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredAndSortedUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredAndSortedUsers.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedUsers(new Set());
  }, [searchQuery, statusFilter, roleFilter, dateRangeStart, dateRangeEnd]);

  const handleSort = (column: "name" | "email" | "createdAt") => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      // Create FormData with isActive status
      const formData = new FormData();
      formData.append("isActive", (!currentStatus).toString());
      
      const response = await usersAPI.update(userId, formData);
      if (response.success) {
        showSuccess(`User ${!currentStatus ? "activated" : "deactivated"} successfully`);
        fetchUsers(); // Refresh the list
      } else {
        showError(response.message || "Failed to update user status");
      }
    } catch (err) {
      showError("Error updating user status");
      console.error(err);
    }
  };

  // Get unique roles for filter
  const uniqueRoles = useMemo(() => {
    const roles = new Set(users.map((user) => user.role));
    return Array.from(roles);
  }, [users]);

  // Bulk selection handlers
  const handleSelectAll = () => {
    if (selectedUsers.size === paginatedUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(paginatedUsers.map((user) => user._id)));
    }
  };

  const handleSelectUser = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const isAllSelected = paginatedUsers.length > 0 && selectedUsers.size === paginatedUsers.length;
  const isIndeterminate = selectedUsers.size > 0 && selectedUsers.size < paginatedUsers.length;

  // Bulk actions
  const handleBulkActivate = async () => {
    if (selectedUsers.size === 0) return;
    setIsBulkProcessing(true);
    try {
      const promises = Array.from(selectedUsers).map((userId) => {
        const formData = new FormData();
        formData.append("isActive", "true");
        return usersAPI.update(userId, formData);
      });
      await Promise.all(promises);
      showSuccess(`${selectedUsers.size} user(s) activated successfully`);
      setSelectedUsers(new Set());
      fetchUsers();
    } catch (err) {
      showError("Error activating users");
      console.error(err);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkDeactivate = async () => {
    if (selectedUsers.size === 0) return;
    setIsBulkProcessing(true);
    try {
      const promises = Array.from(selectedUsers).map((userId) => {
        const formData = new FormData();
        formData.append("isActive", "false");
        return usersAPI.update(userId, formData);
      });
      await Promise.all(promises);
      showSuccess(`${selectedUsers.size} user(s) deactivated successfully`);
      setSelectedUsers(new Set());
      fetchUsers();
    } catch (err) {
      showError("Error deactivating users");
      console.error(err);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // Export functions
  const exportToCSV = () => {
    const headers = ["Name", "Email", "Role", "Status", "Created At"];
    const rows = filteredAndSortedUsers.map((user) => [
      user.name,
      user.email,
      user.role,
      user.isActive ? "Active" : "Inactive",
      new Date(user.createdAt).toLocaleDateString("en-US"),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `users_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showSuccess("Users exported to CSV successfully");
  };

  const exportToExcel = () => {
    // For Excel, we'll create a CSV with Excel-compatible format
    // In a real app, you might use a library like xlsx
    const headers = ["Name", "Email", "Role", "Status", "Created At"];
    const rows = filteredAndSortedUsers.map((user) => [
      user.name,
      user.email,
      user.role,
      user.isActive ? "Active" : "Inactive",
      new Date(user.createdAt).toLocaleDateString("en-US"),
    ]);

    // Create TSV (Tab-separated) which Excel can open
    const tsvContent = [
      headers.join("\t"),
      ...rows.map((row) => row.join("\t")),
    ].join("\n");

    const blob = new Blob([tsvContent], { type: "text/tab-separated-values;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `users_${new Date().toISOString().split("T")[0]}.xls`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showSuccess("Users exported to Excel successfully");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <div className="flex flex-1 items-center justify-center lg:ml-72">
          <div className="text-center">
            <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
            <p className="text-slate-600">Loading users...</p>
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
              <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Users</h1>
              <p className="mt-1 text-xs text-slate-600 sm:mt-1.5 sm:text-sm">
                Manage clinic users and their access
              </p>
            </div>
            <button
              onClick={() => navigate("/users/new")}
              className="w-full rounded-xl bg-indigo-700 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-500/30 transition hover:bg-indigo-800 hover:shadow-lg hover:shadow-indigo-500/40 sm:w-auto sm:px-5 sm:py-2.5"
            >
              + Add User
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {/* Search and Filters */}
          <div className="mb-6 space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              {/* Search */}
              <div className="relative flex-1 sm:max-w-md">
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
                  placeholder="Search users by name, email, or role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
              </div>

              {/* Filters and Actions */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>

                {/* Role Filter */}
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                >
                  <option value="all">All Roles</option>
                  {uniqueRoles.map((role) => (
                    <option key={role} value={role}>
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </option>
                  ))}
                </select>

                {/* Advanced Filters Toggle */}
                <button
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                >
                  {showAdvancedFilters ? "Hide" : "Advanced"} Filters
                </button>

                {/* Export Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={exportToCSV}
                    disabled={filteredAndSortedUsers.length === 0}
                    className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                    title="Export to CSV"
                  >
                    <svg
                      className="h-4 w-4 inline-block mr-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    CSV
                  </button>
                  <button
                    onClick={exportToExcel}
                    disabled={filteredAndSortedUsers.length === 0}
                    className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                    title="Export to Excel"
                  >
                    <svg
                      className="h-4 w-4 inline-block mr-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    Excel
                  </button>
                </div>
              </div>
            </div>

            {/* Advanced Filters */}
            {showAdvancedFilters && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Date Range Start */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Created From
                    </label>
                    <input
                      type="date"
                      value={dateRangeStart}
                      onChange={(e) => setDateRangeStart(e.target.value)}
                      className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>

                  {/* Date Range End */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Created To
                    </label>
                    <input
                      type="date"
                      value={dateRangeEnd}
                      onChange={(e) => setDateRangeEnd(e.target.value)}
                      className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>
                </div>

                {/* Clear Advanced Filters */}
                {(dateRangeStart || dateRangeEnd) && (
                  <button
                    onClick={() => {
                      setDateRangeStart("");
                      setDateRangeEnd("");
                    }}
                    className="mt-3 text-xs text-indigo-600 hover:text-indigo-700"
                  >
                    Clear advanced filters
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Bulk Actions Bar */}
          {selectedUsers.size > 0 && (
            <div className="mb-4 flex items-center justify-between rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3">
              <div className="text-sm font-medium text-indigo-900">
                {selectedUsers.size} user(s) selected
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleBulkActivate}
                  disabled={isBulkProcessing}
                  className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isBulkProcessing ? "Processing..." : "Activate Selected"}
                </button>
                <button
                  onClick={handleBulkDeactivate}
                  disabled={isBulkProcessing}
                  className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isBulkProcessing ? "Processing..." : "Deactivate Selected"}
                </button>
                <button
                  onClick={() => setSelectedUsers(new Set())}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}

          {/* Results Count and Pagination Controls */}
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-600">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredAndSortedUsers.length)} of{" "}
              {filteredAndSortedUsers.length} users
              {filteredAndSortedUsers.length !== users.length && ` (filtered from ${users.length} total)`}
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-600">Items per page:</label>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full min-w-[640px]">
                <thead className="border-b border-slate-200 bg-slate-50/80">
                  <tr>
                    <th className="w-12 px-4 py-3 text-left sm:px-6 sm:py-4">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        ref={(input) => {
                          if (input) input.indeterminate = isIndeterminate;
                        }}
                        onChange={handleSelectAll}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 sm:px-6 sm:py-4">
                      <button
                        onClick={() => handleSort("name")}
                        className="flex items-center gap-1 hover:text-indigo-600 transition-colors"
                      >
                        Name
                        {sortBy === "name" && (
                          <svg
                            className={`h-4 w-4 ${sortOrder === "asc" ? "" : "rotate-180"}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 15l7-7 7 7"
                            />
                          </svg>
                        )}
                      </button>
                    </th>
                    <th className="hidden px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 sm:table-cell sm:px-6 sm:py-4">
                      <button
                        onClick={() => handleSort("email")}
                        className="flex items-center gap-1 hover:text-indigo-600 transition-colors"
                      >
                        Email
                        {sortBy === "email" && (
                          <svg
                            className={`h-4 w-4 ${sortOrder === "asc" ? "" : "rotate-180"}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 15l7-7 7 7"
                            />
                          </svg>
                        )}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 sm:px-6 sm:py-4">
                      Role
                    </th>
                    <th className="hidden px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 md:table-cell sm:px-6 sm:py-4">
                      Status
                    </th>
                    <th className="hidden px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600 lg:table-cell sm:px-6 sm:py-4">
                      <button
                        onClick={() => handleSort("createdAt")}
                        className="flex items-center gap-1 hover:text-indigo-600 transition-colors"
                      >
                        Created
                        {sortBy === "createdAt" && (
                          <svg
                            className={`h-4 w-4 ${sortOrder === "asc" ? "" : "rotate-180"}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 15l7-7 7 7"
                            />
                          </svg>
                        )}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-600 sm:px-6 sm:py-4">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {paginatedUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center">
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
                              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                            />
                          </svg>
                          <p className="text-sm font-medium text-slate-600">
                            {users.length === 0
                              ? "No users found"
                              : "No users match your filters"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {users.length === 0
                              ? "Get started by adding your first user"
                              : "Try adjusting your search or filters"}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedUsers.map((user) => (
                      <tr
                        key={user._id}
                        className={`cursor-pointer transition-colors hover:bg-slate-50/50 ${
                          selectedUsers.has(user._id) ? "bg-indigo-50/50" : ""
                        }`}
                        onClick={() => navigate(`/users/${user._id}`)}
                      >
                        <td className="whitespace-nowrap px-4 py-3 sm:px-6 sm:py-4">
                          <input
                            type="checkbox"
                            checked={selectedUsers.has(user._id)}
                            onChange={() => handleSelectUser(user._id)}
                            onClick={(e) => e.stopPropagation()}
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-sm">
                              <span className="text-sm font-bold text-white">
                                {user.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-slate-900">
                                {user.name}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="text-sm font-medium text-slate-700">
                            {user.email}
                          </div>
                        </td>
                        <td className="px-4 py-3 sm:px-6 sm:py-4">
                          <div className="flex flex-wrap gap-1 sm:gap-1.5">
                            {user.roles && user.roles.length > 0 ? (
                              user.roles.slice(0, 2).map((role) => (
                                <span
                                  key={role._id}
                                  className="inline-flex rounded-lg border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 sm:px-2.5 sm:py-1 sm:text-xs"
                                >
                                  {role.displayName}
                                </span>
                              ))
                            ) : (
                              <span
                                className={`inline-flex rounded-lg border px-1.5 py-0.5 text-[10px] font-semibold capitalize sm:px-2.5 sm:py-1 sm:text-xs ${getRoleBadgeColor(
                                  user.role
                                )}`}
                              >
                                {user.role}
                              </span>
                            )}
                            {user.roles && user.roles.length > 2 && (
                              <span className="inline-flex rounded-lg border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 sm:px-2.5 sm:py-1 sm:text-xs">
                                +{user.roles.length - 2}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="hidden whitespace-nowrap px-4 py-3 md:table-cell sm:px-6 sm:py-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleUserStatus(user._id, user.isActive);
                            }}
                            className={`inline-flex items-center gap-1 rounded-lg border px-1.5 py-0.5 text-[10px] font-semibold transition hover:opacity-80 sm:gap-1.5 sm:px-2.5 sm:py-1 sm:text-xs ${
                              user.isActive
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border-slate-200 bg-slate-50 text-slate-600"
                            }`}
                            title={`Click to ${user.isActive ? "deactivate" : "activate"}`}
                          >
                            <span
                              className={`h-1 w-1 rounded-full sm:h-1.5 sm:w-1.5 ${
                                user.isActive ? "bg-emerald-500" : "bg-slate-400"
                              }`}
                            />
                            {user.isActive ? "Active" : "Inactive"}
                          </button>
                        </td>
                        <td className="hidden whitespace-nowrap px-4 py-3 text-xs text-slate-600 lg:table-cell sm:px-6 sm:py-4">
                          <div className="text-xs text-slate-600 sm:text-sm">
                            {new Date(user.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right sm:px-6 sm:py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/users/${user._id}`);
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

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-slate-600">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                          currentPage === pageNum
                            ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                            : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default Users;
