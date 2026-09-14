/**
 * ThemeBackground
 *
 * Decorative background shapes matching the public marketing site's warm
 * gradient look (orange / blue / red geometric blocks). Drop this once
 * near the top of any page's JSX — it's `fixed` and covers the whole
 * viewport regardless of where in the tree it's rendered, so page layout
 * doesn't need to change to accommodate it.
 *
 * It's non-interactive (pointer-events-none) and sits behind everything
 * (-z-10), so it never interferes with clicks, forms, or tables.
 *
 * Usage:
 *   import ThemeBackground from '../components/ThemeBackground';
 *   ...
 *   return (
 *     <div className="min-h-screen flex relative">
 *       <ThemeBackground />
 *       ...rest of the page...
 *     </div>
 *   );
 */
export default function ThemeBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-[#F6F7F5]" />

      {/* Large orange chevron, bottom-left */}
      <div
        className="absolute -left-32 -bottom-32 w-[520px] h-[520px] opacity-[0.10]"
        style={{
          background: 'linear-gradient(135deg, #B5651D 0%, #D97D34 100%)',
          clipPath: 'polygon(0 20%, 40% 0, 100% 60%, 60% 100%, 0 60%)',
        }}
      />

      {/* Blue diamond, top-right */}
      <div
        className="absolute -right-24 -top-24 w-[420px] h-[420px] opacity-[0.08] rotate-12"
        style={{
          background: 'linear-gradient(135deg, #2C5A9A 0%, #2563EB 100%)',
          clipPath: 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)',
        }}
      />

      {/* Deep red triangle, bottom-right */}
      <div
        className="absolute -right-16 bottom-0 w-[360px] h-[360px] opacity-[0.07] -rotate-12"
        style={{
          background: 'linear-gradient(135deg, #9A2C2C 0%, #C24A4A 100%)',
          clipPath: 'polygon(0 100%, 50% 0, 100% 100%)',
        }}
      />

      {/* Soft dotted accent, echoing the marketing page's dot rows */}
      <div
        className="absolute left-10 bottom-10 w-32 h-6 opacity-20"
        style={{
          backgroundImage: 'radial-gradient(#B5651D 1.5px, transparent 1.5px)',
          backgroundSize: '10px 10px',
        }}
      />
    </div>
  );
}