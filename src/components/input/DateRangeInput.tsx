interface DateRangeInputProps {
  startDate: string;
  endDate: string;
  onStartChange: (date: string) => void;
  onEndChange: (date: string) => void;
}

export function DateRangeInput({ startDate, endDate, onStartChange, onEndChange }: DateRangeInputProps) {
  const getDayCount = () => {
    if (!startDate || !endDate) return null;
    const diff = Math.ceil(
      (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    return diff > 0 ? diff + 1 : null;
  };

  const days = getDayCount();

  return (
    <div className="flex items-center space-x-3">
      <div className="flex-1 flex items-center bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 focus-within:ring-2 focus-within:ring-primary-300">
        <input
          type="date"
          value={startDate}
          onChange={(e) => onStartChange(e.target.value)}
          aria-label="出发日期"
          className="flex-1 bg-transparent text-gray-700 text-sm focus:outline-none min-w-0"
        />
        <span className="mx-3 text-gray-300" aria-hidden="true">—</span>
        <input
          type="date"
          value={endDate}
          min={startDate}
          onChange={(e) => onEndChange(e.target.value)}
          aria-label="返程日期"
          className="flex-1 bg-transparent text-gray-700 text-sm focus:outline-none min-w-0"
        />
      </div>
      <div className="w-24 bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 flex items-center justify-center shrink-0">
        <span className="text-gray-700 text-sm whitespace-nowrap">{days ? `${days} 天` : '— 天'}</span>
      </div>
    </div>
  );
}
