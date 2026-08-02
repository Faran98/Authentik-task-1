export const validatePassword = (password) => {
  if (typeof password !== 'string') {
    return { valid: false, message: 'Password is required.' };
  }

  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long.' };
  }

  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must include uppercase, lowercase, and numeric characters.' };
  }

  return { valid: true, message: null };
};
