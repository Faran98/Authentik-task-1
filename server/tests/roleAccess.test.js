import test from 'node:test';
import assert from 'node:assert/strict';
import { canManageTarget, isRoleCreateAllowed, getVisibleUserRoleFilter } from '../utils/roleAccess.js';

test('admin can manage manager and user accounts', () => {
  assert.equal(canManageTarget('admin', 'user'), true);
  assert.equal(canManageTarget('admin', 'manager'), true);
  assert.equal(canManageTarget('admin', 'admin'), true);
});

test('manager can only manage user accounts', () => {
  assert.equal(canManageTarget('manager', 'user'), true);
  assert.equal(canManageTarget('manager', 'manager'), false);
  assert.equal(canManageTarget('manager', 'admin'), false);
});

test('manager can create only regular users', () => {
  assert.equal(isRoleCreateAllowed('manager', 'user'), true);
  assert.equal(isRoleCreateAllowed('manager', 'manager'), false);
});

test('visible role filter reflects the role hierarchy', () => {
  assert.equal(getVisibleUserRoleFilter('manager'), 'user');
  assert.deepEqual(getVisibleUserRoleFilter('admin'), { $in: ['user', 'manager'] });
});
