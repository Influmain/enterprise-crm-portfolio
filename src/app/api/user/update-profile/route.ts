// src/app/api/user/update-profile/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

const normalClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    console.log('=== API 요청 시작 ===');
    
    const payload = await req.json();
    console.log('받은 전체 데이터:', payload);
    
    // 다양한 방식으로 user_id 찾기
    const userId = payload.user_id || payload.userId || payload.id;
    console.log('추출된 userId:', userId);
    console.log('payload.user_id:', payload.user_id);
    console.log('payload.userId:', payload.userId);
    console.log('payload.id:', payload.id);
    
    if (!userId) {
      console.error('❌ 사용자 ID 없음');
      console.error('전체 payload keys:', Object.keys(payload));
      console.error('payload 타입:', typeof payload);
      return NextResponse.json({ 
        error: 'User ID required', 
        received_data: payload,
        keys: Object.keys(payload)
      }, { status: 400 });
    }

    console.log('✅ 사용자 ID 확인됨:', userId);

    // 사용자 존재 확인
    console.log('사용자 정보 조회 중...');
    const { data: userInfo, error: userQueryError } = await normalClient
      .from('users')
      .select('id, email, full_name')
      .eq('id', userId)
      .single();

    console.log('DB 조회 결과:', { userInfo, userQueryError });

    if (userQueryError || !userInfo) {
      console.error('❌ 사용자를 찾을 수 없음');
      return NextResponse.json({ 
        error: 'User not found', 
        userId: userId,
        dbError: userQueryError?.message 
      }, { status: 404 });
    }

    console.log('✅ 사용자 확인됨:', userInfo.email);

    // 프로필 업데이트 준비
    const profileChanges: any = {};
    
    if (payload.full_name !== undefined && payload.full_name !== null) {
      profileChanges.full_name = payload.full_name;
      console.log('이름 업데이트:', payload.full_name);
    }
    
    if (payload.phone !== undefined && payload.phone !== null) {
      profileChanges.phone = payload.phone;
      console.log('전화번호 업데이트:', payload.phone);
    }

    // 프로필 정보 업데이트
    if (Object.keys(profileChanges).length > 0) {
      console.log('프로필 업데이트 실행:', profileChanges);
      
      const { error: updateError } = await normalClient
        .from('users')
        .update(profileChanges)
        .eq('id', userId);

      if (updateError) {
        console.error('❌ 프로필 업데이트 실패:', updateError);
        return NextResponse.json({ 
          error: 'Profile update failed', 
          details: updateError.message 
        }, { status: 500 });
      }
      
      console.log('✅ 프로필 업데이트 성공');
    } else {
      console.log('프로필 업데이트할 내용 없음');
    }

    // 비밀번호 변경 처리
    if (payload.current_password && payload.new_password) {
      console.log('비밀번호 변경 시작');
      
      try {
        // 현재 비밀번호 확인
        const { error: authError } = await normalClient.auth.signInWithPassword({
          email: userInfo.email,
          password: payload.current_password
        });

        if (authError) {
          console.error('❌ 현재 비밀번호 틀림:', authError.message);
          return NextResponse.json({ 
            error: 'Current password is incorrect' 
          }, { status: 400 });
        }

        console.log('✅ 현재 비밀번호 확인됨');

        // 새 비밀번호로 업데이트
        const { error: passwordError } = await adminClient.auth.admin.updateUserById(userId, {
          password: payload.new_password
        });

        if (passwordError) {
          console.error('❌ 비밀번호 업데이트 실패:', passwordError);
          return NextResponse.json({ 
            error: 'Password update failed', 
            details: passwordError.message 
          }, { status: 500 });
        }

        console.log('✅ 비밀번호 변경 성공');
      } catch (pwdError: any) {
        console.error('❌ 비밀번호 변경 중 오류:', pwdError);
        return NextResponse.json({ 
          error: 'Password change error', 
          details: pwdError.message 
        }, { status: 500 });
      }
    }

    console.log('=== API 성공 완료 ===');
    return NextResponse.json({ 
      success: true, 
      message: 'Profile updated successfully',
      updated_fields: Object.keys(profileChanges),
      password_changed: !!(payload.current_password && payload.new_password)
    });

  } catch (error: any) {
    console.error('=== API 전체 에러 ===', error);
    return NextResponse.json({ 
      error: 'Server error', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

// 테스트용 GET 메서드
export async function GET() {
  return NextResponse.json({ 
    status: 'Profile update API is working',
    timestamp: new Date().toISOString(),
    env_check: {
      has_supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      has_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      has_anon_key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    }
  });
}