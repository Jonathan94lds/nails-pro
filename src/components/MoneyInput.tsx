'use client';

import React from 'react';

interface MoneyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: number | string;
  onChange: (val: number) => void;
}

export default function MoneyInput({ value, onChange, className = '', ...props }: MoneyInputProps) {
  const formatNumber = (num: number | string) => {
    if (!num && num !== 0) return '';
    const cleanNum = String(num).replace(/\D/g, '');
    if (!cleanNum) return '';
    return Number(cleanNum).toLocaleString('es-CO');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    const numericValue = rawValue === '' ? 0 : Number(rawValue);
    onChange(numericValue);
  };

  return (
    <div className="relative rounded-2xl shadow-sm w-full">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 z-10">
        <span className="text-[#1F1B18] font-medium text-sm">$</span>
      </div>
      <input
        type="text"
        value={formatNumber(value)}
        onChange={handleChange}
        {...props}
        className={`w-full bg-[#FAF8F5] border border-[#EFEAE2] rounded-2xl py-4 pr-4 pl-10 text-[#1F1B18] placeholder:text-[#B4AC9E] focus:outline-none focus:ring-2 focus:ring-[#B08D57]/40 focus:border-[#B08D57] ${className}`.trim()}
      />
    </div>
  );
}
