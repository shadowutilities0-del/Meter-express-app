export default function CallSection() {
  return (
   <section className="max-w-[1180px] mx-auto px-8 pt-10 pb-28">
      <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-9">
        <h2 className="relative inline-block font-display text-[28px] font-semibold pb-3.5 mb-9 text-[#1E2422]">
          Do you know who to call?
          <svg viewBox="0 0 240 10" preserveAspectRatio="none" className="absolute left-0 bottom-0 w-full h-2.5">
            <path d="M2 6 Q 40 2 80 6 T 160 5 T 238 6" stroke="#D97D34" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </svg>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[#CBD0CA] rounded-lg overflow-hidden">
          <div className="bg-white p-7">
            <h4 className="text-[#1E2422] text-[17px] font-semibold mb-2">Smell gas? Act now.</h4>
            <p className="text-sm text-[#525F58] mb-4">
              Call <span className="text-[#B5651D] font-semibold">0800 111 999*</span> immediately at any time of the day or night.
            </p>
            <h4 className="text-[#1E2422] text-[17px] font-semibold mb-2">Have a power cut?</h4>
            <p className="text-sm text-[#525F58]">Call <span className="text-[#B5651D] font-semibold">105</span></p>
          </div>
          <div className="bg-white p-7">
            <h4 className="text-[#1E2422] text-[17px] font-semibold mb-2">Problem with your boiler or gas appliances?*</h4>
            <p className="text-sm text-[#525F58] mb-2">Call a Gas Safe registered engineer. Find one at gassafe.co.uk</p>
            <p className="text-sm text-[#525F58] underline">Is your boiler not working?</p>
          </div>
          <div className="bg-white p-7">
            <h4 className="text-[#1E2422] text-[17px] font-semibold mb-2">Concerned with your energy costs?</h4>
            <p className="text-sm text-[#525F58] mb-4">Contact your energy supplier for support.</p>
            <h4 className="text-[#1E2422] text-[17px] font-semibold mb-2">Issues with your gas meter or bill?</h4>
            <p className="text-sm text-[#525F58]">Contact your gas supplier.</p>
          </div>
        </div>

        <p className="text-[11.5px] text-[#8A8F89] mt-4">
          *If you have home care cover with your gas supplier please contact them directly.
        </p>
      </div>
    </section>
  );
}