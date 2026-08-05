import type { ReactNode } from "react";
import "./FormSection.css";

interface FormSectionProps {
  children: ReactNode;
  description?: string;
  title: string;
}

export function FormSection({ children, description, title }: FormSectionProps) {
  return (
    <section className="form-section" aria-labelledby={`${title.replace(/\s+/g, "-").toLowerCase()}-title`}>
      <div className="form-section__heading">
        <h2 id={`${title.replace(/\s+/g, "-").toLowerCase()}-title`}>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
