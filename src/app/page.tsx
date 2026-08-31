import Link from "next/link";

import { ContinuePlaying } from "./continue-playing";
import { EnterCodeForm } from "./enter-code-form";

const STEPS = [
  {
    title: "Find a QR Hunt poster",
    detail: "Head to the start location — your leader will point you at the first poster.",
  },
  {
    title: "Scan it with your Camera app",
    detail:
      "Point your phone's normal Camera app at the QR code and tap the link that pops up. On iPhone, use the Camera app itself — not the Control Centre code scanner, which forgets who you are.",
  },
  {
    title: "Tell us your name and you're in",
    detail:
      "Follow the hints, find the stops in order, and scan each code you discover. Your progress is saved as you go.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-4 py-10">
      <header className="space-y-2 text-center">
        <p className="text-4xl" aria-hidden>
          🔍
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">QR Hunt</h1>
        <p className="text-sm text-slate-600">
          A treasure trail of QR codes: scan your way from clue to clue and race — or explore — to
          the end.
        </p>
      </header>

      <ContinuePlaying />

      <section aria-labelledby="get-started" className="space-y-4">
        <h2 id="get-started" className="text-lg font-semibold text-slate-900">
          Get started
        </h2>
        <ol className="space-y-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                {index + 1}
              </span>
              <span>
                <span className="block text-sm font-medium text-slate-900">{step.title}</span>
                <span className="mt-0.5 block text-sm text-slate-600">{step.detail}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="have-code" className="space-y-3">
        <h2 id="have-code" className="text-lg font-semibold text-slate-900">
          Got a code instead?
        </h2>
        <p className="text-sm text-slate-600">
          Enter the game code from your leader, the code printed on any poster, or your rejoin code
          if you&apos;ve switched phones.
        </p>
        <EnterCodeForm />
      </section>

      <footer className="mt-auto border-t border-slate-200 pt-4 text-center text-xs text-slate-500">
        Organising a hunt?{" "}
        <Link href="/admin" className="underline hover:text-slate-900">
          Open the admin area
        </Link>
      </footer>
    </main>
  );
}
