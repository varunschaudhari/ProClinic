import { useMemo, useState, useEffect } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { showSuccess, showError } from "../utils/toast";

type LoginForm = {
  email: string;
  password: string;
  remember: boolean;
};

function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState<LoginForm>({
    email: "",
    password: "",
    remember: true,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const errors = useMemo(() => {
    const output: Partial<Record<keyof LoginForm, string>> = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      output.email = "Enter a valid work email address.";
    }
    if (form.password.trim().length < 6) {
      output.password = "Password must be at least 6 characters.";
    }
    return output;
  }, [form.email, form.password]);

  const isValid = Object.keys(errors).length === 0;
  const showErrorState = hasSubmitted && !isValid;

  // Redirect if already logged in
  useEffect(() => {
    const token =
      localStorage.getItem("proclinic_token") ||
      sessionStorage.getItem("proclinic_token");
    
    if (token) {
      navigate("/dashboard");
    }
  }, [navigate]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setHasSubmitted(true);

    if (!isValid) {
      showError("Please fix the highlighted fields and try again.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Store token in localStorage if remember me is checked
        if (form.remember) {
          localStorage.setItem("proclinic_token", data.data.token);
          localStorage.setItem("proclinic_user", JSON.stringify(data.data.user));
        } else {
          sessionStorage.setItem("proclinic_token", data.data.token);
          sessionStorage.setItem("proclinic_user", JSON.stringify(data.data.user));
        }

        // Debug: Log user data to verify permissions are included
        console.log("User logged in:", {
          name: data.data.user.name,
          email: data.data.user.email,
          role: data.data.user.role,
          roles: data.data.user.roles,
          permissions: data.data.user.permissions,
        });

        showSuccess("Login successful. Redirecting to clinic dashboard...");
        
        // Redirect to dashboard using React Router
        setTimeout(() => {
          navigate("/dashboard");
        }, 1000);
      } else {
        showError(data.message || "Login failed. Please check your credentials.");
      }
    } catch (error) {
      console.error("Login error:", error);
      showError("Network error. Please check if the server is running.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputClassName =
    "h-12 w-full border-none bg-transparent px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed";
  const socialButtonClassName =
    "flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <main className="login-page-bg relative min-h-screen overflow-hidden px-4 py-8 text-slate-900 sm:px-6 sm:py-10">
      <div className="pointer-events-none absolute -left-24 top-24 h-64 w-64 rounded-full bg-cyan-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-20 h-80 w-80 rounded-full bg-indigo-200/40 blur-3xl" />

      <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-5xl flex-col justify-center">
        <div className="mb-5 text-center">
          <div className="inline-flex items-center gap-2.5 rounded-full border border-slate-200/75 bg-white/90 px-5 py-2 shadow-sm backdrop-blur">
            <span className="relative inline-flex h-8 w-8 items-center justify-center">
              <span className="absolute h-4 w-4 rounded-full bg-cyan-400" />
              <span className="absolute left-[1px] top-[7px] h-4 w-4 rounded-full bg-indigo-700" />
              <span className="absolute right-[1px] top-[7px] h-4 w-4 rounded-full bg-indigo-500" />
              <span className="absolute bottom-[1px] h-4 w-4 rounded-full bg-indigo-800" />
            </span>
            <span className="text-4xl font-bold tracking-tight text-slate-900">
              ProClinic
            </span>
          </div>
        </div>

        <section className="grid overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 shadow-[0_30px_70px_-35px_rgba(15,23,42,0.45)] backdrop-blur lg:grid-cols-2">
          <aside className="relative hidden overflow-hidden bg-gradient-to-br from-indigo-700 via-indigo-600 to-cyan-500 px-10 py-12 text-white lg:block">
            <div className="absolute -left-16 -top-16 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
            <div className="absolute -bottom-16 right-0 h-48 w-48 rounded-full bg-cyan-300/25 blur-2xl" />
            <div className="relative">
              <p className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                Trusted by care teams
              </p>
              <h2 className="mt-6 text-4xl font-semibold leading-tight">
                Manage your clinic, smarter and faster.
              </h2>
              <p className="mt-4 max-w-sm text-sm text-cyan-50/90">
                Centralize appointments, patient records, and billing in one
                secure workspace designed for modern healthcare operations.
              </p>

              <div className="mt-8 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/25 bg-white/10 p-4">
                  <p className="text-xs uppercase tracking-wide text-cyan-100">
                    Uptime
                  </p>
                  <p className="mt-1 text-2xl font-bold">99.9%</p>
                </div>
                <div className="rounded-2xl border border-white/25 bg-white/10 p-4">
                  <p className="text-xs uppercase tracking-wide text-cyan-100">
                    Active Clinics
                  </p>
                  <p className="mt-1 text-2xl font-bold">1,200+</p>
                </div>
              </div>
            </div>
          </aside>

          <div className="px-5 py-7 sm:px-10 sm:py-10">
            <p className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Secure clinic access
            </p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">
              Sign In
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Enter your details to access your ProClinic dashboard.
            </p>

            <form onSubmit={handleSubmit} className="mt-7 space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-semibold text-slate-800"
                >
                  Email Address
                </label>
                <div
                  className={`mt-2 flex items-center rounded-xl border bg-white px-3 transition focus-within:ring-4 ${
                    hasSubmitted && errors.email
                      ? "border-rose-300 focus-within:border-rose-500 focus-within:ring-rose-100"
                      : "border-slate-300 focus-within:border-indigo-500 focus-within:ring-indigo-100"
                  }`}
                >
                  <span className="text-slate-500">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
                      <path
                        d="M4 7h16v10H4V7zm0 0 8 6 8-6"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    required
                    value={form.email}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        email: event.target.value,
                      }))
                    }
                    disabled={isSubmitting}
                    aria-invalid={hasSubmitted && !!errors.email}
                    aria-describedby={
                      hasSubmitted && errors.email ? "email-error" : undefined
                    }
                    placeholder="doctor@proclinic.com"
                    className={inputClassName}
                  />
                </div>
                {hasSubmitted && errors.email ? (
                  <p id="email-error" className="mt-2 text-sm text-rose-600">
                    {errors.email}
                  </p>
                ) : null}
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-semibold text-slate-800"
                >
                  Password
                </label>
                <div
                  className={`mt-2 flex items-center rounded-xl border bg-white px-3 transition focus-within:ring-4 ${
                    hasSubmitted && errors.password
                      ? "border-rose-300 focus-within:border-rose-500 focus-within:ring-rose-100"
                      : "border-slate-300 focus-within:border-indigo-500 focus-within:ring-indigo-100"
                  }`}
                >
                  <span className="text-slate-500">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
                      <path
                        d="M8 11V8a4 4 0 1 1 8 0v3M6 11h12v9H6z"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    autoComplete="current-password"
                    required
                    value={form.password}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        password: event.target.value,
                      }))
                    }
                    disabled={isSubmitting}
                    aria-invalid={hasSubmitted && !!errors.password}
                    aria-describedby={
                      hasSubmitted && errors.password
                        ? "password-error"
                        : undefined
                    }
                    placeholder="Enter your password"
                    className={inputClassName}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((previous) => !previous)}
                    className="rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                    aria-label="Toggle password visibility"
                    disabled={isSubmitting}
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
                      <path
                        d="M3 3l18 18M10.7 10.7A3 3 0 0 0 12 16a3 3 0 0 0 1.3-.3M9.9 5.1A10.9 10.9 0 0 1 12 5c5 0 9 3.5 10 7-0.3 1.2-1 2.4-1.9 3.5M6.2 6.2C4.7 7.4 3.6 9 3 12c1 3.5 5 7 9 7 1.3 0 2.5-.2 3.6-.7"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
                {hasSubmitted && errors.password ? (
                  <p id="password-error" className="mt-2 text-sm text-rose-600">
                    {errors.password}
                  </p>
                ) : null}
              </div>

              <div className="flex items-center justify-between gap-4">
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.remember}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        remember: event.target.checked,
                      }))
                    }
                    disabled={isSubmitting}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-700 accent-indigo-700"
                  />
                  Remember Me
                </label>
                <a
                  href="#"
                  className="text-sm font-medium text-rose-600 hover:text-rose-700 hover:underline"
                >
                  Forgot Password?
                </a>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="h-12 w-full rounded-xl bg-indigo-700 text-base font-semibold text-white shadow-[0_12px_30px_-12px_rgba(67,56,202,0.95)] transition hover:bg-indigo-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200 disabled:cursor-not-allowed disabled:bg-indigo-500"
              >
                {isSubmitting ? "Signing In..." : "Login"}
              </button>


              {showErrorState ? (
                <p className="text-center text-xs text-slate-500">
                  Tip: Use your registered clinic email and password.
                </p>
              ) : null}

              <div className="flex items-center gap-3 pt-1">
                <div className="h-px flex-1 bg-slate-200" />
                <p className="text-xs font-semibold tracking-[0.22em] text-slate-500">
                  OR
                </p>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  className={`${socialButtonClassName} text-blue-600`}
                  aria-label="Continue with Facebook"
                  disabled={isSubmitting}
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                    <path d="M13.5 21v-8.2h2.8l.4-3.2h-3.2V7.5c0-.9.3-1.5 1.6-1.5h1.7V3.1c-.3 0-1.3-.1-2.4-.1-2.4 0-4.1 1.5-4.1 4.2v2.4H7.5v3.2h2.8V21h3.2z" />
                  </svg>
                </button>
                <button
                  type="button"
                  className={socialButtonClassName}
                  aria-label="Continue with Google"
                  disabled={isSubmitting}
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5">
                    <path
                      fill="#EA4335"
                      d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.5 14.6 2.6 12 2.6a9.4 9.4 0 1 0 0 18.8c5.4 0 9-3.8 9-9.1 0-.6 0-1.1-.2-1.6H12z"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  className={`${socialButtonClassName} text-slate-900`}
                  aria-label="Continue with Apple"
                  disabled={isSubmitting}
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                    <path d="M16.7 12.7c0-2 1.6-3 1.6-3-1-1.6-2.6-1.8-3.2-1.9-1.4-.1-2.7.8-3.4.8-.7 0-1.8-.8-2.9-.8-1.5 0-2.8.9-3.6 2.2-1.6 2.8-.4 6.9 1.1 9.1.7 1 1.6 2.2 2.8 2.1 1.1 0 1.6-.7 3-.7 1.4 0 1.8.7 3 .7 1.2 0 2-1.1 2.8-2.1.8-1.2 1.2-2.3 1.2-2.4-.1 0-2.4-.9-2.4-4zm-2.5-6.5c.6-.8 1-1.9.9-3-.9 0-2.1.6-2.8 1.4-.6.7-1.1 1.8-1 2.9 1 .1 2.1-.5 2.9-1.3z" />
                  </svg>
                </button>
              </div>

              <p className="pt-1 text-center text-sm text-slate-700">
                Don&apos;t have an account yet?{" "}
                <a
                  href="#"
                  className="font-semibold text-indigo-700 hover:underline"
                >
                  Register
                </a>
              </p>
            </form>
          </div>
        </section>

        <p className="pb-2 pt-4 text-center text-sm text-slate-600 sm:pb-4">
          Copyright © 2025 - ProClinic.
        </p>
      </div>
    </main>
  );
}

export default Login;
