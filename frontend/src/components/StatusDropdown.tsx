import { DETAILED_STATUS_OPTIONS } from "../lib/constants";
import type { DetailedStatus } from "../lib/types";

interface Props {
  value: DetailedStatus;
  onChange: (value: DetailedStatus) => void;
  disabled?: boolean;
}

export default function StatusDropdown({ value, onChange, disabled }: Props) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as DetailedStatus)}
      disabled={disabled}
      className="block w-full text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:text-gray-500"
    >
      {DETAILED_STATUS_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
