import mongoose, { Schema, Document } from 'mongoose';

export enum FriendRequestStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  BLOCKED = 'blocked'
}

export interface IFriendRequest extends Document {
  senderId: mongoose.Types.ObjectId; // createdBy
  receiverId: mongoose.Types.ObjectId;//sendTo
  status: FriendRequestStatus;
  createdAt: Date;
  acceptedAt?: Date;
  updatedAt?: Date;
}

const FriendRequestSchema: Schema = new Schema<IFriendRequest>(
  {
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    receiverId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(FriendRequestStatus),
      default: FriendRequestStatus.PENDING,
      required: true,
    },
    acceptedAt: {
      type: Date,
      required: false,
    },
    updatedAt: {
      type: Date,
      required: false,
    },
  },
  {
    timestamps: true,
    versionKey: '__v',
  }
);

// Compound indexes for better query performance
FriendRequestSchema.index({ senderId: 1, receiverId: 1 }, { unique: true });
FriendRequestSchema.index({ receiverId: 1, status: 1 });
FriendRequestSchema.index({ senderId: 1, status: 1 });

// Prevent self-friend requests
FriendRequestSchema.pre('save', function (this: any, next) {
  if (this.senderId?.toString() === this.receiverId?.toString()) {
    throw new Error('Cannot send friend request to yourself');
  }
  next();
});

export const FriendRequestModel = mongoose.model<IFriendRequest>('FriendRequest', FriendRequestSchema);
