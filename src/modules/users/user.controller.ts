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
const userRouter = Router();

userRouter.get("/getUsers", getUsers);
userRouter.get(
  "/getSingleUser",
  authenticationMiddleware,
  authorizationMiddleware({ accessRoles: endPoints.getSingleUser }),
  getSingleUser
);
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
  coverImages
);

userRouter.patch(
  "/update-password",
  validate(updatePasswordValidation),
  authenticationMiddleware,
  authorizationMiddleware({ accessRoles: endPoints.updatePassword }),
  updatePassword
);

userRouter.delete(
  "/freeze-account{/:userId}",
  validate(freezeAccountValidation),
  authenticationMiddleware,
  authorizationMiddleware({ accessRoles: endPoints.freezeAccount }),
  freezeAccount
);

userRouter.patch(
  "/unfreeze-account/:userId",
  validate(unfreezeAccountValidation),
  authenticationMiddleware,
  authorizationMiddleware({ accessRoles: endPoints.unfreezeAccount }),
  unfreezeAccount
);

userRouter.delete(
  "/delete-account/:userId",
  validate(deleteAccountValidation),
  authenticationMiddleware,
  authorizationMiddleware({ accessRoles: endPoints.deleteAccount }),
  deleteAccount
);

export default userRouter;
