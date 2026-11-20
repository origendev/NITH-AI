/**
 * Hexagonal Nith AI logo, shown at its original proportions.
 * Source: public/nith-ai-logo.png
 */
export default function Logo({ size = 34, pulse = false, className = '' }) {
  return (
    <span
      aria-label="Nith AI"
      role="img"
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden ${pulse ? 'animate-soft-pulse' : ''} ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src={`${import.meta.env.BASE_URL}nith-ai-logo.png`}
        alt=""
        draggable={false}
        className="h-full w-full select-none object-contain"
      />
    </span>
  );
}
