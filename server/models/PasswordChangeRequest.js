import { Schema, model } from 'mongoose';

const passwordChangeRequestSchema = new Schema(
  {
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetUser: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    newPassword: { type: String, required: true },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending', index: true },
    rejectionReason: { type: String, default: '' },
  },
  { timestamps: true }
);

export const PasswordChangeRequest = model('PasswordChangeRequest', passwordChangeRequestSchema, 'Approvals');
