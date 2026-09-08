import { PosterPrintButton } from "@/components/admin/poster-print-button";
import { QrImageExportButton } from "@/components/admin/qr-image-export-button";
import { HeaderBar } from "@/components/ui/header";

export function AdminGameEditNav({ gameId }: { gameId: string }) {
  return (
    <HeaderBar level={3}>
      <nav className="scouts-navigation" aria-label="Game editing navigation">
        <ul className="scouts-navigation__list">
          <li className="scouts-navigation__item">
            <PosterPrintButton gameId={gameId} />
          </li>
          <li className="scouts-navigation__item">
            <QrImageExportButton gameId={gameId} />
          </li>
        </ul>
      </nav>
    </HeaderBar>
  );
}
