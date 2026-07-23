// Shared shapes used across repository interfaces, independent of any one
// domain.

export interface PaginatedResult<T> {
  items: T[];
  hasMore: boolean;
}
