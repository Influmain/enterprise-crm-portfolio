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

export async function POST(request: NextRequest) {
  try {
    const { user_id, restored_by } = await request.json();

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
      return NextResponse.json({ error: '최고관리자만 계정을 복구할 수 있습니다.' }, { status: 403 });
    }

    // 2. 삭제된 사용자인지 확인
    const { data: deletedUser, error: checkError } = await supabaseAdmin
      .from('users')
      .select('id, full_name, email, deleted_at')
      .eq('id', user_id)
      .eq('is_active', false)
      .not('deleted_at', 'is', null)
      .single();

    if (checkError || !deletedUser) {
      return NextResponse.json(
        { error: '삭제된 사용자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 3. 사용자 복구
    const { error: restoreError } = await supabaseAdmin
      .from('users')
      .update({
        is_active: true,
        deleted_at: null,
        deleted_by: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', user_id);

    if (restoreError) {
      console.error('복구 실패:', restoreError);
      return NextResponse.json(
        { error: `복구 실패: ${restoreError.message}` },
        { status: 500 }
      );
    }

    // 4. 사용자 권한도 복구
    const { error: permError } = await supabaseAdmin
      .from('user_permissions')
      .update({ is_active: true })
      .eq('user_id', user_id);

    if (permError) {
      console.warn('권한 복구 실패:', permError);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: deletedUser.id,
        email: deletedUser.email,
        full_name: deletedUser.full_name
      },
      message: `${deletedUser.full_name}님의 계정이 복구되었습니다.`
    });

  } catch (error) {
    console.error('복구 API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 삭제된 사용자 목록 조회
export async function GET(request: NextRequest) {
  try {
    // 권한 확인
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: '유효하지 않은 인증 토큰입니다.' }, { status: 401 });
    }

    const { data: requesterProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('is_super_admin')
      .eq('id', user.id)
      .single();

    if (profileError || !requesterProfile?.is_super_admin) {
      return NextResponse.json({ error: '최고관리자만 접근할 수 있습니다.' }, { status: 403 });
    }

    // 삭제된 사용자 목록 조회 (관계 조인 제거)
    const { data: deletedUsers, error: queryError } = await supabaseAdmin
      .from('users')
      .select(`
        id, 
        email, 
        full_name, 
        role, 
        department, 
        deleted_at,
        deleted_by
      `)
      .eq('is_active', false)
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });

    if (queryError) {
      console.error('삭제된 사용자 조회 실패:', queryError);
      return NextResponse.json(
        { error: `조회 실패: ${queryError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      deletedUsers: deletedUsers || []
    });

  } catch (error) {
    console.error('삭제된 사용자 조회 API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}