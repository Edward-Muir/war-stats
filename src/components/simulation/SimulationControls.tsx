interface Props {
  isRunning: boolean;
}

export function SimulationStatus({ isRunning }: Props) {
  if (!isRunning) return null;
  return <div className="py-4 text-center text-sm text-muted-foreground animate-pulse">Simulating…</div>;
}
