import React from 'react';

export default function RadialGauge({ value, label, color = 'blue' }) {
  const radius = 24;
  const strokeWidth = 3.5;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  const colorMap = {
    blue: {
      stroke: 'stroke-blue-500',
      track: 'stroke-blue-950',
      text: 'text-blue-400',
      glow: 'shadow-blue-500/20'
    },
    purple: {
      stroke: 'stroke-purple-500',
      track: 'stroke-purple-950',
      text: 'text-purple-400',
      glow: 'shadow-purple-500/20'
    },
    green: {
      stroke: 'stroke-green-500',
      track: 'stroke-green-950',
      text: 'text-green-400',
      glow: 'shadow-green-500/20'
    },
    cyan: {
      stroke: 'stroke-cyan-500',
      track: 'stroke-cyan-950',
      text: 'text-cyan-400',
      glow: 'shadow-cyan-500/20'
    }
  };

  const colors = colorMap[color] || colorMap.blue;

  return (
    <div className="flex flex-col items-center gap-1.5 font-sans">
      <div className="relative w-[54px] h-[54px] flex items-center justify-center">
        {/* Background track */}
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="27"
            cy="27"
            r={radius}
            className={`${colors.track} fill-none`}
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx="27"
            cy="27"
            r={radius}
            className={`${colors.stroke} fill-none transition-all duration-500 ease-out`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
        {/* Value Text */}
        <span className="absolute text-[11px] font-semibold text-white">
          {value}%
        </span>
      </div>
      <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
}
