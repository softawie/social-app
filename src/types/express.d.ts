import type { Document } from "mongoose";
import type { IUser } from "@db/models/user.model";
import type { DecodedToken } from "@src/MiddleWares/auth.middleware";

declare global {
  namespace Express {
    interface Request {
      user?: (Document<unknown, {}, IUser> & IUser & { _id: unknown }) | undefined;
      decoded?: DecodedToken;
    }
  }
}

export {};
