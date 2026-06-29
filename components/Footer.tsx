export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black/40 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col items-center justify-center space-y-4">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">AH</span>
            </div>
            <span className="text-sm font-semibold text-white">AH Exzellent Immobilien GmbH</span>
          </div>

          {/* Divider */}
          <div className="w-12 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

          {/* Copyright */}
          <div className="text-center">
            <p className="text-xs text-white/60">
              © {new Date().getFullYear()} - AH Exzellent Immobilien GmbH
            </p>
            <p className="text-xs text-white/40 mt-1">
              Professionelle Immobilienverwaltung · Design & Entwicklung: Behroz Hakimi
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
