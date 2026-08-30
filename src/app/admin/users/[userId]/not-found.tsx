import Link from "next/link";

export default function UserNotFound() {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 px-6 py-12 text-center">
      <h1 className="text-lg font-semibold text-slate-900">User not found</h1>
      <p className="mt-1 text-sm text-slate-500">The account may have been deleted.</p>
      <Link href="/admin/users" className="mt-4 inline-block text-sm font-medium underline">
        Back to users
      </Link>
    </div>
  );
}
