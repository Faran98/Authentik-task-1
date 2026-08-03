import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { PasswordChangeRequest } from '../models/PasswordChangeRequest.js';
import { sendEmail } from '../utils/sendEmail.js';
import { getUserStatusState, normalizeUserStatus } from '../utils/statusHelpers.js';
import { validatePassword } from '../utils/passwordValidation.js';
import { canManageTarget, getVisibleUserRoleFilter, isRoleCreateAllowed } from '../utils/roleAccess.js';
import { canRequestPasswordChange, normalizeRequestStatus } from '../utils/passwordChangeRequest.js';

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// 1. Login (FIXED: Status field inside Auth Response)
export const login = asyncHandler(async (req, res) => {
  const { email, password, role } = req.body;
  const requestedRole = String(role || 'customer').trim().toLowerCase();

  // Admin Login 
  if (requestedRole === 'admin') {
    if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
      const token = jwt.sign({ sub: 'admin', role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1d' });
      return res.status(200).json({
        success: true,
        message: 'Admin login successful',
        data: { token, user: { name: 'System Admin', email, role: 'admin', status: 'active' } },
      });
    }
    return res.status(401).json({ success: false, message: 'Invalid Admin Credentials' });
  }

  // User Login 
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user) return res.status(401).json({ success: false, message: 'Invalid Credentials' });

  if (user.role !== requestedRole) {
    return res.status(401).json({ success: false, message: 'Role mismatch for this account.' });
  }

  // Soft Delete Check (Purged accounts)
  if (user.isDeleted) {
    return res.status(403).json({
      success: false,
      message: 'Your account has been deleted. Please contact support.',
    });
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid Credentials' });

  const token = jwt.sign({ sub: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
  
  // FIX 2: Return dynamic status (active/inactive) so UI displays exact state upon login
  return res.status(200).json({
    success: true,
    message: 'User login successful',
    data: { 
      token, 
      user: { 
        id: user._id, 
        _id: user._id,
        name: user.name, 
        email: user.email, 
        role: user.role,
        status: user.status || 'active' 
      } 
    },
  });
});

// 2. Create User
export const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, status, role: requestedRole } = req.body;
  const actorRole = req.body.actorRole || 'customer';
  const targetRole = requestedRole || 'customer';

  if (!isRoleCreateAllowed(actorRole, targetRole)) {
    return res.status(403).json({ success: false, message: 'You are not allowed to create this role.' });
  }

  const existing = await User.findOne({ email });
  if (existing) return res.status(400).json({ success: false, message: 'User already exists' });

  const passwordHash = await bcrypt.hash(password, 10);
  const normalizedStatus = normalizeUserStatus(status);
  const newUser = await User.create({ name, email, passwordHash, role: targetRole, status: normalizedStatus, isDeleted: false });
  res.status(201).json({ success: true, message: 'User created successfully', data: newUser });
});

// 3. Get Active Users
export const getActiveUsers = asyncHandler(async (req, res) => {
  const actorRole = req.query.role || 'customer';
  const roleFilter = getVisibleUserRoleFilter(actorRole);
  
  // Active means status == 'active' and not archived/deleted
  const query = { status: 'active', isDeleted: false };
  if (roleFilter) query.role = roleFilter;

  const users = await User.find(query).lean();
  res.status(200).json({ success: true, data: users });
});

// 4. Get Inactive Users (FIX 1: Search by status: 'inactive' instead of isDeleted: true)
export const getDeletedUsers = asyncHandler(async (req, res) => {
  const actorRole = req.query.role || 'customer';
  const roleFilter = getVisibleUserRoleFilter(actorRole);

  // Core Bug Fix: Inactive records rely on status: 'inactive', not isDeleted: true
  const query = { status: 'inactive', isDeleted: false };
  if (roleFilter) query.role = roleFilter;

  const users = await User.find(query).lean();
  res.status(200).json({ success: true, data: users });
});

// 5. Update User Profile (FIX 3: Block editing for inactive users)
export const updateUser = asyncHandler(async (req, res) => {
  const { name, email, status, role: requestedRole, password } = req.body;
  const targetUser = await User.findById(req.params.id);
  const actorRole = req.body.actorRole || 'customer';

  if (!targetUser) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  // FIX 3: Restrict updates if the target user account is inactive (unless strictly updating status to activate)
  if (targetUser.status === 'inactive' && status !== 'active') {
    return res.status(403).json({
      success: false,
      message: 'Inactive user profile is locked. Please activate the user before updating details.',
    });
  }

  if (!canManageTarget(actorRole, targetUser.role)) {
    return res.status(403).json({ success: false, message: 'You are not allowed to manage this account.' });
  }

  if (requestedRole && !isRoleCreateAllowed(actorRole, requestedRole)) {
    return res.status(403).json({ success: false, message: 'You are not allowed to assign this role.' });
  }

  const updates = {};

  if (typeof name !== 'undefined') {
    updates.name = name;
  }

  if (typeof email !== 'undefined') {
    const normalizedEmail = String(email).trim().toLowerCase();
    if (normalizedEmail !== targetUser.email.toLowerCase()) {
      const existing = await User.findOne({ email: normalizedEmail });
      if (existing && existing._id.toString() !== targetUser._id.toString()) {
        return res.status(400).json({ success: false, message: 'User with this email already exists' });
      }
    }
    updates.email = normalizedEmail;
  }

  if (typeof status !== 'undefined') {
    updates.status = normalizeUserStatus(status);
    updates.isDeleted = false;
  }

  if (requestedRole) {
    updates.role = requestedRole;
  }

  if (typeof password !== 'undefined' && password) {
    const validation = validatePassword(password);
    if (!validation.valid) {
      return res.status(400).json({ success: false, message: validation.message });
    }
    updates.passwordHash = await bcrypt.hash(password, 10);
  }

  const updated = await User.findByIdAndUpdate(
    req.params.id,
    updates,
    { new: true, runValidators: true }
  ).select('-passwordHash');

  res.status(200).json({ success: true, message: 'User profile updated', data: updated });
});

// 6. Soft Delete (Archive)
export const softDeleteUser = asyncHandler(async (req, res) => {
  const targetUser = await User.findById(req.params.id);
  const actorRole = req.body.actorRole || 'customer';

  if (!targetUser) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  if (!canManageTarget(actorRole, targetUser.role)) {
    return res.status(403).json({ success: false, message: 'You are not allowed to manage this account.' });
  }

  await User.findByIdAndUpdate(req.params.id, { isDeleted: true });
  res.status(200).json({ success: true, message: 'User archived successfully' });
});

// 7. Restore User
export const restoreUser = asyncHandler(async (req, res) => {
  const targetUser = await User.findById(req.params.id);
  const actorRole = req.body.actorRole || 'customer';

  if (!targetUser) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  if (!canManageTarget(actorRole, targetUser.role)) {
    return res.status(403).json({ success: false, message: 'You are not allowed to manage this account.' });
  }

  await User.findByIdAndUpdate(req.params.id, { status: 'active', isDeleted: false });
  res.status(200).json({ success: true, message: 'User restored' });
});

// 8. Hard Delete User
export const hardDeleteUser = asyncHandler(async (req, res) => {
  const targetUser = await User.findById(req.params.id);
  const actorRole = req.body.actorRole || 'customer';

  if (!targetUser) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  if (!canManageTarget(actorRole, targetUser.role)) {
    return res.status(403).json({ success: false, message: 'You are not allowed to manage this account.' });
  }

  await User.findByIdAndDelete(req.params.id);
  res.status(200).json({ success: true, message: 'User permanently purged' });
});

// 9. Toggle User Status Handler
export const toggleUserStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const actorRole = req.body.actorRole || 'customer';
  const targetUser = await User.findById(id);

  if (!targetUser) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  if (!canManageTarget(actorRole, targetUser.role)) {
    return res.status(403).json({ success: false, message: 'You are not allowed to manage this account.' });
  }

  const requestedStatus = typeof req.body.status !== 'undefined' 
    ? normalizeUserStatus(req.body.status) 
    : (targetUser.status === 'active' ? 'inactive' : 'active');

  const updatedUser = await User.findByIdAndUpdate(
    id, 
    { status: requestedStatus, isDeleted: false }, 
    { new: true }
  ).select('-passwordHash');

  res.status(200).json({
    success: true,
    message: `User status updated to ${requestedStatus === 'inactive' ? 'Inactive' : 'Active'}`,
    data: updatedUser,
  });
});

// 10. Admin Reset User Password
export const adminResetUserPassword = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { password, actorRole } = req.body;

  const validation = validatePassword(password);
  if (!validation.valid) {
    return res.status(400).json({ success: false, message: validation.message });
  }

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  if (!canManageTarget(actorRole || 'customer', user.role)) {
    return res.status(403).json({ success: false, message: 'You are not allowed to manage this account.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await User.findByIdAndUpdate(userId, { passwordHash });

  res.status(200).json({ success: true, message: 'User password updated successfully!' });
});

export const requestPasswordChange = asyncHandler(async (req, res) => {
  const { targetUserId, password, actorRole, requesterId } = req.body;

  const validation = validatePassword(password);
  if (!validation.valid) {
    return res.status(400).json({ success: false, message: validation.message });
  }

  const targetUser = await User.findById(targetUserId);
  if (!targetUser) {
    return res.status(404).json({ success: false, message: 'Target user not found' });
  }

  if (!canRequestPasswordChange(actorRole || 'customer', targetUser.role)) {
    return res.status(403).json({ success: false, message: 'Managers can only request password changes for regular users.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const request = await PasswordChangeRequest.create({
    requestedBy: requesterId,
    targetUser: targetUserId,
    newPassword: passwordHash,
    status: 'Pending',
  });

  res.status(201).json({ success: true, message: 'Password change request submitted for approval.', data: request });
});

export const getPasswordChangeRequests = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const query = userId ? { requestedBy: userId } : { status: 'Pending' };
  const requests = await PasswordChangeRequest.find(query).populate('requestedBy', 'name email role').populate('targetUser', 'name email role').lean();
  res.status(200).json({ success: true, data: requests });
});

export const reviewPasswordChangeRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { action, rejectionReason } = req.body;
  const normalizedStatus = normalizeRequestStatus(action);

  const request = await PasswordChangeRequest.findById(id);
  if (!request) {
    return res.status(404).json({ success: false, message: 'Request not found' });
  }

  if (normalizedStatus === 'Rejected') {
    request.status = 'Rejected';
    request.rejectionReason = rejectionReason || 'No reason provided.';
    await request.save();
    return res.status(200).json({ success: true, message: 'Password change request rejected.', data: request });
  }

  const targetUser = await User.findById(request.targetUser);
  if (!targetUser) {
    return res.status(404).json({ success: false, message: 'Target user not found' });
  }

  targetUser.passwordHash = request.newPassword;
  await targetUser.save();
  request.status = 'Approved';
  request.rejectionReason = '';
  await request.save();

  res.status(200).json({ success: true, message: 'Password change request approved.', data: request });
});

// 11. Forgot Password
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (!user) {
    return res.status(404).json({ success: false, message: 'User with this email does not exist' });
  }

  const resetToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '15m' });
  const resetUrl = `http://localhost:5173/reset-password/${resetToken}`;
  const message = `You requested a password reset. Please click on this link to reset your password: \n\n ${resetUrl}`;

  await sendEmail({
    email: user.email,
    subject: 'Password Reset Request',
    message,
  });

  res.status(200).json({ success: true, message: 'Password reset link sent to email!' });
});

// 12. Reset Password
export const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const passwordHash = await bcrypt.hash(password, 10);

  await User.findByIdAndUpdate(decoded.id, { passwordHash });

  res.status(200).json({ success: true, message: 'Password updated successfully!' });
});