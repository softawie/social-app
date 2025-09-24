import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import { TokenType, UserRoles } from "./enums";
import { nanoid } from "nanoid";
import { IUser } from "@db/models/user.model";

export const signToken = ({
  payload = {},
  options = { expiresIn: "1h", subject: "access" } as SignOptions,
  user,
  tokenType = TokenType.ACCESS,
}: {
  payload?: string | object | Buffer;
  options?: SignOptions;
  user?: { role?: string };
  tokenType?: TokenType;
}) => {
  // Set default options if not provided
  const signOptions: SignOptions = {
    expiresIn: tokenType === TokenType.ACCESS ? "1d" : "7d",
    subject: tokenType === TokenType.ACCESS ? "access" : "refresh",
    issuer: process.env.JWT_ISSUER!,
    ...options
  };
  // Determine token signature based on both user role and token type
  const tokenSignature = user?.role === UserRoles.ADMIN
    ? (tokenType === TokenType.ACCESS 
        ? process.env.ACCESS_ADMIN_JWT_SECRET!
        : process.env.REFRESH_ADMIN_JWT_SECRET!)
    : (tokenType === TokenType.ACCESS
        ? process.env.ACCESS_USER_JWT_SECRET!
        : process.env.REFRESH_USER_JWT_SECRET!);

  return jwt.sign(payload, tokenSignature, signOptions);
};

export interface VerifyTokenOptions {
  token: string;
  user?: { role?: string };
  tokenType?: TokenType;
  bearer?: string;
}

export const verifyToken = ({
  token = "",
  user,
  tokenType = TokenType.ACCESS,
  bearer
}: VerifyTokenOptions) => {
  // Check if this is an admin token based on the bearer or user role
  const isAdmin = bearer === "admin" || user?.role === UserRoles.ADMIN;
  // Determine token signature based on both user role and token type
  const tokenSignature = isAdmin
    ? (tokenType === TokenType.ACCESS 
        ? process.env.ACCESS_ADMIN_JWT_SECRET!
        : process.env.REFRESH_ADMIN_JWT_SECRET!)
    : (tokenType === TokenType.ACCESS
        ? process.env.ACCESS_USER_JWT_SECRET!
        : process.env.REFRESH_USER_JWT_SECRET!);

  return jwt.verify(token, tokenSignature);
};

export const generateToken = ({
  user,
}: {
  user: IUser;
}) => {
  const jwtID = nanoid()
  const accessToken = signToken({
    payload: { _id: user._id },
    options: { expiresIn: "1d", subject: "access", jwtid: jwtID },
    user: { role: user.role },
  });
  const refreshToken = signToken({
    payload: { _id: user._id },
    tokenType: TokenType.REFRESH,
    options: {
      expiresIn: "7d",
      issuer: process.env.JWT_ISSUER!,
      subject: "refresh",
      jwtid: jwtID,
    },
    user: { role: user.role },
  });
  return {accessToken,refreshToken};
};