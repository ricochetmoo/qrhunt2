"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button, Input } from "@/components/ui";

/**
 * Hands any typed code to the /s/<code> funnel, which resolves game codes,
 * poster stop codes, and team rejoin codes alike.
 */
export function EnterCodeForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = code.trim();

    if (!trimmed) return;
    setBusy(true);
    router.push(`/s/${encodeURIComponent(trimmed)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 sm:gap-3">
      <label htmlFor="enter-code" className="sr-only">
        Game, poster, or rejoin code
      </label>
      <Input
        id="enter-code"
        value={code}
        onChange={(event) => setCode(event.target.value)}
        placeholder="e.g. V6F3TX"
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        maxLength={16}
        className="font-mono tracking-widest"
      />
      <Button type="submit" disabled={busy || !code.trim()}>
        {busy ? "Opening…" : "Submit"}
      </Button>
    </form>
  );
}
