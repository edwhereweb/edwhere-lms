export const PAGE_SIZE = 20;

type SearchParamValue = string | string[] | undefined;

export function getPagination(page: SearchParamValue, pageSize = PAGE_SIZE) {
  const current = Math.max(1, Math.floor(Number(page)) || 1);
  return { page: current, skip: (current - 1) * pageSize, take: pageSize };
}

export function getPageCount(total: number, pageSize = PAGE_SIZE) {
  return Math.max(1, Math.ceil(total / pageSize));
}

export function getParam(value: SearchParamValue) {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? '';
}
