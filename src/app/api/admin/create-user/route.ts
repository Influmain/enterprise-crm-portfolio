// /app/api/admin/create-user/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 서버사이드에서만 사용하는 Supabase 클라이언트 (service role key 필요)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // 환경변수에 추가 필요
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(request: NextRequest) {
  try {
    const { email, password, full_name, phone, department, role, created_by } = await request.json();

    // 1. 요청자 권한 확인
    const authHeader = request.headers.get('Authorization');
    console.log('🔍 Authorization 헤더:', authHeader ? '존재' : '없음');
    
    if (!authHeader) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('🔍 토큰 길이:', token.length);
    console.log('🔍 토큰 시작:', token.substring(0, 20) + '...');
    
    // 요청자의 JWT 토큰 검증
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    console.log('🔍 토큰 검증 결과:', authError ? `오류: ${authError.message}` : '성공');
    console.log('🔍 사용자 정보:', user ? `ID: ${user.id}, 이메일: ${user.email}` : '없음');
    
    if (authError || !user) {
      console.log('❌ 토큰 검증 실패:', authError?.message || '사용자 없음');
      return NextResponse.json({ error: '유효하지 않은 인증 토큰입니다.' }, { status: 401 });
    }

    // 요청자가 관리자이고 counselors 권한이 있는지 확인
    const { data: requesterProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('role, is_super_admin')
      .eq('id', user.id)
      .single();

    if (profileError || requesterProfile?.role !== 'admin') {
      return NextResponse.json({ error: '관리자만 계정을 생성할 수 있습니다.' }, { status: 403 });
    }

    // 최고관리자가 아닌 경우 counselors 권한 확인
    if (!requesterProfile.is_super_admin) {
      const { data: permissions, error: permError } = await supabaseAdmin
        .from('user_permissions')
        .select('permission_type')
        .eq('user_id', user.id)
        .eq('permission_type', 'counselors')
        .eq('is_active', true);

      if (permError || !permissions || permissions.length === 0) {
        return NextResponse.json({ error: '상담원 관리 권한이 없습니다.' }, { status: 403 });
      }
    }

    // 2. Supabase Auth에 사용자 생성
    const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        role
      }
    });

    if (createError) {
      console.error('Auth 사용자 생성 실패:', createError);
      return NextResponse.json(
        { error: `계정 생성 실패: ${createError.message}` }, 
        { status: 400 }
      );
    }

    // 3. users 테이블에 사용자 정보 추가
    const { error: dbError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: authUser.user.id,
        email,
        full_name,
        phone: phone || null,
        department: department || null,
        role,
        is_active: true,
        is_super_admin: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (dbError) {
      console.error('사용자 정보 저장 실패:', dbError);
      
      // Auth에서 생성된 사용자 삭제 (롤백)
      try {
        await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      } catch (rollbackError) {
        console.error('롤백 실패:', rollbackError);
      }
      
      return NextResponse.json(
        { error: `사용자 정보 저장 실패: ${dbError.message}` }, 
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: authUser.user.id,
        email,
        full_name,
        role
      },
      message: `${full_name}님의 ${role === 'admin' ? '관리자' : '영업사원'} 계정이 생성되었습니다.`
    });

  } catch (error) {
    console.error('계정 생성 API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' }, 
      { status: 500 }
    );
  }
}