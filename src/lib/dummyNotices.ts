import { Notice } from "@/src/types/notice";

export const DUMMY_NOTICES: Notice[] = [
  {
    id: 1,
    title: "🚀 [공지] 게으른 가계부 V1.0.0 비공개 테스트 오픈 안내",
    summary: "드디어 세상의 모든 게으른 완벽주의자들을 위한 가계부 첫 테스트가 시작되었습니다! 많은 피드백 부탁드립니다.",
    detailUrl: "https://cafe.naver.com/lazykit/1",
    isPinned: true,
    isVisible: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2시간 전
  },
  {
    id: 2,
    title: "🛠️ 주말 서버 점검 안내 (예정)",
    summary: "안정적인 서비스 제공을 위해 이번 주말 새벽 2시부터 4시까지 서버 점검이 진행될 예정입니다.",
    detailUrl: "https://cafe.naver.com/lazykit/2",
    isPinned: false,
    isVisible: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(), // 4일 전 (3일 지남)
  },
  {
    id: 3,
    title: "🎁 가계부 작성하고 100P 받으세요",
    summary: "매일 가계부를 작성하시면 포인트 상점에서 사용 가능한 100P를 드립니다.",
    detailUrl: "https://cafe.naver.com/lazykit/3",
    isPinned: false,
    isVisible: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(), // 1일 전 (최신)
  },
];
