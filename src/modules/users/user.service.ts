import { Request, Response, NextFunction } from "express";
import UserModel from "../../db/models/user.model";
import { logger } from "@src/helpers/logger.helper";
import { SucRes } from "@utils/response.handler";
import { decrypt } from "@utils/encryptio.utils";
import { compare, hashing } from "@utils/hash.utils";
import { UserRoles } from "@utils/enums";

// Types are globally augmented in src/types/multer-augmentations.d.ts

export const getUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await UserModel.create(req.body);
    SucRes({
      res,
      statusCode: 201,
      message: "User added in successfully",
      data: user,
    });
  } catch (error) {
    logger.log(error);
    next(error);
  }
};

export const getSingleUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  req.user.phone = decrypt({ cipherText: req.user.phone });
  SucRes({
    res,
    statusCode: 200,
    message: "User fetched successfully",
    data: { user: req.user },
  });
};

export const updateProfileImage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.file?.path) {
      return next(new Error("No image file provided", { cause: 400 }));
    }
    const user = await UserModel.findByIdAndUpdate(
      req.user._id,
      { profileImage: req.file.finalPath },
      { new: true, runValidators: true }
    );
    if (!user) {
      return next(new Error("User not found", { cause: 404 }));
    }
    return SucRes({
      res,
      statusCode: 200,
      message: "Profile image updated successfully",
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

export const coverImages = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Normalize req.files to an array regardless of multer mode
  const filesArray: Express.Multer.File[] | undefined = Array.isArray(req.files)
    ? req.files
    : req.files
    ? Object.values(req.files).flat()
    : undefined;

  if (!filesArray?.length) {
    return next(new Error("No image file provided", { cause: 400 }));
  }
  const user = await UserModel.findByIdAndUpdate(
    req.user._id,
    { coverImages: filesArray.map((file) => file.finalPath) },
    { new: true, runValidators: true }
  );
  if (!user) {
    return next(new Error("User not found", { cause: 404 }));
  }
  return SucRes({
    res,
    statusCode: 200,
    message: "Cover images updated successfully",
    data: { file: filesArray },
  });
};

export const updatePassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { oldPassword, confirmPassword } = req.body;
  const isMatched = await compare({
    plainText: oldPassword,
    hash: req.user.password,
  });
  if (!isMatched) {
    return next(new Error("Invalid old password", { cause: 400 }));
  }
  // Prevent reusing current or any previous passwords
  const sameAsCurrent = await compare({ plainText: confirmPassword, hash: req.user.password });
  if (sameAsCurrent) {
    return next(new Error("New password cannot be the same as the current password", { cause: 400 }));
  }
  if (Array.isArray(req.user.passwordHistory)) {
    for (const oldHash of req.user.passwordHistory) {
      if (await compare({ plainText: confirmPassword, hash: oldHash })) {
        return next(new Error("New password cannot match any of your recent passwords", { cause: 400 }));
      }
    }
  }

  const hashedPassword = await hashing({ plainText: confirmPassword });
  const newHistory = [req.user.password, ...((req.user.passwordHistory as string[]) || [])].slice(0, 5);
  const user = await UserModel.findByIdAndUpdate(
    req.user._id,
    {
      password: hashedPassword,
      passwordHistory: newHistory,
    }
  );

  return user
    ? SucRes({
        res,
        statusCode: 200,
        message: "Password updated successfully",
      })
    : next(new Error("Invalid Access", { cause: 401 }));
};

export const freezeAccount = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { userId } = req.params;
  const user = await UserModel.findById(userId);
  if (userId && req.user.role !== UserRoles.ADMIN) {
    return next(new Error("Invalid Access", { cause: 403 }));
  }
  const updatedUser = await UserModel.findByIdAndUpdate(
    userId || req.user._id,
    { freezeAt: { $exists: false } },
   // { freezeAt: Date.now(),freezeBy:userId || req.user._id,unfreezeAt:undefined,unfreezeBy:undefined }
   { freezeAt: Date.now(),freezeBy:userId || req.user._id,$unset:{unfreezeAt:true,unfreezeBy:true} } //other way

  );
  return updatedUser
    ? SucRes({
        res,
        statusCode: 200,
        message: "Account frozen successfully",
      })
    : next(new Error("Invalid Access", { cause: 401 }));
};

export const unfreezeAccount = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { userId } = req.params;
  const user = await UserModel.findById(userId);
  if (userId && req.user.role !== UserRoles.ADMIN) {
    return next(new Error("Invalid Access", { cause: 403 }));
  }
  const updatedUser = await UserModel.findByIdAndUpdate(
    userId ,
    { unfreezeAt: { $exists: true } ,unfreezeBy:{$ne:userId} },
    { unfreezeAt: Date.now(),unfreezeBy: req.user._id,$unset:{freezeAt:true,freezeBy:true} } //other way

  );
  return updatedUser
    ? SucRes({
        res,
        statusCode: 200,
        message: "Account unfrozen successfully",
      })
    : next(new Error("Invalid Access", { cause: 401 }));
};

export const deleteAccount = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { userId } = req.params;

  // Only admins can delete another user's account
  if (userId && req.user.role !== UserRoles.ADMIN) {
    return next(new Error("Invalid Access", { cause: 403 }));
  }

  // Use deleteOne to get a DeleteResult that contains deletedCount
  const result = await UserModel.deleteOne({
    _id: userId || req.user._id,
    // Only allow deletion if the account is not frozen
    freezeAt: { $exists: false },
  });

  return result.deletedCount && result.deletedCount > 0
    ? SucRes({
        res,
        statusCode: 200,
        message: "Account deleted successfully",
      })
    : next(new Error("Invalid Access", { cause: 401 }));
};