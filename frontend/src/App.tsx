import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import DoctorDashboard from "./pages/DoctorDashboard";
import Users from "./pages/Users";
import UserDetails from "./pages/UserDetails";
import Roles from "./pages/Roles";
import RoleDetails from "./pages/RoleDetails";
import Patients from "./pages/Patients";
import PatientDetails from "./pages/PatientDetails";
import Appointments from "./pages/Appointments";
import DoctorSchedules from "./pages/DoctorSchedules";
import OPDDashboard from "./pages/OPDDashboard";
import OPDRegister from "./pages/OPDRegister";
import OPDQueue from "./pages/OPDQueue";
import OPDList from "./pages/OPDList";
import OPDDetails from "./pages/OPDDetails";
import OPDBilling from "./pages/OPDBilling";
import OPDBillingOverview from "./pages/OPDBillingOverview";
import OPDBillingPatientDetails from "./pages/OPDBillingPatientDetails";
import OPDBillingCashMemo from "./pages/OPDBillingCashMemo";
import OPDBillingInvoice from "./pages/OPDBillingInvoice";
import OPDBillingReceipt from "./pages/OPDBillingReceipt";
import OPDBillingAdvance from "./pages/OPDBillingAdvance";
import OPDBillingCreditNotes from "./pages/OPDBillingCreditNotes";
import OPDBillingRefund from "./pages/OPDBillingRefund";
import IPDDashboard from "./pages/IPDDashboard";
import IPDAdmit from "./pages/IPDAdmit";
import IPDList from "./pages/IPDList";
import IPDDetails from "./pages/IPDDetails";
import Rooms from "./pages/Rooms";
import Wards from "./pages/Wards";
import OTManagement from "./pages/OTManagement";
import OTScheduler from "./pages/OTScheduler";
import IPDBilling from "./pages/IPDBilling";
import Settings from "./pages/Settings";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        reverseOrder={false}
        gutter={8}
        containerClassName=""
        containerStyle={{}}
        toastOptions={{
          // Default options for all toasts
          duration: 3000,
          style: {
            background: "#fff",
            color: "#1e293b",
            borderRadius: "0.5rem",
            padding: "0.75rem 1rem",
            fontSize: "0.875rem",
            fontWeight: "500",
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
          },
          // Success toast
          success: {
            duration: 3000,
            iconTheme: {
              primary: "#10b981",
              secondary: "#fff",
            },
            style: {
              background: "#10b981",
              color: "#fff",
            },
          },
          // Error toast
          error: {
            duration: 4000,
            iconTheme: {
              primary: "#ef4444",
              secondary: "#fff",
            },
            style: {
              background: "#ef4444",
              color: "#fff",
            },
          },
          // Loading toast
          loading: {
            iconTheme: {
              primary: "#6366f1",
              secondary: "#fff",
            },
            style: {
              background: "#6366f1",
              color: "#fff",
            },
          },
        }}
      />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/doctor/dashboard"
          element={
            <ProtectedRoute>
              <DoctorDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users"
          element={
            <ProtectedRoute>
              <Users />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users/new"
          element={
            <ProtectedRoute>
              <UserDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users/:id"
          element={
            <ProtectedRoute>
              <UserDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/roles"
          element={
            <ProtectedRoute>
              <Roles />
            </ProtectedRoute>
          }
        />
        <Route
          path="/roles/:id"
          element={
            <ProtectedRoute>
              <RoleDetails />
            </ProtectedRoute>
          }
                  />
        <Route
          path="/patients"
          element={
            <ProtectedRoute>
              <Patients />
            </ProtectedRoute>
          }
        />
        <Route
          path="/patients/:id"
          element={
            <ProtectedRoute>
              <PatientDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/appointments"
          element={
            <ProtectedRoute>
              <Navigate to="/appointments/dashboard" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/appointments/dashboard"
          element={
            <ProtectedRoute>
              <Appointments viewMode="dashboard" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/appointments/list"
          element={
            <ProtectedRoute>
              <Appointments viewMode="list" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/appointments/calendar"
          element={
            <ProtectedRoute>
              <Appointments viewMode="calendar" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/doctor-schedules"
          element={
            <ProtectedRoute>
              <DoctorSchedules />
            </ProtectedRoute>
          }
        />
        <Route
          path="/opd/dashboard"
          element={
            <ProtectedRoute>
              <OPDDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/opd/register"
          element={
            <ProtectedRoute>
              <OPDRegister />
            </ProtectedRoute>
          }
        />
        <Route
          path="/opd/queue"
          element={
            <ProtectedRoute>
              <OPDQueue />
            </ProtectedRoute>
          }
        />
        <Route
          path="/opd"
          element={
            <ProtectedRoute>
              <OPDList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/opd/billing"
          element={
            <ProtectedRoute>
              <OPDBilling />
            </ProtectedRoute>
          }
        />
        <Route
          path="/opd/billing/overview"
          element={
            <ProtectedRoute>
              <OPDBillingOverview />
            </ProtectedRoute>
          }
        />
        <Route
          path="/opd/billing/patient/:patientId"
          element={
            <ProtectedRoute>
              <OPDBillingPatientDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/opd/billing/cash-memo"
          element={
            <ProtectedRoute>
              <OPDBillingCashMemo />
            </ProtectedRoute>
          }
        />
        <Route
          path="/opd/billing/invoice"
          element={
            <ProtectedRoute>
              <OPDBillingInvoice />
            </ProtectedRoute>
          }
        />
        <Route
          path="/opd/billing/receipt"
          element={
            <ProtectedRoute>
              <OPDBillingReceipt />
            </ProtectedRoute>
          }
        />
        <Route
          path="/opd/billing/advance"
          element={
            <ProtectedRoute>
              <OPDBillingAdvance />
            </ProtectedRoute>
          }
        />
        <Route
          path="/opd/billing/credit-notes"
          element={
            <ProtectedRoute>
              <OPDBillingCreditNotes />
            </ProtectedRoute>
          }
        />
        <Route
          path="/opd/billing/refund"
          element={
            <ProtectedRoute>
              <OPDBillingRefund />
            </ProtectedRoute>
          }
        />
        <Route
          path="/opd/:id"
          element={
            <ProtectedRoute>
              <OPDDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ipd/dashboard"
          element={
            <ProtectedRoute>
              <IPDDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ipd/admit"
          element={
            <ProtectedRoute>
              <IPDAdmit />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ipd"
          element={
            <ProtectedRoute>
              <IPDList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ipd/billing"
          element={
            <ProtectedRoute>
              <IPDBilling />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ipd/:id"
          element={
            <ProtectedRoute>
              <IPDDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ipd/rooms"
          element={
            <ProtectedRoute>
              <Rooms />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ipd/wards"
          element={
            <ProtectedRoute>
              <Wards />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ipd/ot"
          element={
            <ProtectedRoute>
              <OTManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ipd/ot/scheduler"
          element={
            <ProtectedRoute>
              <OTScheduler />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
