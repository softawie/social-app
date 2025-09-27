import { providersEnum } from "@utils/enums";

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
  role: string;
}

export interface ILoginDTO {
  password: string;
  email: string;
}

export interface IConfirmEmailDTO {
  email: string;
  otp: string;
}

export interface IResetPasswordDTO {
  userId: string;
  code: string;
  password: string;
  email: string;
}
  