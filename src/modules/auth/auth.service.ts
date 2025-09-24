import TokenModel from "@db/models/token.model";
import UserModel, { IUser } from "@db/models/user.model";
import { logger } from "@helpers/logger.helper";
import { DecodedToken } from "@MiddleWares/auth.middleware";
import { encrypt } from "@utils/encryptio.utils";
import {
  EmailEventEnums,
  EmailSubjects,
  providersEnum,
  TokenType,
} from "@utils/enums";
import { emailEvent } from "@utils/event.utils";
import { hashing, compare } from "@utils/hash.utils";
import { SucRes } from "@utils/response.handler";
import { generateToken } from "@utils/token.utils";
import { Request, Response, NextFunction } from "express";
import { OAuth2Client } from "google-auth-library";
import { customAlphabet } from "nanoid";

const signup = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { firstName, lastName, password, email, age, phone, role } = req.body;
  const name = `${firstName} ${lastName}`;
  //check if user already exists
  const existingUser = await UserModel.findOne({ email });
  if (existingUser) {
    return next(new Error("User already exists", { cause: 409 }));
  }
  // Hash the password
  const hashedPassword = await hashing({ plainText: password });
  logger.log("Password hashed successfully");
  const encryptedPhone = encrypt({ plainText: phone });
  // otp hashing
  const code = customAlphabet("1234567890", 6)();
  const hashedOtp = await hashing({ plainText: code });

  emailEvent.emit("email", {
    type: EmailEventEnums.CONFIRM_EMAIL,
    to: email,
    code,
    name,
    subject: EmailSubjects.CONFIRM_EMAIL,
  });
  const user = await UserModel.create({
    firstName,
    lastName,
    password: hashedPassword,
    passwordHistory: [hashedPassword],
    email,
    age,
    phone: encryptedPhone,
    role,
    confirmEmailOtp: hashedOtp,
  });
  SucRes({
    res,
    statusCode: 201,
    message: "User added successfully.",
    data: user,
  });
};

const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { password, email } = req.body;

  // Check if user exists
  const user = await UserModel.findOne({ email });
  if (!user) {
    return next(new Error("User not found", { cause: 404 }));
  }
  if (!user.confirmEmail) {
    return next(
      new Error("User not found or Email not confirmed", { cause: 401 })
    );
  }
  const isMatched = await compare({
    plainText: password,
    hash: user.password,
  });
  if (!isMatched) {
    return next(new Error("Invalid credentials", { cause: 401 }));
  }
  const { accessToken, refreshToken } = generateToken({ user: user as IUser });
  SucRes({
    res,
    message: "User logged in successfully",
    data: { accessToken, refreshToken },
  });
};

const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const user = req.user as IUser;
  const decoded = req.decoded as DecodedToken | undefined;
  if (!user || !decoded) {
    return next(new Error("Unauthorized", { cause: 401 }));
  }
  // JWT `exp` is in seconds since epoch. Convert to ms and compute remaining time.
  const expSeconds = decoded.exp as number | undefined;
  const expiresIn = expSeconds ? Math.max(0, expSeconds * 1000 - Date.now()) : 0;

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

interface User {
  email: string | undefined;
  email_verified: boolean | undefined;
  given_name: string | undefined;
  family_name: string | undefined;
  picture: string | undefined;
  provider: providersEnum;
  role: string;
}

const loginWithGmail = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { idToken }: DecodedToken = req.body;
  const payload = await verifyGoogleAccount({ idToken });
  if (!payload) {
    return next(new Error("Invalid Google token", { cause: 401 }));
  }
  const { email, email_verified, given_name, family_name, picture } = payload;
  if (!email_verified) {
    return next(new Error("Email not verified", { cause: 401 }));
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
  res: Response,
  next: NextFunction
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
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { email, otp } = req.body;
  // to filter also with confirmEmail
  const user = await UserModel.findOne({
    email,
    confirmEmailOtp: { $exists: true },
    confirmEmail: { $exists: false },
  });
  if (!user) {
    return next(
      new Error("User not found or Email already confirmed", { cause: 401 })
    );
  }
  if (!(await compare({ plainText: otp, hash: user.confirmEmailOtp }))) {
    return next(new Error("Invalid code", { cause: 401 }));
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
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { email } = req.body;
  const code = customAlphabet("1234567890", 6)();
  const hashedOtp = await hashing({ plainText: code });
  const user = await UserModel.findOneAndUpdate(
    { email, provider: providersEnum.SYSTEM, confirmEmail: { $exists: true } },
    { $set: { forgetPasswordOtp: hashedOtp } }
  );
  if (!user) {
    return next(
      new Error("User not found or Email not confirmed", { cause: 401 })
    );
  }
  const name = `${user.firstName} ${user.lastName}`;

  emailEvent.emit("email", {
    type: EmailEventEnums.FORGET_PASSWORD,
    to: email,
    code,
    name,
    subject: EmailSubjects.RESET_PASSWORD,
  });
  return SucRes({
    res,
    message: "Check your email for reset password OTP",
  });
};

const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { email, code, password } = req.body;
  const user = await UserModel.findOne({
    email,
    forgetPasswordOtp: { $exists: true },
    freezeAt: { $exists: false },
    confirmEmail: { $exists: true },
    provider: providersEnum.SYSTEM,
  });
  if (!user) {
    return next(
      new Error("User not found or Email not confirmed", { cause: 401 })
    );
  }
  if (!(await compare({ plainText: code, hash: user.forgetPasswordOtp }))) {
    return next(new Error("Invalid code", { cause: 401 }));
  }

  // Enforce password history: reject if matches current or any previous
  const matchesCurrent = await compare({
    plainText: password,
    hash: user.password,
  });
  if (matchesCurrent) {
    return next(
      new Error("New password cannot be the same as the current password", {
        cause: 400,
      })
    );
  }
  if (Array.isArray(user.passwordHistory)) {
    for (const oldHash of user.passwordHistory) {
      if (await compare({ plainText: password, hash: oldHash })) {
        return next(
          new Error("New password cannot match any of your recent passwords", {
            cause: 400,
          })
        );
      }
    }
  }

  const hashedPassword = await hashing({ plainText: password });
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

export { signup, login, loginWithGmail, forgetPassword, resetPassword, logout };
