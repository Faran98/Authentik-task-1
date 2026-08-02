import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePassword } from '../utils/passwordValidation.js';

test('accepts strong passwords', () => {
  const result = validatePassword('StrongPass123!');
  assert.equal(result.valid, true);
  assert.equal(result.message, null);
});

test('rejects weak passwords', () => {
  const result = validatePassword('weak');
  assert.equal(result.valid, false);
  assert.match(result.message, /at least 8 characters/i);
});
