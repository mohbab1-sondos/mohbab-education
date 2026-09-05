'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PlusCircle, Video, Calendar, Clock, ArrowLeft } from 'lucide-react';

interface SessionItem {
  id: string;
  title: string;
  description: string;
  start_time: string;
  classes?: { title: string };
}

export default function Home() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSessions() {
      try {
        const res = await fetch('/api/sessions');
        if (res.ok) {
          const data = await res.json();
          setSessions(data || []);
        }
      } catch (err) {
        console.error('فشل في جلب الجلسات:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchSessions();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans p-6 dir-rtl" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* الهيدر الرئيسي */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
          <div>
            <h1 className="text-2xl font-bold mb-2">منصة التعليم والبث المباشر</h1>
            <p className="text-slate-400 text-sm">إدارة الفصول الدراسية وقاعات البث التفاعلي المباشر</p>
          </div>
          <Link
            href="/sessions/new"
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-5 rounded-xl transition flex items-center gap-2 shadow-lg shrink-0"
          >
            <PlusCircle size={18} /> إنشاء جلسة جديدة
          </Link>
        </div>

        {/* قائمة الجلسات المجدولة */}
        <div>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Calendar className="text-indigo-400" size={20} /> الجلسات المتاحة والبث المباشر
          </h2>

          {loading ? (
            <div className="text-center py-12 bg-slate-900/50 border border-slate-800/80 rounded-2xl text-slate-400">
              جاري تحميل الجلسات...
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12 bg-slate-900/50 border border-slate-800/80 rounded-2xl text-slate-400">
              <p className="mb-4">لا توجد جلسات مجدولة حالياً</p>
              <Link
                href="/live/1"
                className="inline-flex items-center gap-2 text-indigo-400 hover:underline text-sm"
              >
                الدخول لقاعة البث الافتراضية <ArrowLeft size={16} />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between space-y-4 hover:border-slate-700 transition"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-1 rounded-md font-medium">
                        {session.classes?.title || 'الصف العام'}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock size={12} /> {new Date(session.start_time).toLocaleString('ar-EG')}
                      </span>
                    </div>
                    <h3 className="font-bold text-base text-white mb-1">{session.title}</h3>
                    <p className="text-slate-400 text-xs line-clamp-2">{session.description || 'لا يوجد وصف مضاف'}</p>
                  </div>

                  <Link
                    href={`/live/${session.id}`}
                    className="w-full bg-slate-800 hover:bg-indigo-600 text-white font-semibold py-2.5 rounded-xl transition flex items-center justify-center gap-2 text-sm"
                  >
                    <Video size={16} /> الانضمام للبث المباشر
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
