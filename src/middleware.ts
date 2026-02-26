export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: ["/today", "/tasks", "/projects/:path*"],
};
