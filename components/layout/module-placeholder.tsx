import { Topbar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";

interface ModulePlaceholderProps {
  title: string;
  subtitle: string;
  phase: string;
}

export function ModulePlaceholder({ title, subtitle, phase }: ModulePlaceholderProps) {
  return (
    <div>
      <Topbar title={title} subtitle={subtitle} />
      <div className="p-6">
        <Card title="Estado del modulo">
          <p className="text-sm text-zinc-600">
            Este modulo queda preparado para implementacion detallada en {phase}. La estructura de base de datos y la
            navegacion ya estan creadas para continuar por fases.
          </p>
        </Card>
      </div>
    </div>
  );
}
