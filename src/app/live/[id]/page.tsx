'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Mic, MicOff, Video, VideoOff, Hand, Shield, Users } from 'lucide-react';

interface Participant {
  id: string;
  name: string;
  role: 'teacher' | 'student';
  hand: boolean;
  canSpeak: boolean;
}

export default function LiveRoom() {
  const [isMuted, setIsMuted] = useState(true);
  const [isCameraOff, setIsCameraOff] = useState(true);
  const [handRaised, setHandRaised] = useState(false);
  
  // قائمة المشاركين التفاعلية
  const [participants, setParticipants] = useState<Participant[]>([
    { id: '1', name: 'المعلم (أنت)', role: 'teacher', hand: false, canSpeak: true },
    { id: '2', name: 'الطالب أحمد', role: 'student', hand: false, canSpeak: false },
    { id: '3', name: 'الطالبة سارة', role: 'student', hand: false, canSpeak: false },
  ]);

  useEffect(() => {
    // الاشتراك في قناة البث اللحظي عبر Supabase
    const channel = supabase.channel('room-1');

    channel
      .on('broadcast', { event: 'hand-toggle' }, ({ payload }) => {
        setParticipants((prev) =>
          prev.map((p) => (p.id === payload.id ? { ...p, hand: payload.hand } : p))
        );
      })
      .on('broadcast', { event: 'speak-permission' }, ({ payload }) => {
        setParticipants((prev) =>
          prev.map((p) => (p.id === payload.id ? { ...p, canSpeak: payload.canSpeak, hand: false } : p))
        );
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // زر رفع اليد للطالب
  const toggleHand = () => {
    const nextHandState = !handRaised;
    setHandRaised(nextHandState);

    // إرسال إشارة لحظية للمعلم
    supabase.channel('room-1').send({
      type: 'broadcast',
      event: 'hand-toggle',
      payload: { id: '2', hand: nextHandState }, // معرف الطالب الافتراضي
    });
  };

  // إعطاء/سحب إذن التحدث من المعلم
  const toggleSpeakPermission = (id: string, currentPermission: boolean) => {
    const newPermission = !currentPermission;
    setParticipants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, canSpeak: newPermission, hand: false } : p))
    );

    // بث القرار لجميع المشاركين
    supabase.channel('room-1').send({
      type: 'broadcast',
      event: 'speak-permission',
      payload: { id, canSpeak: newPermission },
    });
  };

  return (
    <div className="flex h-screen bg-slate-950 text-white font-sans dir-rtl" dir="rtl">
      {/* منطقة البث الرئيسية */}
      <div className="flex-1 flex flex-col p-4">
        <div className="flex-1 bg-slate-900 rounded-2xl flex items-center justify-center border border-slate-800 relative overflow-hidden">
          <div className="text-center">
            <div className="w-28 h-28 rounded-full bg-indigo-600/30 border-2 border-indigo-500 flex items-center justify-center text-4xl font-bold mx-auto mb-4 animate-pulse">
              🎥
            </div>
            <h2 className="text-xl font-bold mb-2">قاعة البث المباشر التفاعلية</h2>
            <p className="text-slate-400 text-sm">البث نشط ومتصل بقواعد بيانات Supabase Realtime</p>
          </div>
        </div>

        {/* شريط أدوات التحكم للوسائط */}
        <div className="h-20 bg-slate-900/90 backdrop-blur rounded-2xl mt-4 border border-slate-800 flex items-center justify-center gap-4 px-6 shadow-xl">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-4 rounded-xl transition-all ${
              isMuted ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-slate-800 text-white hover:bg-slate-700'
            }`}
            title="الصوت"
          >
            {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
          </button>

          <button
            onClick={() => setIsCameraOff(!isCameraOff)}
            className={`p-4 rounded-xl transition-all ${
              isCameraOff ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-slate-800 text-white hover:bg-slate-700'
            }`}
            title="الكاميرا"
          >
            {isCameraOff ? <VideoOff size={22} /> : <Video size={22} />}
          </button>

          <button
            onClick={toggleHand}
            className={`p-4 rounded-xl transition-all ${
              handRaised ? 'bg-amber-500 text-slate-950 font-bold scale-105' : 'bg-slate-800 text-white hover:bg-slate-700'
            }`}
            title="رفع اليد للمشاركة"
          >
            <Hand size={22} />
          </button>
        </div>
      </div>

      {/* لوحة التحكم والإدارة الجانبية للمعلم */}
      <div className="w-80 bg-slate-900 border-r border-slate-800 p-4 flex flex-col">
        <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-800">
          <h2 className="text-base font-bold flex items-center gap-2">
            <Shield className="text-indigo-400" size={20} /> إدارة المشاركين
          </h2>
          <span className="flex items-center gap-1 text-xs bg-slate-800 px-2.5 py-1 rounded-full text-slate-400">
            <Users size={14} /> {participants.length}
          </span>
        </div>

        <div className="space-y-3 flex-1 overflow-y-auto">
          {participants.map((p) => (
            <div
              key={p.id}
              className={`p-3.5 rounded-xl border transition-all ${
                p.hand
                  ? 'bg-amber-500/10 border-amber-500/50'
                  : 'bg-slate-800/40 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-semibold text-sm flex items-center gap-2">
                    {p.name}
                    {p.hand && <span className="text-xs bg-amber-500 text-slate-950 px-1.5 py-0.5 rounded font-bold">مداخلة ✋</span>}
                  </p>
                  <span className="text-xs text-slate-400">
                    {p.role === 'teacher' ? 'المعلم (المشرف)' : p.canSpeak ? 'مسموح بالتحدث 🎙️' : 'مستمع'}
                  </span>
                </div>
              </div>

              {p.role === 'student' && (
                <button
                  onClick={() => toggleSpeakPermission(p.id, p.canSpeak)}
                  className={`w-full text-xs py-2 rounded-lg font-medium transition-all ${
                    p.canSpeak
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                      : p.hand
                      ? 'bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 animate-pulse'
                      : 'bg-indigo-600 text-white hover:bg-indigo-500'
                  }`}
                >
                  {p.canSpeak ? 'سحب الميكروفون' : p.hand ? 'إعطاء الميكروفون الآن ✋' : 'السماح بالتحدث'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
