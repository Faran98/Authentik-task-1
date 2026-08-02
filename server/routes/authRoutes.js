import { Router } from 'express';
import {
  login,
  createUser,
  getActiveUsers,
  getDeletedUsers,
  updateUser,
  softDeleteUser,
  restoreUser,
  hardDeleteUser,
  updateUserStatus,
  forgotPassword,
  resetPassword,
} from '../controllers/authController.js';

const router = Router();

// Authentication Routes
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

// User Management Routes
router.get('/users/active', getActiveUsers);
router.get('/users/deleted', getDeletedUsers);
router.post('/users', createUser);
router.put('/users/:id', updateUser);

// Soft Delete / Status / Restore Routes
router.patch('/users/soft-delete/:id', softDeleteUser);
router.patch('/users/restore/:id', restoreUser);
router.patch('/users/status/:id', updateUserStatus);
router.delete('/users/hard-delete/:id', hardDeleteUser);

export default router;