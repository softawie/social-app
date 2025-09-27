import { UserRoles } from "@utils/enums";
import { z } from "zod";

const RoleStrings = Object.values(UserRoles).filter(
  (v) => typeof v === "string"
) as string[];

export const generalValidations = {
  firstName: z
    .string()
    .min(3, { message: "Name must be at least 3 characters long" })
    .max(50, { message: "the {VALUE} must be at most 50 characters long" }),
  lastName: z.string(),
  email: z.string().email({ message: "email is required" }),
  password: z.string().min(1, { message: "password is required" }),
  // Note: confirmPassword equality is enforced at the object level in specific schemas
  confirmPassword: z.string(),
  userId: z.string().min(1, { message: "userId is required" }),
  // Coerce to number so we can provide a custom message for missing/empty values in Zod v4
  age: z
    .coerce
    .number()
    .refine((v) => !Number.isNaN(v), { message: "age is required" }),
  phone: z.string().min(1, { message: "phone must be a string" }),
  code: z.string().min(1, { message: "code is required" }),
  role: z
    .string()
    .min(1, { message: "role is required" })
    .refine((val: string) => RoleStrings.includes(val), {
      message: "role is not supported",
    })
    .default(UserRoles.USER as unknown as string),
};