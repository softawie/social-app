import { providersEnum, UserRoles, VerificationMethod } from "@utils/enums";

export interface User {
  email: string | undefined;
  email_verified: boolean | undefined;
  given_name: string | undefined;
  family_name: string | undefined;
  picture: string | undefined;
  provider: providersEnum;
  role: string;
}

export interface ISignupDTO {
  firstName: string;
  lastName: string;
  password: string;
  email: string;
  age: number;
  phone: string;
  role: UserRoles|undefined;
  verificationMethod?: VerificationMethod; // Optional, defaults to OTP
}

export interface ILoginDTO {
  password: string;
  email: string;
}

export interface IConfirmEmailDTO {
  email: string;
  otp?: string; // Optional for OTP method
  token?: string; // Optional for token method
}

export interface IResetPasswordDTO {
  userId?: string; // Optional for token method
  code?: string; // Optional for OTP method
  token?: string; // Optional for token method
  password: string;
  email: string;
}

export interface IForgetPasswordDTO {
  email: string;
  verificationMethod?: VerificationMethod; // Optional, defaults to OTP
}

export interface IVerifyTokenDTO {
  email: string;
  token: string;
}
  