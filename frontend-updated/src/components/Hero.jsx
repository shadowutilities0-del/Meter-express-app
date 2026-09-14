const quickLinks = [
  'Contact us', 'Upgrading your gas pipes', 'Priority Services Register',
  'New gas connection', 'Centres for warmth', 'Smell gas?',
];

export default function Hero() {
  return (
    <section className="max-w-[1180px] mx-auto px-8 py-14 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-7">
      <div className="relative rounded overflow-hidden min-h-[380px] flex items-end bg-[#1E2422]">
        <img
          src="https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=1200&auto=format&fit=crop"
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-55"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1E2422]/90 via-[#1E2422]/20 to-transparent" />
        <div className="relative z-10 p-9 max-w-[480px] text-white">
          <h2 className="font-display text-[32px] font-semibold mb-3 leading-tight">
            You're our
            <br />
            <span className="text-[#D97D34] text-[42px]">Priority</span>
          </h2>
          <p className="text-sm text-[#DCE1DD] mb-6">
            The Priority Services Register is a free service, designed to help those who might
            need extra support, particularly in a gas emergency.
          </p>
          <button className="bg-[#B5651D] hover:bg-[#D97D34] text-white font-semibold px-6 py-3 rounded transition">
            Find out if you're eligible
          </button>
        </div>
      </div>

      <aside className="bg-[#F7F8F6] border border-[#CBD0CA] rounded p-6">
        <h3 className="font-display text-base font-semibold mb-3.5">Quick links</h3>
        <ul className="list-none m-0 p-0">
          {quickLinks.map((l, i) => (
            <li key={l} className={i !== 0 ? 'border-t border-[#CBD0CA]' : ''}>
              <a href="#" className="flex justify-between items-center py-3 text-sm text-[#525F58] hover:text-[#B5651D]">
                {l} <span>→</span>
              </a>
            </li>
          ))}
        </ul>
      </aside>
    </section>
  );
}