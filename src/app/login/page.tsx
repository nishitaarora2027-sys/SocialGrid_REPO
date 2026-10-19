import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { AuthShell } from "@/components/shared/auth-shell";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect(session.isExpert ? "/expert" : "/chat");
  return (
    <AuthShell>
      <LoginForm />
    </AuthShell>
  );
}
