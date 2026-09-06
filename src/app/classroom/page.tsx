'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function ClassroomPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [userName, setUserName] = useState('طالب');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const prevCoords = useRef<{ x: number; y: number } | null>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    const channel = supabase.channel('room-classroom-1', {
      config: { broadcast: { self: false } }
    });

    channel
      .on('broadcast', { event: 'draw' }, ({ payload }) => {
        drawOnCanvas(payload.prevX, payload.prevY, payload.currX, payload.currY, payload.color);
      })
      .on('broadcast', { event: 'clear' }, () => {
        clearLocalCanvas();
      })
      .subscribe();

    channelRef.current = channel;

    const fetchMessages = async () => {
      const { data } = await supabase.from('messages').select('*').order('created_at', { ascending: true });
      if (data) setMessages(data);
    };
    fetchMessages();

    const msgChannel = supabase
      .channel('classroom-chat')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        setMessages((prev) => [...prev, payload.new]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(msgChannel);
    };
  }, []);

  // دالة تحويل إحداثيات الماوس لتتطابق بدقة مع مقاس الكانفاس الفعلي
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
    const coords = getCanvasCoordinates(e);
    prevCoords.current = coords;
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !prevCoords.current) return;

    const coords = getCanvasCoordinates(e);
    const prevX = prevCoords.current.x;
    const prevY = prevCoords.current.y;

    drawOnCanvas(prevX, prevY, coords.x, coords.y);

    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'draw',
        payload: { prevX, prevY, currX: coords.x, currY: coords.y, color: '#6366f1' }
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
    clearLocalCanvas();
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'clear',
        payload: {}
      });
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    const text = input;
    setInput('');
    await supabase.from('messages').insert([{ sender: userName, content: text }]);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6 flex flex-col justify-between" dir="rtl">
      <header className="border-b border-slate-800 pb-4 mb-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-indigo-400">غرفة الفصل الدراسي المباشر</h1>
          <p className="text-xs text-slate-400">سبورة تفاعلية ومحاذاة سريعة عبر Realtime Broadcast</p>
        </div>
        <div className="flex gap-3 items-center">
          <input 
            type="text" 
            value={userName} 
            onChange={(e) => setUserName(e.target.value)}
            className="bg-slate-800 border border-slate-700 px-3 py-1 rounded text-sm text-center"
          />
          <button onClick={handleClearBoard} className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 px-3 py-1 rounded text-xs font-medium">
            مسح السبورة للجميع
          </button>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 my-4">
        <div className="md:col-span-2 bg-slate-950 rounded-xl p-4 border border-slate-800 flex flex-col justify-between items-center relative overflow-hidden min-h-[450px]">
          <span className="absolute top-3 right-4 text-xs text-slate-500 font-mono">Live Sync Whiteboard</span>
          <canvas 
            ref={canvasRef} 
            width={1280} 
            height={720}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            className="w-full h-full bg-slate-900/60 rounded border border-slate-800 cursor-crosshair touch-none"
          />
        </div>

        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 flex flex-col justify-between">
          <h2 className="text-sm font-semibold mb-3 text-slate-300">المحادثات المباشرة</h2>
          <div className="flex-1 overflow-y-auto space-y-2 mb-4 max-h-[350px] p-2 bg-slate-900/50 rounded-lg">
            {messages.map((msg, idx) => (
              <div key={idx} className="bg-slate-800 p-2 rounded text-sm border border-slate-700">
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
