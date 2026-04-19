import React from "react";
import { Link } from "react-router-dom";
import { PenLine, LogOut, User } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import toast from "react-hot-toast";

export const Navbar: React.FC = () => {
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    toast.success("Logged out.");
  };

  return (
    <nav className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
      <Link to="/dashboard" className="flex items-center gap-2 font-bold text-brand-600 text-lg">
        <PenLine size={22} />
        InkBase
      </Link>

      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500 hidden sm:block">{user?.email}</span>
        <Link
          to="/profile"
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
        >
          <User size={18} />
        </Link>
        <button
          onClick={handleLogout}
          className="p-2 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors"
        >
          <LogOut size={18} />
        </button>
      </div>
    </nav>
  );
};
