import "./PasswordRequirements.css";

interface PasswordRequirementsProps {
  id: string;
  password: string;
}

const requirements = [
  {
    label: "Mínimo 8 caracteres",
    test: (value: string) => value.length >= 8,
  },
  {
    label: "Una letra mayúscula",
    test: (value: string) => /[A-Z]/.test(value),
  },
  {
    label: "Una letra minúscula",
    test: (value: string) => /[a-z]/.test(value),
  },
  {
    label: "Un número",
    test: (value: string) => /\d/.test(value),
  },
];

export function PasswordRequirements({ id, password }: PasswordRequirementsProps) {
  return (
    <ul className="password-requirements" id={id} aria-label="Requisitos de contraseña">
      {requirements.map((requirement) => {
        const isMet = requirement.test(password);

        return (
          <li
            className={`password-requirements__item ${
              isMet ? "password-requirements__item--met" : ""
            }`.trim()}
            key={requirement.label}
          >
            <span aria-hidden="true">{isMet ? "OK" : "-"}</span>
            {requirement.label}
          </li>
        );
      })}
    </ul>
  );
}
