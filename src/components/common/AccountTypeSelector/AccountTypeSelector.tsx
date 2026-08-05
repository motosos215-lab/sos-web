import "./AccountTypeSelector.css";

export type AccountType = "conductor" | "monitor";

interface AccountTypeSelectorProps {
  error?: string;
  name: string;
  onChange: (value: AccountType) => void;
  value: AccountType | "";
}

const accountTypes: Array<{
  description: string;
  icon: string;
  label: string;
  value: AccountType;
}> = [
  {
    description: "Gestiona tu seguridad y alertas personales.",
    icon: "C",
    label: "Conductor",
    value: "conductor",
  },
  {
    description: "Acompaña y supervisa a motociclistas asignados.",
    icon: "M",
    label: "Monitor",
    value: "monitor",
  },
];

export function AccountTypeSelector({ error, name, onChange, value }: AccountTypeSelectorProps) {
  const errorId = error ? `${name}-error` : undefined;

  return (
    <fieldset
      aria-describedby={errorId}
      aria-invalid={Boolean(error)}
      className="account-type"
    >
      <legend className="account-type__legend">Tipo de cuenta</legend>
      <div className="account-type__options">
        {accountTypes.map((type) => (
          <label className="account-type__option" key={type.value}>
            <input
              checked={value === type.value}
              className="account-type__radio"
              name={name}
              onChange={() => onChange(type.value)}
              type="radio"
              value={type.value}
            />
            <span className="account-type__card">
              <span className="account-type__icon" aria-hidden="true">
                {type.icon}
              </span>
              <span>
                <span className="account-type__label">{type.label}</span>
                <span className="account-type__description">{type.description}</span>
              </span>
            </span>
          </label>
        ))}
      </div>
      {error ? (
        <p className="account-type__error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
