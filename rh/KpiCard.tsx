type KpiCardProps = {
  label: string;
  value: string | number;
  cardClassName?: string;
  labelClassName?: string;
  valueClassName?: string;
};

export default function KpiCard({
  label,
  value,
  cardClassName = 'bg-white border border-gray-200 rounded-lg p-3',
  labelClassName = 'text-xs text-gray-600',
  valueClassName = 'text-xl font-semibold text-gray-900'
}: KpiCardProps) {
  return (
    <div className={cardClassName}>
      <p className={labelClassName}>{label}</p>
      <p className={valueClassName}>{value}</p>
    </div>
  );
}
