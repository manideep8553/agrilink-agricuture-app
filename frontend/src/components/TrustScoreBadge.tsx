import { FiShield } from 'react-icons/fi';

interface Props {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export default function TrustScoreBadge({ score, size = 'sm', showLabel = true }: Props) {
  const getColor = () => {
    if (score >= 80) return 'text-green-600 bg-green-100 border-green-200';
    if (score >= 60) return 'text-amber-600 bg-amber-100 border-amber-200';
    if (score >= 40) return 'text-orange-600 bg-orange-100 border-orange-200';
    return 'text-red-600 bg-red-100 border-red-200';
  };

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-1',
    lg: 'text-sm px-3 py-1.5',
  };

  return (
    <div className={`inline-flex items-center space-x-1 rounded-full border ${getColor()} ${sizeClasses[size]} font-medium`}>
      <FiShield size={size === 'sm' ? 10 : size === 'md' ? 12 : 14} />
      {showLabel && <span>{score}</span>}
    </div>
  );
}
