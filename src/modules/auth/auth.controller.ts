import { Router } from "express";
import * as authService from "./auth.service";
import { authenticationMiddleware } from "@src/MiddleWares/auth.middleware";
import { signUpValidation, loginValidation ,forgetPasswordValidation, resetPasswordValidation} from "./auth.validation";
import { validate } from "@src/MiddleWares/validation.middleware";
const authRouter = Router();

authRouter.post("/signup", validate(signUpValidation), authService.signup);
authRouter.post("/login", validate(loginValidation), authService.login);
authRouter.post("/logout", authenticationMiddleware, authService.logout);
authRouter.post("/social-login", authService.loginWithGmail);
authRouter.post("/refresh-token",authenticationMiddleware, authService.refreshToken);
authRouter.patch("/confirm-email",authService.confirmEmail);
authRouter.patch("/forget-password",validate(forgetPasswordValidation),authService.forgetPassword);
authRouter.patch("/reset-password",validate(resetPasswordValidation),authService.resetPassword);

export default authRouter;
