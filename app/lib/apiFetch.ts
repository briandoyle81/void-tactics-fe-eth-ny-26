export async function apiFetch<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API ${url} failed ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}
