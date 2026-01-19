import express from 'express';
import { uploadImage, deleteImage, upload } from '../controllers/uploadController.js';

const router = express.Router();

// Upload image
router.post('/image', upload.single('image'), uploadImage);

// Delete image
router.delete('/image', deleteImage);

export default router;
