// LEARN: useEffect for data fetching.
// useEffect runs after the component renders. The dependency array [] means
// it runs ONCE (on mount). This is the standard pattern for fetching data.
//
// LEARN: Custom hooks (useDocumentStore) — separating UI from state management.

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Grid3X3, List } from "lucide-react";
import { useDocumentStore } from "@/store/documentStore";
import { DocumentCard } from "@/components/documents/DocumentCard";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import toast from "react-hot-toast";

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    documents, isLoading, total, fetchDocuments, fetchFolders,
    createDocument, deleteDocument, setSearchQuery, searchQuery,
  } = useDocumentStore();

  const [view, setView] = useState<"grid" | "list">("grid");
  const [showNewDoc, setShowNewDoc] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [searchInput, setSearchInput] = useState("");

  // LEARN: Fetch data on mount
  useEffect(() => {
    fetchDocuments();
    fetchFolders();
  }, []);

  // LEARN: Debounced search — wait 400ms after typing stops before fetching
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
      fetchDocuments();
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setIsCreating(true);
    try {
      const doc = await createDocument(newTitle.trim());
      setShowNewDoc(false);
      setNewTitle("");
      toast.success("Document created.");
      navigate(`/editor/${doc.id}`);
    } catch {
      toast.error("Failed to create document.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this document? This cannot be undone.")) return;
    try {
      await deleteDocument(id);
      toast.success("Document deleted.");
    } catch {
      toast.error("Failed to delete.");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Documents</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} document{total !== 1 ? "s" : ""}</p>
        </div>
        <Button leftIcon={<Plus size={16} />} onClick={() => setShowNewDoc(true)}>
          New Document
        </Button>
      </div>

      {/* Search + View Toggle */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="input-base pl-9"
          />
        </div>
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1">
          <button onClick={() => setView("grid")} className={`p-1.5 rounded ${view === "grid" ? "bg-brand-50 text-brand-600" : "text-gray-400"}`}>
            <Grid3X3 size={16} />
          </button>
          <button onClick={() => setView("list")} className={`p-1.5 rounded ${view === "list" ? "bg-brand-50 text-brand-600" : "text-gray-400"}`}>
            <List size={16} />
          </button>
        </div>
      </div>

      {/* Document Grid / List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-600 border-t-transparent" />
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-400 text-lg mb-4">No documents yet.</p>
          <Button leftIcon={<Plus size={16} />} onClick={() => setShowNewDoc(true)}>
            Create your first document
          </Button>
        </div>
      ) : (
        <div className={view === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" : "flex flex-col gap-3"}>
          {documents.map((doc) => (
            <DocumentCard key={doc.id} doc={doc} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* New Document Modal */}
      <Modal isOpen={showNewDoc} onClose={() => setShowNewDoc(false)} title="New Document">
        <div className="space-y-4">
          <input
            autoFocus
            type="text"
            placeholder="Document title..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className="input-base text-base"
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowNewDoc(false)}>Cancel</Button>
            <Button isLoading={isCreating} onClick={handleCreate} disabled={!newTitle.trim()}>
              Create
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
