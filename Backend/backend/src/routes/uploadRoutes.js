import express from 'express';
import { uploadImage, deleteImage, upload, uploadVideo, uploadVideoMulter } from '../controllers/uploadController.js';
import { verifyToken, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/image', verifyToken, requireAdmin, upload.single('image'), uploadImage);
router.post('/video', verifyToken, requireAdmin, uploadVideoMulter.single('video'), uploadVideo);
router.delete('/image', verifyToken, requireAdmin, deleteImage);

export default router;
