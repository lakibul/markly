import React from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { Globe, Lock, GitBranch, Users, Paperclip, Trash2 } from "lucide-react";
import { Document } from "@/types";

interface Props {
  doc: Document;
  onDelete: (id: string) => void;
}

export const DocumentCard: React.FC<Props> = ({ doc, onDelete }) => {
  return (
    <div className="card p-4 hover:shadow-md transition-shadow group relative">
      <Link to={`/editor/${doc.id}`} className="block">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 group-hover:text-brand-600 transition-colors">
            {doc.title}
          </h3>
          {doc.isPublic ? (
            <Globe size={14} className="text-green-500 shrink-0 mt-0.5" />
          ) : (
            <Lock size={14} className="text-gray-300 shrink-0 mt-0.5" />
          )}
        </div>

        {/* Tags */}
        {doc.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {doc.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="px-1.5 py-0.5 bg-brand-50 text-brand-600 text-xs rounded">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Meta */}
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span>{formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}</span>
          {doc.folder && (
            <span className="truncate max-w-[80px]">📁 {doc.folder.name}</span>
          )}
        </div>

        {/* Counts */}
        {doc._count && (
          <div className="flex items-center gap-3 text-xs text-gray-400 mt-2">
            {doc._count.versions > 0 && (
              <span className="flex items-center gap-1"><GitBranch size={11} />{doc._count.versions}</span>
            )}
            {doc._count.collaborators > 0 && (
              <span className="flex items-center gap-1"><Users size={11} />{doc._count.collaborators}</span>
            )}
            {doc._count.attachments > 0 && (
              <span className="flex items-center gap-1"><Paperclip size={11} />{doc._count.attachments}</span>
            )}
          </div>
        )}
      </Link>

      {/* Delete button — shown on hover */}
      <button
        onClick={(e) => { e.preventDefault(); onDelete(doc.id); }}
        className="absolute top-3 right-8 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 text-gray-300 transition-all"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
};
