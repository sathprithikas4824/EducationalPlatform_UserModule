import express from 'express';
import * as modulesController from '../controllers/modulesController.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import { sanitizeBody } from '../middleware/sanitizeInput.js';

const router = express.Router();

router.get('/single/:moduleId', modulesController.getModuleById);
router.get('/:categoryId', modulesController.getModules);
router.post('/', verifyToken, sanitizeBody(['description']), modulesController.createModule);
router.put('/:id', verifyToken, sanitizeBody(['description']), modulesController.updateModule);
router.delete('/:id', verifyToken, modulesController.deleteModule);

export default router;
