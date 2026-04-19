// LEARN: Pagination limits how many DB rows we return per request.
// Never return ALL rows — if a user has 10,000 documents, that's huge.
// Offset-based pagination: skip X rows, take Y rows.
// cursor-based is more efficient at scale, but offset is simpler to learn first.

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export const getPagination = (
  pageRaw?: string | number,
  limitRaw?: string | number
): PaginationParams => {
  const page = Math.max(1, parseInt(String(pageRaw ?? 1), 10));
  const limit = Math.min(100, Math.max(1, parseInt(String(limitRaw ?? 20), 10)));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};
