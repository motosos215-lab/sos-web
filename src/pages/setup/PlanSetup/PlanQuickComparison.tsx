import type { MotoSosPlan } from "../../../types/plan";
import { PlanStatusBadge } from "./PlanStatusBadge";

interface PlanQuickComparisonProps {
  plans: MotoSosPlan[];
  currentPlanId: MotoSosPlan["id"];
}

function formatLimit(value: number | null) {
  return value === null ? "Según licencia" : String(value);
}

export function PlanQuickComparison({ plans, currentPlanId }: PlanQuickComparisonProps) {
  return (
    <section className="plan-compare" aria-labelledby="plan-compare-title">
      <h2 id="plan-compare-title">Comparación rápida</h2>
      <div className="plan-compare__scroll">
        <table className="plan-compare__table">
          <thead>
            <tr>
              <th scope="col">Plan</th>
              <th scope="col">Contactos</th>
              <th scope="col">Vehículos</th>
              <th scope="col">Conductores</th>
              <th scope="col">Estado</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((plan) => (
              <tr key={plan.id}>
                <th scope="row">
                  {plan.name}
                  {plan.id === currentPlanId ? <span className="plan-compare__current">Activo</span> : null}
                </th>
                <td>{formatLimit(plan.contactLimit)}</td>
                <td>{formatLimit(plan.vehicleLimit)}</td>
                <td>{formatLimit(plan.driverLimit)}</td>
                <td>
                  <PlanStatusBadge status={plan.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
