import Link from "next/link";

export function AdminNav() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-6 px-4">
        <Link href="/admin/games" className="text-sm font-semibold text-slate-900">
          QR Hunt Admin
        </Link>
        <nav className="flex items-center gap-4 text-sm text-slate-600">
          <Link href="/admin/games" className="hover:text-slate-900">
            Games
          </Link>
          <Link href="/admin/users" className="hover:text-slate-900">
            Users
          </Link>
        </nav>
        <Link href="/" className="ml-auto text-xs text-slate-500 hover:text-slate-900">
          Back to site
        </Link>
      </div>
    </header>
  );
}
