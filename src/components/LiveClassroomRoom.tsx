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
    <div style={{ backgroundColor: '#0f172a', color: '#fff', padding: '15px', borderRadius: '10px', fontFamily: 'sans-serif' }} dir="rtl">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #334155', paddingBottom: '10px' }}>
        <div>
          <span style={{ fontSize: '12px', color: isConnected ? '#4ade80' : '#f59e0b', padding: '3px 8px', border: '1px solid currentColor', borderRadius: '4px' }}>
            {statusText}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" onClick={() => { setRole('teacher'); setUserName('المعلم'); }} style={{ padding: '6px 12px', backgroundColor: role === 'teacher' ? '#4f46e5' : '#334155', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
            👨‍🏫 وضع المعلم
          </button>
          <button type="button" onClick={() => { setRole('student'); setUserName('طالب'); }} style={{ padding: '6px 12px', backgroundColor: role === 'student' ? '#4f46e5' : '#334155', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
            👨‍🎓 وضع الطالب
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} style={{ padding: '5px', borderRadius: '4px', border: '1px solid #475569', backgroundColor: '#1e293b', color: '#fff', textAlign: 'center' }} />

          {role === 'teacher' ? (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input type="color" value={penColor} onChange={(e) => setPenColor(e.target.value)} style={{ cursor: 'pointer', height: '30px', width: '30px', border: 'none', background: 'none' }} title="لون القلم" />
              <button type="button" onClick={handleClearBoard} style={{ padding: '6px 12px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                مسح السبورة
              </button>
              {raisedHandsList.length > 0 && (
                <button type="button" onClick={handleClearAllHands} style={{ padding: '6px 12px', backgroundColor: '#d97706', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                  تصفير الكل ✋
                </button>
              )}
            </div>
          ) : (
            <button type="button" onClick={toggleRaiseHand} style={{ padding: '6px 12px', backgroundColor: handRaised ? '#d97706' : '#334155', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
              {handRaised ? '✋ اليد مرفوعة' : '✋ رفع اليد'}
            </button>
          )}
        </div>
      </div>

      {raisedHandsList.length > 0 && (
        <div style={{ backgroundColor: '#78350f', border: '1px solid #f59e0b', padding: '8px 12px', borderRadius: '6px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <strong style={{ color: '#fef3c7', fontSize: '13px' }}>✋ المستأذنون حالياً:</strong>
          {raisedHandsList.map((student) => (
            <span key={student} style={{ backgroundColor: '#92400e', color: '#fff', padding: '3px 8px', borderRadius: '15px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              {student}
              {role === 'teacher' && (
                <button type="button" onClick={() => handleLowerSingleHand(student)} title="خفض يد الطالب" style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', cursor: 'pointer', display: 'inline-flex', justifyContent: 'center', alignItems: 'center' }}>
                  ✕
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '15px' }}>
        <div style={{ backgroundColor: '#020617', padding: '5px', borderRadius: '8px', border: '1px solid #1e293b' }}>
          <canvas ref={canvasRef} width={1280} height={720} onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} style={{ width: '100%', height: '360px', backgroundColor: '#0f172a', borderRadius: '6px', cursor: role === 'teacher' ? 'crosshair' : 'default' }} />
        </div>

        <div style={{ backgroundColor: '#1e293b', padding: '10px', borderRadius: '8px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '370px' }}>
          <div style={{ flex: 1, overflowY: 'auto', marginBottom: '10px', backgroundColor: '#0f172a', padding: '8px', borderRadius: '6px' }}>
            {messages.map((msg, idx) => (
              <div key={idx} style={{ marginBottom: '6px', padding: '5px', backgroundColor: '#1e293b', borderRadius: '4px', fontSize: '12px' }}>
                <strong style={{ color: '#818cf8', display: 'block' }}>{msg.sender}</strong>
                <span>{msg.content}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '5px' }}>
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMessage()} placeholder="اكتب رسالة..." style={{ flex: 1, padding: '6px', borderRadius: '4px', border: '1px solid #475569', backgroundColor: '#0f172a', color: '#fff', fontSize: '12px' }} />
            <button type="button" onClick={sendMessage} style={{ padding: '6px 12px', backgroundColor: '#4f46e5', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>إرسال</button>
          </div>
        </div>
      </div>
    </div>
  );
}
