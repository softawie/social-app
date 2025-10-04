import TokenModel from "@db/models/token.model";
import UserModel, { IUser } from "@db/models/user.model";
import { logger } from "@helpers/logger.helper";
import { DecodedToken } from "@MiddleWares/auth.middleware";
import { encrypt, decrypt } from "@utils/encryptio.utils";
import {
  EmailEventEnums,
  EmailSubjects,
  providersEnum,
  TokenType,
  VerificationMethod,
} from "@utils/enums";
import { emailEvent } from "@utils/event.utils";
import { hashing, compare } from "@utils/hash.utils";
import { SucRes } from "@utils/response.handler";
import { generateToken } from "@utils/token.utils";
import { Request, Response } from "express";
import { OAuth2Client } from "google-auth-library";
import { customAlphabet } from "nanoid";
import {
  AppException,
  BadReqException,
  NotFoundException,
} from "@utils/globalError.handler";
import { IConfirmEmailDTO, ILoginDTO, IResetPasswordDTO, ISignupDTO, IForgetPasswordDTO, IVerifyTokenDTO, User } from "./auth.dto";
import { DatabaseRepo } from "@db/resposetories/database.repo";
import { 
  createVerificationToken, 
  verifyToken as verifyVerificationToken,
  generateVerificationUrl 
} from "@utils/verification-token.utils";
import { VerificationTokenType } from "@db/models/verification-token.model";
import { verificationSuccessPage, verificationErrorPage } from "@utils/html/verification-views";

const signup = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { firstName, lastName, password, email, phone, role, verificationMethod = VerificationMethod.TOKEN }: ISignupDTO =
    req.body;
  const name = `${firstName} ${lastName}`;
  //check if user already exists
  const existingUser = await UserModel.findOne({ email });
  if (existingUser) {
    throw new AppException("User already exists", 409);
  }
  // Hash the password
  const hashedPassword = await hashing({ plainText: password });
  logger.log("Password hashed successfully");
  const encryptedPhone = encrypt({ plainText: phone });
  
  let hashedOtp: string | undefined;
  let verificationToken: string | undefined;

  // Always generate OTP for database storage
  const code = customAlphabet("1234567890", 6)();
  hashedOtp = await hashing({ plainText: code });

  let verificationUrl: string | undefined;
  
  if (verificationMethod === VerificationMethod.TOKEN) {
    // Token method - also create verification token
    verificationToken = await createVerificationToken({
      email,
      type: VerificationTokenType.CONFIRM_EMAIL,
      expirationHours: 24,
    });

    verificationUrl = generateVerificationUrl(
      verificationToken,
      VerificationTokenType.CONFIRM_EMAIL,
      email
    );
  }

  // Always use CONFIRM_EMAIL type, template will show both options if verificationUrl is provided
  emailEvent.emit("email", {
    type: EmailEventEnums.CONFIRM_EMAIL,
    to: email,
    code,
    token: verificationToken,
    verificationUrl,
    name,
    subject: EmailSubjects.CONFIRM_EMAIL,
  });

  const repo = new DatabaseRepo(UserModel);
  
  const user = await repo.create({
    data:[{
        firstName,
        lastName,
        password: hashedPassword,
        passwordHistory: [hashedPassword],
        email,
        phone: encryptedPhone,
        confirmEmailOtp: hashedOtp,
        role,
    }],
    options: {
      validateBeforeSave: true,  
    },
  });

  if (!user) {
    throw new BadReqException("User not created");
  }

  SucRes({
    res,
    statusCode: 201,
    message: `User added successfully. Please check your email for ${verificationMethod === VerificationMethod.OTP ? 'OTP code' : 'verification link'}.`,
    data: { 
      user: user[0],
      verificationMethod,
    },
  });
};

const login = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { password, email }: ILoginDTO = req.body;

  // Decrypt password if client sent AES cipher text
  let plainPassword = password;
  try {
    // Attempt to decrypt; if it fails (e.g., plaintext provided), fall back
    plainPassword = decrypt({ cipherText: password });
    if (!plainPassword) {
      // If decryption yields empty string, assume original was plaintext
      plainPassword = password;
    }
  } catch {
    plainPassword = password;
  }

  // Check if user exists
  const user = await UserModel.findOne({ email });
  if (!user) {
    throw new NotFoundException("User not found");
  }
  if (!user.confirmEmail) {
    throw new AppException("User not found or Email not confirmed", 401);
  }
  const isMatched = await compare({
    plainText: plainPassword,
    hash: user.password,
  });
  if (!isMatched) {
    throw new AppException("Invalid credentials", 401);
  }
  const name = `${user.firstName} ${user.lastName}`;

  const { accessToken, refreshToken } = generateToken({ user: user as IUser });
  SucRes({
    res,
    message: "User logged in successfully",
    data: { accessToken, refreshToken, name },
  });
};

const logout = async (
  req: Request,
  res: Response
): Promise<void> => {
  const user = req.user as IUser;
  const decoded = req.decoded as DecodedToken | undefined;
  if (!user || !decoded) {
    throw new AppException("Unauthorized", 401);
  }
  // JWT `exp` is in seconds since epoch. Convert to ms and compute remaining time.
  const expSeconds = decoded.exp as number | undefined;
  const expiresIn = expSeconds
    ? Math.max(0, expSeconds * 1000 - Date.now())
    : 0;

  await TokenModel.create({
    userId: user._id,
    jti: decoded.jti,
    expiresIn,
  });
  SucRes({
    res,
    statusCode: 201,
    message: "User logged out successfully",
  });
};

async function verifyGoogleAccount({ idToken }: { idToken: string }) {
  const client = new OAuth2Client();

  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  return payload;
}

const loginWithGmail = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { idToken }: DecodedToken = req.body;
  const payload = await verifyGoogleAccount({ idToken });
  if (!payload) {
    throw new AppException("Invalid Google token", 401);
  }
  const { email, email_verified, given_name, family_name, picture } = payload;
  if (!email_verified) {
    throw new AppException("Email not verified", 401);
  }
  let user = (await UserModel.findOne({ email })) as IUser | User;
  if (user) {
    if (user.provider === providersEnum.GOOGLE) {
      const { accessToken, refreshToken } = generateToken({
        user: user as IUser,
      });
      SucRes({
        res,
        message: "User logged in successfully",
        data: { accessToken, refreshToken },
      });
    }
  } else {
    // Create a new user if not exists
    user = (await UserModel.create({
      name: `${given_name} ${family_name}`,
      email,
      provider: providersEnum.GOOGLE,
      photo: picture,
      confirmEmail: Date.now(),
    })) as IUser;
    logger.log("New user created via Google OAuth");
    const { accessToken, refreshToken } = generateToken({
      user: user as IUser,
    });
    SucRes({
      res,
      statusCode: 201,
      message: "User created successfully",
      data: { accessToken, refreshToken },
    });
  }
};

export const refreshToken = async (
  req: Request,
  res: Response
): Promise<void> => {
  const user = req.user;
  const { accessToken, refreshToken } = generateToken({ user: user as IUser });
  SucRes({
    res,
    message: "New Credentials Generated successfully",
    data: { accessToken, refreshToken },
  });
};

export const confirmEmail = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { email, otp, token }: IConfirmEmailDTO = req.body;

  // Validate that either OTP or token is provided, but not both
  if ((!otp && !token) || (otp && token)) {
    throw new BadReqException("Please provide either OTP code or verification token");
  }

  const user = await UserModel.findOne({
    email,
    confirmEmail: { $exists: false },
  });

  if (!user) {
    throw new AppException("User not found or Email already confirmed", 401);
  }

  if (otp) {
    // OTP verification
    if (!user.confirmEmailOtp) {
      throw new AppException("No OTP found for this email", 401);
    }
    if (!(await compare({ plainText: otp, hash: user.confirmEmailOtp }))) {
      throw new AppException("Invalid OTP code", 401);
    }
  } else if (token) {
    // Token verification
    try {
      await verifyVerificationToken({
        token,
        email,
        type: VerificationTokenType.CONFIRM_EMAIL,
        markAsUsed: true,
      });
    } catch (error) {
      throw new AppException("Invalid or expired verification token", 401);
    }
  }

  await UserModel.updateOne(
    { email },
    {
      $set: { confirmEmail: Date.now(), confirmEmailOtp: undefined },
      $inc: { __v: 1 },
    }
  );

  SucRes({
    res,
    message: "Email confirmed successfully",
  });
};

const forgetPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { email, verificationMethod = VerificationMethod.OTP }: IForgetPasswordDTO = req.body;
  
  const user = await UserModel.findOne({
    email, 
    provider: providersEnum.SYSTEM, 
    confirmEmail: { $exists: true }
  });
  
  if (!user) {
    throw new AppException("User not found or Email not confirmed", 401);
  }
  
  const name = `${user.firstName} ${user.lastName}`;

  // Always generate OTP for database storage
  const code = customAlphabet("1234567890", 6)();
  const hashedOtp = await hashing({ plainText: code });
  
  await UserModel.updateOne(
    { email },
    { $set: { forgetPasswordOtp: hashedOtp } }
  );

  let verificationToken: string | undefined;
  let verificationUrl: string | undefined;
  
  if (verificationMethod === VerificationMethod.TOKEN) {
    // Token method - also create verification token
    verificationToken = await createVerificationToken({
      email,
      type: VerificationTokenType.RESET_PASSWORD,
      userId: user._id?.toString(),
      expirationHours: 24,
    });

    verificationUrl = generateVerificationUrl(
      verificationToken,
      VerificationTokenType.RESET_PASSWORD,
      email
    );
  }

  // Always use FORGET_PASSWORD type, template will show both options if verificationUrl is provided
  emailEvent.emit("email", {
    type: EmailEventEnums.FORGET_PASSWORD,
    to: email,
    code,
    token: verificationToken,
    verificationUrl,
    name,
    subject: EmailSubjects.RESET_PASSWORD,
  });

  return SucRes({
    res,
    message: verificationMethod === VerificationMethod.TOKEN 
      ? "Check your email for reset password options" 
      : "Check your email for reset password OTP",
    data: { userId: user.id, verificationMethod },
  });
};

const resetPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { userId, code, token, password, email }: IResetPasswordDTO = req.body;

  // Validate that either OTP or token is provided, but not both
  if ((!code && !token) || (code && token)) {
    throw new BadReqException("Please provide either OTP code or verification token");
  }

  let user;

  if (code) {
    // OTP verification
    user = await UserModel.findOne({
      _id: userId,
      email,
      forgetPasswordOtp: { $exists: true },
      freezeAt: { $exists: false },
      confirmEmail: { $exists: true },
      provider: providersEnum.SYSTEM,
    });

    if (!user) {
      throw new AppException("User not found or Email not confirmed", 401);
    }

    if (!(await compare({ plainText: code, hash: user.forgetPasswordOtp }))) {
      throw new AppException("Invalid OTP code", 401);
    }
  } else if (token) {
    // Token verification
    try {
      const verificationToken = await verifyVerificationToken({
        token,
        email,
        type: VerificationTokenType.RESET_PASSWORD,
        markAsUsed: true,
      });

      user = await UserModel.findOne({
        email,
        freezeAt: { $exists: false },
        confirmEmail: { $exists: true },
        provider: providersEnum.SYSTEM,
      });

      if (!user) {
        throw new AppException("User not found or Email not confirmed", 401);
      }
    } catch (error) {
      throw new AppException("Invalid or expired verification token", 401);
    }
  }

  if (!user) {
    throw new AppException("User not found", 401);
  }

  // Enforce password history: reject if matches current or any previous
  // Decrypt password if needed for comparisons
  let plainResetPassword = password;
  try {
    plainResetPassword = decrypt({ cipherText: password });
    if (!plainResetPassword) plainResetPassword = password;
  } catch {
    plainResetPassword = password;
  }

  const matchesCurrent = await compare({
    plainText: plainResetPassword,
    hash: user.password,
  });
  if (matchesCurrent) {
    throw new BadReqException(
      "New password cannot be the same as the current password"
    );
  }
  if (Array.isArray(user.passwordHistory)) {
    for (const oldHash of user.passwordHistory) {
      if (await compare({ plainText: plainResetPassword, hash: oldHash })) {
        throw new BadReqException(
          "New password cannot match any of your recent passwords"
        );
      }
    }
  }

  const hashedPassword = await hashing({ plainText: plainResetPassword });
  // Build new password history (cap to last 5)
  const newHistory = [user.password, ...(user.passwordHistory || [])].slice(
    0,
    5
  );

  await UserModel.updateOne(
    { email },
    {
      $set: {
        password: hashedPassword,
        forgetPasswordOtp: undefined,
        passwordHistory: newHistory,
      },
      $inc: { __v: 1 },
    }
  );
  SucRes({
    res,
    message: "Password reset successfully",
  });
};


// New API endpoint for email verification via token (from URL)
const verifyEmailViaToken = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { token, email } = req.query;

  if (!token || !email) {
    throw new BadReqException("Token and email are required");
  }

  if (typeof token !== 'string' || typeof email !== 'string') {
    throw new BadReqException("Invalid token or email format");
  }

  try {
    // Verify the token
    await verifyVerificationToken({
      token,
      email,
      type: VerificationTokenType.CONFIRM_EMAIL,
      markAsUsed: true,
    });

    // Check if user exists and email is not already confirmed
    const user = await UserModel.findOne({
      email,
      confirmEmail: { $exists: false },
    });

    if (!user) {
      throw new AppException("User not found or Email already confirmed", 401);
    }

    // Update user's email confirmation
    await UserModel.updateOne(
      { email },
      {
        $set: { confirmEmail: Date.now(), confirmEmailOtp: undefined },
        $inc: { __v: 1 },
      }
    );

    const redirectUrl = process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3000';
    const successHtml = verificationSuccessPage({ email, redirectUrl });
    res.status(200).send(successHtml);
  } catch (error) {
    const base = process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3000';
    const errorHtml = verificationErrorPage({
      retryUrl: `${base}/signup`,
      supportUrl: `${base}/contact`,
    });
    res.status(400).send(errorHtml);
  }
};

export { signup, login, loginWithGmail, forgetPassword, resetPassword, logout, verifyEmailViaToken };
