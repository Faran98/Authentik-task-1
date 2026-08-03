const normalizeRole = (role) => {
  if (!role) return 'customer';
  const normalized = String(role).trim().toLowerCase();
  if (normalized === 'user') return 'customer';
  return normalized;
};

export const canRequestPasswordChange = (actorRole, targetRole) => {
  const normalizedActorRole = normalizeRole(actorRole);
  const normalizedTargetRole = normalizeRole(targetRole);

  if (normalizedActorRole === 'admin') return true;
  if (normalizedActorRole === 'manager') return normalizedTargetRole === 'customer';
  if (normalizedActorRole === 'customer') return normalizedTargetRole === 'customer';
  return false;
};

export const normalizeRequestStatus = (status) => {
  const normalized = String(status || '').trim().toLowerCase();
  if (normalized === 'approved') return 'Approved';
  if (normalized === 'rejected') return 'Rejected';
  return 'Pending';
};
