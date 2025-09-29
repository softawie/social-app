import { ValidationLocation } from "@utils/enums";
import { Request, Response, NextFunction, RequestHandler } from "express";
import { BadReqException } from "@utils/globalError.handler";
import { z } from "zod";

export const validate = (
  schema: z.ZodTypeAny,
  location: ValidationLocation = ValidationLocation.Body
): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req[location]);

    if (!parsed.success) {
      const message = parsed.error.issues.map((e) => e.message).join(", ");
      throw new BadReqException(message);
    }

    // assign sanitized values back (unknown keys stripped by .strip())
    req[location] = parsed.data as any;
    return next();
  };
};
