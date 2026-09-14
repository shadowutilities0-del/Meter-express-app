export default function Footer() {
  return (
    <footer className="max-w-[1180px] mx-auto px-8 pb-10">
      <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] px-9 pt-9 pb-5">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-8 border-b border-[#CBD0CA]">
          <div>
            <h1 className="font-display text-[26px] font-semibold text-[#1E2422]">Meter Express Ltd</h1>
            <p className="text-xs tracking-widest uppercase text-[#525F58] mt-0.5 mb-4.5">Your gas network</p>
            <button className="bg-[#B5651D] hover:bg-[#D97D34] text-white font-semibold px-5 py-2.5 rounded mr-2">Contact us</button>
            <button className="bg-[#B5651D] hover:bg-[#D97D34] text-white font-semibold px-5 py-2.5 rounded">FAQs</button>
            <p className="text-xs mt-5 text-[#8A8F89]">Meter Express Ltd © 2026 — demo site</p>
          </div>

          <div>
            <h5 className="font-mono-custom text-xs tracking-wider uppercase text-[#525F58] mb-3.5">Legal</h5>
            <ul className="space-y-2.5 text-sm">
              {['Sitemap', 'Cookie policy', 'Privacy policy', 'Terms & conditions'].map((l) => (
                <li key={l}><a href="#" className="text-[#1E2422] hover:text-[#B5651D]">{l}</a></li>
              ))}
            </ul>
          </div>

          <div>
            <h5 className="font-mono-custom text-xs tracking-wider uppercase text-[#525F58] mb-3.5">Compliance</h5>
            <ul className="space-y-2.5 text-sm">
              {['Accessibility', 'GDPR form', 'Our location', 'Speaking up'].map((l) => (
                <li key={l}><a href="#" className="text-[#1E2422] hover:text-[#B5651D]">{l}</a></li>
              ))}
            </ul>
          </div>

          <div className="text-sm">
            <p className="text-xs text-[#525F58] mb-1">Smell gas?</p>
            <p className="font-mono-custom text-[17px] text-[#1E2422] mb-2.5">0800 111 999*</p>
            <p className="text-xs text-[#525F58] mb-1">Suspect carbon monoxide?</p>
            <p className="font-mono-custom text-[17px] text-[#1E2422]">0800 111 999*</p>
          </div>
        </div>

        <div className="pt-5 text-xs flex justify-between text-[#8A8F89]">
          <span>All calls may be recorded and monitored.</span>
          <span>Accessibility · GDPR</span>
        </div>
      </div>
    </footer>
  );
}