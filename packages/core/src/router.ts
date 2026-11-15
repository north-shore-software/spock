// Helpers for turning a route table into TanStack routes.

/** Drops the table-only `parent` field before handing options to TanStack. */
export function opts<T extends { parent: string }>(entry: T): Omit<T, "parent"> {
  const { parent, ...options } = entry;
  void parent;
  return options;
}
