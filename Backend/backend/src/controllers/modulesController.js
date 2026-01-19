import { supabase } from '../config/supabaseClient.js';
import AppError from '../utils/AppError.js';

export const getModuleById = async (req, res, next) => {
  try {
    const { moduleId } = req.params;
    const { data, error } = await supabase
      .from('modules')
      .select('*')
      .eq('module_id', moduleId)
      .is('deleted_at', null)
      .single();

    if (error) throw error;
    if (!data) {
      return next(new AppError('Module not found', 404));
    }
    res.json(data);
  } catch (err) {
    next(new AppError(err.message, 500));
  }
};

export const getModules = async (req, res, next) => {
  try {
    const { categoryId } = req.params;
    const { data, error } = await supabase
      .from('modules')
      .select('*')
      .eq('category_id', categoryId)
      .is('deleted_at', null);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(new AppError(err.message, 500));
  }
};

export const createModule = async (req, res, next) => {
  try {
    const { categoryId, name, title, description, image_url } = req.body;
    const { data, error } = await supabase
      .from('modules')
      .insert([{ category_id: categoryId, name, title: title || null, description, image_url: image_url || null }])
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (err) {
    next(new AppError(err.message, 500));
  }
};

export const updateModule = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, title, description, image_url } = req.body;

    const { data, error } = await supabase
      .from('modules')
      .update({ name, title: title || null, description, image_url: image_url || null, updated_at: new Date() })
      .eq('module_id', id)
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    next(new AppError(err.message, 500));
  }
};

export const deleteModule = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('modules')
      .update({ deleted_at: new Date() })
      .eq('module_id', id);

    if (error) throw error;
    res.json({ message: 'Module deleted' });
  } catch (err) {
    next(new AppError(err.message, 500));
  }
};
