import express from 'express';
import * as topicsController from '../controllers/topicsController.js';
import { verifyToken, requireAdmin } from '../middleware/authMiddleware.js';
import { sanitizeBody } from '../middleware/sanitizeInput.js';

const router = express.Router();

router.get('/:submoduleId', topicsController.getTopics);
router.get('/module/:moduleId', topicsController.getTopicsByModule);
router.post('/', verifyToken, requireAdmin, sanitizeBody(['content']), topicsController.createTopic);
router.put('/:id', verifyToken, requireAdmin, sanitizeBody(['content']), topicsController.updateTopic);
router.delete('/:id', verifyToken, requireAdmin, topicsController.deleteTopic);

export default router;
