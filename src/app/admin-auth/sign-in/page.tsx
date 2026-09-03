"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import {
  Button,
  Card,
  CardBody,
  ErrorMessage,
  Field,
  Input,
  ScoutsHeading,
  ScoutsLogo,
} from "@/components/ui";
import { adminSignIn } from "@/lib/admin-auth-client";

export default function AdminSignInPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    try {
      const result = await adminSignIn.email({
        email,
        password,
        callbackURL: "/admin/games",
      });

      if (result.error) {
        setError(result.error.message ?? "We could not sign you in. Check your details and try again.");
        return;
      }

      router.replace("/admin/games");
      router.refresh();
    } catch {
      setError("We could not sign you in. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 py-10" aria-labelledby="admin-sign-in-title">
      <header className="space-y-4 text-center">
        <ScoutsLogo showWordmark className="justify-center" />
        <div className="space-y-2">
          <ScoutsHeading id="admin-sign-in-title" as="h1" size="m">
            Admin sign in
          </ScoutsHeading>
          <p className="text-scouts-grey-dark">
            Sign in to create and manage QR Hunt games.
          </p>
        </div>
      </header>

      <Card>
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-5">
            <ErrorMessage message={error} />

            <Field label="Email address" htmlFor="admin-email" required>
              <Input
                id="admin-email"
                name="email"
                type="email"
                autoComplete="username"
                required
                autoFocus
              />
            </Field>

            <Field label="Password" htmlFor="admin-password" required>
              <Input
                id="admin-password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </Field>

            <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </CardBody>
      </Card>
    </section>
  );
}
