/**
 * Supabase 쿼리에 자동으로 데모 세션 필터를 추가하는 Hook
 *
 * 사용 예시:
 * const supabase = useSupabaseWithSession()
 * const { data } = await supabase.from('lead_pool').select('*') // 자동으로 demo_session_id 필터 추가됨
 */

import { useDemoSession } from '@/contexts/DemoSessionContext'
import { supabase as baseSupabase } from '@/lib/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'

export function useSupabaseWithSession() {
  const { sessionId } = useDemoSession()

  // Supabase 쿼리 빌더를 래핑하는 프록시
  const createFilteredQuery = (tableName: string) => {
    const query = baseSupabase.from(tableName)

    // 원본 select 메서드를 저장
    const originalSelect = query.select.bind(query)

    // select 메서드를 오버라이드
    query.select = function(columns?: string) {
      const selectQuery = originalSelect(columns)

      // demo_session_id 필터 자동 추가
      if (sessionId) {
        return selectQuery.eq('demo_session_id', sessionId)
      }

      return selectQuery
    }

    // insert 메서드를 오버라이드 (demo_session_id 자동 추가)
    const originalInsert = query.insert.bind(query)
    query.insert = function(values: any) {
      if (sessionId) {
        if (Array.isArray(values)) {
          // 배열인 경우 각 객체에 demo_session_id 추가
          const valuesWithSession = values.map(v => ({
            ...v,
            demo_session_id: sessionId
          }))
          return originalInsert(valuesWithSession)
        } else {
          // 단일 객체인 경우
          return originalInsert({
            ...values,
            demo_session_id: sessionId
          })
        }
      }
      return originalInsert(values)
    }

    // update 메서드를 오버라이드 (demo_session_id 필터 추가)
    const originalUpdate = query.update.bind(query)
    query.update = function(values: any) {
      const updateQuery = originalUpdate(values)

      // update는 where 조건과 함께 사용되므로, eq를 체이닝
      if (sessionId) {
        return updateQuery.eq('demo_session_id', sessionId)
      }

      return updateQuery
    }

    // delete 메서드를 오버라이드 (demo_session_id 필터 추가)
    const originalDelete = query.delete.bind(query)
    query.delete = function() {
      const deleteQuery = originalDelete()

      if (sessionId) {
        return deleteQuery.eq('demo_session_id', sessionId)
      }

      return deleteQuery
    }

    return query
  }

  // from 메서드를 오버라이드한 Supabase 클라이언트 반환
  return {
    ...baseSupabase,
    from: createFilteredQuery,

    // RPC 호출에도 세션 ID 전달
    rpc: (fnName: string, params: any = {}) => {
      if (sessionId && !params.p_session_id) {
        return baseSupabase.rpc(fnName, {
          ...params,
          p_session_id: sessionId
        })
      }
      return baseSupabase.rpc(fnName, params)
    },

    // 세션 ID 직접 접근 (필요한 경우)
    getSessionId: () => sessionId
  } as SupabaseClient & { getSessionId: () => string | null }
}
