import express from 'express';
import { uploadImage, deleteImage, upload, uploadVideo, uploadVideoMulter } from '../controllers/uploadController.js';

const router = express.Router();

// Upload image
router.post('/image', upload.single('image'), uploadImage);

// Upload video
router.post('/video', uploadVideoMulter.single('video'), uploadVideo);

// Delete image
router.delete('/image', deleteImage);

export default router;
