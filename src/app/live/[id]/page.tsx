import React from 'react';
import LiveClassroomRoom from '../../../components/LiveClassroomRoom';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function LiveLessonPage({ params }: PageProps) {
  const resolvedParams = await params;
  const lessonId = resolvedParams.id;

  return (
    <main className="min-h-screen bg-slate-950 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <LiveClassroomRoom lessonId={lessonId} />
      </div>
    </main>
  );
}
