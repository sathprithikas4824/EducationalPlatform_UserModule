import express from 'express';
import {
  upsertSeoMeta,
  upsertAeoOptimization,
  getSeoAeoData,
  deleteSeoAeoData,
  getAllSeoMeta
} from '../controllers/seoAeoController.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import { body } from 'express-validator';
import { validate } from '../middleware/validationMiddleware.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(verifyToken);

/**
 * @route   POST /api/seo-aeo/seo
 * @desc    Create or Update SEO metadata
 * @access  Private/Admin
 */
router.post(
  '/seo',
  [
    body('page_id').notEmpty().withMessage('page_id is required'),
    body('page_type')
      .isIn(['homepage', 'course', 'article', 'pathway', 'category', 'about', 'contact', 'topic'])
      .withMessage('Invalid page_type'),
    body('page_url').optional(),
    body('meta_title')
      .notEmpty().withMessage('meta_title is required')
      .isLength({ max: 60 }).withMessage('meta_title must be maximum 60 characters'),
    body('meta_description')
      .notEmpty().withMessage('meta_description is required')
      .isLength({ max: 160 }).withMessage('meta_description must be maximum 160 characters'),
    body('og_title').optional().isLength({ max: 95 }).withMessage('og_title must be maximum 95 characters'),
    body('og_description').optional().isLength({ max: 200 }).withMessage('og_description must be maximum 200 characters'),
    body('twitter_title').optional().isLength({ max: 70 }).withMessage('twitter_title must be maximum 70 characters'),
    body('twitter_description').optional().isLength({ max: 200 }).withMessage('twitter_description must be maximum 200 characters')
  ],
  validate,
  upsertSeoMeta
);

/**
 * @route   POST /api/seo-aeo/aeo
 * @desc    Create or Update AEO optimization data
 * @access  Private/Admin
 */
router.post(
  '/aeo',
  [
    body('page_id').notEmpty().withMessage('page_id is required'),
    body('snippet_format')
      .optional()
      .isIn(['paragraph', 'list', 'table', 'video'])
      .withMessage('Invalid snippet_format'),
    body('paa_questions').optional().isArray().withMessage('paa_questions must be an array'),
    body('paa_answers').optional().isArray().withMessage('paa_answers must be an array'),
    body('key_facts').optional().isArray().withMessage('key_facts must be an array'),
    body('primary_entities').optional().isArray().withMessage('primary_entities must be an array'),
    body('related_topics').optional().isArray().withMessage('related_topics must be an array')
  ],
  validate,
  upsertAeoOptimization
);

/**
 * @route   GET /api/seo-aeo/all
 * @desc    Get all SEO metadata
 * @access  Private/Admin
 */
router.get('/all', getAllSeoMeta);

/**
 * @route   GET /api/seo-aeo/:pageId
 * @desc    Get SEO/AEO data for a specific page
 * @access  Private
 */
router.get('/:pageId', getSeoAeoData);

/**
 * @route   DELETE /api/seo-aeo/:pageId
 * @desc    Delete SEO/AEO data for a page
 * @access  Private/Admin
 */
router.delete('/:pageId', deleteSeoAeoData);

export default router;
