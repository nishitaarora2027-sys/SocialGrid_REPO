import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { Landing } from "@/components/landing/landing";

export const metadata: Metadata = {
  title: "SocialGrid · Instagram posts for your business, made by our team",
  description:
    "Tell us what you need in chat or by voice, in Hindi or English. Our team makes your Instagram posts and tells you when each one is ready.",
};

/** Signed-in people go straight to their app; everyone else sees the landing page */
export default async function Home() {
  const session = await getSession();
  if (session) redirect(session.isExpert ? "/expert" : "/chat");
  return <Landing />;
}
