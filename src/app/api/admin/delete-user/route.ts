import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function DELETE(request: NextRequest) {
  try {
    const { user_id, deleted_by } = await request.json();

    // 1. 요청자 권한 확인
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: '유효하지 않은 인증 토큰입니다.' }, { status: 401 });
    }

    // 요청자가 최고관리자인지 확인
    const { data: requesterProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('is_super_admin')
      .eq('id', user.id)
      .single();

    if (profileError || !requesterProfile?.is_super_admin) {
      return NextResponse.json({ error: '최고관리자만 계정을 삭제할 수 있습니다.' }, { status: 403 });
    }

    // 2. 소프트 삭제 실행 (Auth 계정은 유지)
    const { error: deleteError } = await supabaseAdmin
      .from('users')
      .update({
        is_active: false,
        deleted_at: new Date().toISOString(),
        deleted_by: deleted_by
      })
      .eq('id', user_id);

    if (deleteError) {
      console.error('소프트 삭제 실패:', deleteError);
      return NextResponse.json(
        { error: `삭제 실패: ${deleteError.message}` },
        { status: 500 }
      );
    }

    // 3. 사용자 권한도 비활성화
    const { error: permError } = await supabaseAdmin
      .from('user_permissions')
      .update({ is_active: false })
      .eq('user_id', user_id);

    if (permError) {
      console.warn('권한 비활성화 실패:', permError);
    }

    return NextResponse.json({
      success: true,
      message: '사용자가 비활성화되었습니다. (복구 가능)'
    });

  } catch (error) {
    console.error('삭제 API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}