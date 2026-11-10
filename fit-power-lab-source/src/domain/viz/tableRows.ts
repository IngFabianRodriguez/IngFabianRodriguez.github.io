/**
 * At most `max` rows of a long series, evenly spaced and always including the first and the last,
 * so a table of what a chart plots stays readable.
 */
export function pickRows<T>(rows: T[], max: number): { rows: T[]; total: number } {
  const total = rows.length;
  if (total <= max) return { rows: [...rows], total };
  if (max <= 1) return { rows: rows.slice(0, 1), total };

  const picked: T[] = [];
  for (let i = 0; i < max; i++) {
    const row = rows[Math.round((i * (total - 1)) / (max - 1))];
    if (row !== undefined) picked.push(row);
  }
  return { rows: picked, total };
}
