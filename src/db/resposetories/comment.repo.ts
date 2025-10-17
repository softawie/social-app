import { CommentModel, IComment } from '@db/models/comment.model';
import { DatabaseRepo } from './database.repo';
import mongoose from 'mongoose';

export class CommentRepository extends DatabaseRepo<IComment> {
  constructor() {
    super(CommentModel);
  }

  async findByPostId(postId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    return await this.model
      .find({ postId, parentCommentId: null })
      .populate('userId', 'firstName lastName profileImage')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
  }

  async findRepliesByCommentId(commentId: string, page: number = 1, limit: number = 5) {
    const skip = (page - 1) * limit;
    return await this.model
      .find({ parentCommentId: commentId })
      .populate('userId', 'firstName lastName profileImage')
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .lean();
  }

  async findById(commentId: string) {
    return await this.model
      .findById(commentId)
      .populate('userId', 'firstName lastName profileImage')
      .lean();
  }

  async findByIdAndUserId(commentId: string, userId: string) {
    return await this.model.findOne({ _id: commentId, userId }).lean();
  }

  async countByPostId(postId: string) {
    return await this.model.countDocuments({ postId });
  }

  async countRepliesByCommentId(commentId: string) {
    return await this.model.countDocuments({ parentCommentId: commentId });
  }

  async deleteById(commentId: string) {
    return await this.model.findByIdAndDelete(commentId);
  }

  async deleteByIdAndUserId(commentId: string, userId: string) {
    return await this.model.findOneAndDelete({ _id: commentId, userId });
  }

  async updateById(commentId: string, updateData: Partial<IComment>) {
    return await this.model
      .findByIdAndUpdate(commentId, updateData, { new: true })
      .populate('userId', 'firstName lastName profileImage')
      .lean();
  }

  async updateByIdAndUserId(commentId: string, userId: string, updateData: Partial<IComment>) {
    return await this.model
      .findOneAndUpdate(
        { _id: commentId, userId },
        updateData,
        { new: true }
      )
      .populate('userId', 'firstName lastName profileImage')
      .lean();
  }
}
