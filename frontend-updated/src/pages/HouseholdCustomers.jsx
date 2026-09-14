import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PageBackground from '../components/PageBackground';

const subServices = [
  {
    title: 'New utilities connections',
    text: 'If you\'re in need of a new gas connection, did you know that we could help you? Read all about our new connections service here.',
    image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=500&q=80',
    link: '/login',
  },
  {
    title: 'Utilities alterations',
    text: 'If you are renovating or extending your home you may need to change the position of your gas meter and pipes.',
    image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=500&q=80',
    link: '/login',
  },
  {
    title: 'Utilities disconnections',
    text: 'If you need a gas disconnection or gas meter disconnection, we could provide you with the help you require.',
    image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=500&q=80',
    link: '/login',
  },
];

export default function HouseholdCustomers() {
  return (
    <PageBackground>
      <Navbar />

      <section className="max-w-[1180px] mx-auto px-8 py-14">
        <span className="inline-block text-xs font-mono-custom tracking-[0.2em] uppercase text-[#4B5D45] mb-3">
          Our Services
        </span>
        <h1 className="font-display text-[34px] font-semibold text-[#1E2422] mb-8">
          Household Customers
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start mb-16">
          {/* Left: intro text */}
          <div>
            <p className="text-[#525F58] leading-relaxed mb-5">
              We offer services for new and existing properties.
            </p>
            <ul className="space-y-3 mb-6">
              {[
                'We provide gas connections to existing and new build properties.',
                'We disconnect gas supplies when they are no longer needed.',
                'We alter the position of gas meters and pipes if they need moving to a new position.',
              ].map((point) => (
                <li key={point} className="flex gap-3 text-sm text-[#1E2422]">
                  <span className="text-[#B5651D] mt-0.5">●</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
            <p className="text-sm text-[#525F58] leading-relaxed">
              Please watch our video to see your connection journey from application through to completion.
            </p>
          </div>

          {/* Right: video/banner block */}
          <div className="relative rounded-2xl overflow-hidden shadow-[0_8px_24px_rgba(30,36,34,0.12)] bg-[#1E2422] aspect-video flex items-center justify-center">
            <img
              src="https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=800&q=80"
              alt="Getting you connected"
              className="absolute inset-0 w-full h-full object-cover opacity-60"
            />
            <div className="relative z-10 flex flex-col items-center text-center px-6">
              <h3 className="font-display text-2xl font-semibold text-white mb-4">
                Getting You Connected
              </h3>
              <button className="w-16 h-16 rounded-full bg-[#B5651D] hover:bg-[#D97D34] flex items-center justify-center transition">
                <span className="text-white text-2xl ml-1">▶</span>
              </button>
            </div>
          </div>
        </div>

        {/* Sub-services grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-7">
          {subServices.map((s) => (
            <div
              key={s.title}
              className="group bg-white rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_24px_rgba(30,36,34,0.1)] transition-shadow duration-300"
            >
              <div className="h-[180px] overflow-hidden">
                <img
                  src={s.image}
                  alt={s.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-6">
                <h3 className="font-display text-lg font-semibold text-[#1E2422] mb-2.5">
                  {s.title}
                </h3>
                <p className="text-sm text-[#525F58] leading-relaxed mb-5">
                  {s.text}
                </p>
                <Link
                  to={s.link}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#4B5D45] group-hover:gap-2.5 transition-all"
                >
                  Click for more
                  <span aria-hidden>→</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </PageBackground>
  );
}