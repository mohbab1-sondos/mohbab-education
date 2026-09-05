import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, start_time } = body;

    if (!title || !start_time) {
      return NextResponse.json({ error: 'يرجى إدخال عنوان الجلسة وتاريخ البداية' }, { status: 400 });
    }

    // 1. التاكد من وجود class_id
    let classId = null;
    const { data: existingClass } = await supabase.from('classes').select('id').limit(1).maybeSingle();

    if (existingClass) {
      classId = existingClass.id;
    } else {
      // إنشاء صف افتراضي إذا كان الجدول فارغاً
      const { data: newClass } = await supabase.from('classes').insert([{ title: 'الصف العام' }]).select().single();
      classId = newClass?.id;
    }

    // 2. إدراج الجلسة الجديدة
    const { data, error } = await supabase
      .from('sessions')
      .insert([
        {
          title,
          description: description || '',
          start_time: new Date(start_time).toISOString(),
          class_id: classId,
          status: 'scheduled'
        }
      ])
      .select();

    if (error) {
      console.error('Supabase Insert Error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'خطأ سيرفر غير متوقع';
    console.error('API Error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
