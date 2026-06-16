import { useState } from "react";

interface BudgetSliderProps {
  min?: number;
  max?: number;
  onChange: (range: [number, number]) => void;
  labelId?: string;
}

const TICKS = [1000, 3000, 5000, 8000, 12000];

export function BudgetSlider({ min = 1000, max = 12000, onChange, labelId }: BudgetSliderProps) {
  const [value, setValue] = useState(5000);

  const handleChange = (newVal: number) => {
    setValue(newVal);
    onChange([min, newVal]);
  };

  const percent = ((value - min) / (max - min)) * 100;

  const nearestTick = TICKS.reduce((prev, curr) =>
    Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
  );

  return (
    <div className="pt-2">
      <input
        type="range"
        min={min}
        max={max}
        step={100}
        value={value}
        onChange={(e) => handleChange(Number(e.target.value))}
        aria-labelledby={labelId}
        aria-valuetext={`人均 ¥${value.toLocaleString()}`}
        className="custom-slider"
        style={{
          background: `linear-gradient(to right, var(--color-accent-400) 0%, var(--color-accent-400) ${percent}%, var(--color-sand-100) ${percent}%, var(--color-sand-100) 100%)`,
        }}
      />
      <div className="flex justify-between mt-2">
        {TICKS.map((tick) => (
          <span
            key={tick}
            className={`text-xs ${
              tick === nearestTick ? "text-accent-600 font-bold" : "text-gray-500"
            }`}
          >
            ¥ {tick.toLocaleString()}{tick === 12000 ? "+" : ""}
          </span>
        ))}
      </div>
    </div>
  );
}
