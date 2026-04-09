interface TopbarProps {
  title: string;
  subtitle?: string;
}

export function Topbar({ title, subtitle }: TopbarProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-lm-aqua/20 bg-white/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-white/90">
      <h2 className="text-xl font-semibold tracking-tight text-lm-dark-teal">{title}</h2>
      {subtitle ? <p className="mt-1 text-sm text-zinc-500">{subtitle}</p> : null}
    </header>
  );
}
