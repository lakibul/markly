// Public document view — no auth required, read-only

import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import MDEditor from "@uiw/react-md-editor";
import { PenLine } from "lucide-react";
import { documentService } from "@/services/document.service";
import { Document } from "@/types";
import { formatDistanceToNow } from "date-fns";

export const SharedDocumentPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [doc, setDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    documentService
      .getByShareToken(token)
      .then(setDoc)
      .catch(() => setError("Document not found or link has expired."))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-600 border-t-transparent" />
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <p className="text-gray-500 mb-2">{error}</p>
        <a href="/login" className="text-brand-600 hover:underline text-sm">Go to InkBase →</a>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex items-center gap-2 text-brand-600 font-bold mb-8">
        <PenLine size={20} /> InkBase
      </div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">{doc?.title}</h1>
      <p className="text-sm text-gray-400 mb-8">
        Updated {doc?.updatedAt && formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}
      </p>
      <div data-color-mode="light">
        <MDEditor.Markdown source={doc?.content ?? ""} />
      </div>
    </div>
  );
};
