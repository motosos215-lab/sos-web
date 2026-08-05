import type { VehicleType } from "../../../types/vehicle";

interface VehicleTypeSelectorProps {
  error?: string;
  onChange: (value: VehicleType) => void;
  value: VehicleType | "";
}

const vehicleTypeOptions: Array<{ label: string; description: string; value: VehicleType; icon: string }> = [
  {
    label: "Motocicleta",
    description: "Para motos urbanas, deportivas, touring o de trabajo.",
    value: "motocicleta",
    icon: "MT",
  },
  {
    label: "Motoneta",
    description: "Para scooters y motonetas de uso cotidiano.",
    value: "motoneta",
    icon: "SC",
  },
];

export function VehicleTypeSelector({ error, onChange, value }: VehicleTypeSelectorProps) {
  const errorId = error ? "vehicleType-error" : undefined;

  return (
    <fieldset
      aria-describedby={errorId}
      aria-invalid={Boolean(error)}
      className="vehicle-type-selector"
    >
      <legend>Tipo de vehículo</legend>
      <div className="vehicle-type-selector__options">
        {vehicleTypeOptions.map((option) => {
          const isSelected = value === option.value;

          return (
            <label
              className={`vehicle-type-selector__option ${isSelected ? "vehicle-type-selector__option--selected" : ""}`.trim()}
              key={option.value}
            >
              <input
                checked={isSelected}
                data-field="vehicleType"
                name="vehicleType"
                onChange={() => onChange(option.value)}
                type="radio"
                value={option.value}
              />
              <span className="vehicle-type-selector__icon" aria-hidden="true">
                {option.icon}
              </span>
              <span className="vehicle-type-selector__content">
                <strong>{option.label}</strong>
                <small>{option.description}</small>
                <span className="vehicle-type-selector__state">
                  {isSelected ? "Seleccionado" : "No seleccionado"}
                </span>
              </span>
            </label>
          );
        })}
      </div>
      {error ? (
        <p className="vehicle-type-selector__error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
