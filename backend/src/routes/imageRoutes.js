import express from 'express';
import upload from '../middleware/upload.js';
import uploadImage from '../controllers/imageController.js';

const router = express.Router();

// POST /api/images/upload
router.post('/upload', upload.single('image'), uploadImage);

export default router;