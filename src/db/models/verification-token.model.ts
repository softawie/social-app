import mongoose, { Schema, Document } from "mongoose";

export enum VerificationTokenType {
  CONFIRM_EMAIL = "confirm_email",
  RESET_PASSWORD = "reset_password",
}

export interface IVerificationToken extends Document {
  token: string;
  email: string;
  type: VerificationTokenType;
  expiresAt: Date;
  used: boolean;
  userId?: Schema.Types.ObjectId;
}

const VerificationTokenSchema = new Schema<IVerificationToken>(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    type: {
      type: String,
      enum: Object.values(VerificationTokenType),
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 }, // MongoDB TTL index
    },
    used: {
      type: Boolean,
      default: false,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
  },
  { timestamps: true }
);

// Compound index for efficient queries
VerificationTokenSchema.index({ email: 1, type: 1 });
VerificationTokenSchema.index({ token: 1, used: 1 });

const VerificationTokenModel = mongoose.model<IVerificationToken>(
  "VerificationToken",
  VerificationTokenSchema
);

export default VerificationTokenModel;
