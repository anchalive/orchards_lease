import { z } from 'zod';
import { objectId } from './common.validator.js';

export const getWeatherSchema = {
  params: z.object({
    orchardId: objectId,
  }),
};
