export const canManageTarget = (actorRole, targetRole) => {
  if (actorRole === 'admin') return true;
  if (actorRole === 'manager') return targetRole === 'user';
  return false;
};

export const isRoleCreateAllowed = (actorRole, targetRole) => {
  if (actorRole === 'admin') return true;
  if (actorRole === 'manager') return targetRole === 'user';
  return false;
};

export const getVisibleUserRoleFilter = (actorRole) => {
  if (actorRole === 'manager') return 'user';
  if (actorRole === 'admin') return { $in: ['user', 'manager'] };
  return 'user';
};
