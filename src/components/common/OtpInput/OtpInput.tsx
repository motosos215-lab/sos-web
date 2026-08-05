import { ClipboardEvent, KeyboardEvent, useRef } from "react";
import "./OtpInput.css";

interface OtpInputProps {
  error?: string;
  id: string;
  label: string;
  length?: number;
  onChange: (value: string) => void;
  value: string;
}

export function OtpInput({ error, id, label, length = 6, onChange, value }: OtpInputProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const errorId = error ? `${id}-error` : undefined;
  const hintId = `${id}-hint`;
  const digits = Array.from({ length }, (_, index) => value[index] ?? "");

  const focusInput = (index: number) => {
    inputRefs.current[index]?.focus();
    inputRefs.current[index]?.select();
  };

  const updateDigit = (index: number, nextValue: string) => {
    const digit = nextValue.replace(/\D/g, "").slice(-1);

    if (!digit) {
      const nextDigits = [...digits];
      nextDigits[index] = "";
      onChange(nextDigits.join(""));
      return;
    }

    const nextDigits = [...digits];
    nextDigits[index] = digit;
    onChange(nextDigits.join(""));

    if (index < length - 1) {
      focusInput(index + 1);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      event.preventDefault();
      focusInput(index - 1);
      return;
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      focusInput(index - 1);
      return;
    }

    if (event.key === "ArrowRight" && index < length - 1) {
      event.preventDefault();
      focusInput(index + 1);
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pastedCode = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);

    if (!pastedCode) {
      return;
    }

    event.preventDefault();
    onChange(pastedCode);
    focusInput(Math.min(pastedCode.length, length) - 1);
  };

  return (
    <div className="otp-input">
      <label className="otp-input__label" id={`${id}-label`}>
        {label}
      </label>
      <p className="otp-input__hint" id={hintId}>
        Escribe los seis números del código recibido.
      </p>
      <div
        aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
        aria-invalid={Boolean(error)}
        aria-labelledby={`${id}-label`}
        className="otp-input__group"
        role="group"
      >
        {digits.map((digit, index) => (
          <input
            aria-label={`Dígito ${index + 1} del código`}
            autoComplete={index === 0 ? "one-time-code" : "off"}
            className="otp-input__control"
            id={`${id}-${index}`}
            inputMode="numeric"
            key={`${id}-${index}`}
            maxLength={1}
            onChange={(event) => updateDigit(index, event.target.value)}
            onFocus={(event) => event.target.select()}
            onKeyDown={(event) => handleKeyDown(event, index)}
            onPaste={handlePaste}
            pattern="[0-9]*"
            ref={(element) => {
              inputRefs.current[index] = element;
            }}
            type="text"
            value={digit}
          />
        ))}
      </div>
      {error ? (
        <p className="otp-input__error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
