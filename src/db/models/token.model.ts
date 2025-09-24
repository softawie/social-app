import mongoose, { Schema, Document } from "mongoose";

export interface IToken extends Document {
  jti: string;
  expiresIn: number;  
  userId: Schema.Types.ObjectId;
}

const TokenSchema = new Schema<IToken>(
  {
    jti: {
      type: String,
      required: true,
      unique:true
    },
    expiresIn: {
      type: Number,
      required: true,
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref:"User",
        required: true,
      },
  },
  { timestamps: true }
);

const TokenModel = mongoose.model<IToken>("Token", TokenSchema);

export default TokenModel;
