import { Router } from "express";
import { coverImages, getSingleUser, getUsers, updateProfileImage ,updatePassword, freezeAccount, unfreezeAccount, deleteAccount} from "./user.service";
import {
  authenticationMiddleware,
  authorizationMiddleware,
} from "@src/MiddleWares/auth.middleware";
import { endPoints } from "./user.authorization";
import { fileValidation, localFileUpload, secureFileUpload } from "@utils/multer/local.util";
import { validate } from "@src/MiddleWares/validation.middleware";
import { deleteAccountValidation, freezeAccountValidation, signUpValidation, unfreezeAccountValidation, updatePasswordValidation } from "@modules/auth/auth.validation";
import { quickCache, invalidateCache } from "@src/MiddleWares/universal-cache.middleware";
const userRouter = Router();

// Public routes with caching
userRouter.get("/getUsers", quickCache.public(), getUsers);

// Protected routes with caching
userRouter.get(
  "/getSingleUser",
  authenticationMiddleware,
  authorizationMiddleware({ accessRoles: endPoints.getSingleUser }),
  quickCache.userSpecific(),
  getSingleUser
);

// Profile update routes with cache invalidation
userRouter.patch(
  "/update-profile-image",
  authenticationMiddleware,
  authorizationMiddleware({ accessRoles: endPoints.updateProfileImage }),
  secureFileUpload({
    customPath: 'User',
    validation: {
      allowedMimeTypes: fileValidation.allowedMimeTypes,
      maxSize: fileValidation.maxSize
    }
  }).single("profileImage"),
  invalidateCache((req) => [
    `api:*user:${req.user?.id}*`,
    'api:*users*'
  ]),
  updateProfileImage
);

userRouter.patch(
  "/cover-images",
  authenticationMiddleware,
  authorizationMiddleware({ accessRoles: endPoints.updateProfileImage }),
  secureFileUpload({
    customPath: 'User',
    validation: {
      allowedMimeTypes: fileValidation.allowedMimeTypes,
      maxSize: fileValidation.maxSize
    }
  }).array("coverImages",5),
  invalidateCache((req) => [
    `api:*user:${req.user?.id}*`,
    'api:*users*'
  ]),
  coverImages
);

userRouter.patch(
  "/update-password",
  validate(updatePasswordValidation),
  authenticationMiddleware,
  authorizationMiddleware({ accessRoles: endPoints.updatePassword }),
  invalidateCache((req) => [
    `api:*user:${req.user?.id}*`
  ]),
  updatePassword
);

// Account management routes with cache invalidation
userRouter.delete(
  "/freeze-account{/:userId}",
  validate(freezeAccountValidation),
  authenticationMiddleware,
  authorizationMiddleware({ accessRoles: endPoints.freezeAccount }),
  invalidateCache((req) => [
    `api:*user:${req.params.userId || req.user?.id}*`,
    'api:*users*'
  ]),
  freezeAccount
);

userRouter.patch(
  "/unfreeze-account/:userId",
  validate(unfreezeAccountValidation),
  authenticationMiddleware,
  authorizationMiddleware({ accessRoles: endPoints.unfreezeAccount }),
  invalidateCache((req) => [
    `api:*user:${req.params.userId}*`,
    'api:*users*'
  ]),
  unfreezeAccount
);

userRouter.delete(
  "/delete-account/:userId",
  validate(deleteAccountValidation),
  authenticationMiddleware,
  authorizationMiddleware({ accessRoles: endPoints.deleteAccount }),
  invalidateCache((req) => [
    `api:*user:${req.params.userId}*`,
    'api:*users*',
    'api:*posts*',
    'api:*comments*',
    'api:*friend*'
  ]),
  deleteAccount
);

export default userRouter;
