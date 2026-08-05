export function DashboardSkeleton() {
  return (
    <section className="dashboard-skeleton" aria-busy="true" aria-label="Cargando dashboard" aria-live="polite">
      <p>Cargando dashboard...</p>
      <div aria-hidden="true" className="dashboard-skeleton__grid">
        <span />
        <span />
        <span />
        <span />
      </div>
      <div aria-hidden="true" className="dashboard-skeleton__map" />
    </section>
  );
}
