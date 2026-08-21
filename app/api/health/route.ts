/** Liveness probe for Docker and reverse proxies. Deliberately reveals nothing else. */
export function GET() {
  return Response.json({ status: "ok" });
}
