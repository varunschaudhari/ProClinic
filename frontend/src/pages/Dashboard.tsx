import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { appointmentsAPI, opdAPI, ipdAPI, otSchedulerAPI, roomAPI } from "../utils/api";
import { canAccessRoute } from "../utils/permissions";
import { showError } from "../utils/toast";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
};

function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [range, setRange] = useState<"today" | "7d" | "30d">("today");
  const [stats, setStats] = useState({
    appointmentsScheduled: 0,
    appointmentsCompleted: 0,
    bedsOccupied: 0,
    bedsEmpty: 0,
    otScheduled: 0,
    otAvailablePct: 0,
    opdCashMemo: 0,
    opdInvoiceRaised: 0,
    ipdCashMemo: 0,
    ipdInvoiceRaised: 0,
  });

  useEffect(() => {
    // Check if user is authenticated
    const token =
      localStorage.getItem("proclinic_token") ||
      sessionStorage.getItem("proclinic_token");
    const userData =
      localStorage.getItem("proclinic_user") ||
      sessionStorage.getItem("proclinic_user");

    if (!token || !userData) {
      navigate("/login");
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      // Permission gate (Admin by default, configurable via Roles module)
      if (!canAccessRoute("/dashboard")) {
        // If doctor, send to doctor dashboard; else fallback to OPD dashboard
        const role = (parsedUser.role || "").toLowerCase();
        const isDoctor = role === "doctor" || (parsedUser.roles || []).some((r: any) => String(r?.name || r).toLowerCase().includes("doctor"));
        navigate(isDoctor ? "/doctor/dashboard" : "/opd/dashboard");
        return;
      }
    } catch (error) {
      console.error("Error parsing user data:", error);
      navigate("/login");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    fetchCommonDashboardStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, range]);

  const fetchCommonDashboardStats = async () => {
    try {
      setStatsLoading(true);
      const today = new Date().toISOString().split("T")[0];

      const [appointmentsRes, roomsStatsRes, otRes, opdRes, ipdRes] = await Promise.all([
        appointmentsAPI.getAll({ date: today }),
        roomAPI.getStats(),
        otSchedulerAPI.getAll({ status: "scheduled" }),
        opdAPI.getAll({}),
        ipdAPI.getAll({}),
      ]);

      const appointments = appointmentsRes?.success ? (appointmentsRes.data?.appointments || []) : [];
      const appointmentsScheduled = appointments.filter((a: any) => (a.status || "").toLowerCase() === "scheduled").length;
      const appointmentsCompleted = appointments.filter((a: any) => (a.status || "").toLowerCase() === "completed").length;

      const roomStats = roomsStatsRes?.success ? roomsStatsRes.data?.stats : null;
      const bedsOccupied = Number(roomStats?.occupiedBeds || 0);
      const bedsEmpty = Number(roomStats?.availableBeds || 0);

      const otScheduled = otRes?.success ? Number(otRes.data?.count || (otRes.data?.schedules || []).length || 0) : 0;

      const opdRecords = opdRes?.success ? (opdRes.data?.opdRecords || []) : [];
      const opdCashMemo = opdRecords.filter((r: any) => r.billingDocumentType === "cash_memo" || !!r.cashMemoNumber).length;
      const opdInvoiceRaised = opdRecords.filter((r: any) => r.billingDocumentType === "invoice" || !!r.invoiceNumber || (r.totalAmount || 0) > 0).length;

      const ipdRecords = ipdRes?.success ? (ipdRes.data?.ipdRecords || []) : [];
      const ipdInvoiceRaised = ipdRecords.filter((r: any) => (r.totalAmount || 0) > 0).length;
      const ipdCashMemo = ipdRecords.filter((r: any) => (r.paymentStatus || "") === "paid").length;

      // OT availability %: we don't have total OT count here, keep 0 for now (can wire later)
      setStats({
        appointmentsScheduled,
        appointmentsCompleted,
        bedsOccupied,
        bedsEmpty,
        otScheduled,
        otAvailablePct: 0,
        opdCashMemo,
        opdInvoiceRaised,
        ipdCashMemo,
        ipdInvoiceRaised,
      });
      setLastUpdatedAt(new Date());
    } catch (e) {
      console.error(e);
      showError("Failed to load dashboard statistics");
    } finally {
      setStatsLoading(false);
    }
  };

  const formatUpdated = useMemo(() => {
    if (!lastUpdatedAt) return "—";
    return lastUpdatedAt.toLocaleString();
  }, [lastUpdatedAt]);

  const kpiTone = (tone: "indigo" | "emerald" | "amber" | "rose") => {
    switch (tone) {
      case "emerald":
        return { ring: "ring-emerald-100", iconBg: "bg-emerald-50", iconText: "text-emerald-700" };
      case "amber":
        return { ring: "ring-amber-100", iconBg: "bg-amber-50", iconText: "text-amber-700" };
      case "rose":
        return { ring: "ring-rose-100", iconBg: "bg-rose-50", iconText: "text-rose-700" };
      default:
        return { ring: "ring-indigo-100", iconBg: "bg-indigo-50", iconText: "text-indigo-700" };
    }
  };

  const KPI = ({
    label,
    value,
    sublabel,
    tone,
    iconPathD,
  }: {
    label: string;
    value: number | string;
    sublabel?: string;
    tone: "indigo" | "emerald" | "amber" | "rose";
    iconPathD: string;
  }) => {
    const t = kpiTone(tone);
    return (
      <div className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ${t.ring} sm:p-5`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-semibold tracking-wide text-slate-500">{label}</div>
            <div className="mt-1 text-2xl font-bold text-slate-900">{statsLoading ? "…" : value}</div>
            {sublabel ? <div className="mt-1 text-xs text-slate-500">{sublabel}</div> : null}
          </div>
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${t.iconBg} ${t.iconText}`}>
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d={iconPathD} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full w-1/2 ${tone === "emerald" ? "bg-emerald-500" : tone === "amber" ? "bg-amber-500" : tone === "rose" ? "bg-rose-500" : "bg-indigo-500"}`} />
        </div>
      </div>
    );
  };

  const Action = ({
    label,
    hint,
    onClick,
    tone = "indigo",
  }: {
    label: string;
    hint?: string;
    onClick: () => void;
    tone?: "indigo" | "emerald" | "amber" | "rose";
  }) => {
    const t = kpiTone(tone);
    return (
      <button
        onClick={onClick}
        className="group flex w-full items-start gap-3 rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-slate-200 transition hover:ring-indigo-200 hover:shadow-md"
      >
        <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${t.iconBg} ${t.iconText}`}>
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M12 4v16m8-8H4" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900">{label}</div>
          {hint ? <div className="mt-0.5 text-xs text-slate-500">{hint}</div> : null}
        </div>
        <div className="ml-auto mt-1 text-slate-400 transition group-hover:text-indigo-500">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M9 18l6-6-6-6" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </button>
    );
  };

  const Section = ({
    title,
    subtitle,
    children,
  }: {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
  }) => (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-bold text-slate-900">{title}</div>
          {subtitle ? <div className="mt-1 text-xs text-slate-500">{subtitle}</div> : null}
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );


  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
          <p className="text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col sidebar-content-margin">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-md">
          <div className="px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Command Center</h1>
                <div className="mt-0.5 text-xs text-slate-500">
                  Last updated: <span className="font-medium text-slate-700">{formatUpdated}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <div className="inline-flex rounded-xl bg-slate-100 p-1">
                  {(["today", "7d", "30d"] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setRange(r)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                        range === r ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {r === "today" ? "Today" : r === "7d" ? "Last 7 days" : "Last 30 days"}
                    </button>
                  ))}
                </div>

                <button
                  onClick={fetchCommonDashboardStats}
                  className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
                  disabled={statsLoading}
                >
                  Refresh
                </button>

                <div className="hidden items-center gap-3 sm:flex">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900">{user.name}</p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-100">
                    <span className="text-sm font-semibold text-indigo-700">{user.name.charAt(0).toUpperCase()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {/* KPI Strip */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KPI
              label="Appointments (scheduled)"
              value={stats.appointmentsScheduled}
              sublabel={range === "today" ? "Today" : "Today (API) • Range coming next"}
              tone="amber"
              iconPathD="M8 7V3m8 4V3M5 11h14M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
            <KPI
              label="Appointments (completed)"
              value={stats.appointmentsCompleted}
              sublabel={range === "today" ? "Today" : "Today (API) • Range coming next"}
              tone="emerald"
              iconPathD="M5 13l4 4L19 7"
            />
            <KPI
              label="Beds occupied"
              value={stats.bedsOccupied}
              sublabel="Live room stats"
              tone="rose"
              iconPathD="M4 11h16a2 2 0 012 2v6M2 19v-6a2 2 0 012-2m0 0V7a2 2 0 012-2h3m10 6V7a2 2 0 00-2-2h-3"
            />
            <KPI
              label="Beds available"
              value={stats.bedsEmpty}
              sublabel="Live room stats"
              tone="indigo"
              iconPathD="M4 19V9a2 2 0 012-2h12a2 2 0 012 2v10M2 19h20"
            />
          </div>

          {/* Modules + Analytics */}
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <div className="grid gap-4 lg:col-span-2">
              <Section title="Appointments" subtitle="Fast actions for front desk">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Action label="Add new appointment" hint="Book & assign doctor quickly" onClick={() => navigate("/appointments/dashboard")} />
                  <Action label="View appointments list" hint="Filter, edit, complete visits" onClick={() => navigate("/appointments/list")} />
                </div>
              </Section>

              <Section title="Admissions (IPD)" subtitle="Bed, room and patient operations">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Action label="Admit patient" hint="Create new IPD admission" onClick={() => navigate("/ipd/admit")} tone="amber" />
                  <Action label="Rooms & availability" hint="Check beds, occupancy and rates" onClick={() => navigate("/ipd/rooms")} tone="emerald" />
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Action label="View in-patients" hint="All IPD records and statuses" onClick={() => navigate("/ipd")} />
                  <Action label="OT calendar" hint="See scheduled OT cases" onClick={() => navigate("/ipd/ot")} />
                </div>
              </Section>

              <Section title="Billing (OPD)" subtitle="Cash memo, invoice, receipt, advance">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Action label="OPD billing dashboard" hint="Overview + patient details" onClick={() => navigate("/opd/billing")} tone="indigo" />
                  <Action label="Create a bill" hint="Go to OPD billing flow" onClick={() => navigate("/opd/billing/overview")} tone="amber" />
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Action label="Cash Memo" onClick={() => navigate("/opd/billing/cash-memo?action=add")} tone="emerald" />
                  <Action label="Invoice" onClick={() => navigate("/opd/billing/invoice?action=add")} tone="indigo" />
                  <Action label="Receipt" onClick={() => navigate("/opd/billing/receipt?action=add")} tone="amber" />
                  <Action label="Advance" onClick={() => navigate("/opd/billing/advance?action=add")} tone="rose" />
                </div>
              </Section>

              <Section title="Billing (IPD)" subtitle="Shortcuts (wire dedicated pages later)">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Action label="Go to IPD billing" hint="Current placeholder route" onClick={() => navigate("/ipd/billing")} />
                  <Action label="View IPD list" hint="Billing from IPD details" onClick={() => navigate("/ipd")} />
                </div>
              </Section>
            </div>

            <div className="grid gap-4">
              <Section title="Analytics" subtitle="At-a-glance operational signals">
                <div className="grid gap-3">
                  <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-slate-600">OT scheduled</div>
                      <div className="text-sm font-bold text-slate-900">{statsLoading ? "…" : stats.otScheduled}</div>
                    </div>
                    <div className="mt-2 text-xs text-slate-500">Next: add OT capacity to calculate availability %</div>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-slate-600">OPD docs</div>
                      <div className="text-sm font-bold text-slate-900">{statsLoading ? "…" : stats.opdInvoiceRaised + stats.opdCashMemo}</div>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600">
                      <div className="rounded-xl bg-white p-2 ring-1 ring-slate-200">
                        <div className="text-[11px] text-slate-500">Cash memo</div>
                        <div className="font-semibold text-slate-900">{statsLoading ? "…" : stats.opdCashMemo}</div>
                      </div>
                      <div className="rounded-xl bg-white p-2 ring-1 ring-slate-200">
                        <div className="text-[11px] text-slate-500">Invoices</div>
                        <div className="font-semibold text-slate-900">{statsLoading ? "…" : stats.opdInvoiceRaised}</div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-slate-600">IPD docs</div>
                      <div className="text-sm font-bold text-slate-900">{statsLoading ? "…" : stats.ipdInvoiceRaised}</div>
                    </div>
                    <div className="mt-2 text-xs text-slate-500">Next: split into cash memo vs invoice (needs backend fields)</div>
                  </div>
                </div>
              </Section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default Dashboard;
