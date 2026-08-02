import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { sendEmail } from '../utils/sendEmail.js';
import { getUserStatusState } from '../utils/statusHelpers.js';

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// 1. Login
export const login = asyncHandler(async (req, res) => {
  const { email, password, role } = req.body;

  // Admin Login 
  if (role === 'admin') {
    if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
      const token = jwt.sign({ sub: 'admin', role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1d' });
      return res.status(200).json({
        success: true,
        message: 'Admin login successful',
        data: { token, user: { name: 'System Admin', email, role: 'admin' } },
      });
    }
    return res.status(401).json({ success: false, message: 'Invalid Admin Credentials' });
  }

  // User Login 
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user) return res.status(401).json({ success: false, message: 'Invalid Credentials' });

  // Soft Delete Check
  if (user.isDeleted) {
    return res.status(403).json({
      success: false,
      message: 'Your account has been deactivated. Please contact support.',
    });
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid Credentials' });

  const token = jwt.sign({ sub: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
  return res.status(200).json({
    success: true,
    message: 'User login successful',
    data: { token, user: { id: user._id, name: user.name, email: user.email, role: user.role } },
  });
});

// 2. Create User
export const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, status } = req.body;
  const existing = await User.findOne({ email });
  if (existing) return res.status(400).json({ success: false, message: 'User already exists' });

  const passwordHash = await bcrypt.hash(password, 10);
  const { status: normalizedStatus, isDeleted } = getUserStatusState(status);
  const newUser = await User.create({ name, email, passwordHash, role: 'user', status: normalizedStatus, isDeleted });
  res.status(201).json({ success: true, message: 'User created successfully', data: newUser });
});

// 3. Get Active Users
export const getActiveUsers = asyncHandler(async (_req, res) => {
  const users = await User.find({ status: 'active', isDeleted: false, role: 'user' }).lean();
  res.status(200).json({ success: true, data: users });
});

// 4. Get Soft-Deleted Users (Recycle Bin)
export const getDeletedUsers = asyncHandler(async (_req, res) => {
  const users = await User.find({ status: 'inactive', isDeleted: true, role: 'user' }).lean();
  res.status(200).json({ success: true, data: users });
});

// 5. Update User Profile (Triggered by Dashboard Edit Modal)
export const updateUser = asyncHandler(async (req, res) => {
  const { name, email, status } = req.body;
  const updates = { name, email };

  if (typeof status !== 'undefined') {
    const { status: normalizedStatus, isDeleted } = getUserStatusState(status);
    updates.status = normalizedStatus;
    updates.isDeleted = isDeleted;
  }

  const updated = await User.findByIdAndUpdate(
    req.params.id,
    updates,
    { new: true, runValidators: true }
  ).select('-passwordHash');

  if (!updated) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  res.status(200).json({ success: true, message: 'User profile updated', data: updated });
});

// 6. Soft Delete User
export const softDeleteUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.params.id, { status: 'inactive', isDeleted: true });
  res.status(200).json({ success: true, message: 'User soft deleted' });
});

// 7. Restore User
export const restoreUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.params.id, { status: 'active', isDeleted: false });
  res.status(200).json({ success: true, message: 'User restored' });
});

// 8. Hard Delete User
export const hardDeleteUser = asyncHandler(async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.status(200).json({ success: true, message: 'User permanently purged' });
});

// 9. Update User Status Toggle
export const updateUserStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, isDeleted } = req.body;
  const nextState = getUserStatusState(status ?? isDeleted);

  const updatedUser = await User.findByIdAndUpdate(
    id,
    { status: nextState.status, isDeleted: nextState.isDeleted },
    { new: true }
  );

  if (!updatedUser) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  res.status(200).json({
    success: true,
    message: `User status updated to ${nextState.status === 'inactive' ? 'Inactive/Deleted' : 'Active'}`,
    data: updatedUser,
  });
});

// 10. Forgot Password
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

// 11. Reset Password
export const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const passwordHash = await bcrypt.hash(password, 10);

  await User.findByIdAndUpdate(decoded.id, { passwordHash });

  res.status(200).json({ success: true, message: 'Password updated successfully!' });
});