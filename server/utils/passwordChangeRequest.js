export const canRequestPasswordChange = (actorRole, targetRole) => {
  if (actorRole === 'admin') return true;
  if (actorRole === 'manager') return targetRole === 'user';
  return false;
};

export const normalizeRequestStatus = (status) => {
  const normalized = String(status || '').trim().toLowerCase();
  if (normalized === 'approved') return 'Approved';
  if (normalized === 'rejected') return 'Rejected';
  return 'Pending';
};
