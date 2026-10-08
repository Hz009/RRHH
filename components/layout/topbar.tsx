interface TopbarProps {
  title: string;
  subtitle?: string;
}

export function Topbar({ title, subtitle }: TopbarProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-lm-dark-teal/10 bg-white/75 px-8 py-5 backdrop-blur-md">
      <h2 className="text-2xl font-semibold tracking-tight text-lm-dark-teal">{title}</h2>
      {subtitle ? <p className="mt-1 text-sm text-zinc-500">{subtitle}</p> : null}
    </header>
  );
}
