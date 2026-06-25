// Centralized, declarative permission map — extensible for future custom roles

export const PERMISSIONS = {
  VIEW_INTERVIEWS: "view:interviews",
  TAKE_INTERVIEW: "take:interview",
  VIEW_REPORTS: "view:reports",
  EVALUATE_STUDENT: "evaluate:student",
  POST_FEEDBACK: "post:feedback",
  MANAGE_USERS: "manage:users",
  VIEW_SYSTEM_AUDIT: "view:system_audit",
  MODIFY_SETTINGS: "modify:settings",
};

export const ROLE_PERMISSIONS = {
  student: [
    PERMISSIONS.VIEW_INTERVIEWS,
    PERMISSIONS.TAKE_INTERVIEW,
    PERMISSIONS.VIEW_REPORTS,
  ],
  mentor: [
    PERMISSIONS.VIEW_INTERVIEWS,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.EVALUATE_STUDENT,
    PERMISSIONS.POST_FEEDBACK,
  ],
  admin: Object.values(PERMISSIONS), // Admin receives all permissions
};

/**
 * Checks whether a given role has a specific permission.
 * @param {string} role - The user's role (e.g., "student", "mentor", "admin")
 * @param {string} permission - A PERMISSIONS value to check
 * @returns {boolean}
 */
export function roleHasPermission(role, permission) {
  const allowed = ROLE_PERMISSIONS[role];
  if (!allowed) return false;
  return allowed.includes(permission);
}

/**
 * Returns the full permission list for a given role.
 * Returns an empty array for unknown roles.
 * @param {string} role
 * @returns {string[]}
 */
export function getPermissionsForRole(role) {
  return ROLE_PERMISSIONS[role] ?? [];
}

/**
 * All recognized role names. Add new roles here to extend the system.
 */
export const VALID_ROLES = Object.keys(ROLE_PERMISSIONS);
