'use client';
import { useState } from 'react';

interface Props {
  country: string;
  size?: number;
  className?: string;
}

const COUNTRY_BG: Record<string, string> = {
  kr: '#003087', us: '#3C3B6E', jp: '#BC002D',
  cn: '#DE2910', gb: '#012169', de: '#000000',
};

export default function CountryFlag({ country, size = 16, className = '' }: Props) {
  const [failed, setFailed] = useState(false);
  const code = country.toLowerCase();
  const bg = COUNTRY_BG[code] ?? '#475569';

  return (
    <div
      className={`inline-flex items-center justify-center rounded-full overflow-hidden flex-shrink-0 ${className}`}
      style={{ width: size, height: size, backgroundColor: bg }}
    >
      {!failed ? (
        <img
          src={`https://hatscripts.github.io/circle-flags/flags/${code}.svg`}
          alt={code.toUpperCase()}
          width={size}
          height={size}
          className="w-full h-full"
          onError={() => setFailed(true)}
        />
      ) : (
        <span
          className="font-bold uppercase text-th-text leading-none select-none"
          style={{ fontSize: Math.round(size * 0.38) }}
        >
          {code.slice(0, 2)}
        </span>
      )}
    </div>
  );
}
