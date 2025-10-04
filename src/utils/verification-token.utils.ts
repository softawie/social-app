import { customAlphabet } from "nanoid";
import VerificationTokenModel, { 
  IVerificationToken, 
  VerificationTokenType 
} from "@db/models/verification-token.model";
import { AppException } from "./globalError.handler";

// Generate a secure random token
const generateSecureToken = customAlphabet(
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
  64
);

export interface CreateVerificationTokenOptions {
  email: string;
  type: VerificationTokenType;
  expirationHours?: number;
  userId?: string;
}

export interface VerifyTokenOptions {
  token: string;
  email: string;
  type: VerificationTokenType;
  markAsUsed?: boolean;
}

/**
 * Create a new verification token
 */
export const createVerificationToken = async ({
  email,
  type,
  expirationHours = 24, // Default 24 hours
  userId,
}: CreateVerificationTokenOptions): Promise<string> => {
  // Invalidate any existing unused tokens for this email and type
  await VerificationTokenModel.updateMany(
    { email, type, used: false },
    { used: true }
  );

  const token = generateSecureToken();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + expirationHours);

  await VerificationTokenModel.create({
    token,
    email,
    type,
    expiresAt,
    userId,
  });

  return token;
};

/**
 * Verify a token
 */
export const verifyToken = async ({
  token,
  email,
  type,
  markAsUsed = true,
}: VerifyTokenOptions): Promise<IVerificationToken> => {
  const verificationToken = await VerificationTokenModel.findOne({
    token,
    email,
    type,
    used: false,
    expiresAt: { $gt: new Date() },
  });

  if (!verificationToken) {
    throw new AppException("Invalid or expired verification token", 400);
  }

  if (markAsUsed) {
    verificationToken.used = true;
    await verificationToken.save();
  }

  return verificationToken;
};

/**
 * Check if a token is valid without marking it as used
 */
export const isTokenValid = async ({
  token,
  email,
  type,
}: Omit<VerifyTokenOptions, "markAsUsed">): Promise<boolean> => {
  try {
    await verifyToken({ token, email, type, markAsUsed: false });
    return true;
  } catch {
    return false;
  }
};

/**
 * Clean up expired tokens (can be called periodically)
 */
export const cleanupExpiredTokens = async (): Promise<number> => {
  const result = await VerificationTokenModel.deleteMany({
    $or: [
      { expiresAt: { $lt: new Date() } },
      { used: true, createdAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }, // Remove used tokens older than 7 days
    ],
  });

  return result.deletedCount || 0;
};

/**
 * Generate verification URL
 */
export const generateVerificationUrl = (
  token: string,
  type: VerificationTokenType,
  email: string
): string => {
  const baseUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`;
  
  switch (type) {
    case VerificationTokenType.CONFIRM_EMAIL:
      return `${baseUrl}/auth/verify-email?token=${token}&email=${encodeURIComponent(email)}`;
    case VerificationTokenType.RESET_PASSWORD:
      return `${baseUrl}/auth/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
    default:
      return `${baseUrl}/auth/verify?token=${token}&email=${encodeURIComponent(email)}&type=${type}`;
  }
};
