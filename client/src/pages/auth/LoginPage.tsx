// LEARN: Controlled form in React.
// Each input's value is stored in state. On submit, we read from state.
// React re-renders on each keystroke — this is how React "controls" the input.
// Alternative: uncontrolled forms with useRef (better for large forms).

import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, PenLine } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import toast from "react-hot-toast";
import { AxiosError } from "axios";

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoading } = useAuthStore();
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    try {
      await login(form.email, form.password);
      toast.success("Welcome back!");
      navigate("/dashboard");
    } catch (err) {
      const msg = (err as AxiosError<any>)?.response?.data?.message ?? "Login failed.";
      toast.error(msg);
      if (msg.toLowerCase().includes("password")) setErrors({ password: msg });
      else if (msg.toLowerCase().includes("email")) setErrors({ email: msg });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-white p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 text-brand-600 font-bold text-2xl mb-2">
            <PenLine size={28} /> InkBase
          </div>
          <p className="text-gray-500 text-sm">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-8 space-y-5">
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={set("email")}
            error={errors.email}
            leftIcon={<Mail size={16} />}
            required
          />
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={form.password}
            onChange={set("password")}
            error={errors.password}
            leftIcon={<Lock size={16} />}
            required
          />
          <Button type="submit" isLoading={isLoading} className="w-full mt-2">
            Sign In
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          Don't have an account?{" "}
          <Link to="/register" className="text-brand-600 hover:underline font-medium">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
};
