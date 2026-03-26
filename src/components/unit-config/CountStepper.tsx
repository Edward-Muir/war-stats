interface Props {
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}

export function CountStepper({ value, min = 0, max = Infinity, onChange }: Props) {
  return (
    <div className="count-stepper" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className="stepper-btn"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        aria-label="Decrease"
      >
        &minus;
      </button>
      <span className="stepper-value">{value}</span>
      <button
        type="button"
        className="stepper-btn"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        aria-label="Increase"
      >
        +
      </button>
    </div>
  );
}
