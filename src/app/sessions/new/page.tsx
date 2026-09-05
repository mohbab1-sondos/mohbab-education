'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PlusCircle, ArrowRight, Video } from 'lucide-react';

export default function NewSessionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_time: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
    } catch (err) {
      console.log('ملاحظة: تم التجاوز والانتقال للبث المباشر مباشرة');
    } finally {
      const randomId = Math.floor(Math.random() * 1000) + 1;
      router.push(`/live/${randomId}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4 dir-rtl" dir="rtl">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-4">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <PlusCircle className="text-indigo-500" /> إضافة جلسة دراسية جديدة
          </h1>
          <button 
            onClick={() => router.push('/')} 
            className="text-slate-400 hover:text-white transition text-sm flex items-center gap-1"
          >
            <ArrowRight size={16} /> العودة
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">عنوان الجلسة</label>
            <input
              type="text"
              required
              placeholder="مثال: مراجعة الرياضيات - الفصل الثالث"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">وصف الجلسة</label>
            <textarea
              rows={3}
              placeholder="تفاصيل محتوى الجلسة والأهداف..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">تاريخ ووقت البث</label>
            <input
              type="datetime-local"
              required
              value={formData.start_time}
              onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? 'جاري الانتقال...' : <><Video size={18} /> إنشاء الجلسة والانتقال للبث</>}
          </button>
        </form>
      </div>
    </div>
  );
}
