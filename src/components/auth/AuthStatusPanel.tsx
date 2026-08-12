"use client";

import { ReactNode } from "react";
import { Loader2 } from "lucide-react";

interface AuthStatusPanelProps {
  title: string;
  description?: ReactNode;
  /** 로딩 스피너 + aria-busy/role="status" 부여 */
  busy?: boolean;
  children?: ReactNode;
}

/**
 * 폼 대신 화면 전체를 차지하는 인증 상태(초기 세션 확인, 이메일 인증 대기 등)를 보여준다.
 * `StatePanel`(ftweb/src/components/ledger/StatePanel.tsx)과 같은 시각 언어를 쓰되,
 * 전체 화면 중앙 배치 + 액션 버튼 여러 개를 세로로 쌓을 수 있도록 확장했다.
 * 페이지당 h1이 1개가 되도록, 이 컴포넌트가 렌더링되는 상태에서는 폼(h1 포함)을 대체한다.
 */
export function AuthStatusPanel({ title, description, busy, children }: AuthStatusPanelProps) {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-ll-paper px-4 py-10"
      role={busy ? "status" : undefined}
      aria-busy={busy || undefined}
    >
      <div className="w-full max-w-sm rounded-2xl border-t-4 border-ll-periwinkle bg-white p-8 text-center shadow-[4px_5px_0_rgba(32,40,58,0.06)]">
        {busy && (
          <div className="mb-4 flex justify-center" aria-hidden="true">
            <Loader2 className="h-8 w-8 animate-spin text-ll-pencil" />
          </div>
        )}
        <h1 className="mb-2 text-xl font-bold text-ll-ink break-keep">{title}</h1>
        {description && (
          <div className="text-sm leading-relaxed text-ll-pencil break-keep [overflow-wrap:break-word]">
            {description}
          </div>
        )}
        {children && <div className="mt-6 space-y-2">{children}</div>}
      </div>
    </div>
  );
}

export default AuthStatusPanel;
