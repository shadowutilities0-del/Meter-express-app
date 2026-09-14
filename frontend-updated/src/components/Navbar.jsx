import { Link } from 'react-router-dom';
import logo from '../assets/logo.png';

const menu = [
  { label: 'Emergencies', items: ['What to do if you smell gas', 'How to detect a gas leak','Suspect Carbon Monoxide','Your home emergency','Emergency engineer visit'] },
  { label: 'In your area', items: ['Upgrading your gas pipes','What is happening near you','Small Business claims','Under your feet','Hydrogen Projects','Major Projects','Incidents','Sniffer cars'] },
  { label: 'Our services', items: ['Connections hub', 'Biomethane'] },
  { label: 'Gas safety', items: ['Gas Safe engineers'] },
  { label: 'Help & advice', items: ['FAQs'] },
];

function Dropdown({ label, items }) {
  return (
    <li className="relative group">
      <a href="#" className="block px-3.5 py-2.5 text-sm font-medium text-[#525F58] border-b-2 border-transparent hover:text-[#1E2422] hover:border-[#B5651D]">
        {label}
      </a>
      <div className="absolute left-0 top-full hidden group-hover:block bg-white border border-[#CBD0CA] min-w-[200px] p-1.5 shadow-lg z-50">
        {items.map((item) => (
          <a key={item} href="#" className="block px-2.5 py-2 text-sm text-[#525F58] hover:bg-[#EDEFEF] hover:text-[#1E2422]">
            {item}
          </a>
        ))}
      </div>
    </li>
  );
}

export default function Navbar() {
  return (
    <header>
      <div className="bg-[#1E2422] text-[#B9C2BC] font-mono-custom text-sm">
        <div className="max-w-[1180px] mx-auto px-8 h-[34px] flex items-center justify-between">
          <span>English</span>
          <div className="flex gap-5">
            {['About us', 'Careers', 'Contact us'].map((l) => (
              <a key={l} href="#" className="opacity-85 hover:text-[#D97D34] hover:opacity-100">{l}</a>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white border-b border-[#CBD0CA]">
        <div className="max-w-[1180px] mx-auto px-8 h-[78px] flex items-center justify-between gap-5">
          <div className="flex items-center gap-2.5">
            <img src={logo} alt="Meter Express Ltd" className="h-[40px] w-auto object-contain" />
            <div>
              <h1 className="font-display text-[28px] font-semibold leading-none">Meter Express Ltd</h1>
              <small className="block font-mono-custom text-[10px] tracking-widest text-[#525F58] uppercase mt-0.5">Your utilities network</small>
            </div>
          </div>

          <ul className="flex list-none m-0 p-0 gap-1">
            {menu.map((m) => <Dropdown key={m.label} {...m} />)}
          </ul>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="border border-[#1E2422] text-[#1E2422] text-sm font-semibold px-5 py-2.5 rounded hover:bg-[#1E2422] hover:text-white transition"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="bg-[#B5651D] hover:bg-[#D97D34] text-white text-sm font-semibold px-5 py-2.5 rounded transition"
            >
              Register
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}