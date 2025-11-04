// /app/api/admin/update-user/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 서버사이드에서만 사용하는 Supabase 클라이언트 (service role key 필요)
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

export async function PATCH(request: NextRequest) {
  try {
    const { user_id, full_name, phone, department } = await request.json();

    // 1. 요청자 권한 확인
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // 요청자의 JWT 토큰 검증
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: '유효하지 않은 인증 토큰입니다.' }, { status: 401 });
    }

    // 요청자가 최고관리자인지 확인
    const { data: requesterProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('is_super_admin, role')
      .eq('id', user.id)
      .single();

    if (profileError || !requesterProfile?.is_super_admin) {
      return NextResponse.json({ error: '최고관리자만 사용자 정보를 수정할 수 있습니다.' }, { status: 403 });
    }

    // 2. 수정할 사용자 정보 확인
    const { data: targetUser, error: targetError } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name, role, is_super_admin')
      .eq('id', user_id)
      .single();

    if (targetError || !targetUser) {
      return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 });
    }

    // 3. users 테이블에서 사용자 정보 업데이트
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (full_name) updateData.full_name = full_name;
    if (phone !== undefined) updateData.phone = phone || null;
    if (department !== undefined) updateData.department = department || null;

    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', user_id);

    if (updateError) {
      console.error('사용자 정보 업데이트 실패:', updateError);
      return NextResponse.json(
        { error: `사용자 정보 업데이트 실패: ${updateError.message}` }, 
        { status: 500 }
      );
    }

    // 4. Auth 메타데이터도 업데이트 (이름이 변경된 경우)
    if (full_name) {
      try {
        await supabaseAdmin.auth.admin.updateUserById(user_id, {
          user_metadata: {
            full_name: full_name
          }
        });
      } catch (metaError) {
        console.error('Auth 메타데이터 업데이트 실패:', metaError);
        // 메타데이터 업데이트 실패는 critical하지 않으므로 계속 진행
      }
    }

    return NextResponse.json({
      success: true,
      message: `${targetUser.full_name}님의 정보가 업데이트되었습니다.`,
      user: {
        id: user_id,
        email: targetUser.email,
        full_name: full_name || targetUser.full_name,
        phone: phone,
        department: department,
        role: targetUser.role
      }
    });

  } catch (error) {
    console.error('사용자 정보 업데이트 API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' }, 
      { status: 500 }
    );
  }
}