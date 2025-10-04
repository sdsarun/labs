/**
 * Builds a plain object containing query string values from the provided URL.
 */
export function parseQuery(url: URL): Record<string, string | string[]> {
  const query: Record<string, string | string[]> = {};

  url.searchParams.forEach((value, key) => {
    const existing = query[key];

    if (existing === undefined) {
      query[key] = value;
      return;
    }

    if (Array.isArray(existing)) {
      existing.push(value);
      return;
    }

    query[key] = [existing, value];
  });

  return query;
}
