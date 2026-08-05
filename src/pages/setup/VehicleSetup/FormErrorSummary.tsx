interface FormErrorSummaryProps {
  errors: Partial<Record<string, string>>;
  labels: Partial<Record<string, string>>;
}

export function FormErrorSummary({ errors, labels }: FormErrorSummaryProps) {
  const entries = Object.entries(errors).filter((entry): entry is [string, string] => Boolean(entry[1]));

  if (entries.length === 0) {
    return null;
  }

  const focusField = (field: string) => {
    const element = document.querySelector<HTMLElement>(`[data-field="${field}"]`);
    element?.focus();
    element?.scrollIntoView({ block: "center", behavior: "smooth" });
  };

  return (
    <section className="vehicle-error-summary" aria-labelledby="vehicle-error-summary-title" role="alert">
      <h2 id="vehicle-error-summary-title">Revisa los campos marcados</h2>
      <ul>
        {entries.map(([field, message]) => (
          <li key={field}>
            <button onClick={() => focusField(field)} type="button">
              {labels[field] ?? field}: {message}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
