import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn, auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const session = await auth();
  if (session?.user) {
    redirect("/");
  }

  const params = await searchParams;
  const callbackUrl = params.callbackUrl ?? "/";
  const error = params.error;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-primary px-4">
      <div className="mb-8 text-center text-white">
        <p className="text-kofc-gold text-sm font-medium tracking-widest uppercase">
          Knights of Columbus
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-white">
          Council 10325
        </h1>
        <p className="mt-1 text-white/80">Financial Secretary Companion</p>
      </div>

      <Card className="w-full max-w-md shadow-xl">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>
            Private officer app. Access is limited to allowlisted accounts.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error === "AccessDenied"
                ? "Your account is not on the allowlist for this app."
                : "Sign-in failed. Check credentials and AUTH_ALLOWLIST."}
            </p>
          ) : null}

          <form
            action={async () => {
              "use server";
              try {
                await signIn("google", { redirectTo: callbackUrl });
              } catch (e) {
                if (e instanceof AuthError) {
                  redirect(`/login?error=${e.type}`);
                }
                throw e;
              }
            }}
          >
            <Button type="submit" className="w-full" size="lg">
              Continue with Google
            </Button>
          </form>

          <p className="text-muted-foreground text-center text-xs leading-relaxed">
            Member data is confidential. Do not share login access. Official
            ledgers remain at Officers Online (kofc.org).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
