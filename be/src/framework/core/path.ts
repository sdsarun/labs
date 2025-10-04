/**
 * Splits a URL path into sanitized path segments without leading/trailing slashes.
 */
export function splitPath(path: string): string[] {
  if (!path || path === "/") return [];
  return path
    .split("/")
    .filter(Boolean)
    .map((segment) => segment.trim());
}

/**
 * Checks whether request segments match the given route pattern and collects params.
 */
export function matchRoute(
  routeSegments: string[],
  requestSegments: string[]
): { params: Record<string, string> } | null {
  if (routeSegments.length !== requestSegments.length) {
    return null;
  }

  const params: Record<string, string> = {};

  for (let i = 0; i < routeSegments.length; i += 1) {
    const expected = routeSegments[i];
    const actual = requestSegments[i];

    if (expected.startsWith(":")) {
      params[expected.slice(1)] = decodeURIComponent(actual);
      continue;
    }

    if (expected !== actual) {
      return null;
    }
  }

  return { params };
}

/**
 * Determines if a middleware path prefix applies to the current request path.
 */
export function matchPrefix(
  middlewareSegments: string[],
  requestSegments: string[]
): boolean {
  if (middlewareSegments.length === 0) {
    return true;
  }

  if (middlewareSegments.length > requestSegments.length) {
    return false;
  }

  for (let i = 0; i < middlewareSegments.length; i += 1) {
    if (middlewareSegments[i] !== requestSegments[i]) {
      return false;
    }
  }

  return true;
}
