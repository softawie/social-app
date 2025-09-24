import { generalValidations } from "@utils/general.valiations";
import joi from "joi";

const signUpValidation = joi.object({
  firstName: generalValidations.firstName.required(),
  lastName: generalValidations.lastName.required(),
  email: generalValidations.email.required(),
  password: generalValidations.password.required(),
  age: generalValidations.age,
  phone: generalValidations.phone,
  role: generalValidations.role,
});

const loginValidation = joi
  .object({
    email: generalValidations.email.required(),
    password: generalValidations.password.required(),
  })
  .required();

const forgetPasswordValidation = joi.object({
  email: generalValidations.email.required(),
});

const resetPasswordValidation = joi.object({
  email: generalValidations.email.required(),
  code: generalValidations.code.required(),
  password: generalValidations.password.required(),
  confirmPassword: generalValidations.confirmPassword,
});

const updatePasswordValidation = joi.object({
  oldPassword: generalValidations.password.required(),
  password: generalValidations.password
    .not(joi.ref("oldPassword"))
    .messages({
      "any.invalid": "New password must be different from old password",
      "any.required": "password is required",
    })
    .required(),
  confirmPassword: generalValidations.confirmPassword,
});

const freezeAccountValidation = joi.object({
  userId: generalValidations.userId,
});
const unfreezeAccountValidation = joi.object({
  userId: generalValidations.userId.required(),
});

const deleteAccountValidation = joi.object({
  userId: generalValidations.userId.required(),
});
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
