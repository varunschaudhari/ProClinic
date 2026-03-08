import toast from "react-hot-toast";

// Success toast
export const showSuccess = (message: string) => {
  toast.success(message, {
    duration: 3000,
    position: "top-right",
    style: {
      background: "#10b981",
      color: "#fff",
      borderRadius: "0.5rem",
      padding: "0.75rem 1rem",
      fontSize: "0.875rem",
      fontWeight: "500",
    },
    iconTheme: {
      primary: "#fff",
      secondary: "#10b981",
    },
  });
};

// Error toast
export const showError = (message: string) => {
  toast.error(message, {
    duration: 4000,
    position: "top-right",
    style: {
      background: "#ef4444",
      color: "#fff",
      borderRadius: "0.5rem",
      padding: "0.75rem 1rem",
      fontSize: "0.875rem",
      fontWeight: "500",
    },
    iconTheme: {
      primary: "#fff",
      secondary: "#ef4444",
    },
  });
};

// Info toast
export const showInfo = (message: string) => {
  toast(message, {
    duration: 3000,
    position: "top-right",
    icon: "ℹ️",
    style: {
      background: "#3b82f6",
      color: "#fff",
      borderRadius: "0.5rem",
      padding: "0.75rem 1rem",
      fontSize: "0.875rem",
      fontWeight: "500",
    },
  });
};

// Warning toast
export const showWarning = (message: string) => {
  toast(message, {
    duration: 3500,
    position: "top-right",
    icon: "⚠️",
    style: {
      background: "#f59e0b",
      color: "#fff",
      borderRadius: "0.5rem",
      padding: "0.75rem 1rem",
      fontSize: "0.875rem",
      fontWeight: "500",
    },
  });
};

// Loading toast (returns a function to dismiss)
export const showLoading = (message: string) => {
  return toast.loading(message, {
    position: "top-right",
    style: {
      background: "#6366f1",
      color: "#fff",
      borderRadius: "0.5rem",
      padding: "0.75rem 1rem",
      fontSize: "0.875rem",
      fontWeight: "500",
    },
  });
};

// Promise toast (for async operations)
export const showPromise = <T,>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((error: any) => string);
  }
) => {
  return toast.promise(
    promise,
    {
      loading: messages.loading,
      success: messages.success,
      error: messages.error,
    },
    {
      position: "top-right",
      style: {
        borderRadius: "0.5rem",
        padding: "0.75rem 1rem",
        fontSize: "0.875rem",
        fontWeight: "500",
      },
    }
  );
};
