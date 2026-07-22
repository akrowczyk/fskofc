import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn, auth } from "@/lib/auth";
import { CouncilLogo } from "@/components/council-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-kofc-navy px-4">
      {/* Soft gold glow like council site hero */}
      <div
        className="pointer-events-none absolute inset-0 opacity-100"
        style={{
          background:
            "radial-gradient(1100px 500px at 50% -10%, rgba(247,183,24,0.18), transparent 60%), linear-gradient(160deg, #112866 0%, #0b1c4a 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute right-0 bottom-0 left-0 h-[5px]"
        style={{
          background: "linear-gradient(90deg, #F7B718, #CB0E0E, #F7B718)",
        }}
      />

      <div className="relative z-10 mb-8 flex flex-col items-center text-center text-white">
        <CouncilLogo size={96} priority className="mb-5 drop-shadow-lg" />
        <p className="text-kofc-gold text-sm font-bold tracking-[0.14em] uppercase">
          Knights of Columbus
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-white">
          Council #10325
        </h1>
        <p className="mt-1 text-base font-medium text-white/90">
          Holy Ghost Parish · Wood Dale, Illinois
        </p>
        <p className="mt-2 text-sm text-white/75">
          Financial Secretary Companion
        </p>
      </div>

      <Card className="relative z-10 w-full max-w-md border-white/10 shadow-xl">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>
            Private officer app for the Financial Secretary. Use the email and
            password set in your environment.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error === "CredentialsSignin"
                ? "Invalid email or password."
                : "Sign-in failed. Check AUTH_USER_EMAIL and AUTH_USER_PASSWORD."}
            </p>
          ) : null}

          <form
            className="flex flex-col gap-4"
            action={async (formData) => {
              "use server";
              const email = String(formData.get("email") ?? "");
              const password = String(formData.get("password") ?? "");
              try {
                await signIn("credentials", {
                  email,
                  password,
                  redirectTo: callbackUrl,
                });
              } catch (e) {
                if (e instanceof AuthError) {
                  redirect(`/login?error=${e.type}`);
                }
                throw e;
              }
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                required
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </div>
            <Button type="submit" className="w-full" size="lg">
              Sign in
            </Button>
          </form>

          <p className="text-muted-foreground text-center text-xs leading-relaxed">
            Member data is confidential. Official ledgers remain at Officers
            Online (kofc.org). Emblem used only inside this private app.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
