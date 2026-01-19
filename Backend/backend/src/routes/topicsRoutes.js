import express from 'express';
import * as topicsController from '../controllers/topicsController.js';
import { sanitizeBody } from '../middleware/sanitizeInput.js';

const router = express.Router();

router.get('/:submoduleId', topicsController.getTopics);
router.get('/module/:moduleId', topicsController.getTopicsByModule); // For standalone categories
router.post('/', sanitizeBody(['content']), topicsController.createTopic);
router.put('/:id', sanitizeBody(['content']), topicsController.updateTopic);
router.delete('/:id', topicsController.deleteTopic);

export default router;
