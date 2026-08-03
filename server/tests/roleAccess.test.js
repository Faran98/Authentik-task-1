import test from 'node:test';
import assert from 'node:assert/strict';
import { canManageTarget, isRoleCreateAllowed, getVisibleUserRoleFilter } from '../utils/roleAccess.js';

test('admin can manage manager and customer accounts', () => {
  assert.equal(canManageTarget('admin', 'customer'), true);
  assert.equal(canManageTarget('admin', 'manager'), true);
  assert.equal(canManageTarget('admin', 'admin'), true);
});

test('manager can only manage customer accounts', () => {
  assert.equal(canManageTarget('manager', 'customer'), true);
  assert.equal(canManageTarget('manager', 'manager'), false);
  assert.equal(canManageTarget('manager', 'admin'), false);
});

test('manager can create only customer accounts', () => {
  assert.equal(isRoleCreateAllowed('manager', 'customer'), true);
  assert.equal(isRoleCreateAllowed('manager', 'manager'), false);
  assert.equal(isRoleCreateAllowed('customer', 'customer'), false);
});

test('visible role filter reflects the role hierarchy', () => {
  assert.equal(getVisibleUserRoleFilter('manager'), 'customer');
  assert.deepEqual(getVisibleUserRoleFilter('admin'), { $in: ['customer', 'manager'] });
});
