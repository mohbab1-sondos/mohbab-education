'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://aqzwoxsyyuvqifpeapfi.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxendveHN5eXV2cWlmcGVhcGZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyMzQ1NjcsImV4cCI6MjA1NjgxMDU2N30.X_PLACEHOLDER_KEY_HERE';

interface LiveClassroomRoomProps {
  lessonId: string;
}

interface ChatMessage {
  sender: string;
  content: string;
}

export default function LiveClassroomRoom({ lessonId }: LiveClassroomRoomProps) {
  const [role, setRole] = useState<'teacher' | 'student'>('teacher');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [userName, setUserName] = useState('المعلم');
  const [penColor, setPenColor] = useState('#6366f1');
  const [handRaised, setHandRaised] = useState(false);
  const [raisedHandsList, setRaisedHandsList] = useState<string[]>([]);
  const [statusText, setStatusText] = useState('جاري الاتصال...');
  const [isConnected, setIsConnected] = useState(false);

  const supabaseRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const prevCoords = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const client: any = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      realtime: { params: { eventsPerSecond: 10 } },
    });
    supabaseRef.current = client;

    const channelName = `lesson-room-${lessonId}`;
    const channel = client.channel(channelName);

    channel
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'classroom_events' },
        (payload: { new: any }) => {
          const newEvent = payload.new;
          if (!newEvent) return;

          if (newEvent.event_type === 'draw') {
            const data = newEvent.payload;
            drawOnCanvas(data.prevX, data.prevY, data.currX, data.currY, data.color);
          } else if (newEvent.event_type === 'clear') {
            clearLocalCanvas();
          } else if (newEvent.event_type === 'raise-hand') {
            const data = newEvent.payload;
            if (data.raised) {
              setRaisedHandsList((prev) => Array.from(new Set([...prev, data.studentName])));
            } else {
              setRaisedHandsList((prev) => prev.filter((name) => name !== data.studentName));
            }
          } else if (newEvent.event_type === 'lower-hand-single') {
            const data = newEvent.payload;
            setRaisedHandsList((prev) => prev.filter((name) => name !== data.studentName));
          } else if (newEvent.event_type === 'clear-hands') {
            setRaisedHandsList([]);
            setHandRaised(false);
          } else if (newEvent.event_type === 'chat') {
            setMessages((prev) => [...prev, newEvent.payload]);
          }
        }
      )
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          setStatusText('متصل بالمزامنة المباشرة ●');
        } else {
          setIsConnected(false);
          setStatusText(`حالة الاتصال: ${status}`);
        }
      });

    return () => {
      client.removeChannel(channel);
    };
  }, [lessonId]);

  const sendEvent = async (eventType: string, payloadData: Record<string, any>) => {
    if (!supabaseRef.current) return;
    try {
      await supabaseRef.current.from('classroom_events').insert([{
        event_type: eventType,
        payload: { ...payloadData, lessonId }
      }] as any);
    } catch (err) {
      console.error('Error sending event:', err);
    }
  };

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height)
    };
  };

  const drawOnCanvas = (prevX: number, prevY: number, currX: number, currY: number, color: string = '#6366f1') => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(prevX, prevY);
    ctx.lineTo(currX, currY);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (role !== 'teacher') return;
    prevCoords.current = getCanvasCoordinates(e);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (role !== 'teacher' || !isDrawing || !prevCoords.current) return;

    const coords = getCanvasCoordinates(e);
    drawOnCanvas(prevCoords.current.x, prevCoords.current.y, coords.x, coords.y, penColor);
    sendEvent('draw', { prevX: prevCoords.current.x, prevY: prevCoords.current.y, currX: coords.x, currY: coords.y, color: penColor });

    prevCoords.current = coords;
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    prevCoords.current = null;
  };

  const clearLocalCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleClearBoard = () => {
    if (role !== 'teacher') return;
    clearLocalCanvas();
    sendEvent('clear', {});
  };

  const handleLowerSingleHand = (studentName: string) => {
    if (role !== 'teacher') return;
    setRaisedHandsList((prev) => prev.filter((name) => name !== studentName));
    sendEvent('lower-hand-single', { studentName });
  };

  const handleClearAllHands = () => {
    if (role !== 'teacher') return;
    setRaisedHandsList([]);
    sendEvent('clear-hands', {});
  };

  const toggleRaiseHand = () => {
    if (role === 'teacher') return;
    const newStatus = !handRaised;
    setHandRaised(newStatus);
    sendEvent('raise-hand', { studentName: userName, raised: newStatus });
  };

  const sendMessage = () => {
    if (!input.trim()) return;
    sendEvent('chat', { sender: `${userName} (${role === 'teacher' ? 'معلم' : 'طالب'})`, content: input });
    setInput('');
  };

  return (
    <div className="bg-slate-900 text-white p-4 rounded-xl shadow-2xl border border-slate-800 space-y-4 max-w-7xl mx-auto" dir="rtl">
      {/* الشريط العلوي */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${isConnected ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
            {statusText}
          </span>
        </div>

        {/* زر التبديل بين المعلم والطالب */}
        <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
          <button
            type="button"
            onClick={() => { setRole('teacher'); setUserName('المعلم'); }}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${role === 'teacher' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            👨‍🏫 وضع المعلم
          </button>
          <button
            type="button"
            onClick={() => { setRole('student'); setUserName('طالب'); }}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${role === 'student' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
          >
            👨‍🎓 وضع الطالب
          </button>
        </div>

        {/* أدوات التحكم */}
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-3 py-1.5 text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 w-28"
            placeholder="اسم المستجيب"
          />

          {role === 'teacher' ? (
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={penColor}
                onChange={(e) => setPenColor(e.target.value)}
                className="w-8 h-8 rounded-lg border-0 cursor-pointer bg-transparent"
                title="لون القلم"
              />
              <button
                type="button"
                onClick={handleClearBoard}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs px-3 py-1.5 rounded-lg transition-colors font-medium shadow"
              >
                مسح السبورة
              </button>
              {raisedHandsList.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllHands}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs px-3 py-1.5 rounded-lg transition-colors font-medium shadow"
                >
                  تصفير الكل ✋
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={toggleRaiseHand}
              className={`text-xs px-4 py-1.5 rounded-lg transition-colors font-medium shadow ${handRaised ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'}`}
            >
              {handRaised ? '✋ اليد مرفوعة' : '✋ رفع اليد'}
            </button>
          )}
        </div>
      </div>

      {/* شريط قائمة المستأذنين */}
      {raisedHandsList.length > 0 && (
        <div className="bg-amber-950/40 border border-amber-500/30 p-3 rounded-xl flex items-center gap-2 flex-wrap">
          <span className="text-amber-200 text-xs font-bold flex items-center gap-1">✋ المستأذنون حالياً:</span>
          {raisedHandsList.map((student) => (
            <span key={student} className="bg-amber-900/60 text-amber-200 border border-amber-500/30 px-2.5 py-1 rounded-full text-xs flex items-center gap-2">
              {student}
              {role === 'teacher' && (
                <button
                  type="button"
                  onClick={() => handleLowerSingleHand(student)}
                  className="bg-rose-500 hover:bg-rose-600 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center transition-colors"
                  title="تنزيل اليد"
                >
                  ✕
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* منطقة السبورة والمحادثة */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-slate-950 p-2 rounded-xl border border-slate-800 relative">
          <canvas
            ref={canvasRef}
            width={1280}
            height={720}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            className={`w-full h-[400px] bg-slate-950 rounded-lg ${role === 'teacher' ? 'cursor-crosshair' : 'cursor-default'}`}
          />
        </div>

        {/* المحادثة */}
        <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-800 flex flex-col justify-between h-[418px]">
          <div className="flex-1 overflow-y-auto space-y-2 mb-3 pl-1">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">لا توجد رسائل بعد...</div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className="bg-slate-800 p-2.5 rounded-lg border border-slate-700/50">
                  <span className="text-indigo-400 font-semibold text-xs block mb-0.5">{msg.sender}</span>
                  <span className="text-slate-200 text-xs">{msg.content}</span>
                </div>
              ))
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="اكتب رسالة..."
              className="flex-1 bg-slate-900 border border-slate-700 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={sendMessage}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-4 py-2 rounded-lg transition-colors font-medium shadow"
            >
              إرسال
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
