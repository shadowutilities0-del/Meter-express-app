import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PageBackground from '../components/PageBackground';

const quickLinks = [
  { label: 'Information hub', link: '/services/info-hub' },
  { label: 'Alternative providers', link: '/services/alternative-providers' },
  { label: 'Easement guidance', link: '/services/easement-guidance', doc: true },
  { label: 'FAQs', link: '/help-advice/faqs' },
  { label: 'Connections charging statement', link: '/services/charging-statement', doc: true },
];

const subServices = [
  {
    title: 'Commercial connections',
    text: 'If you\'re in need of a new gas connection to a commercial property, did you know that we could help you? Read all about our new connections service here.',
    image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=500&q=80',
    link: '/services/commercial-connections',
  },
  {
    title: 'Commercial alterations & Multiple Homes',
    text: 'If you are renovating your commercial property, you may need to change the position of your gas meter and pipes. If you also require gas connections to multiple homes or new developments, we could help you with your connections needs.',
    image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=500&q=80',
    link: '/services/commercial-alterations',
  },
  {
    title: 'Commercial disconnections',
    text: 'If you need a gas service disconnection, we could provide you with the help you require. Click here to find out more about our disconnections service.',
    image: 'https://images.unsplash.com/photo-1517511620798-cec17d428bc0?w=500&q=80',
    link: '/services/commercial-disconnections',
  },
];

export default function BusinessCustomers() {
  return (
    <PageBackground>
      <Navbar />

      <section className="max-w-[1180px] mx-auto px-8 py-14">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8 mb-12">
          {/* Banner image */}
          <div className="rounded-2xl overflow-hidden shadow-[0_8px_24px_rgba(30,36,34,0.12)] h-[260px]">
            <img
              src="https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=1000&q=80"
              alt="Aerial view of housing development"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Quick links sidebar */}
          <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-6">
            <h2 className="font-display text-lg font-semibold text-[#1E2422] mb-4">
              Quick links
            </h2>
            <ul className="space-y-3">
              {quickLinks.map((q) => (
                <li key={q.label}>
                  <Link
                    to={q.link}
                    className="flex items-center gap-2 text-sm text-[#4B5D45] hover:text-[#B5651D] transition"
                  >
                    {q.doc && <span aria-hidden>📄</span>}
                    {q.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Heading + intro */}
        <span className="inline-block text-xs font-mono-custom tracking-[0.2em] uppercase text-[#4B5D45] mb-3">
          Our Services
        </span>
        <h1 className="font-display text-[34px] font-semibold text-[#1E2422] mb-5">
          Businesses or Multiple Homes
        </h1>
        <p className="text-[#525F58] leading-relaxed mb-5 max-w-[760px]">
          We offer a range of services to our business customers, developers and households that require a bespoke service.
        </p>
        <ul className="space-y-3 mb-16 max-w-[760px]">
          {[
            'We provide gas connections to existing and new build commercial properties and to new developments.',
            'We disconnect gas supplies when they are no longer needed.',
            'We alter the position of gas meters and pipes if they need moving to a new position.',
            'We can upgrade your service pipe, where you need an increase to your gas demand.',
          ].map((point) => (
            <li key={point} className="flex gap-3 text-sm text-[#1E2422]">
              <span className="text-[#B5651D] mt-0.5">●</span>
              <span>{point}</span>
            </li>
          ))}
        </ul>

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