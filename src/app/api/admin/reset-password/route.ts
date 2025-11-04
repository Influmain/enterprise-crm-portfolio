// app/api/admin/reset-password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase Admin Client (서버측에서만 사용)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Service Role Key 필요
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// 일반 Supabase Client (토큰 검증용)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // 1. Authorization 헤더에서 토큰 추출
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '인증 토큰이 필요합니다.' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];

    // 2. 토큰 검증 및 사용자 정보 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.error('토큰 검증 실패:', authError);
      return NextResponse.json({ error: '유효하지 않은 토큰입니다.' }, { status: 401 });
    }

    // 3. 관리자 권한 확인
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('role, full_name')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      console.error('사용자 프로필 조회 실패:', profileError);
      return NextResponse.json({ error: '사용자 정보를 확인할 수 없습니다.' }, { status: 403 });
    }

    if (userProfile.role !== 'admin' && userProfile.role !== 'super_admin') {
      console.error('권한 없음:', { userId: user.id, role: userProfile.role });
      return NextResponse.json({ error: '관리자만 비밀번호를 리셋할 수 있습니다.' }, { status: 403 });
    }

    // 4. 요청 데이터 검증
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('요청 본문 파싱 실패:', parseError);
      return NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 });
    }

    const { userId, newPassword } = body;

    if (!userId || !newPassword) {
      return NextResponse.json({ error: '사용자 ID와 새 비밀번호가 필요합니다.' }, { status: 400 });
    }

    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return NextResponse.json({ error: '비밀번호는 최소 6자리 이상이어야 합니다.' }, { status: 400 });
    }

    // 5. 대상 사용자가 영업사원인지 확인
    const { data: targetUser, error: targetUserError } = await supabase
      .from('users')
      .select('id, email, full_name, role')
      .eq('id', userId)
      .eq('role', 'counselor')
      .single();

    if (targetUserError || !targetUser) {
      console.error('대상 사용자 조회 실패:', targetUserError);
      return NextResponse.json({ error: '해당 영업사원을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 6. Supabase Admin API로 비밀번호 업데이트
    console.log(`비밀번호 리셋 시도: ${targetUser.full_name} (${targetUser.email})`);
    
    const { data: updateResult, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { 
        password: newPassword,
        // 이메일 확인을 우회하여 즉시 활성화
        email_confirm: true
      }
    );

    if (updateError) {
      console.error('Supabase Auth 비밀번호 업데이트 실패:', updateError);
      
      // 구체적인 에러 메시지 처리
      let errorMessage = '비밀번호 업데이트에 실패했습니다.';
      
      if (updateError.message.includes('User not found')) {
        errorMessage = '사용자를 찾을 수 없습니다.';
      } else if (updateError.message.includes('weak password')) {
        errorMessage = '비밀번호가 너무 약합니다.';
      } else if (updateError.message.includes('rate limit')) {
        errorMessage = '너무 많은 요청입니다. 잠시 후 다시 시도해주세요.';
      }
      
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }

    // 7. 성공 로그 기록
    console.log(`비밀번호 리셋 성공: ${targetUser.full_name} (${targetUser.email}) by ${userProfile.full_name}`);

    // 8. 성공 응답 (새 비밀번호는 클라이언트가 이미 가지고 있음)
    return NextResponse.json({
      success: true,
      message: '비밀번호가 성공적으로 리셋되었습니다.',
      user: {
        id: targetUser.id,
        email: targetUser.email,
        full_name: targetUser.full_name
      }
    });

  } catch (error: any) {
    console.error('비밀번호 리셋 API 에러:', error);
    
    return NextResponse.json({ 
      error: '서버 내부 오류가 발생했습니다.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

/*
사용법:

1. 환경변수 설정 (.env.local):
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

2. 클라이언트에서 호출:
const response = await fetch('/api/admin/reset-password', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`
  },
  body: JSON.stringify({
    userId: 'user-uuid',
    newPassword: 'newTempPassword123'
  })
});

3. Service Role Key 찾는 방법:
- Supabase 대시보드 > Settings > API
- Service Role Key (secret) 복사
- .env.local에 추가

주의사항:
- Service Role Key는 절대 클라이언트 코드에 노출하면 안됨
- 서버 사이드에서만 사용
- 모든 Supabase 데이터에 접근 가능한 강력한 키
*/