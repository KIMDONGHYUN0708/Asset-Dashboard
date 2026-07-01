interface Props {
  country: string; // ISO 2자리 (kr, us, jp …)
  size?: number;
  className?: string;
}

export default function CountryFlag({ country, size = 16, className = '' }: Props) {
  const code = country.toLowerCase();
  return (
    <img
      src={`https://hatscripts.github.io/circle-flags/flags/${code}.svg`}
      alt={code.toUpperCase()}
      width={size}
      height={size}
      className={`inline-block rounded-full flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
