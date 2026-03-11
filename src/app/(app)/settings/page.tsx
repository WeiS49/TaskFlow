import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserTimezone } from "@/lib/auth-utils";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tz = await getUserTimezone(session.user.id);
  return <SettingsClient currentTimezone={tz} />;
}
