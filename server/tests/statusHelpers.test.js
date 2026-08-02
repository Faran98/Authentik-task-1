import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeUserStatus, getUserStatusState } from '../utils/statusHelpers.js';

test('normalizes active and inactive strings', () => {
  assert.equal(normalizeUserStatus('active'), 'active');
  assert.equal(normalizeUserStatus('inactive'), 'inactive');
  assert.equal(normalizeUserStatus('Active '), 'active');
  assert.equal(normalizeUserStatus('INACTIVE'), 'inactive');
});

test('maps boolean values to the correct user status state', () => {
  assert.deepEqual(getUserStatusState(true), { status: 'inactive', isDeleted: true });
  assert.deepEqual(getUserStatusState(false), { status: 'active', isDeleted: false });
});
