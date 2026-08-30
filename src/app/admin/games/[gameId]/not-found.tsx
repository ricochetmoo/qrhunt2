import Link from "next/link";

export default function GameNotFound() {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 px-6 py-12 text-center">
      <h1 className="text-lg font-semibold text-slate-900">Game not found</h1>
      <p className="mt-1 text-sm text-slate-500">It may have been deleted.</p>
      <Link href="/admin/games" className="mt-4 inline-block text-sm font-medium underline">
        Back to games
      </Link>
    </div>
  );
}
