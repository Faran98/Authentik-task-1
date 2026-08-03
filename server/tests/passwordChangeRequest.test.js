import test from 'node:test';
import assert from 'node:assert/strict';
import { canRequestPasswordChange, normalizeRequestStatus } from '../utils/passwordChangeRequest.js';

test('manager can request password changes for customer accounts', () => {
  assert.equal(canRequestPasswordChange('manager', 'customer'), true);
  assert.equal(canRequestPasswordChange('manager', 'manager'), false);
  assert.equal(canRequestPasswordChange('manager', 'admin'), false);
});

test('customer can request password changes for their own account', () => {
  assert.equal(canRequestPasswordChange('customer', 'customer'), true);
});

test('admin can request password changes for all accessible targets', () => {
  assert.equal(canRequestPasswordChange('admin', 'customer'), true);
  assert.equal(canRequestPasswordChange('admin', 'manager'), true);
});

test('request status is normalized to a supported value', () => {
  assert.equal(normalizeRequestStatus('Pending'), 'Pending');
  assert.equal(normalizeRequestStatus('approved'), 'Approved');
  assert.equal(normalizeRequestStatus('rejected'), 'Rejected');
  assert.equal(normalizeRequestStatus('unknown'), 'Pending');
});
