import { Router } from 'express';
import * as weatherController from '../controllers/weather.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { getWeatherSchema } from '../validators/weather.validator.js';

const router = Router();

router.get('/:orchardId', validate(getWeatherSchema), weatherController.getWeatherForOrchard);

export default router;
