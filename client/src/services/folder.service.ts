import { api } from "./api";
import { Folder } from "@/types";

export const folderService = {
  async list(): Promise<Folder[]> {
    const { data } = await api.get("/folders");
    return data.data;
  },

  async create(name: string, parentId?: string): Promise<Folder> {
    const { data } = await api.post("/folders", { name, parentId });
    return data.data;
  },

  async update(id: string, name: string): Promise<Folder> {
    const { data } = await api.patch(`/folders/${id}`, { name });
    return data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/folders/${id}`);
  },
};
