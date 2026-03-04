export default function OpiceLogo({ light = false }) {
  return (
    <div className="flex items-baseline gap-1">
      <span
        className="font-syne font-extrabold text-xl tracking-tight"
        style={{ color: light ? '#111111' : '#FFFFFF' }}
      >
        Opice
      </span>
      <span
        className="font-syne font-normal text-sm tracking-widest"
        style={{ color: light ? '#555555' : 'rgba(255,255,255,0.6)' }}
      >
        BLUM
      </span>
    </div>
  );
}
