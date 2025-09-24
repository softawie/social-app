import { providersEnum, UserRoles } from "@utils/enums";
import mongoose, { Schema, Document } from "mongoose";

Object.freeze(UserRoles);
export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  passwordHistory?: string[];
  phone: string;
  age?: number;
  role: UserRoles;
  profileImage?: string;
  coverImages:[String],
  provider: providersEnum;
  confirmEmail?: boolean;
  confirmEmailOtp?: string;
  freezeAt?:Date;
  freezeBy?:object,
  unfreezeAt?:Date,
  unfreezeBy?:object,
  forgetPasswordOtp?:string,
}

const UserSchema = new Schema<IUser>(
  {
    firstName: {
      type: String,
      required: true,
      minlength: [3, "Name must be at least 3 characters long"],
      maxlength: [50, "the {VALUE} must be at most 50 characters long"],
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      minlength: [3, "Name must be at least 3 characters long"],
      maxlength: [50, "the {VALUE} must be at most 50 characters long"],
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      match: /.+\@.+\..+/,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: function() {
        return this.provider === providersEnum.SYSTEM ? true : false;
      },
      minlength: [6, "Password must be at least 6 characters long"],
      trim: true,
    },
    passwordHistory: {
      type: [String],
      default: [],
    },
    phone: { type: String, required: false },
    age: {
      type: Number,
      validate: {
        validator: function (value: number) {
          return value >= 18 && value <= 60;
        },
        message: "Age must be between 18 and 60 years",
      },
    },
    role: {
      type: Schema.Types.String,
      enum: { values:Object.values(UserRoles),message:"Role is not supported"},
      default: UserRoles.USER,
      required: true,
    },
    confirmEmail:Date,
    confirmEmailOtp:String,
    profileImage:String,
    coverImages:[String],
    freezeAt:Date,
    freezeBy:{
      type:Schema.Types.ObjectId,
      ref:"User"
    },
    unfreezeAt:Date,
    unfreezeBy:{
      type:Schema.Types.ObjectId,
      ref:"User"
    },
    forgetPasswordOtp:String,
    provider: {
      type: String,
      enum:{ values:Object.values(providersEnum),message:"{VALUE} is not supported"},
      default: providersEnum.SYSTEM,
    },

  },
  { timestamps: true }
);

const UserModel = mongoose.model<IUser>("User", UserSchema);

export default UserModel;
