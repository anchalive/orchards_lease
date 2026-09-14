import mongoose from 'mongoose';
import { followSeller, unfollowSeller } from '../services/follow.service.js';
import { ROLES } from '../utils/constants.js';

describe('Follow Service & Business Logic Tests', () => {
  const mockRenterId = new mongoose.Types.ObjectId().toString();
  const mockSellerId = new mongoose.Types.ObjectId().toString();

  const renterUser = {
    _id: mockRenterId,
    role: ROLES.RENTER,
    name: 'Renter Test',
  };

  const sellerUser = {
    _id: mockSellerId,
    role: ROLES.SELLER,
    name: 'Seller Test',
  };

  it('rejects self-follow attempt', async () => {
    await expect(
      followSeller({
        followerUser: { _id: mockSellerId, role: ROLES.RENTER },
        sellerId: mockSellerId,
      })
    ).rejects.toThrow('You cannot follow yourself');
  });

  it('rejects follow attempt by non-renters (sellers)', async () => {
    await expect(
      followSeller({
        followerUser: sellerUser,
        sellerId: mockRenterId,
      })
    ).rejects.toThrow('Only renters can follow sellers');
  });

  it('rejects unfollow attempt by non-renters', async () => {
    await expect(
      unfollowSeller({
        followerUser: sellerUser,
        sellerId: mockRenterId,
      })
    ).rejects.toThrow('Only renters can unfollow sellers');
  });

  it('rejects follow attempt with invalid seller ID format', async () => {
    await expect(
      followSeller({
        followerUser: renterUser,
        sellerId: 'invalid-object-id',
      })
    ).rejects.toThrow('Invalid seller ID format');
  });

  it('rejects unfollow attempt with invalid seller ID format', async () => {
    await expect(
      unfollowSeller({
        followerUser: renterUser,
        sellerId: 'invalid-object-id',
      })
    ).rejects.toThrow('Invalid seller ID format');
  });
});
