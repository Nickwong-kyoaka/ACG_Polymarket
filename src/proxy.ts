import { NextResponse, type NextRequest } from "next/server";

const localeCookieName = "acg-locale";

export function proxy(request: NextRequest) {
  const pathLocale = request.nextUrl.pathname.match(/^\/(en|zh-Hant)(?:\/|$)/)?.[1];
  const legacyLocale = request.nextUrl.searchParams.get("lang");
  const locale = pathLocale ?? (legacyLocale === "cn" ? "zh-Hant" : legacyLocale === "en" ? "en" : undefined);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-acg-public-locale", locale ?? "en");
  requestHeaders.set("x-acg-locale", locale === "zh-Hant" ? "cn" : "en");

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  if (locale) {
    response.cookies.set(localeCookieName, locale, {
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
      sameSite: "lax",
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
