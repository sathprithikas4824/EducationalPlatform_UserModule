import { supabase } from '../config/supabaseClient.js';
import AppError from '../utils/AppError.js';

export const getTopics = async (req, res, next) => {
  try {
    const { submoduleId } = req.params;
    const { data, error } = await supabase
      .from('topics')
      .select('*')
      .eq('submodule_id', submoduleId)
      .is('deleted_at', null);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(new AppError(err.message, 500));
  }
};

// Get topics by module (for standalone categories)
export const getTopicsByModule = async (req, res, next) => {
  try {
    const { moduleId } = req.params;
    const { data, error } = await supabase
      .from('topics')
      .select('*')
      .eq('module_id', moduleId)
      .is('deleted_at', null);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(new AppError(err.message, 500));
  }
};

export const createTopic = async (req, res, next) => {
  try {
    const { submoduleId, moduleId, name, title, description, image_url } = req.body;

    // Validate that either submoduleId or moduleId is provided (not both)
    if ((submoduleId && moduleId) || (!submoduleId && !moduleId)) {
      return next(new AppError('Provide either submoduleId or moduleId, not both', 400));
    }

    const insertData = {
      name,
      title: title || null,
      description: description || null,
      image_url: image_url || null,
      ...(submoduleId ? { submodule_id: submoduleId } : { module_id: moduleId })
    };

    const { data, error } = await supabase
      .from('topics')
      .insert([insertData])
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (err) {
    next(new AppError(err.message, 500));
  }
};

export const updateTopic = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, title, description, image_url } = req.body;

    const { data, error } = await supabase
      .from('topics')
      .update({ name, title: title || null, description: description || null, image_url: image_url || null, updated_at: new Date() })
      .eq('topic_id', id)
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    next(new AppError(err.message, 500));
  }
};

export const deleteTopic = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('topics')
      .update({ deleted_at: new Date() })
      .eq('topic_id', id);

    if (error) throw error;
    res.json({ message: 'Topic deleted' });
  } catch (err) {
    next(new AppError(err.message, 500));
  }
};
