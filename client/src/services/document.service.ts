import { api } from "./api";
import { Document, PaginatedResponse } from "@/types";

export interface ListDocumentsParams {
  page?: number;
  limit?: number;
  search?: string;
  folderId?: string;
  tag?: string;
  sort?: "updatedAt" | "createdAt" | "title";
  order?: "asc" | "desc";
}

export const documentService = {
  async list(params?: ListDocumentsParams): Promise<PaginatedResponse<Document>> {
    const { data } = await api.get("/documents", { params });
    return data;
  },

  async getById(id: string): Promise<Document> {
    const { data } = await api.get(`/documents/${id}`);
    return data.data;
  },

  async getByShareToken(token: string): Promise<Document> {
    const { data } = await api.get(`/documents/shared/${token}`);
    return data.data;
  },

  async create(payload: { title: string; content?: string; folderId?: string; tags?: string[]; isPublic?: boolean }): Promise<Document> {
    const { data } = await api.post("/documents", payload);
    return data.data;
  },

  async update(id: string, payload: Partial<{ title: string; content: string; folderId: string | null; tags: string[]; isPublic: boolean }>): Promise<Document> {
    const { data } = await api.patch(`/documents/${id}`, payload);
    return data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/documents/${id}`);
  },

  async share(id: string, isPublic: boolean): Promise<{ id: string; isPublic: boolean; shareToken: string | null }> {
    const { data } = await api.post(`/documents/${id}/share`, { isPublic });
    return data.data;
  },

  async addCollaborator(id: string, email: string, role: "VIEWER" | "EDITOR") {
    const { data } = await api.post(`/documents/${id}/collaborators`, { email, role });
    return data.data;
  },

  async removeCollaborator(documentId: string, userId: string) {
    await api.delete(`/documents/${documentId}/collaborators/${userId}`);
  },
};
