import { api } from "./api";
import { AuthTokens } from "@/types";

export const authService = {
  async register(name: string, email: string, password: string): Promise<AuthTokens> {
    const { data } = await api.post("/auth/register", { name, email, password });
    return data.data;
  },

  async login(email: string, password: string): Promise<AuthTokens> {
    const { data } = await api.post("/auth/login", { email, password });
    return data.data;
  },

  async logout(refreshToken: string): Promise<void> {
    await api.post("/auth/logout", { refreshToken });
  },

  async getMe() {
    const { data } = await api.get("/users/me");
    return data.data;
  },
};
