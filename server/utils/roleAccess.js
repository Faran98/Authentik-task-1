const normalizeRole = (role) => {
  if (!role) return 'customer';
  const normalized = String(role).trim().toLowerCase();
  if (normalized === 'user') return 'customer';
  return normalized;
};

export const canManageTarget = (actorRole, targetRole) => {
  const normalizedActorRole = normalizeRole(actorRole);
  const normalizedTargetRole = normalizeRole(targetRole);

  if (normalizedActorRole === 'admin') return true;
  if (normalizedActorRole === 'manager') return normalizedTargetRole === 'customer';
  return false;
};

export const isRoleCreateAllowed = (actorRole, targetRole) => {
  const normalizedActorRole = normalizeRole(actorRole);
  const normalizedTargetRole = normalizeRole(targetRole);

  if (normalizedActorRole === 'admin') return true;
  if (normalizedActorRole === 'manager') return normalizedTargetRole === 'customer';
  return false;
};

export const getVisibleUserRoleFilter = (actorRole) => {
  const normalizedActorRole = normalizeRole(actorRole);
  if (normalizedActorRole === 'manager') return 'customer';
  if (normalizedActorRole === 'admin') return { $in: ['customer', 'manager'] };
  return 'customer';
};
