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
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
      <div className="flex flex-1 items-center rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5 focus-within:ring-2 focus-within:ring-primary-300 sm:px-4">
        <input
          type="date"
          value={startDate}
          onChange={(e) => onStartChange(e.target.value)}
          aria-label="出发日期"
          className="min-w-0 flex-1 bg-transparent text-sm text-gray-700 focus:outline-none"
        />
        <span className="mx-2 text-gray-300 sm:mx-3" aria-hidden="true">~</span>
        <input
          type="date"
          value={endDate}
          min={startDate}
          onChange={(e) => onEndChange(e.target.value)}
          aria-label="返程日期"
          className="min-w-0 flex-1 bg-transparent text-sm text-gray-700 focus:outline-none"
        />
      </div>
      <div className="flex shrink-0 items-center justify-center rounded-xl border border-gray-100 bg-gray-50 px-4 py-2.5 sm:w-24">
        <span className="whitespace-nowrap text-sm text-gray-700">{days ? `${days} 天` : '- 天'}</span>
      </div>
    </div>
  );
}
