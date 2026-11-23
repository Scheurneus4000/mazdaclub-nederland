/** Kleine helper voor client-formulieren die JSON posten naar onze API-routes. */
export type PostResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; fields?: Record<string, string>; status: number };

export async function postJson<T = unknown>(url: string, body: unknown): Promise<PostResult<T>> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as T & { error?: string; fields?: Record<string, string> };
    if (!res.ok) {
      return { ok: false, error: data.error || "Er ging iets mis. Probeer het opnieuw.", fields: data.fields, status: res.status };
    }
    return { ok: true, data };
  } catch {
    return { ok: false, error: "Geen verbinding. Controleer je internet en probeer het opnieuw.", status: 0 };
  }
}
