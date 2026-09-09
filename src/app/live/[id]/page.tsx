import React from 'react';
import LiveClassroomRoom from '@/components/LiveClassroomRoom';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function LiveLessonPage({ params }: PageProps) {
  const resolvedParams = await params;
  const lessonId = resolvedParams.id;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* شريط رأس الصفحة */}
        <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-indigo-400">
              الدرس المباشر #{lessonId}
            </h1>
            <p className="text-xs md:text-sm text-slate-400 mt-1">
              غرفة الحصة التفاعلية (السبورة الذكية، رفع اليد، والمحادثة المباشرة)
            </p>
          </div>
          <a
            href="/"
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-3 py-2 rounded-lg border border-slate-700 transition"
          >
            ← العودة للرئيسية
          </a>
        </div>

        {/* استدعاء غرفة الصف التفاعلية المباشرة */}
        <LiveClassroomRoom lessonId={lessonId} />

      </div>
    </div>
  );
}
