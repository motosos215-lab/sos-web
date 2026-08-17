import type { DashboardStatusFilter } from "../../../types/dashboard";

interface DashboardFilterProps {
  disabled: boolean;
  label?: string;
  onChange: (filter: DashboardStatusFilter) => void;
  value: DashboardStatusFilter;
}

const filterOptions: Array<{ label: string; value: DashboardStatusFilter }> = [
  { label: "Todos los estados", value: "all" },
  { label: "Activos", value: "active" },
  { label: "En seguimiento", value: "in_progress" },
  { label: "Resueltos", value: "resolved" },
  { label: "Críticos", value: "critical" },
];

export function DashboardFilter({ disabled, label = "Estado", onChange, value }: DashboardFilterProps) {
  return (
    <label className="dashboard-filter">
      <span>{label}</span>
      <select disabled={disabled} onChange={(event) => onChange(event.target.value as DashboardStatusFilter)} value={value}>
        {filterOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
