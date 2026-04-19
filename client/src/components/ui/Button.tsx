// LEARN: Reusable component pattern.
// Instead of writing Tailwind classes every time, we create a Button component
// with `variant` and `size` props. This keeps the UI consistent and reduces repetition.

import React from "react";
import { Loader2 } from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
}

const variants = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 focus:ring-brand-500",
  secondary: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-gray-400",
  danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
  ghost: "text-gray-600 hover:bg-gray-100 focus:ring-gray-400",
};

const sizes = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  isLoading,
  leftIcon,
  children,
  className = "",
  disabled,
  ...props
}) => {
  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      className={`
        inline-flex items-center justify-center gap-2 font-medium rounded-lg
        focus:outline-none focus:ring-2 focus:ring-offset-1
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-all duration-150
        ${variants[variant]} ${sizes[size]} ${className}
      `}
    >
      {isLoading ? <Loader2 size={16} className="animate-spin" /> : leftIcon}
      {children}
    </button>
  );
};
