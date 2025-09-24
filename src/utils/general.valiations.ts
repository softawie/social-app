import { UserRoles } from "@utils/enums";
import joi from "joi";

export const generalValidations = {
        firstName: joi.string().min(3).max(50).messages({
          "string.min": "Name must be at least 3 characters long",
          "string.max": "the {VALUE} must be at most 50 characters long",
        }),
        lastName: joi.string().messages({
          "string.min": "Name must be at least 3 characters long",
          "string.max": "the {VALUE} must be at most 50 characters long",
        }),
        email: joi.string().email().messages({
          "string.email": "email is required",
        }),
        password: joi.string().messages({
          "any.required": "password is required",
        }),
        confirmPassword: joi.valid(joi.ref("password")).messages({
          "any.only": "confirmPassword must match password",
        }),
        userId: joi.string().messages({
          "any.required": "userId is required",
        }),
        age: joi.number().messages({
          "any.required": "age is required",
        }),
        phone: joi.string().messages({
          "any.required": "phone must be a string",
        }),
        code: joi.string().messages({
          "any.required": "code is required",
        }),
        role: joi
          .string()
          .valid(...Object.values(UserRoles).filter((v) => typeof v === "string"))
          .messages({
            "any.required": "role is required",
            "any.allowOnly": "role is not supported",
          })
          .default(UserRoles.USER),
}