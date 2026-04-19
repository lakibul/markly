// LEARN: JWT (JSON Web Token) flow:
//
//  LOGIN:  server signs a token with a secret → sends to client
//  REQUEST: client sends token in header → server verifies signature
//
// A token has 3 parts: header.payload.signature
//   - payload: { userId, email, iat, exp } — anyone can decode this (it's base64)
//   - signature: only the server can verify this (needs the secret)
//
// Access token (15 min): sent with EVERY API request via Authorization header
// Refresh token (7 days): stored in DB, used ONCE to get a new access token

import jwt from "jsonwebtoken";
import { env } from "@config/env";
import { AuthPayload } from "@types/index";

export const signAccessToken = (payload: AuthPayload): string => {
  return jwt.sign(payload, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessExpiresIn as jwt.SignOptions["expiresIn"],
  });
};

export const signRefreshToken = (payload: AuthPayload): string => {
  return jwt.sign(payload, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpiresIn as jwt.SignOptions["expiresIn"],
  });
};

export const verifyAccessToken = (token: string): AuthPayload => {
  return jwt.verify(token, env.jwt.accessSecret) as AuthPayload;
};

export const verifyRefreshToken = (token: string): AuthPayload => {
  return jwt.verify(token, env.jwt.refreshSecret) as AuthPayload;
};
