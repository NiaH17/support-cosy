// Access levels for Support Cosy (all read from app_metadata, which users cannot edit):
//   admin   = UK admin   (app_metadata.role === 'admin'): everything, including Users and Reports
//   support = UK support (app_metadata.cosy_role === 'support'): everything except Users and Reports
//   partner = French partner (neither): information, installs and support requests for their own company
export function getRole(session) {
  const m = session?.user?.app_metadata || {}
  if (m.role === 'admin') return 'admin'
  if (m.cosy_role === 'support') return 'support'
  return 'partner'
}
export const isStaff = session => getRole(session) !== 'partner'
export const isUkAdmin = session => getRole(session) === 'admin'
