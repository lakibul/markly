// LEARN: React Router v6 declarative routing.
// <Routes> + <Route> define what component to render for each URL path.
// <Navigate> does a client-side redirect.
// AppLayout wraps protected routes — if not logged in, redirects to /login.
//
// Route structure:
//   /login, /register → public auth pages
//   /shared/:token   → public shared document view
//   / (AppLayout)    → protected routes (needs login)
//     /dashboard     → document list
//     /editor/:id    → document editor

import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoginPage } from "@/pages/auth/LoginPage";
import { RegisterPage } from "@/pages/auth/RegisterPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { EditorPage } from "@/pages/EditorPage";
import { SharedDocumentPage } from "@/pages/SharedDocumentPage";

const App: React.FC = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/shared/:token" element={<SharedDocumentPage />} />

      {/* Protected routes — wrapped in AppLayout */}
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/editor/:id" element={<EditorPage />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default App;
