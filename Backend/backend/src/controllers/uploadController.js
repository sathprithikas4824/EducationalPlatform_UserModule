import { supabase } from '../config/supabaseClient.js';
import AppError from '../utils/AppError.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure multer for memory storage
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Accept only image files
  const allowedTypes = /jpeg|jpg|png|gif|webp|svg/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp, svg)'));
  }
};

export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
});

// Upload image to Supabase Storage
export const uploadImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(new AppError('No file uploaded', 400));
    }

    const file = req.file;
    const fileExt = path.extname(file.originalname);
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}${fileExt}`;
    const filePath = `images/${fileName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('course-images') // Make sure this bucket exists in your Supabase project
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (error) {
      console.error('Supabase storage error:', error);
      return next(new AppError('Failed to upload image to storage', 500));
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('course-images')
      .getPublicUrl(filePath);

    res.status(200).json({
      success: true,
      imageUrl: publicUrlData.publicUrl,
      fileName: fileName,
      filePath: filePath
    });
  } catch (err) {
    console.error('Upload error:', err);
    next(new AppError(err.message || 'Failed to upload image', 500));
  }
};

// Delete image from Supabase Storage
export const deleteImage = async (req, res, next) => {
  try {
    const { filePath } = req.body;

    if (!filePath) {
      return next(new AppError('File path is required', 400));
    }

    const { error } = await supabase.storage
      .from('course-images')
      .remove([filePath]);

    if (error) {
      console.error('Delete error:', error);
      return next(new AppError('Failed to delete image', 500));
    }

    res.status(200).json({
      success: true,
      message: 'Image deleted successfully'
    });
  } catch (err) {
    next(new AppError(err.message || 'Failed to delete image', 500));
  }
};
