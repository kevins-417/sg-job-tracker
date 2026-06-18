// Per-user scoping helper.
//
// A user sees their own rows (user_id = their id) plus any "legacy" rows that
// predate multi-user (user_id = ''). This keeps existing single-user data
// visible after the upgrade instead of orphaning it. New rows always get the
// current user's id.
export function ownScope(column = "user_id"): (paramIndex: number) => string {
  return (paramIndex: number) => `(${column} = $${paramIndex} OR ${column} = '')`;
}
