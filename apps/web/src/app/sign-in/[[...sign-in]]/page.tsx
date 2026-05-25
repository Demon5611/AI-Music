import { SignIn } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { env } from "@/shared/config/env";
import styles from "@/shared/ui/auth-page.module.css";

export default function SignInPage() {
  if (!env.isClerkEnabled) {
    redirect("/profile");
  }

  return (
    <main className={styles.page}>
      <SignIn />
    </main>
  );
}
