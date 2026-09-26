/** Keep looping VFX at a fixed size so expired shots refresh instead of stacking. */
export function pushCapped<T>(prev: T[], item: T, max: number): T[] {
  if (max <= 0) return [];
  if (prev.length < max) return [...prev, item];
  const next = prev.slice(prev.length - max + 1);
  next.push(item);
  return next;
}

export function pushManyCapped<T>(prev: T[], items: T[], max: number): T[] {
  if (items.length === 0) return prev;
  const next = prev.concat(items);
  return next.length > max ? next.slice(next.length - max) : next;
}
