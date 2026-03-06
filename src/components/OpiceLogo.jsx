export default function OpiceLogo({ light = false }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span
        className="font-syne text-xl font-bold tracking-[-0.06em]"
        style={{ color: light ? '#15262b' : '#fffdf8' }}
      >
        Opice
      </span>
      <span
        className="font-mono text-[11px] uppercase tracking-[0.28em]"
        style={{ color: light ? 'rgba(21,38,43,0.58)' : 'rgba(255,253,248,0.64)' }}
      >
        Blum
      </span>
    </div>
  );
}
