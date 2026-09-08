"use client";

import { usePathname } from "next/navigation";

import { HeaderBar } from "@/components/ui/header";
import { ScoutsNavigation } from "@/components/ui/navigation";

const sections = [
  { segment: "dashboard", label: "Dashboard" },
  { segment: "edit", label: "Edit" },
  { segment: "badges", label: "Badges" },
];

export function AdminGameNav({ gameId }: { gameId: string }) {
  const pathname = usePathname();
  const basePath = `/admin/games/${encodeURIComponent(gameId)}`;

  return (
    <HeaderBar level={2}>
      <ScoutsNavigation
        label="Game navigation"
        items={sections.map(({ segment, label }) => {
          const href = `${basePath}/${segment}`;

          return {
            href,
            label,
            current: pathname === href || pathname.startsWith(`${href}/`),
          };
        })}
      />
    </HeaderBar>
  );
}
