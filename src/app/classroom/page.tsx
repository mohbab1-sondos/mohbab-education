'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient, RealtimeChannel } from '@supabase/supabase-js';

// قيم صريحة ومباشرة لتجاوز مشاكل Vercel Environment Variables
const SUPABASE_URL = 'https://aqzwoxsyyuvqifpeapfi.supabase.co';
const SUPABASE_ANON_KEY = 'ضع_هنا_مفتاح_ANON_KEY_الحقيقي_الطويل';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function ClassroomPage() {
  const [role, setRole] = useState<'teacher' | 'student'>('student');
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [userName, setUserName] = useState('طالب');
  const [penColor, setPenColor] = useState('#6366f1');
  const [handRaised, setHandRaised] = useState(false);
  const [raisedHandsList, setRaisedHandsList] = useState<string[]>([]);
  const [statusText, setStatusText] = useState('جاري الاتصال...');
  const [isConnected, setIsConnected] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const prevCoords = useRef<{ x: number; y: number } | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const initRealtime = () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    setStatusText('جاري الاتصال بالمزامنة...');

    const channel = supabase.channel('classroom-room-live', {
      config: {
        broadcast: { self: true }
      }
    });

    channel
      .on('broadcast', { event: 'draw' }, ({ payload }) => {
        drawOnCanvas(payload.prevX, payload.prevY, payload.currX, payload.currY, payload.color);
      })
      .on('broadcast', { event: 'clear' }, () => {
        clearLocalCanvas();
      })
      .on('broadcast', { event: 'raise-hand' }, ({ payload }) => {
        if (payload.raised) {
          setRaisedHandsList((prev) => Array.from(new Set([...prev, payload.studentName])));
        } else {
          setRaisedHandsList((prev) => prev.filter((name) => name !== payload.studentName));
        }
      })
      .on('broadcast', { event: 'chat' }, ({ payload }) => {
        setMessages((prev) => [...prev, payload]);
      })
      .subscribe((status, err) => {
        console.log('Realtime Status:', status, err);
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          setStatusText('متصل بالمزامنة المباشرة ●');
        } else {
          setIsConnected(false);
          setStatusText(`حالة الاتصال: ${status}`);
        }
      });

    channelRef.current = channel;
  };

  useEffect(() => {
    initRealtime();
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
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
    const coords = getCanvasCoordinates(e);
    prevCoords.current = coords;
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (role !== 'teacher' || !isDrawing || !prevCoords.current) return;

    const coords = getCanvasCoordinates(e);
    const prevX = prevCoords.current.x;
    const prevY = prevCoords.current.y;

    drawOnCanvas(prevX, prevY, coords.x, coords.y, penColor);

    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'draw',
        payload: { prevX, prevY, currX: coords.x, currY: coords.y, color: penColor }
      });
    }

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
    if (channelRef.current) {
      channelRef.current.send({ type: 'broadcast', event: 'clear', payload: {} });
    }
  };

  const toggleRaiseHand = () => {
    const newStatus = !handRaised;
    setHandRaised(newStatus);

    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'raise-hand',
        payload: { studentName: userName, raised: newStatus }
      });

      if (newStatus) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'chat',
          payload: { sender: 'النظام 🔔', content: `قام الطالب (${userName}) برفع اليد للاستئذان ✋` }
        });
      }
    }
  };

  const sendMessage = () => {
    if (!input.trim()) return;
    const msgData = { sender: `${userName} (${role === 'teacher' ? 'معلم' : 'طالب'})`, content: input };
    
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'chat',
        payload: msgData
      });
    }
    setInput('');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6 flex flex-col justify-between" dir="rtl">
      <header className="border-b border-slate-800 pb-4 mb-4 flex justify-between items-center flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-indigo-400">غرفة الفصل الدراسي المباشر</h1>
            <span className={`px-2 py-0.5 rounded text-[10px] ${isConnected ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
              {statusText}
            </span>
            {!isConnected && (
              <button onClick={() => initRealtime()} className="text-[10px] bg-indigo-600/30 text-indigo-300 hover:bg-indigo-600/50 px-2 py-0.5 rounded border border-indigo-500/30">
                إعادة الاتصال 🔄
              </button>
            )}
          </div>
          <p className="text-xs text-slate-400">إدارة الدور، التحكم بالسبورة، ورفع اليد في الوقت الفعلي</p>
        </div>

        <div className="flex items-center gap-3 bg-slate-800 p-1.5 rounded-lg border border-slate-700">
          <button 
            onClick={() => { setRole('teacher'); setUserName('المعلم'); }} 
            className={`px-3 py-1 rounded text-xs font-bold transition ${role === 'teacher' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            وضع المعلم 👨‍🏫
          </button>
          <button 
            onClick={() => { setRole('student'); setUserName('طالب'); }} 
            className={`px-3 py-1 rounded text-xs font-bold transition ${role === 'student' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            وضع الطالب 👨‍🎓
          </button>
        </div>

        <div className="flex gap-3 items-center">
          <input 
            type="text" 
            value={userName} 
            onChange={(e) => setUserName(e.target.value)}
            className="bg-slate-800 border border-slate-700 px-3 py-1 rounded text-sm text-center"
          />

          {role === 'teacher' ? (
            <>
              <input 
                type="color" 
                value={penColor} 
                onChange={(e) => setPenColor(e.target.value)}
                className="w-8 h-8 rounded border-0 cursor-pointer bg-transparent"
                title="اختر لون القلم"
              />
              <button onClick={handleClearBoard} className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 px-3 py-1 rounded text-xs font-medium">
                مسح السبورة
              </button>
            </>
          ) : (
            <button 
              onClick={toggleRaiseHand} 
              className={`px-3 py-1 rounded text-xs font-medium border transition ${handRaised ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-slate-800 text-slate-300 border-slate-700'}`}
            >
              {handRaised ? '✋ اليد مرفوعة' : '✋ رفع اليد'}
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 my-4">
        <div className="md:col-span-2 bg-slate-950 rounded-xl p-4 border border-slate-800 flex flex-col justify-between items-center relative overflow-hidden min-h-[450px]">
          <div className="absolute top-3 right-4 left-4 flex justify-between items-center text-xs text-slate-500 font-mono pointer-events-none z-10">
            <span>{role === 'teacher' ? 'السبورة جاهزة للرسم' : 'وضع المشاهدة فقط (Read-only)'}</span>
            {raisedHandsList.length > 0 && (
              <span className="bg-amber-500/20 text-amber-300 px-3 py-1 rounded-full border border-amber-500/40 font-sans font-bold animate-pulse">
                ✋ الطلاب المستأذنون: {raisedHandsList.join(', ')}
              </span>
            )}
          </div>
          <canvas 
            ref={canvasRef} 
            width={1280} 
            height={720}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            className={`w-full h-full bg-slate-900/60 rounded border border-slate-800 touch-none ${role === 'teacher' ? 'cursor-crosshair' : 'cursor-not-allowed'}`}
          />
        </div>

        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 flex flex-col justify-between">
          <h2 className="text-sm font-semibold mb-3 text-slate-300">المحادثات المباشرة</h2>
          <div className="flex-1 overflow-y-auto space-y-2 mb-4 max-h-[350px] p-2 bg-slate-900/50 rounded-lg">
            {messages.map((msg, idx) => (
              <div key={idx} className={`p-2 rounded text-sm border ${msg.sender?.includes('النظام') ? 'bg-amber-500/10 border-amber-500/30 text-amber-200' : 'bg-slate-800 border-slate-700'}`}>
                <span className="text-indigo-400 font-bold block text-xs">{msg.sender || 'مستخدم'}</span>
                <span className="text-slate-200">{msg.content}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="اكتب رسالتك..."
              className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white"
            />
            <button onClick={sendMessage} className="bg-indigo-600 px-4 py-2 rounded text-sm font-medium">إرسال</button>
          </div>
        </div>
      </main>
    </div>
  );
}
