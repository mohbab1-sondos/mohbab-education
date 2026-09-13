'use client';

import React, { useState } from 'react';
import LiveClassroomRoom from '@/components/LiveClassroomRoom';

export default function ClassroomPage() {
  const [role, setRole] = useState<'teacher' | 'student'>('teacher');

  return (
    <main style={{ backgroundColor: '#020617', minHeight: '100vh', padding: '24px' }} dir="rtl">
      <div style={{ maxWidth: '1200px', margin: '0 auto', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ color: '#f8fafc', fontSize: '20px', fontWeight: 'bold', margin: 0 }}>
          🏫 الفصل التفاعلي المباشر
        </h1>
        <div style={{ display: 'flex', backgroundColor: '#0f172a', padding: '4px', borderRadius: '10px', border: '1px solid #1e293b' }}>
          <button
            type="button"
            onClick={() => setRole('teacher')}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 'bold',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: role === 'teacher' ? '#4f46e5' : 'transparent',
              color: role === 'teacher' ? '#ffffff' : '#94a3b8',
            }}
          >
            👨‍🏫 وضع المعلم
          </button>
          <button
            type="button"
            onClick={() => setRole('student')}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 'bold',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: role === 'student' ? '#4f46e5' : 'transparent',
              color: role === 'student' ? '#ffffff' : '#94a3b8',
            }}
          >
            👨‍🎓 وضع الطالب
          </button>
        </div>
      </div>

      <LiveClassroomRoom lessonId="demo-room" initialRole={role} />
    </main>
  );
}
