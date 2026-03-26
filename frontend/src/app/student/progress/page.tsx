'use client';

export default function ProgressPage() {
  return (
    <div className="py-12">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center space-y-6">
          {/* Illustration with Tailwind shapes */}
          <div className="flex justify-center mb-8">
            <div className="relative w-32 h-32">
              {/* Background circles */}
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 to-amber-100 rounded-full opacity-50" />
              <div className="absolute top-4 left-4 w-16 h-16 bg-indigo-300 rounded-lg opacity-60" />
              <div className="absolute bottom-6 right-6 w-12 h-12 bg-amber-300 rounded-full opacity-60" />
              {/* Center icon */}
              <div className="absolute inset-0 flex items-center justify-center text-6xl">
                🗺️
              </div>
            </div>
          </div>

          {/* Title and Description */}
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-3">
              Bientôt disponible !
            </h1>
            <p className="text-lg text-slate-600 mb-2">
              Ta carte de connaissances arrive très bientôt
            </p>
            <p className="text-slate-500">
              Elle te montrera ta progression, tes forces et les domaines à améliorer.
            </p>
          </div>

          {/* Feature Preview */}
          <div className="grid grid-cols-3 gap-4 py-6">
            <div className="space-y-2">
              <div className="text-2xl">📊</div>
              <p className="text-xs text-slate-600">Statistiques</p>
            </div>
            <div className="space-y-2">
              <div className="text-2xl">🎯</div>
              <p className="text-xs text-slate-600">Objectifs</p>
            </div>
            <div className="space-y-2">
              <div className="text-2xl">⭐</div>
              <p className="text-xs text-slate-600">Progrès</p>
            </div>
          </div>

          {/* CTA Button */}
          <button className="mt-6 px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all hover:from-indigo-700 hover:to-indigo-600">
            Continuer à apprendre
          </button>
        </div>
      </div>
    </div>
  );
}
