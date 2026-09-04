import {
  ScoutsCard,
  ScoutsHeading,
  ScoutsHeader,
  ScoutsLink,
  ScoutsList,
} from "@/components/ui";

import { ContinuePlaying } from "./continue-playing";
import { EnterCodeForm } from "./enter-code-form";

const STEPS = [
  {
    title: "Find a QR Hunt poster",
    detail: "Find a poster somewhere along the route.",
  },
  {
    title: "Scan it with your Camera app",
    detail:
      "Point your phone's normal Camera app at the QR code and tap the link that pops up. On iPhone, use the Camera app itself - not the Control Centre code scanner.",
  },
  {
    title: "Tell us your name and you're in",
    detail:
      "Follow the hints, find the stops in order, and scan each code you discover. Your progress is saved as you go.",
  },
];

export default function Home() {
  return (
    <>
      <ScoutsHeader title="QR Hunt" logo />

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-4 pb-8 pt-6 sm:px-6">
        <header className="space-y-2">
          <ScoutsHeading size="s" as="h2">
            Ready to play?
          </ScoutsHeading>
          <p className="max-w-prose text-base text-scouts-text">
            Follow the route, find the QR codes, and complete the hunt!
          </p>
        </header>

        <ContinuePlaying />

        <ScoutsCard
          title="Get started"
          variant="blue"
        >
          <ScoutsList
            ordered
            spaced
            className="space-y-5"
            items={STEPS.map((step) => (
              <span key={step.title} className="block">
                <strong className="block text-scouts-text">{step.title}</strong>
                <span className="mt-1 block text-base text-scouts-text">{step.detail}</span>
              </span>
            ))}
          />
        </ScoutsCard>

        <ScoutsCard
          title="Got a code instead?"
          description="Enter the game, poster, or rejoin code you have been given."
          variant="orange"
        >
          <EnterCodeForm />
        </ScoutsCard>

        <footer className="mt-auto border-t border-scouts-border-muted pt-4 text-center text-sm text-scouts-text">
          Organising a hunt?{" "}
          <ScoutsLink href="/admin" variant="muted">
            Open the admin area
          </ScoutsLink>
        </footer>
      </main>
    </>
  );
}
