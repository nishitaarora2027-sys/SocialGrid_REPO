import { getTranslations } from "next-intl/server";
import { requireExpert } from "@/lib/auth/session";
import { CreateClientForm } from "@/components/expert/create-client-form";

export default async function NewClientPage() {
  await requireExpert();
  const t = await getTranslations("expert.createClient");
  return (
    <main className="mx-auto max-w-xl space-y-5 p-4 lg:p-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>
      <CreateClientForm />
    </main>
  );
}
