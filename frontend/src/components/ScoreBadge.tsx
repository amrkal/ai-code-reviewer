import React from 'react';

interface ScoreBadgeProps {
  score: number;
  label?: string;
}

const getColor = (score: number) => {
  if (score >= 8) return 'bg-green-500 text-white';
  if (score >= 5) return 'bg-yellow-400 text-black';
  return 'bg-red-500 text-white';
};

const ScoreBadge: React.FC<ScoreBadgeProps> = ({ score, label }) => {
  const colorClass = getColor(score);
  return (
    <span className={`inline-block px-2 py-1 rounded text-sm font-semibold ${colorClass}`}>
      {label ? `${label}: ` : ''}{score}/10
    </span>
  );
};

export default ScoreBadge;
