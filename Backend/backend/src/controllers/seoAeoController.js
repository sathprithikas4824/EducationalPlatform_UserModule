import { supabase } from '../config/supabaseClient.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import AppError from '../utils/AppError.js';

/**
 * @desc    Create or Update SEO metadata for a page
 * @route   POST /api/seo-aeo/seo
 * @access  Private/Admin
 */
const upsertSeoMeta = asyncHandler(async (req, res) => {
  // Log incoming request
  console.log('\n========== SEO UPSERT REQUEST ==========');
  console.log('Request Body:', JSON.stringify(req.body, null, 2));
  console.log('========================================\n');

  const {
    page_id,
    page_type,
    page_url,
    meta_title,
    meta_description,
    meta_keywords,
    og_title,
    og_description,
    og_image_url,
    og_type,
    twitter_card,
    twitter_title,
    twitter_description,
    twitter_image_url,
    canonical_url,
    robots_directive,
    hreflang_tags
  } = req.body;

  // Validation with detailed logging
  console.log('Validating required fields:');
  console.log('  page_id:', page_id);
  console.log('  page_type:', page_type);
  console.log('  meta_title:', meta_title, `(length: ${meta_title?.length || 0})`);
  console.log('  meta_description:', meta_description, `(length: ${meta_description?.length || 0})`);

  if (!page_id || !page_type || !meta_title || !meta_description) {
    console.error('❌ VALIDATION FAILED: Missing required fields');
    throw new AppError('Please provide all required SEO fields: page_id, page_type, meta_title, meta_description', 400);
  }

  // Validate character limits
  if (meta_title.length > 60) {
    console.error('❌ VALIDATION FAILED: meta_title exceeds 60 characters');
    throw new AppError('meta_title must be maximum 60 characters', 400);
  }
  if (meta_description.length > 160) {
    console.error('❌ VALIDATION FAILED: meta_description exceeds 160 characters');
    throw new AppError('meta_description must be maximum 160 characters', 400);
  }

  console.log('✅ Validation passed, preparing SEO data...');

  const seoData = {
    page_id,
    page_type,
    page_url: page_url || '',
    meta_title,
    meta_description,
    meta_keywords: meta_keywords || null,
    og_title: og_title || null,
    og_description: og_description || null,
    og_image_url: og_image_url || null,
    og_type: og_type || 'website',
    twitter_card: twitter_card || 'summary_large_image',
    twitter_title: twitter_title || null,
    twitter_description: twitter_description || null,
    twitter_image_url: twitter_image_url || null,
    canonical_url: canonical_url || page_url || '',
    robots_directive: robots_directive || 'index, follow',
    hreflang_tags: hreflang_tags || {}
  };

  console.log('Upserting to Supabase...');

  const { data, error } = await supabase
    .from('pages_seo_meta')
    .upsert(seoData, { onConflict: 'page_id' })
    .select()
    .single();

  if (error) {
    console.error('❌ Supabase error:', error);
    throw new AppError(`Failed to save SEO metadata: ${error.message}`, 500);
  }

  console.log('✅ SEO metadata saved successfully!');
  console.log('========================================\n');

  res.status(200).json({
    success: true,
    data
  });
});

/**
 * @desc    Create or Update AEO optimization data for a page
 * @route   POST /api/seo-aeo/aeo
 * @access  Private/Admin
 */
const upsertAeoOptimization = asyncHandler(async (req, res) => {
  // Log incoming request
  console.log('\n========== AEO UPSERT REQUEST ==========');
  console.log('Request Body:', JSON.stringify(req.body, null, 2));
  console.log('========================================\n');

  const {
    page_id,
    featured_snippet_target,
    snippet_format,
    paa_questions,
    paa_answers,
    conversational_query,
    voice_answer,
    ai_summary,
    key_facts,
    primary_entities,
    related_topics
  } = req.body;

  // Validation
  console.log('Validating page_id:', page_id);
  if (!page_id) {
    console.error('❌ VALIDATION FAILED: page_id is required');
    throw new AppError('page_id is required', 400);
  }

  // Check if SEO meta exists for this page_id
  console.log('Checking if SEO metadata exists for page_id:', page_id);
  const { data: seoExists } = await supabase
    .from('pages_seo_meta')
    .select('page_id')
    .eq('page_id', page_id)
    .single();

  if (!seoExists) {
    console.error('❌ SEO metadata not found for page_id:', page_id);
    throw new AppError('SEO metadata must be created first for this page_id', 400);
  }

  console.log('✅ SEO metadata exists, preparing AEO data...');

  const aeoData = {
    page_id,
    featured_snippet_target: featured_snippet_target || null,
    snippet_format: snippet_format || null,
    paa_questions: paa_questions || [],
    paa_answers: paa_answers || [],
    conversational_query: conversational_query || null,
    voice_answer: voice_answer || null,
    ai_summary: ai_summary || null,
    key_facts: key_facts || [],
    primary_entities: primary_entities || [],
    related_topics: related_topics || []
  };

  console.log('Upserting AEO data to Supabase...');

  const { data, error } = await supabase
    .from('pages_aeo_optimization')
    .upsert(aeoData, { onConflict: 'page_id' })
    .select()
    .single();

  if (error) {
    console.error('❌ Supabase error:', error);
    throw new AppError(`Failed to save AEO data: ${error.message}`, 500);
  }

  console.log('✅ AEO data saved successfully!');
  console.log('========================================\n');

  res.status(200).json({
    success: true,
    data
  });
});

/**
 * @desc    Get complete SEO/AEO data for a page
 * @route   GET /api/seo-aeo/:pageId
 * @access  Private
 */
const getSeoAeoData = asyncHandler(async (req, res) => {
  const { pageId } = req.params;

  // Get SEO metadata
  const { data: seoData, error: seoError } = await supabase
    .from('pages_seo_meta')
    .select('*')
    .eq('page_id', pageId)
    .single();

  if (seoError && seoError.code !== 'PGRST116') { // PGRST116 is "not found"
    throw new AppError(`Failed to fetch SEO data: ${seoError.message}`, 500);
  }

  // Get AEO data
  const { data: aeoData, error: aeoError } = await supabase
    .from('pages_aeo_optimization')
    .select('*')
    .eq('page_id', pageId)
    .single();

  if (aeoError && aeoError.code !== 'PGRST116') {
    throw new AppError(`Failed to fetch AEO data: ${aeoError.message}`, 500);
  }

  res.status(200).json({
    success: true,
    data: {
      seo: seoData || null,
      aeo: aeoData || null
    }
  });
});

/**
 * @desc    Delete SEO/AEO data for a page (cascades to AEO)
 * @route   DELETE /api/seo-aeo/:pageId
 * @access  Private/Admin
 */
const deleteSeoAeoData = asyncHandler(async (req, res) => {
  const { pageId } = req.params;

  const { error } = await supabase
    .from('pages_seo_meta')
    .delete()
    .eq('page_id', pageId);

  if (error) {
    throw new AppError(`Failed to delete SEO/AEO data: ${error.message}`, 500);
  }

  res.status(200).json({
    success: true,
    message: 'SEO/AEO data deleted successfully'
  });
});

/**
 * @desc    Get all SEO metadata (for admin dashboard)
 * @route   GET /api/seo-aeo/all
 * @access  Private/Admin
 */
const getAllSeoMeta = asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('pages_seo_meta')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    throw new AppError(`Failed to fetch SEO metadata: ${error.message}`, 500);
  }

  res.status(200).json({
    success: true,
    count: data.length,
    data
  });
});

export {
  upsertSeoMeta,
  upsertAeoOptimization,
  getSeoAeoData,
  deleteSeoAeoData,
  getAllSeoMeta
};
