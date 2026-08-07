/**
 * Turns Zod issues into the flat `{ field: message }` shape the forms render.
 *
 * Shared by every server action: they all show one message per field, and four
 * copies of the same loop drifted apart too easily.
 */
export function collectErrors(
  issues: readonly { path: PropertyKey[]; message: string }[],
  /**
   * Renames a field. The driver form posts as `driverName` while the column is
   * `name`, so the message has to land on the input that exists in the page.
   */
  rename: Record<string, string> = {},
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const path = String(issue.path[0]);
    const key = rename[path] ?? path;
    // First message wins: the form shows a single one per field.
    errors[key] ??= issue.message;
  }
  return errors;
}
