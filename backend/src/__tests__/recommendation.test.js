import { RECOMMENDATION_WEIGHTS } from '../utils/constants.js';
import {
  recommendationQuerySchema,
  similarOrchardParamSchema,
} from '../validators/recommendation.validator.js';

describe('Smart Orchard Recommendation Engine Tests', () => {
  describe('RECOMMENDATION_WEIGHTS Constant Verification', () => {
    it('has exact weight distribution matching requirements', () => {
      expect(RECOMMENDATION_WEIGHTS.BOOKING_HISTORY).toBe(30);
      expect(RECOMMENDATION_WEIGHTS.WISHLIST).toBe(20);
      expect(RECOMMENDATION_WEIGHTS.PREFERRED_FRUITS).toBe(15);
      expect(RECOMMENDATION_WEIGHTS.LOCATION).toBe(10);
      expect(RECOMMENDATION_WEIGHTS.BUDGET).toBe(10);
      expect(RECOMMENDATION_WEIGHTS.RATINGS).toBe(10);
      expect(RECOMMENDATION_WEIGHTS.POPULARITY).toBe(5);

      const totalWeight = Object.values(RECOMMENDATION_WEIGHTS).reduce((a, b) => a + b, 0);
      expect(totalWeight).toBe(100);
    });
  });

  describe('Recommendation Validators (Zod Schemas)', () => {
    it('validates recommendation query schema defaults and options', () => {
      const validQuery = {
        limit: '15',
        fruit: 'mango',
        state: 'Maharashtra',
        district: 'Ratnagiri',
        maxPrice: '50000',
      };

      const parsed = recommendationQuerySchema.query.safeParse(validQuery);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.limit).toBe(15);
        expect(parsed.data.fruit).toBe('mango');
        expect(parsed.data.maxPrice).toBe(50000);
      }
    });

    it('rejects invalid limit or negative maxPrice in recommendation query', () => {
      const invalidQuery = {
        limit: '100', // exceeds max 50
        maxPrice: '-500',
      };

      const parsed = recommendationQuerySchema.query.safeParse(invalidQuery);
      expect(parsed.success).toBe(false);
    });

    it('validates similar orchard param schema with valid ObjectId', () => {
      const validParams = {
        orchardId: '60c72b2f9b1d8b0015b6d001',
      };

      const parsed = similarOrchardParamSchema.params.safeParse(validParams);
      expect(parsed.success).toBe(true);
    });

    it('rejects invalid ObjectId for similar orchard endpoint', () => {
      const invalidParams = {
        orchardId: 'not-an-object-id',
      };

      const parsed = similarOrchardParamSchema.params.safeParse(invalidParams);
      expect(parsed.success).toBe(false);
    });
  });
});
