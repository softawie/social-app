import mongoose, { Schema, Document } from 'mongoose';

export interface ILike extends Document {
  userId: mongoose.Types.ObjectId;
  postId: mongoose.Types.ObjectId;
  commentId?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const LikeSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    postId: {
      type: Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
      index: true,
    },
    commentId: {
      type: Schema.Types.ObjectId,
      ref: 'Comment',
      default: null,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  }
);

// Compound indexes for better query performance
LikeSchema.index({ postId: 1, userId: 1 }, { unique: true });
LikeSchema.index({ commentId: 1, userId: 1 }, { 
  unique: true, 
  partialFilterExpression: { commentId: { $ne: null } }
});
LikeSchema.index({ userId: 1, createdAt: -1 });

// Ensure either postId or commentId is provided, but not both
LikeSchema.pre('save', function(next) {
  if (!this.postId && !this.commentId) {
    throw new Error('Either postId or commentId must be provided');
  }
  if (this.postId && this.commentId) {
    throw new Error('Cannot like both post and comment simultaneously');
  }
  next();
});

export const LikeModel = mongoose.model<ILike>('Like', LikeSchema);
