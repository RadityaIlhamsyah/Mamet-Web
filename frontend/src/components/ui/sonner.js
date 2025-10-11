import React from "react";

let toastCallback = null;

export const Toaster = () => {
  const [toasts, setToasts] = React.useState([]);

  React.useEffect(() => {
    toastCallback = (message, type = "default") => {
      const id = Date.now();
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3000);
    };
    return () => {
      toastCallback = null;
    };
  }, []);

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={
            "px-4 py-3 rounded-lg shadow-lg text-white " +
            (toast.type === "success"
              ? "bg-green-600"
              : toast.type === "error"
              ? "bg-red-600"
              : toast.type === "warning"
              ? "bg-yellow-600"
              : "bg-gray-900")
          }
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
};

export const toast = (message, options = {}) => {
  if (toastCallback) {
    toastCallback(message, options.type || "default");
  }
};

toast.success = (message) => toast(message, { type: "success" });
toast.error = (message) => toast(message, { type: "error" });
toast.warning = (message) => toast(message, { type: "warning" });
