import Image from "next/image";

export function ProviderLogo({
  slug,
  name,
  size = 32,
  className = "",
}: {
  slug: string;
  name: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-white ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src={`/providers/${slug}.png`}
        alt={`${name} logo`}
        width={size}
        height={size}
        className="h-full w-full object-contain"
      />
    </span>
  );
}
