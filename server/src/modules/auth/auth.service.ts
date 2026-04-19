// LEARN: The Service layer contains all business logic.
// Controllers are thin (HTTP in/out). Services do the actual work.
// This separation means you can test business logic without HTTP overhead.
//
// Auth flow:
//   register: hash password → save user → generate tokens → save refresh token in DB
//   login:    find user → compare password hash → generate tokens → save refresh token
//   refresh:  find token in DB → verify it → issue new access token
//   logout:   delete refresh token from DB (invalidates it)

import bcrypt from "bcryptjs";
import { prisma } from "@config/database";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "@utils/token";
import { AppError } from "@utils/AppError";
import { RegisterInput, LoginInput } from "./auth.schema";

const BCRYPT_ROUNDS = 12;  // higher = more secure but slower. 12 is a good balance

export const authService = {
  async register(input: RegisterInput) {
    // Check if email is already taken
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw new AppError("Email already in use.", 409);

    // Hash password — NEVER store plain text passwords
    // bcrypt adds a salt automatically, so same password → different hash each time
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

    const user = await prisma.user.create({
      data: { name: input.name, email: input.email, passwordHash },
      select: { id: true, name: true, email: true, createdAt: true },
    });

    const tokens = await generateAndSaveTokens(user.id, user.email);
    return { user, ...tokens };
  },

  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({ where: { email: input.email } });

    // LEARN: We compare even if user doesn't exist to prevent timing attacks.
    // If we returned early on "user not found", an attacker could time the
    // response to enumerate valid emails. Always do the full comparison.
    const dummyHash = "$2b$12$invalidhashfortimingprotection000000000000000000000000";
    const isValid = await bcrypt.compare(
      input.password,
      user?.passwordHash ?? dummyHash
    );

    if (!user || !isValid) throw new AppError("Invalid email or password.", 401);

    const safeUser = { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl };
    const tokens = await generateAndSaveTokens(user.id, user.email);
    return { user: safeUser, ...tokens };
  },

  async refresh(refreshTokenStr: string) {
    // Verify the JWT signature first
    let payload;
    try {
      payload = verifyRefreshToken(refreshTokenStr);
    } catch {
      throw new AppError("Invalid refresh token.", 401);
    }

    // Check the token exists in DB (wasn't revoked by logout)
    const stored = await prisma.refreshToken.findUnique({
      where: { token: refreshTokenStr },
    });
    if (!stored || stored.expiresAt < new Date()) {
      throw new AppError("Refresh token expired or revoked.", 401);
    }

    // Issue a new access token (refresh token stays the same — token rotation
    // is a more advanced pattern we can add later)
    const accessToken = signAccessToken({ userId: payload.userId, email: payload.email });
    return { accessToken };
  },

  async logout(refreshTokenStr: string) {
    // Delete the refresh token from DB — this is the "revocation" mechanism
    await prisma.refreshToken.deleteMany({ where: { token: refreshTokenStr } });
  },
};

// Helper: generates both tokens and persists the refresh token in DB
async function generateAndSaveTokens(userId: string, email: string) {
  const accessToken = signAccessToken({ userId, email });
  const refreshToken = signRefreshToken({ userId, email });

  // Store refresh token in DB with expiry (7 days from now)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({ data: { token: refreshToken, userId, expiresAt } });

  return { accessToken, refreshToken };
}
