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
  toggleUserStatus, // Single import, unused duplicates removed
  adminResetUserPassword,
  requestPasswordChange,
  getPasswordChangeRequests,
  reviewPasswordChangeRequest,
  forgotPassword,
  resetPassword,
} from '../controllers/authController.js';

const router = Router();

// Authentication Routes
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);
router.patch('/users/:userId/reset-password', adminResetUserPassword);
router.post('/password-change-requests', requestPasswordChange);
router.get('/password-change-requests', getPasswordChangeRequests);
router.get('/password-change-requests/:userId/manager', getPasswordChangeRequests);
router.patch('/password-change-requests/:id/review', reviewPasswordChangeRequest);

// User Management Routes
router.get('/users/active', getActiveUsers);
router.get('/users/deleted', getDeletedUsers);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
router.post('/admin/add-user', createUser);
router.put('/admin/users/:id', updateUser);

// Soft Delete / Status / Restore Routes
router.patch('/users/soft-delete/:id', softDeleteUser);
router.patch('/users/restore/:id', restoreUser);
router.patch('/users/status/:id', toggleUserStatus); // Alias route updated to toggleUserStatus
router.put('/admin/toggle-status/:id', toggleUserStatus);
router.delete('/users/hard-delete/:id', hardDeleteUser);

export default router;