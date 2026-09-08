import { AdminGameNav } from "@/components/admin/admin-game-nav";

export default async function AdminGameLayout({
  children,
  params,
}: LayoutProps<"/admin/games/[gameId]">) {
  const { gameId } = await params;

  return (
    <div className="space-y-6">
      <AdminGameNav gameId={gameId} />
      {children}
    </div>
  );
}
