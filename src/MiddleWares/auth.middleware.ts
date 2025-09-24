import UserModel from "@db/models/user.model";
import { verifyToken } from "@utils/token.utils";
import { Request, Response, NextFunction } from "express";
import { Document } from "mongoose";
import { IUser } from "@db/models/user.model";
import { TokenType, UserRoles } from "@utils/enums";
import TokenModel from "@db/models/token.model";

interface AuthenticatedRequest extends Request {
  user?: (Document<unknown, {}, IUser> & IUser & { _id: unknown }) | undefined;
  decoded?: DecodedToken;
}

export interface DecodedToken {
  _id: string;
  [key: string]: any;
}

export const authenticationMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const { authorization } = req.headers as {
    authorization?: string | undefined;
  };
  if (!authorization) {
    return next(new Error("Authorization token missing", { cause: 401 }));
  }

  const [bearer, tokenStr] = authorization.split(" ") || [];

  if (!bearer || !tokenStr) {
    return next(new Error("Invalid authorization header", { cause: 401 }));
  }

  // First verify the token to get the user ID
  const decoded = verifyToken({
    token: tokenStr,
    bearer
  }) as DecodedToken;

  const tokenDoc = await TokenModel.findOne({ jti: decoded.jti });
  if(decoded.jti && tokenDoc){
    return next(new Error("Token is revoked", { cause: 401 }));
  }
  const user = await UserModel.findById({ _id: decoded._id });
  if (!user) {
    return next(new Error("User not found", { cause: 404 }));
  }
  req.user = user;
  req.decoded = decoded;
  console.log(user) 
  next();
};

export const authorizationMiddleware = ({accessRoles=[]}: {accessRoles: UserRoles[]}) => {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
        if (!accessRoles.includes(req.user?.role as UserRoles)) {
            return next(new Error("Unauthorized", { cause: 403 }));
        }
        next();
    }
}
