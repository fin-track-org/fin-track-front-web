interface SubCategory {
  id: string;
  name: string;
}

interface PaymentMethod {
  id: string;
  type: PaymentMethodType | string;
  name: string;
  provider?: string;
  isActive?: boolean;
}

interface CreateTransactionPayload {
  date: string; // YYYY-MM-DD
  type: TransactionType | "TRANSFER"; // 모달에서 결정
  amount: number; // ✅ 서버에 보낼 최종 amount(지출 음수, 수입 양수)
  categoryId: string; // 일반 거래시 필수
  subCategoryId: string;
  accountId: string; // 출금 계좌 (또는 일반 결제수단)
  toAccountId?: string; // 입금 계좌 (이체/저축 시)
  isSavings?: boolean; // 저축/투자 여부 (이체/저축 시)

  // 아래는 지금 당장 서버에 안 보내도 됨.
  // TODO(api 확장): 서버 DTO에 추가되면 body에 포함시키면 됨.
  merchantText?: string | null;
  description?: string | null;
}

interface AddTransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  categories: Category[];
  accounts: Account[];

  onSubmit: (payload: CreateTransactionPayload) => Promise<void>;
  onSaveDraft?: (payload: Partial<CreateTransactionPayload>) => Promise<void>;
  defaultValues?: Partial<CreateTransactionPayload>;
  mode: "create" | "edit" | "confirm-draft" | "quick";
  isTutorialMode?: boolean;

  /**
   * "나중에 분류" 연속 처리(SequentialCategorizer) 전용 옵션.
   * 지정하지 않으면 기존 단건 create/edit/confirm-draft/quick 동작과 완전히 동일하다.
   */
  /**
   * 지정 시 헤더가 "나중에 분류 · i/N"로 바뀌고, 진행 상황 표시와 전용 푸터가 노출된다.
   * `remaining`(IMPLEMENTATION_BRIEF_018 §9 "현재 항목을 제외한 미완료 draft 수")이 있으면
   * "N건 남았어요" 안내를 함께 표시한다.
   */
  queueProgress?: { current: number; total: number; remaining?: number };
  /** 큐 모드에서 "나중에" 버튼을 노출하고 클릭 시 호출한다. 서버 호출 없이 다음으로 넘긴다. */
  onSkip?: () => void;
  /** 지정 시에만 "← 이전 기록" 버튼을 노출한다(이전 미완료 항목이 없으면 prop 자체를 넘기지 않는다). */
  onPrevious?: () => void;
  /** 큐 모드에서 "남은 분류는 다음에 할게요" 버튼을 노출하고 클릭 시 호출한다(전체 세션 종료). */
  onSkipRemaining?: () => void;
  /** false면 onSubmit 성공 후에도 모달을 자동으로 닫거나 입력값을 리셋하지 않는다. (기본 true) */
  autoCloseOnSubmit?: boolean;
  /** 큐 항목이 바뀔 때마다 다른 값을 넘기면 180~240ms 전환 애니메이션이 재생된다 (reduced-motion에서 자동 제거). */
  transitionKey?: string | number;
  /**
   * 비동기로 늦게 도착할 수 있는 카테고리 추천값. `defaultValues`와 달리 폼 전체를
   * 리셋하지 않고, 비어 있고 사용자가 아직 건드리지 않은 필드에만 채워 넣는다.
   */
  suggestedValues?: Partial<Pick<CreateTransactionPayload, "categoryId" | "subCategoryId" | "accountId">>;
  /**
   * 추천 근거. 자동 선택 안내 문구("지난 기록을 참고해 자동 선택했어요" / "최근 자주 쓴 분류로
   * 자동 선택했어요")를 고르는 데 쓰인다. 근거가 없으면("none") 아무 안내도 표시하지 않는다.
   */
  suggestionBasis?: "memo-history" | "recent-choice" | "frequency" | "none";
}
