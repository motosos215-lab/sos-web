interface DashboardEmptyStateProps {
  message: string;
  onShowAll?: () => void;
  title: string;
}

export function DashboardEmptyState({ message, onShowAll, title }: DashboardEmptyStateProps) {
  return (
    <section className="dashboard-empty" aria-live="polite">
      <div aria-hidden="true">OK</div>
      <h2>{title}</h2>
      <p>{message}</p>
      {onShowAll ? <button onClick={onShowAll} type="button">Mostrar todos</button> : null}
    </section>
  );
}
