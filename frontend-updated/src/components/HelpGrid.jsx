import { Link } from 'react-router-dom';

const cards = [
  {
    title: 'Household Customers',
    text: 'Whether you need a new gas supply, wish to change your existing meter and/or pipe position due to renovating your home or you simply do not require gas anymore then we are here to help.',
    image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=600&q=80',
    link: '/services/household',
  },
  {
    title: 'Businesses or Multiple Homes',
    text: 'We offer a range of services to our business customers and developers so if you\'re looking for connection services to commercial or multiple properties then we\'re here to help.',
    image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80',
    link: '/services/business',
  },
  {
    title: 'Information Hub',
    text: 'You\'ll find helpful documents and information to support you on your connections journey here, such as guidance documents, connections charges and T&C.',
    image: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=600&q=80',
    link: '/services/info-hub',
  },
];

export default function HelpGrid() {
  return (
    <section className="max-w-[1180px] mx-auto px-8 py-20">
      <span className="inline-block text-xs font-mono-custom tracking-[0.2em] uppercase text-[#4B5D45] mb-3">
        Support & Services
      </span>
      <h2 className="font-display text-[34px] font-semibold text-[#1E2422] mb-10">
        How can we help you today?
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-7">
        {cards.map((card, i) => (
          <div
            key={card.title}
            className="group bg-white rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_24px_rgba(30,36,34,0.1)] transition-shadow duration-300"
          >
            <div className="relative h-[200px] overflow-hidden">
              <img
                src={card.image}
                alt={card.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <span className="absolute top-4 left-4 w-9 h-9 rounded-full bg-white/90 backdrop-blur flex items-center justify-center text-[#4B5D45] font-display font-semibold text-sm">
                {i + 1}
              </span>
            </div>
            <div className="p-6">
              <h3 className="font-display text-lg font-semibold text-[#1E2422] mb-2.5">
                {card.title}
              </h3>
              <p className="text-sm text-[#525F58] leading-relaxed mb-5">
                {card.text}
              </p>
              <Link
                to={card.link}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#4B5D45] group-hover:gap-2.5 transition-all"
              >
                Learn more
                <span aria-hidden>→</span>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}