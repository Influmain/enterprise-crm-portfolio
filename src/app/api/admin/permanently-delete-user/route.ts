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
    const { user_id, confirmation_text } = await request.json();

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
      return NextResponse.json({ error: '최고관리자만 계정을 완전 삭제할 수 있습니다.' }, { status: 403 });
    }

    // 2. 삭제 대상 사용자 확인 (이미 소프트 삭제된 사용자만)
    const { data: targetUser, error: checkError } = await supabaseAdmin
      .from('users')
      .select('id, full_name, email, deleted_at')
      .eq('id', user_id)
      .eq('is_active', false)
      .not('deleted_at', 'is', null)
      .single();

    if (checkError || !targetUser) {
      return NextResponse.json(
        { error: '삭제된 사용자를 찾을 수 없습니다. 이미 완전 삭제되었거나 활성 사용자입니다.' },
        { status: 404 }
      );
    }

    // 3. 확인 텍스트 검증 (보안 강화)
    const expectedText = `DELETE ${targetUser.full_name}`;
    if (confirmation_text !== expectedText) {
      return NextResponse.json(
        { error: `확인 텍스트가 일치하지 않습니다. "${expectedText}"를 정확히 입력하세요.` },
        { status: 400 }
      );
    }

    // 4. 관련 데이터 완전 삭제 (참조 무결성 순서 주의)
    
    // 4-1. 리드 배정 기록 삭제
    const { error: assignmentError } = await supabaseAdmin
      .from('lead_assignments')
      .delete()
      .eq('counselor_id', user_id);

    if (assignmentError) {
      console.warn('리드 배정 기록 삭제 실패:', assignmentError);
    }

    // 4-2. 사용자 권한 삭제
    const { error: permError } = await supabaseAdmin
      .from('user_permissions')
      .delete()
      .eq('user_id', user_id);

    if (permError) {
      console.warn('사용자 권한 삭제 실패:', permError);
    }

    // 4-3. 부서 권한 삭제
    const { error: deptPermError } = await supabaseAdmin
      .from('department_permissions')
      .delete()
      .eq('user_id', user_id);

    if (deptPermError) {
      console.warn('부서 권한 삭제 실패:', deptPermError);
    }

    // 5. public.users 테이블에서 완전 삭제
    const { error: dbDeleteError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', user_id);

    if (dbDeleteError) {
      console.error('DB 사용자 삭제 실패:', dbDeleteError);
      return NextResponse.json(
        { error: `DB 삭제 실패: ${dbDeleteError.message}` },
        { status: 500 }
      );
    }

    // 6. auth.users에서 완전 삭제
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id);

    if (authDeleteError) {
      console.error('Auth 사용자 삭제 실패:', authDeleteError);
      return NextResponse.json(
        { error: `Auth 삭제 실패: ${authDeleteError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${targetUser.full_name}님의 계정과 모든 관련 데이터가 완전히 삭제되었습니다.`,
      deleted_user: {
        id: targetUser.id,
        email: targetUser.email,
        full_name: targetUser.full_name
      }
    });

  } catch (error) {
    console.error('완전 삭제 API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}