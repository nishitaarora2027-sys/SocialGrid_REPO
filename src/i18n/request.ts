import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, resolveLocale } from "./config";

export default getRequestConfig(async () => {
  const store = await cookies();
  const locale = resolveLocale(store.get(LOCALE_COOKIE)?.value);
  return {
    locale,
    timeZone: "Asia/Kolkata",
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
