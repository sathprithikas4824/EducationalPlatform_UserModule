import { supabase } from '../config/supabaseClient.js';
import AppError from '../utils/AppError.js';

export const getSubmodules = async (req, res, next) => {
  try {
    const { moduleId } = req.params;
    const { data, error } = await supabase
      .from('submodules')
      .select('*')
      .eq('module_id', moduleId)
      .is('deleted_at', null);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(new AppError(err.message, 500));
  }
};

export const createSubmodule = async (req, res, next) => {
  try {
    const { moduleId, name, title, description, image_url } = req.body;
    const { data, error } = await supabase
      .from('submodules')
      .insert([{ module_id: moduleId, name, title: title || null, description, image_url: image_url || null }])
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (err) {
    next(new AppError(err.message, 500));
  }
};

export const updateSubmodule = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, title, description, image_url } = req.body;

    const { data, error } = await supabase
      .from('submodules')
      .update({ name, title: title || null, description, image_url: image_url || null, updated_at: new Date() })
      .eq('submodule_id', id)
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    next(new AppError(err.message, 500));
  }
};

export const deleteSubmodule = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('submodules')
      .update({ deleted_at: new Date() })
      .eq('submodule_id', id);

    if (error) throw error;
    res.json({ message: 'Submodule deleted' });
  } catch (err) {
    next(new AppError(err.message, 500));
  }
};
