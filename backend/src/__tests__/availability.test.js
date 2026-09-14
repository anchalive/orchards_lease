import {
  checkRangesOverlap,
  hasBlockedDateOverlap,
} from '../services/availability.service.js';
import {
  createBlockDateSchema,
  updateBlockDateSchema,
} from '../validators/availability.validator.js';

describe('Orchard Availability Service & Validation Tests', () => {
  describe('checkRangesOverlap', () => {
    it('returns true when two date ranges overlap', () => {
      const startA = new Date('2026-08-01');
      const endA = new Date('2026-08-10');
      const startB = new Date('2026-08-05');
      const endB = new Date('2026-08-15');

      expect(checkRangesOverlap(startA, endA, startB, endB)).toBe(true);
    });

    it('returns false when two date ranges are strictly adjacent or separate', () => {
      const startA = new Date('2026-08-01');
      const endA = new Date('2026-08-10');
      const startB = new Date('2026-08-10');
      const endB = new Date('2026-08-20');

      expect(checkRangesOverlap(startA, endA, startB, endB)).toBe(false);
    });

    it('returns false when range A is entirely before range B', () => {
      const startA = new Date('2026-08-01');
      const endA = new Date('2026-08-05');
      const startB = new Date('2026-08-10');
      const endB = new Date('2026-08-15');

      expect(checkRangesOverlap(startA, endA, startB, endB)).toBe(false);
    });
  });

  describe('hasBlockedDateOverlap', () => {
    const existingBlocks = [
      {
        _id: '60c72b2f9b1d8b0015b6d001',
        startDate: new Date('2026-09-01'),
        endDate: new Date('2026-09-10'),
        reason: 'Maintenance',
      },
      {
        _id: '60c72b2f9b1d8b0015b6d002',
        startDate: new Date('2026-09-20'),
        endDate: new Date('2026-09-25'),
        reason: 'Harvest',
      },
    ];

    it('detects overlap with existing blocked date entry', () => {
      const overlap = hasBlockedDateOverlap(
        existingBlocks,
        new Date('2026-09-05'),
        new Date('2026-09-15')
      );
      expect(overlap).toBe(true);
    });

    it('returns false when non-overlapping date range is provided', () => {
      const overlap = hasBlockedDateOverlap(
        existingBlocks,
        new Date('2026-09-11'),
        new Date('2026-09-19')
      );
      expect(overlap).toBe(false);
    });

    it('ignores excluded blockId during update checks', () => {
      const overlap = hasBlockedDateOverlap(
        existingBlocks,
        new Date('2026-09-01'),
        new Date('2026-09-10'),
        '60c72b2f9b1d8b0015b6d001'
      );
      expect(overlap).toBe(false);
    });
  });

  describe('createBlockDateSchema Zod Validation', () => {
    it('validates correct block payload', () => {
      const validPayload = {
        params: { id: '60c72b2f9b1d8b0015b6d001' },
        body: {
          startDate: '2026-10-01',
          endDate: '2026-10-05',
          reason: 'Maintenance',
          note: 'Annual pruning',
        },
      };

      const paramsParse = createBlockDateSchema.params.safeParse(validPayload.params);
      const bodyParse = createBlockDateSchema.body.safeParse(validPayload.body);

      expect(paramsParse.success).toBe(true);
      expect(bodyParse.success).toBe(true);
    });

    it('rejects end date before start date', () => {
      const invalidPayload = {
        startDate: '2026-10-10',
        endDate: '2026-10-05',
        reason: 'Harvest',
      };

      const parseResult = createBlockDateSchema.body.safeParse(invalidPayload);
      expect(parseResult.success).toBe(false);
    });

    it('rejects invalid ObjectId parameters', () => {
      const invalidParam = { id: 'invalid-id-string' };
      const parseResult = createBlockDateSchema.params.safeParse(invalidParam);
      expect(parseResult.success).toBe(false);
    });
  });
});
