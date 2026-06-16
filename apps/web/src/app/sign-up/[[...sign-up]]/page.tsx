import { SignUp } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { env } from "@/shared/config/env";
import { appShell } from "@/shared/theme/app-theme";

export default function SignUpPage() {
  if (!env.isClerkEnabled) {
    redirect("/profile");
  }

  return (
    <main className={appShell.authPage}>
      <SignUp />
    </main>
  );
}
