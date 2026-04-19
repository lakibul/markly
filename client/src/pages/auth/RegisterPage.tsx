import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, User, PenLine } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import toast from "react-hot-toast";
import { AxiosError } from "axios";

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register, isLoading } = useAuthStore();
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register(form.name, form.email, form.password);
      toast.success("Account created! Welcome to InkBase.");
      navigate("/dashboard");
    } catch (err) {
      const msg = (err as AxiosError<any>)?.response?.data?.message ?? "Registration failed.";
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-white p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 text-brand-600 font-bold text-2xl mb-2">
            <PenLine size={28} /> InkBase
          </div>
          <p className="text-gray-500 text-sm">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-8 space-y-5">
          <Input label="Full Name" type="text" placeholder="John Doe" value={form.name} onChange={set("name")} leftIcon={<User size={16} />} required />
          <Input label="Email" type="email" placeholder="you@example.com" value={form.email} onChange={set("email")} leftIcon={<Mail size={16} />} required />
          <Input label="Password" type="password" placeholder="Min. 8 chars, 1 uppercase, 1 number" value={form.password} onChange={set("password")} leftIcon={<Lock size={16} />} required />
          <Button type="submit" isLoading={isLoading} className="w-full mt-2">
            Create Account
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          Already have an account?{" "}
          <Link to="/login" className="text-brand-600 hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};
