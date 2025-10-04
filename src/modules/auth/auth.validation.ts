import { generalValidations } from "@utils/general.valiations";
import { z } from "zod";

const signUpValidation = z
  .object({
    firstName: generalValidations.firstName,
    lastName: generalValidations.lastName,
    email: generalValidations.email,
    password: generalValidations.password,
    age: generalValidations.age.optional(),
    phone: generalValidations.phone.optional(),
    role: generalValidations.role.optional(),
  })
  .strip();

const loginValidation = z
  .object({
    email: generalValidations.email,
    password: generalValidations.password,
  })
  .strip();

const forgetPasswordValidation = z
  .object({
    email: generalValidations.email,
  })
  .strip();

const resetPasswordValidation = z
  .object({
    userId: generalValidations.userId.optional(), // Optional for token method
    email: generalValidations.email,
    code: generalValidations.code.optional(), // Optional - either code or token required
    token: z.string().optional(), // Optional - either code or token required
    password: generalValidations.password,
    confirmPassword: generalValidations.confirmPassword.optional(), // Make optional
  })
  .strip()
  .refine((data: { code?: string; token?: string }) => {
    // Either code OR token must be provided, but not both
    return (data.code && !data.token) || (!data.code && data.token);
  }, {
    message: "Please provide either OTP code or verification token (not both)",
    path: ["code"]
  })
  .refine((data: { password: string; confirmPassword?: string }) => {
    // If confirmPassword is provided, it must match password
    return !data.confirmPassword || data.password === data.confirmPassword;
  }, {
    path: ["confirmPassword"],
    message: "confirmPassword must match password",
  });

const updatePasswordValidation = z
  .object({
    oldPassword: generalValidations.password,
    password: generalValidations.password,
    confirmPassword: generalValidations.confirmPassword,
  })
  .strip()
  .refine((data: { password: string; oldPassword: string }) => data.password !== data.oldPassword, {
    path: ["password"],
    message: "New password must be different from old password",
  })
  .refine((data: { password: string; confirmPassword: string }) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "confirmPassword must match password",
  });

const freezeAccountValidation = z
  .object({
    userId: generalValidations.userId.optional(),
  })
  .strip();

const unfreezeAccountValidation = z
  .object({
    userId: generalValidations.userId,
  })
  .strip();

const deleteAccountValidation = z
  .object({
    userId: generalValidations.userId,
  })
  .strip();

export {
  signUpValidation,
  loginValidation,
  updatePasswordValidation,
  freezeAccountValidation,
  unfreezeAccountValidation,
  deleteAccountValidation,
  forgetPasswordValidation,
  resetPasswordValidation,
};
