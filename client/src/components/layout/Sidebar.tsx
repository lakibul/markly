import React, { useState } from "react";
import { FolderOpen, Folder, Plus, Tag, FileText, ChevronRight } from "lucide-react";
import { useDocumentStore } from "@/store/documentStore";
import { folderService } from "@/services/folder.service";
import toast from "react-hot-toast";

export const Sidebar: React.FC = () => {
  const { folders, selectedFolderId, selectedTag, setSelectedFolder, setSelectedTag, fetchFolders, fetchDocuments, documents } = useDocumentStore();
  const [newFolderName, setNewFolderName] = useState("");
  const [showInput, setShowInput] = useState(false);

  // Collect all unique tags from documents
  const allTags = [...new Set(documents.flatMap((d) => d.tags))];

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await folderService.create(newFolderName.trim());
      await fetchFolders();
      setNewFolderName("");
      setShowInput(false);
      toast.success("Folder created.");
    } catch {
      toast.error("Failed to create folder.");
    }
  };

  const handleFolderClick = (id: string | null) => {
    setSelectedFolder(id);
    setSelectedTag(null);
    fetchDocuments();
  };

  const handleTagClick = (tag: string) => {
    setSelectedTag(tag === selectedTag ? null : tag);
    setSelectedFolder(null);
    fetchDocuments();
  };

  return (
    <aside className="w-60 shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-y-auto">
      <div className="p-4">
        {/* All Documents */}
        <button
          onClick={() => handleFolderClick(null)}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
            selectedFolderId === null && !selectedTag
              ? "bg-brand-50 text-brand-600 font-medium"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <FileText size={16} />
          All Documents
        </button>

        {/* Folders */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Folders</span>
            <button
              onClick={() => setShowInput(!showInput)}
              className="p-0.5 rounded hover:bg-gray-100 text-gray-400"
            >
              <Plus size={14} />
            </button>
          </div>

          {showInput && (
            <div className="mb-2 flex gap-1">
              <input
                autoFocus
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
                placeholder="Folder name..."
                className="input-base text-xs py-1.5"
              />
            </div>
          )}

          {folders.map((folder) => (
            <button
              key={folder.id}
              onClick={() => handleFolderClick(folder.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                selectedFolderId === folder.id
                  ? "bg-brand-50 text-brand-600 font-medium"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {selectedFolderId === folder.id ? <FolderOpen size={15} /> : <Folder size={15} />}
              <span className="truncate flex-1 text-left">{folder.name}</span>
              {folder._count && (
                <span className="text-xs text-gray-400">{folder._count.documents}</span>
              )}
            </button>
          ))}
        </div>

        {/* Tags */}
        {allTags.length > 0 && (
          <div className="mt-4">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">Tags</span>
            <div className="flex flex-wrap gap-1.5">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleTagClick(tag)}
                  className={`px-2 py-0.5 rounded-full text-xs transition-colors ${
                    selectedTag === tag
                      ? "bg-brand-100 text-brand-700 font-medium"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
