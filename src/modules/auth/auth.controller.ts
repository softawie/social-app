import { Router } from "express";
import * as authService from "./auth.service";
import { authenticationMiddleware } from "@src/MiddleWares/auth.middleware";
import { signUpValidation, loginValidation ,forgetPasswordValidation, resetPasswordValidation} from "./auth.validation";
import { validate } from "@src/MiddleWares/validation.middleware";
import { invalidateCache } from "@src/MiddleWares/universal-cache.middleware";
import { redisRateLimit } from "@src/MiddleWares/redis-rate-limit.middleware";
const authRouter = Router();

// Auth routes - with rate limiting for security, no caching, but invalidate user caches on changes
authRouter.post("/signup", 
  redisRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 signup attempts per 15 minutes per IP
    message: "Too many signup attempts, please try again later"
  }),
  validate(signUpValidation), 
  authService.signup
);

authRouter.post("/login", 
  redisRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes  
    max: 10, // 10 login attempts per 15 minutes per IP
    message: "Too many login attempts, please try again later"
  }),
  validate(loginValidation), 
  authService.login
);

authRouter.post("/logout", 
  authenticationMiddleware, 
  invalidateCache((req) => [
    `api:*user:${req.user?.id}*`
  ]),
  authService.logout
);

authRouter.post("/social-login", authService.loginWithGmail);
authRouter.post("/refresh-token", authenticationMiddleware, authService.refreshToken);

authRouter.patch("/confirm-email", 
  invalidateCache((req) => [
    'api:*users*'
  ]),
  authService.confirmEmail
);

authRouter.get("/verify-email", authService.verifyEmailViaToken);
authRouter.patch("/forget-password", validate(forgetPasswordValidation), authService.forgetPassword);
authRouter.patch("/reset-password", validate(resetPasswordValidation), authService.resetPassword);

export default authRouter;
