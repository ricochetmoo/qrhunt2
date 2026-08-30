import { GameForm } from "@/components/admin/game-form";
import { Card, CardBody, PageHeader } from "@/components/ui/card";

export default function NewGamePage() {
  return (
    <div className="max-w-xl">
      <PageHeader title="New game" description="Give the game a name; you can configure the route next." />
      <Card>
        <CardBody>
          <GameForm mode="create" />
        </CardBody>
      </Card>
    </div>
  );
}
