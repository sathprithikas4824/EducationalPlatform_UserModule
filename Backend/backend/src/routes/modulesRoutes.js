import express from 'express';
import * as modulesController from '../controllers/modulesController.js';
import { verifyToken, requireAdmin } from '../middleware/authMiddleware.js';
import { sanitizeBody } from '../middleware/sanitizeInput.js';

const router = express.Router();

router.get('/single/:moduleId', modulesController.getModuleById);
router.get('/:categoryId', modulesController.getModules);
router.post('/', verifyToken, requireAdmin, sanitizeBody(['description']), modulesController.createModule);
router.put('/:id', verifyToken, requireAdmin, sanitizeBody(['description']), modulesController.updateModule);
router.delete('/:id', verifyToken, requireAdmin, modulesController.deleteModule);

export default router;
