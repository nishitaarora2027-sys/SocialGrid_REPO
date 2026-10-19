import { getTranslations } from "next-intl/server";
import { requireExpert } from "@/lib/auth/session";
import { CreateClientForm } from "@/components/expert/create-client-form";

export default async function NewClientPage() {
  await requireExpert();
  const t = await getTranslations("expert.createClient");
  return (
    <main className="mx-auto max-w-xl space-y-6 px-4 py-6 lg:px-8 lg:py-8">
      <div>
        <h1 className="display text-[34px] leading-tight font-bold lg:text-[40px]">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>
      <CreateClientForm />
    </main>
  );
}
