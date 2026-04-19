// LEARN: The Editor page is the most complex component in the app.
// Key patterns:
//   - useParams() to get the document ID from the URL
//   - Auto-save with debounce (save 2 seconds after the user stops typing)
//   - Optimistic UI: update state immediately, then sync with server
//   - Tabs for switching between Write and Preview modes

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MDEditor from "@uiw/react-md-editor";
import {
  Save, Share2, Clock, Users, Paperclip, ArrowLeft,
  Globe, Lock, Copy, Check, Tag, X
} from "lucide-react";
import { useDocumentStore } from "@/store/documentStore";
import { documentService } from "@/services/document.service";
import { versionService } from "@/services/version.service";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { DocumentVersion } from "@/types";
import toast from "react-hot-toast";
import { formatDistanceToNow } from "date-fns";

export const EditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentDoc, fetchDocument, updateCurrentDoc, saveDocument } = useDocumentStore();

  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showShare, setShowShare] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [shareLink, setShareLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Fetch document on mount
  useEffect(() => {
    if (id) fetchDocument(id);
  }, [id]);

  // LEARN: Auto-save with debounce.
  // Every time content changes, we reset a 2-second timer.
  // The save only fires 2 seconds after the user STOPS typing.
  const handleContentChange = useCallback((value: string | undefined) => {
    updateCurrentDoc({ content: value ?? "" });

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      if (!id || !currentDoc) return;
      setIsSaving(true);
      try {
        await saveDocument(id, value ?? "");
        setLastSaved(new Date());
      } catch {
        toast.error("Failed to auto-save.");
      } finally {
        setIsSaving(false);
      }
    }, 2000);
  }, [id, currentDoc, saveDocument, updateCurrentDoc]);

  const handleManualSave = async () => {
    if (!id || !currentDoc) return;
    setIsSaving(true);
    try {
      await saveDocument(id, currentDoc.content ?? "", currentDoc.title);
      setLastSaved(new Date());
      toast.success("Saved.");
    } catch {
      toast.error("Failed to save.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = async () => {
    if (!id) return;
    try {
      const result = await documentService.share(id, !currentDoc?.isPublic);
      updateCurrentDoc({ isPublic: result.isPublic, shareToken: result.shareToken });
      if (result.isPublic && result.shareToken) {
        const link = `${window.location.origin}/shared/${result.shareToken}`;
        setShareLink(link);
      }
      toast.success(result.isPublic ? "Document is now public." : "Document is now private.");
    } catch {
      toast.error("Failed to update sharing.");
    }
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const loadVersions = async () => {
    if (!id) return;
    try {
      const result = await versionService.list(id);
      setVersions(result.data);
      setShowVersions(true);
    } catch {
      toast.error("Failed to load versions.");
    }
  };

  const handleRestoreVersion = async (versionId: string) => {
    if (!confirm("Restore this version? Current content will be saved as a version first.")) return;
    try {
      const result = await versionService.restore(versionId);
      updateCurrentDoc({ content: result.restoredContent });
      setShowVersions(false);
      toast.success("Version restored.");
    } catch {
      toast.error("Failed to restore version.");
    }
  };

  const handleAddTag = () => {
    if (!tagInput.trim() || !currentDoc) return;
    const newTag = tagInput.trim().toLowerCase();
    if (currentDoc.tags.includes(newTag)) return;
    const newTags = [...currentDoc.tags, newTag];
    updateCurrentDoc({ tags: newTags });
    documentService.update(currentDoc.id, { tags: newTags });
    setTagInput("");
  };

  const handleRemoveTag = (tag: string) => {
    if (!currentDoc) return;
    const newTags = currentDoc.tags.filter((t) => t !== tag);
    updateCurrentDoc({ tags: newTags });
    documentService.update(currentDoc.id, { tags: newTags });
  };

  if (!currentDoc) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Editor Toolbar */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-2 shrink-0">
        <button onClick={() => navigate("/dashboard")} className="p-1.5 rounded hover:bg-gray-100 text-gray-500">
          <ArrowLeft size={18} />
        </button>

        {/* Editable Title */}
        <input
          type="text"
          value={currentDoc.title}
          onChange={(e) => updateCurrentDoc({ title: e.target.value })}
          onBlur={() => id && documentService.update(id, { title: currentDoc.title })}
          className="flex-1 text-base font-semibold text-gray-800 bg-transparent border-none outline-none focus:bg-gray-50 rounded px-2 py-1"
        />

        {/* Status */}
        <span className="text-xs text-gray-400 hidden sm:block">
          {isSaving ? "Saving..." : lastSaved ? `Saved ${formatDistanceToNow(lastSaved, { addSuffix: true })}` : ""}
        </span>

        {/* Tags */}
        <div className="hidden md:flex items-center gap-1.5">
          {currentDoc.tags.map((tag) => (
            <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-brand-50 text-brand-600 text-xs rounded-full">
              #{tag}
              <button onClick={() => handleRemoveTag(tag)}><X size={10} /></button>
            </span>
          ))}
          <div className="flex items-center gap-1">
            <Tag size={13} className="text-gray-400" />
            <input
              placeholder="add tag..."
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
              className="text-xs border-none outline-none bg-transparent w-16 text-gray-500 placeholder:text-gray-300"
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5 ml-2">
          <Button size="sm" variant="ghost" leftIcon={<Clock size={14} />} onClick={loadVersions}>History</Button>
          <Button size="sm" variant="ghost" leftIcon={currentDoc.isPublic ? <Globe size={14} /> : <Lock size={14} />} onClick={() => setShowShare(true)}>Share</Button>
          <Button size="sm" isLoading={isSaving} leftIcon={<Save size={14} />} onClick={handleManualSave}>Save</Button>
        </div>
      </div>

      {/* Markdown Editor */}
      <div className="flex-1 overflow-hidden" data-color-mode="light">
        <MDEditor
          value={currentDoc.content ?? ""}
          onChange={handleContentChange}
          height="100%"
          preview="live"
          style={{ height: "100%", borderRadius: 0, border: "none" }}
        />
      </div>

      {/* Share Modal */}
      <Modal isOpen={showShare} onClose={() => setShowShare(false)} title="Share Document">
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div>
              <p className="font-medium text-sm">{currentDoc.isPublic ? "Public" : "Private"}</p>
              <p className="text-xs text-gray-500">
                {currentDoc.isPublic ? "Anyone with the link can view" : "Only you and collaborators"}
              </p>
            </div>
            <button
              onClick={handleShare}
              className={`relative w-11 h-6 rounded-full transition-colors ${currentDoc.isPublic ? "bg-brand-600" : "bg-gray-300"}`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${currentDoc.isPublic ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>

          {currentDoc.isPublic && shareLink && (
            <div className="flex items-center gap-2">
              <input readOnly value={shareLink} className="input-base text-xs" />
              <Button size="sm" variant="secondary" leftIcon={copied ? <Check size={14} /> : <Copy size={14} />} onClick={handleCopyLink}>
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          )}
        </div>
      </Modal>

      {/* Version History Modal */}
      <Modal isOpen={showVersions} onClose={() => setShowVersions(false)} title="Version History" size="lg">
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {versions.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No versions saved yet.</p>
          ) : (
            versions.map((v) => (
              <div key={v.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium">{v.label ?? "Auto-save"}</p>
                  <p className="text-xs text-gray-400">
                    {formatDistanceToNow(new Date(v.createdAt), { addSuffix: true })} · {v.user.name}
                  </p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => handleRestoreVersion(v.id)}>
                  Restore
                </Button>
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  );
};
