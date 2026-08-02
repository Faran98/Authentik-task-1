export const normalizeUserStatus = (value) => {
  if (typeof value === 'boolean') return value ? 'inactive' : 'active';
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'active' || normalized === 'inactive') return normalized;
  }

  return 'active';
};

export const getUserStatusState = (value) => {
  const normalizedStatus = normalizeUserStatus(value);
  const isDeleted = normalizedStatus === 'inactive';

  return {
    status: normalizedStatus,
    isDeleted,
  };
};
