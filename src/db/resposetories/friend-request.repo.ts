import { FriendRequestModel, IFriendRequest, FriendRequestStatus } from '@db/models/friend-request.model';
import { DatabaseRepo } from './database.repo';
import mongoose from 'mongoose';

export class FriendRequestRepository extends DatabaseRepo<IFriendRequest> {
  constructor() {
    super(FriendRequestModel);
  }

  async findBySenderAndReceiver(senderId: string, receiverId: string) {
    return await this.model.findOne({ senderId, receiverId }).lean();
  }

  async findPendingRequestsBetweenUsers(userId1: string, userId2: string) {
    return await this.model.findOne({
      $or: [
        { senderId: userId1, receiverId: userId2, status: FriendRequestStatus.PENDING },
        { senderId: userId2, receiverId: userId1, status: FriendRequestStatus.PENDING }
      ]
    }).lean();
  }

  async findReceivedRequests(userId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    return await this.model
      .find({ receiverId: userId, status: FriendRequestStatus.PENDING })
      .populate('senderId', 'firstName lastName profileImage email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
  }

  async findSentRequests(userId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    return await this.model
      .find({ senderId: userId, status: FriendRequestStatus.PENDING })
      .populate('receiverId', 'firstName lastName profileImage email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
  }

  async findFriends(userId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    return await this.model
      .find({
        $or: [
          { senderId: userId, status: FriendRequestStatus.ACCEPTED },
          { receiverId: userId, status: FriendRequestStatus.ACCEPTED }
        ]
      })
      .populate('senderId', 'firstName lastName profileImage email')
      .populate('receiverId', 'firstName lastName profileImage email')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
  }

  async countReceivedRequests(userId: string) {
    return await this.model.countDocuments({ 
      receiverId: userId, 
      status: FriendRequestStatus.PENDING 
    });
  }

  async countSentRequests(userId: string) {
    return await this.model.countDocuments({ 
      senderId: userId, 
      status: FriendRequestStatus.PENDING 
    });
  }

  async countFriends(userId: string) {
    return await this.model.countDocuments({
      $or: [
        { senderId: userId, status: FriendRequestStatus.ACCEPTED },
        { receiverId: userId, status: FriendRequestStatus.ACCEPTED }
      ]
    });
  }

  async updateStatus(requestId: string, status: FriendRequestStatus) {
    return await this.model
      .findByIdAndUpdate(requestId, { status }, { new: true })
      .populate('senderId', 'firstName lastName profileImage email')
      .populate('receiverId', 'firstName lastName profileImage email')
      .lean();
  }

  async findById(requestId: string) {
    return await this.model
      .findById(requestId)
      .populate('senderId', 'firstName lastName profileImage email')
      .populate('receiverId', 'firstName lastName profileImage email')
      .lean();
  }

  async deleteById(requestId: string) {
    return await this.model.findByIdAndDelete(requestId);
  }

  async areFriends(userId1: string, userId2: string) {
    const friendship = await this.model.findOne({
      $or: [
        { senderId: userId1, receiverId: userId2, status: FriendRequestStatus.ACCEPTED },
        { senderId: userId2, receiverId: userId1, status: FriendRequestStatus.ACCEPTED }
      ]
    }).lean();
    
    return !!friendship;
  }
}
