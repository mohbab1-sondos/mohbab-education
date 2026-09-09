import React from 'react';
import LiveClassroomRoom from '../../../components/LiveClassroomRoom';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function LiveLessonPage({ params }: PageProps) {
  const resolvedParams = await params;
  const lessonId = resolvedParams.id;

  return (
    <main className="min-h-screen bg-slate-950 p-4 md:p-8 text-slate-100">
      <LiveClassroomRoom lessonId={lessonId} />
    </main>
  );
}
