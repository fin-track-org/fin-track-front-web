"use client";

import { ChevronLeft } from "lucide-react";

interface StepBackLinkProps {
  onClick: () => void;
  disabled?: boolean;
}

/**
 * 단계 2·3 상단의 "이전" 이동(§3 "같은 페이지 내 뒤로가기"). 이미 입력한 화면 임시 상태(폼 값)는
 * 되돌아가면 초기화되지만, 서버에 이미 저장된 모드·결제수단은 다음 단계 컴포넌트가 다시 조회해
 * 중복 생성을 막는다. 클릭 시 상위(OnboardingFlow)가 단계를 옮기면 새 h1으로 초점이 이동한다(§10).
 */
export function StepBackLink({ onClick, disabled }: StepBackLinkProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="mb-3 flex min-h-[44px] w-fit items-center gap-1 rounded-full px-1 text-xs font-semibold text-ll-pencil transition-colors hover:text-ll-ink disabled:cursor-not-allowed disabled:opacity-50"
    >
      <ChevronLeft size={14} aria-hidden="true" />
      이전
    </button>
  );
}

export default StepBackLink;
