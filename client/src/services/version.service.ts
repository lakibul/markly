import { api } from "./api";
import { DocumentVersion, PaginatedResponse } from "@/types";

export const versionService = {
  async list(documentId: string, page = 1): Promise<PaginatedResponse<DocumentVersion>> {
    const { data } = await api.get(`/versions/${documentId}`, { params: { page } });
    return data;
  },

  async saveManual(documentId: string, label?: string): Promise<DocumentVersion> {
    const { data } = await api.post(`/versions/${documentId}`, { label });
    return data.data;
  },

  async restore(versionId: string): Promise<{ documentId: string; restoredContent: string }> {
    const { data } = await api.post(`/versions/${versionId}/restore`);
    return data.data;
  },
};
