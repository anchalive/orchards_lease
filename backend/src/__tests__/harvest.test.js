import { calculateHarvestStatus } from '../services/harvest.service.js';
import { updateHarvestSchema } from '../validators/orchard.validator.js';

describe('Harvest Season Service & Validation Tests', () => {
  describe('calculateHarvestStatus', () => {
    it('returns default status when harvestSeasons is empty', () => {
      const result = calculateHarvestStatus([]);
      expect(result).toEqual({
        harvestSeasons: [],
        fruits: [],
        currentStatus: 'No Harvest Schedule',
        nextHarvest: null,
        badge: null,
        isCurrentlyHarvesting: false,
      });
    });

    it('correctly calculates harvest status for configured seasons', () => {
      const currentMonth = new Date().getMonth() + 1;
      const testSeasons = [
        {
          fruitName: 'Mango',
          startMonth: currentMonth,
          peakStartMonth: currentMonth,
          peakEndMonth: currentMonth,
          endMonth: (currentMonth % 12) + 1,
        },
      ];

      const result = calculateHarvestStatus(testSeasons);
      expect(result.isCurrentlyHarvesting).toBe(true);
      expect(result.currentStatus).toBe('Peak Season');
      expect(result.badge).toBe('⭐ Peak Season');
      expect(result.harvestSeasons).toHaveLength(1);
      expect(result.harvestSeasons[0].fruitName).toBe('Mango');
    });

    it('calculates upcoming harvest when current month is outside harvest window', () => {
      const currentMonth = new Date().getMonth() + 1;
      const nextMonth = (currentMonth % 12) + 1;
      const monthAfter = ((currentMonth + 1) % 12) + 1;

      const testSeasons = [
        {
          fruitName: 'Apple',
          startMonth: nextMonth,
          peakStartMonth: nextMonth,
          peakEndMonth: monthAfter,
          endMonth: monthAfter,
        },
      ];

      const result = calculateHarvestStatus(testSeasons);
      expect(result.isCurrentlyHarvesting).toBe(false);
      expect(result.currentStatus).toBe('Upcoming Harvest');
      expect(result.nextHarvest).not.toBeNull();
      expect(result.nextHarvest.fruitName).toBe('Apple');
      expect(result.nextHarvest.monthsUntil).toBe(1);
    });
  });

  describe('updateHarvestSchema Validation', () => {
    it('accepts valid harvest season array', () => {
      const validPayload = {
        harvestSeasons: [
          {
            fruitName: 'Mango',
            startMonth: 4,
            peakStartMonth: 5,
            peakEndMonth: 6,
            endMonth: 7,
          },
          {
            fruitName: 'Litchi',
            startMonth: 5,
            peakStartMonth: 5,
            peakEndMonth: 6,
            endMonth: 6,
          },
        ],
      };

      const parseResult = updateHarvestSchema.body.safeParse(validPayload);
      expect(parseResult.success).toBe(true);
    });

    it('rejects duplicate fruit names', () => {
      const duplicatePayload = {
        harvestSeasons: [
          {
            fruitName: 'Mango',
            startMonth: 4,
            peakStartMonth: 5,
            peakEndMonth: 6,
            endMonth: 7,
          },
          {
            fruitName: 'mango', // case-insensitive duplicate
            startMonth: 5,
            peakStartMonth: 5,
            peakEndMonth: 6,
            endMonth: 6,
          },
        ],
      };

      const parseResult = updateHarvestSchema.body.safeParse(duplicatePayload);
      expect(parseResult.success).toBe(false);
    });

    it('rejects peak harvest months outside overall harvest season range', () => {
      const invalidPeakPayload = {
        harvestSeasons: [
          {
            fruitName: 'Orange',
            startMonth: 10,
            peakStartMonth: 1, // January peak is outside Oct-Dec window
            peakEndMonth: 2,
            endMonth: 12,
          },
        ],
      };

      const parseResult = updateHarvestSchema.body.safeParse(invalidPeakPayload);
      expect(parseResult.success).toBe(false);
    });

    it('rejects month values outside 1-12', () => {
      const invalidMonthPayload = {
        harvestSeasons: [
          {
            fruitName: 'Guava',
            startMonth: 0,
            peakStartMonth: 1,
            peakEndMonth: 2,
            endMonth: 13,
          },
        ],
      };

      const parseResult = updateHarvestSchema.body.safeParse(invalidMonthPayload);
      expect(parseResult.success).toBe(false);
    });
  });
});
