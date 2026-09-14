import bgImage from '../assets/page-bg.png';

export default function PageBackground({ children, className = '' }) {
  return (
    <div className={`relative min-h-screen ${className}`}>
      <div
        className="fixed inset-0 -z-10 bg-[#EDEFEF] bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${bgImage})` }}
      />
      {children}
    </div>
  );
}