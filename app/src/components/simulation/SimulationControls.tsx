interface Props {
  isRunning: boolean;
}

export function SimulationStatus({ isRunning }: Props) {
  if (!isRunning) return null;
  return <div className="simulation-status">Simulating…</div>;
}
