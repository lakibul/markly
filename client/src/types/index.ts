// LEARN: Shared TypeScript interfaces used across the entire frontend.
// These mirror the shapes returned by our backend API.

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  createdAt: string;
  _count?: { documents: number; folders: number };
}

export interface Document {
  id: string;
  title: string;
  content?: string;
  tags: string[];
  isPublic: boolean;
  shareToken?: string | null;
  folderId?: string | null;
  folder?: { id: string; name: string } | null;
  ownerId?: string;
  createdAt: string;
  updatedAt: string;
  _count?: { versions: number; collaborators: number; attachments: number };
  collaborators?: Collaborator[];
  attachments?: Attachment[];
}

export interface Folder {
  id: string;
  name: string;
  parentId?: string | null;
  children?: Pick<Folder, "id" | "name">[];
  _count?: { documents: number };
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  content: string;
  label?: string | null;
  createdAt: string;
  user: Pick<User, "id" | "name" | "avatarUrl">;
}

export interface Collaborator {
  id: string;
  role: "VIEWER" | "EDITOR";
  user: Pick<User, "id" | "name" | "email" | "avatarUrl">;
}

export interface Attachment {
  id: string;
  filename: string;
  url: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: User;
}
