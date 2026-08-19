import { PandaBrandArt } from "@/src/components/auth/PandaBrandArt";

/**
 * 판다 얼굴 + butter색 비정형 원형 면(DECISION_004 §4, design-package/app-welcome-mobile.html).
 * `/welcome`의 확인 중·비로그인 두 상태가 공유한다 — 판다는 화면당 1회만 쓰도록 이 컴포넌트로 통일한다.
 * 96~112px 범위(Decision 004 §4) 중 104px 한 크기만 쓴다 — 320px·390px 모두에서 무난히 들어맞고,
 * 반응형 이중 렌더링(숨김 처리된 이미지 중복 다운로드) 없이 단순하게 유지한다.
 */
export function PandaHalo() {
  return (
    <div
      aria-hidden="true"
      className="grid h-[124px] w-[124px] -rotate-2 place-items-center rounded-[47%_53%_50%_50%] bg-ll-butter/55"
    >
      <div className="rotate-2">
        <PandaBrandArt size={104} />
      </div>
    </div>
  );
}

export default PandaHalo;
