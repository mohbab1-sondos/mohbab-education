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

  const channelRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const prevCoords = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const channelName = `room-${lessonId}`;
    const channel = client.channel(channelName);

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
      .on('broadcast', { event: 'lower-hand-single' }, ({ payload }) => {
        setRaisedHandsList((prev) => prev.filter((name) => name !== payload.studentName));
      })
      .on('broadcast', { event: 'clear-hands' }, () => {
        setRaisedHandsList([]);
        setHandRaised(false);
      })
      .on('broadcast', { event: 'chat' }, ({ payload }) => {
        setMessages((prev) => [...prev, payload]);
      })
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          setStatusText('متصل بالمزامنة المباشرة ●');
        } else {
          setIsConnected(false);
          setStatusText(`حالة الاتصال: ${status}`);
        }
      });

    channelRef.current = channel;

    return () => {
      client.removeChannel(channel);
    };
  }, [lessonId]);

  const sendBroadcast = (eventName: string, payload: Record<string, any>) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: eventName,
        payload,
      });
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
    sendBroadcast('draw', { prevX: prevCoords.current.x, prevY: prevCoords.current.y, currX: coords.x, currY: coords.y, color: penColor });

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
    sendBroadcast('clear', {});
  };

  const handleLowerSingleHand = (studentName: string) => {
    if (role !== 'teacher') return;
    setRaisedHandsList((prev) => prev.filter((name) => name !== studentName));
    sendBroadcast('lower-hand-single', { studentName });
  };

  const handleClearAllHands = () => {
    if (role !== 'teacher') return;
    setRaisedHandsList([]);
    sendBroadcast('clear-hands', {});
  };

  const toggleRaiseHand = () => {
    if (role === 'teacher') return;
    const newStatus = !handRaised;
    setHandRaised(newStatus);

    if (newStatus) {
      setRaisedHandsList((prev) => Array.from(new Set([...prev, userName])));
    } else {
      setRaisedHandsList((prev) => prev.filter((name) => name !== userName));
    }

    sendBroadcast('raise-hand', { studentName: userName, raised: newStatus });
  };

  const sendMessage = () => {
    if (!input.trim()) return;
    const msgData = { sender: `${userName} (${role === 'teacher' ? 'معلم' : 'طالب'})`, content: input };
    setMessages((prev) => [...prev, msgData]);
    sendBroadcast('chat', msgData);
    setInput('');
  };

  return (
    <div style={{ backgroundColor: '#0f172a', color: '#ffffff', padding: '20px', borderRadius: '16px', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }} dir="rtl">
      
      {/* الشريط العلوي */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '15px', paddingBottom: '15px', borderBottom: '1px solid #1e293b', marginBottom: '20px' }}>
        <div>
          <span style={{ fontSize: '13px', color: isConnected ? '#4ade80' : '#f59e0b', backgroundColor: isConnected ? 'rgba(74, 222, 128, 0.1)' : 'rgba(245, 158, 11, 0.1)', padding: '6px 12px', borderRadius: '20px', border: '1px solid currentColor', fontWeight: 'bold' }}>
            {statusText}
          </span>
        </div>

        <div style={{ display: 'flex', backgroundColor: '#1e293b', padding: '4px', borderRadius: '10px', border: '1px solid #334155' }}>
          <button
            type="button"
            onClick={() => { setRole('teacher'); setUserName('المعلم'); }}
            style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 'bold', borderRadius: '8px', border: 'none', cursor: 'pointer', backgroundColor: role === 'teacher' ? '#4f46e5' : 'transparent', color: role === 'teacher' ? '#ffffff' : '#94a3b8', transition: 'all 0.2s' }}
          >
            👨‍🏫 وضع المعلم
          </button>
          <button
            type="button"
            onClick={() => { setRole('student'); setUserName('طالب'); }}
            style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 'bold', borderRadius: '8px', border: 'none', cursor: 'pointer', backgroundColor: role === 'student' ? '#4f46e5' : 'transparent', color: role === 'student' ? '#ffffff' : '#94a3b8', transition: 'all 0.2s' }}
          >
            👨‍🎓 وضع الطالب
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            style={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#ffffff', fontSize: '13px', borderRadius: '8px', padding: '8px 12px', textAlign: 'center', width: '120px' }}
            placeholder="اسم المستجيب"
          />

          {role === 'teacher' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="color"
                value={penColor}
                onChange={(e) => setPenColor(e.target.value)}
                style={{ width: '36px', height: '36px', border: 'none', background: 'none', cursor: 'pointer' }}
                title="لون القلم"
              />
              <button
                type="button"
                onClick={handleClearBoard}
                style={{ backgroundColor: '#e11d48', color: '#ffffff', fontSize: '13px', fontWeight: 'bold', padding: '8px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
              >
                مسح السبورة
              </button>
              {raisedHandsList.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllHands}
                  style={{ backgroundColor: '#d97706', color: '#ffffff', fontSize: '13px', fontWeight: 'bold', padding: '8px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
                >
                  تصفير الكل ✋
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={toggleRaiseHand}
              style={{ backgroundColor: handRaised ? '#d97706' : '#1e293b', color: '#ffffff', fontSize: '13px', fontWeight: 'bold', padding: '8px 16px', borderRadius: '8px', border: '1px solid #334155', cursor: 'pointer' }}
            >
              {handRaised ? '✋ اليد مرفوعة' : '✋ رفع اليد'}
            </button>
          )}
        </div>
      </div>

      {/* شريط قائمة المستأذنين */}
      {raisedHandsList.length > 0 && (
        <div style={{ backgroundColor: 'rgba(120, 53, 15, 0.4)', border: '1px solid rgba(245, 158, 11, 0.4)', padding: '12px 16px', borderRadius: '12px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ color: '#fef3c7', fontSize: '13px', fontWeight: 'bold' }}>✋ المستأذنون حالياً:</span>
          {raisedHandsList.map((student) => (
            <span key={student} style={{ backgroundColor: 'rgba(146, 64, 14, 0.8)', color: '#ffffff', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {student}
              {role === 'teacher' && (
                <button
                  type="button"
                  onClick={() => handleLowerSingleHand(student)}
                  style={{ backgroundColor: '#ef4444', color: '#ffffff', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyConent: 'center', lineHeight: '1' }}
                  title="تنزيل اليد"
                >
                  ✕
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* السبورة والمحادثة */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        <div style={{ backgroundColor: '#020617', padding: '8px', borderRadius: '12px', border: '1px solid #1e293b' }}>
          <canvas
            ref={canvasRef}
            width={1280}
            height={720}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            style={{ width: '100%', height: '400px', backgroundColor: '#020617', borderRadius: '8px', cursor: role === 'teacher' ? 'crosshair' : 'default', display: 'block' }}
          />
        </div>

        <div style={{ backgroundColor: 'rgba(30, 41, 59, 0.5)', padding: '12px', borderRadius: '12px', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '416px' }}>
          <div style={{ flex: 1, overflowY: 'auto', marginBottom: '12px', paddingLeft: '4px' }}>
            {messages.length === 0 ? (
              <div style={{ height: '100%', display: 'flex', itemsCenter: 'center', justifyContent: 'center', color: '#64748b', fontSize: '12px' }}>لا توجد رسائل بعد...</div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} style={{ backgroundColor: '#1e293b', padding: '10px', borderRadius: '8px', border: '1px solid #334155', marginBottom: '8px' }}>
                  <span style={{ color: '#818cf8', fontWeight: 'bold', fontSize: '12px', display: 'block', marginBottom: '2px' }}>{msg.sender}</span>
                  <span style={{ color: '#e2e8f0', fontSize: '12px' }}>{msg.content}</span>
                </div>
              ))
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="اكتب رسالة..."
              style={{ flex: 1, backgroundColor: '#0f172a', border: '1px solid #334155', color: '#ffffff', fontSize: '12px', borderRadius: '8px', padding: '8px 12px' }}
            />
            <button
              type="button"
              onClick={sendMessage}
              style={{ backgroundColor: '#4f46e5', color: '#ffffff', fontSize: '12px', fontWeight: 'bold', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
            >
              إرسال
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
