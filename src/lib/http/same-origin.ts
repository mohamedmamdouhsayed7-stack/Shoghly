export function hasSameOrigin(request: Request, configuredAppUrl: string) {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  try {
    const originUrl = new URL(origin);
    const appUrl = new URL(configuredAppUrl);
    return (
      (originUrl.protocol === "http:" || originUrl.protocol === "https:") &&
      originUrl.origin === appUrl.origin
    );
  } catch {
    return false;
  }
}
