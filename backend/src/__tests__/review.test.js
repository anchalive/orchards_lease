import mongoose from 'mongoose';
import { createReviewSchema, updateReviewSchema } from '../validators/review.validator.js';
import Review from '../models/Review.js';

describe('Review System Unit & Validation Tests', () => {
  const validObjectId = new mongoose.Types.ObjectId().toString();

  describe('createReviewSchema Validation', () => {
    it('accepts valid review creation payload with category ratings', () => {
      const payload = {
        orchardId: validObjectId,
        bookingId: validObjectId,
        rating: 5,
        cleanlinessRating: 5,
        maintenanceRating: 4,
        accessibilityRating: 4,
        communicationRating: 5,
        comment: 'Fantastic orchard experience with high yield and great support!',
      };

      const result = createReviewSchema.body.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.rating).toBe(5);
        expect(result.data.cleanlinessRating).toBe(5);
        expect(result.data.maintenanceRating).toBe(4);
      }
    });

    it('defaults category ratings to 5 if omitted', () => {
      const payload = {
        bookingId: validObjectId,
        rating: 4,
        comment: 'Great orchard!',
      };

      const result = createReviewSchema.body.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.cleanlinessRating).toBe(5);
        expect(result.data.maintenanceRating).toBe(5);
      }
    });

    it('rejects rating values outside 1-5 range', () => {
      const invalidLow = {
        bookingId: validObjectId,
        rating: 0,
      };

      const invalidHigh = {
        bookingId: validObjectId,
        rating: 6,
      };

      expect(createReviewSchema.body.safeParse(invalidLow).success).toBe(false);
      expect(createReviewSchema.body.safeParse(invalidHigh).success).toBe(false);
    });

    it('rejects category ratings outside 1-5 range', () => {
      const invalidCategory = {
        bookingId: validObjectId,
        rating: 4,
        cleanlinessRating: 6,
      };

      expect(createReviewSchema.body.safeParse(invalidCategory).success).toBe(false);
    });

    it('rejects review comment exceeding 2000 characters', () => {
      const longCommentPayload = {
        bookingId: validObjectId,
        rating: 5,
        comment: 'a'.repeat(2001),
      };

      expect(createReviewSchema.body.safeParse(longCommentPayload).success).toBe(false);
    });
  });

  describe('updateReviewSchema Validation', () => {
    it('accepts partial updates for ratings and comment', () => {
      const updatePayload = {
        rating: 4,
        comment: 'Updated review content',
        cleanlinessRating: 4,
      };

      const result = updateReviewSchema.body.safeParse(updatePayload);
      expect(result.success).toBe(true);
    });

    it('rejects invalid updated rating values', () => {
      const invalidUpdate = {
        rating: 7,
      };

      expect(updateReviewSchema.body.safeParse(invalidUpdate).success).toBe(false);
    });
  });
});
