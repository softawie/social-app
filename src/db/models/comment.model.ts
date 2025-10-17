import mongoose, { Schema, Document } from 'mongoose';

export interface IComment extends Document {
  content: string;
  postId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  parentCommentId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema: Schema = new Schema(
  {
    content: {
      type: String,
      required: true,
      maxlength: 500,
      trim: true,
    },
    postId: {
      type: Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    parentCommentId: {
      type: Schema.Types.ObjectId,
      ref: 'Comment',
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: '__v',
  }
);

// Indexes for better query performance
CommentSchema.index({ postId: 1, createdAt: 1 });
CommentSchema.index({ postId: 1, parentCommentId: 1, createdAt: 1 });
CommentSchema.index({ userId: 1, createdAt: -1 });
CommentSchema.index({ parentCommentId: 1 });

// Ensure parent comment belongs to the same post (validation)
CommentSchema.pre('save', async function(next) {
  if (this.parentCommentId) {
    const parentComment = await mongoose.model('Comment').findById(this.parentCommentId) as any;
    if (!parentComment || (parentComment as any).postId.toString() !== (this as any).postId.toString()) {
      throw new Error('Parent comment must belong to the same post');
    }
  }
  next();
});

export const CommentModel = mongoose.model<IComment>('Comment', CommentSchema);
