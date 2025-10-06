import { useState } from 'react';

interface TimePickerProps {
  value?: string; // Format: "HH:MM" (24-hour)
  onChange: (time: string) => void;
  onRemove?: () => void;
  label?: string;
  disabled?: boolean;
}

export function TimePicker({
  value,
  onChange,
  onRemove,
  label,
  disabled = false,
}: TimePickerProps) {
  const [time, setTime] = useState(value || '');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value;
    setTime(newTime);
    onChange(newTime);
  };

  const handleClear = () => {
    setTime('');
    if (onRemove) {
      onRemove();
    } else {
      onChange('');
    }
  };

  return (
    <div className="flex items-center gap-2">
      {label && (
        <label className="text-xs text-gray-600 whitespace-nowrap">
          {label}
        </label>
      )}
      <div className="flex items-center gap-1">
        <input
          type="time"
          value={time}
          onChange={handleChange}
          disabled={disabled}
          className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        {time && !disabled && (
          <button
            onClick={handleClear}
            className="text-gray-400 hover:text-gray-600 p-1"
            title="Clear time"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

interface TimeRangePickerProps {
  startTime?: string;
  endTime?: string;
  onStartTimeChange: (time: string) => void;
  onEndTimeChange: (time: string) => void;
  disabled?: boolean;
}

export function TimeRangePicker({
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
  disabled = false,
}: TimeRangePickerProps) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <TimePicker
        value={startTime}
        onChange={onStartTimeChange}
        label="Start:"
        disabled={disabled}
      />
      <span className="text-gray-400">—</span>
      <TimePicker
        value={endTime}
        onChange={onEndTimeChange}
        label="End:"
        disabled={disabled}
      />
    </div>
  );
}
