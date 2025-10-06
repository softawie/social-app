import mongoose, { Schema, Document } from 'mongoose';
import { PostVisibility } from '@utils/enums';

export interface IPost extends Document {
  content: string;
  images: string[];
  tags: string[];
  visibility: PostVisibility;
  location?: {
    name?: string;
    latitude?: number;
    longitude?: number;
  };
  userId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PostSchema: Schema = new Schema(
  {
    content: {
      type: String,
      required: true,
      maxlength: 2000,
      trim: true,
    },
    images: {
      type: [String],
      default: [],
      validate: {
        validator: function(images: string[]) {
          return images.length <= 10;
        },
        message: 'Maximum 10 images allowed per post',
      },
    },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: function(tags: string[]) {
          return tags.length <= 20 && tags.every(tag => tag.length <= 50);
        },
        message: 'Maximum 20 tags allowed, each tag max 50 characters',
      },
    },
    visibility: {
      type: String,
      enum: Object.values(PostVisibility),
      default: PostVisibility.PUBLIC,
    },
    location: {
      name: {
        type: String,
        maxlength: 100,
      },
      latitude: {
        type: Number,
        min: -90,
        max: 90,
      },
      longitude: {
        type: Number,
        min: -180,
        max: 180,
      },
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: '__v',
  }
);

// Indexes for better query performance
PostSchema.index({ userId: 1, createdAt: -1 });
PostSchema.index({ visibility: 1, createdAt: -1 });
PostSchema.index({ tags: 1 });
PostSchema.index({ createdAt: -1 });

// Text index for search functionality
PostSchema.index({ 
  content: 'text', 
  tags: 'text' 
}, {
  weights: {
    content: 10,
    tags: 5,
  },
  name: 'post_text_index'
});

export const PostModel = mongoose.model<IPost>('Post', PostSchema);
