import { NextResponse } from "next/server";

// Placeholder middleware — Auth.js integration in Phase B
export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: ["/(app)/:path*"],
};
