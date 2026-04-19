// LEARN: Layout component — wraps pages that need the navbar + sidebar.
// Using React Router's <Outlet /> renders the matched child route inside the layout.
// This avoids repeating <Navbar /> and <Sidebar /> in every page component.

import React from "react";
import { Outlet, Navigate } from "react-router-dom";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";
import { useAuthStore } from "@/store/authStore";

export const AppLayout: React.FC = () => {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
