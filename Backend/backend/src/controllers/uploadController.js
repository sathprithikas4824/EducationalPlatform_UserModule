import { supabase } from '../config/supabaseClient.js';
import AppError from '../utils/AppError.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure multer for memory storage
const storage = multer.memoryStorage();

const imageFileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp|svg/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp, svg)'));
  }
};

const videoFileFilter = (req, file, cb) => {
  const allowedTypes = /mp4|webm|ogg|mov|avi|mkv/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimeAllowed = /video\//.test(file.mimetype);
  if (mimeAllowed && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only video files are allowed (mp4, webm, ogg, mov)'));
  }
};

export const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFileFilter
});

export const uploadVideoMulter = multer({
  storage: storage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB for videos
  fileFilter: videoFileFilter
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

// Upload video to Cloudinary
export const uploadVideo = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(new AppError('No file uploaded', 400));
    }

    const file = req.file;

    const videoUrl = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'video',
          folder: 'course-videos',
          use_filename: true,
          unique_filename: true,
          overwrite: false,
          // Pre-generate the faststart version synchronously so the CDN-cached URL
          // is ready before any user tries to play the video. fl_faststart moves the
          // moov atom to the front of the MP4 so browsers can start playing after
          // downloading just the first few KB instead of the entire file.
          eager: [{ flags: 'faststart', format: 'mp4' }],
          eager_async: false,
        },
        (error, result) => {
          if (error) return reject(error);
          // Prefer the faststart-optimised URL; fall back to original if eager failed
          resolve(result.eager?.[0]?.secure_url || result.secure_url);
        }
      );
      Readable.from(file.buffer).pipe(uploadStream);
    });

    res.status(200).json({ success: true, videoUrl });
  } catch (err) {
    console.error('Cloudinary video upload error:', err);
    next(new AppError(err.message || 'Failed to upload video', 500));
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
