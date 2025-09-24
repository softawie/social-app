import { ValidationLocation } from "@utils/enums";
import { Request, Response, NextFunction, RequestHandler } from "express";
import  { ObjectSchema } from "joi";

export const validate = (
  schema: ObjectSchema,
  location: ValidationLocation = ValidationLocation.Body
): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req[location], {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: true,
    });

    if (error) {
      const message = error.details.map((d) => d.message).join(", ");
      return next(new Error(message, { cause: 400 }));
    }

    // assign sanitized values back
    req[location] = value;
    return next();
  };
};
