import React from 'react';
import Link from 'next/link';
import { BookOpen, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl academic-border academic-shadow p-8 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-gold-50 text-gold-700 flex items-center justify-center mx-auto shadow-md">
          <BookOpen className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold text-navy-900">404</h1>
          <h2 className="text-lg font-bold text-slate-800">
            Sahifa topilmadi / Page Not Found
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Kechirasiz, siz qidirayotgan ilmiy maqola yoki sahifa mavjud emas yoki boshqa manzilga ko‘chirilgan.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/uz"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-navy-900 hover:bg-navy-800 text-white text-xs font-bold transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>Bosh sahifaga qaytish</span>
          </Link>
          <Link
            href="/uz/articles"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors"
          >
            <span>Barcha maqolalar</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
