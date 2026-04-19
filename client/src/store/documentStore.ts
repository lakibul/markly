// LEARN: Document store manages the list of documents and the currently open document.
// Using a dedicated store avoids prop drilling (passing data through many component layers).

import { create } from "zustand";
import { Document, Folder } from "@/types";
import { documentService, ListDocumentsParams } from "@/services/document.service";
import { folderService } from "@/services/folder.service";

interface DocumentState {
  documents: Document[];
  currentDoc: Document | null;
  folders: Folder[];
  total: number;
  page: number;
  totalPages: number;
  isLoading: boolean;
  searchQuery: string;
  selectedFolderId: string | null;
  selectedTag: string | null;

  fetchDocuments: (params?: ListDocumentsParams) => Promise<void>;
  fetchDocument: (id: string) => Promise<void>;
  fetchFolders: () => Promise<void>;
  createDocument: (title: string, folderId?: string) => Promise<Document>;
  updateCurrentDoc: (updates: Partial<Document>) => void;
  saveDocument: (id: string, content: string, title?: string) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  setSearchQuery: (q: string) => void;
  setSelectedFolder: (id: string | null) => void;
  setSelectedTag: (tag: string | null) => void;
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  documents: [],
  currentDoc: null,
  folders: [],
  total: 0,
  page: 1,
  totalPages: 1,
  isLoading: false,
  searchQuery: "",
  selectedFolderId: null,
  selectedTag: null,

  fetchDocuments: async (params) => {
    set({ isLoading: true });
    try {
      const { searchQuery, selectedFolderId, selectedTag } = get();
      const result = await documentService.list({
        search: searchQuery || undefined,
        folderId: selectedFolderId || undefined,
        tag: selectedTag || undefined,
        ...params,
      });
      set({
        documents: result.data,
        total: result.meta.total,
        page: result.meta.page,
        totalPages: result.meta.totalPages,
      });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchDocument: async (id) => {
    set({ isLoading: true });
    try {
      const doc = await documentService.getById(id);
      set({ currentDoc: doc });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchFolders: async () => {
    const folders = await folderService.list();
    set({ folders });
  },

  createDocument: async (title, folderId) => {
    const doc = await documentService.create({ title, folderId, content: "" });
    set((state) => ({ documents: [doc, ...state.documents] }));
    return doc;
  },

  updateCurrentDoc: (updates) => {
    set((state) => ({
      currentDoc: state.currentDoc ? { ...state.currentDoc, ...updates } : null,
    }));
  },

  saveDocument: async (id, content, title) => {
    await documentService.update(id, { content, ...(title && { title }) });
  },

  deleteDocument: async (id) => {
    await documentService.delete(id);
    set((state) => ({
      documents: state.documents.filter((d) => d.id !== id),
      currentDoc: state.currentDoc?.id === id ? null : state.currentDoc,
    }));
  },

  setSearchQuery: (q) => set({ searchQuery: q }),
  setSelectedFolder: (id) => set({ selectedFolderId: id }),
  setSelectedTag: (tag) => set({ selectedTag: tag }),
}));
