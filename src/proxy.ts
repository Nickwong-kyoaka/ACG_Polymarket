import { NextResponse, type NextRequest } from "next/server";
import { normalizeLocale } from "@/lib/i18n";

const localeCookieName = "acg_locale";

export function proxy(request: NextRequest) {
  const urlLocale = request.nextUrl.searchParams.get("lang");
  const cookieLocale = request.cookies.get(localeCookieName)?.value;
  const locale = normalizeLocale(urlLocale ?? cookieLocale);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-acg-locale", locale);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  if (urlLocale === "en" || urlLocale === "cn") {
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
