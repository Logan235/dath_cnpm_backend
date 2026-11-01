import { SelectQueryBuilder, ObjectLiteral } from 'typeorm';

export interface Paged<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export function pageParams(q: any): { page: number; pageSize: number; skip: number } {
  const page = Math.max(1, parseInt(q?.page, 10) || 1);
  const pageSize = Math.min(200, Math.max(1, parseInt(q?.pageSize, 10) || 20));
  return { page, pageSize, skip: (page - 1) * pageSize };
}

export async function paginate<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  q: any,
): Promise<Paged<T>> {
  const { page, pageSize, skip } = pageParams(q);
  const [data, total] = await qb.skip(skip).take(pageSize).getManyAndCount();
  return { data, total, page, pageSize };
}

/** Thêm điều kiện tìm kiếm ILIKE trên nhiều cột */
export function applySearch<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  search: string | undefined,
  columns: string[],
): SelectQueryBuilder<T> {
  if (search && search.trim()) {
    const cond = columns.map((c) => `${c} ILIKE :kw`).join(' OR ');
    qb.andWhere(`(${cond})`, { kw: `%${search.trim()}%` });
  }
  return qb;
}

export function toBool(v: any): boolean | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  if (typeof v === 'boolean') return v;
  return ['true', '1', 'yes'].includes(String(v).toLowerCase());
}
