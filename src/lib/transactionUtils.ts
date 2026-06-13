
export function getTransactionColor(transaction: any, currentAccountId?: string) {
  const code = transaction.category?.code;

  // 1. 전체 계좌 조회 중일 때 이체/저축 성격의 색상 보정
  if (transaction.transferDetail && !currentAccountId) {
    const fromType = transaction.transferDetail.fromAccount.type;
    const toType = transaction.transferDetail.toAccount.type;

    const isFromSavings = fromType === "SAVINGS_INVESTMENT";
    const isToSavings = toType === "SAVINGS_INVESTMENT";

    // 저축 -> 일반 (수익/회수 느낌): 하늘색
    if (isFromSavings && !isToSavings) return "text-sky-500";
    // 일반 -> 저축 (저축/투자 느낌): 보라색
    if (!isFromSavings && isToSavings) return "text-purple-600";
  }

  // 2. 기본 카테고리 코드 기반 색상
  if (code === "SAVINGS_EXPENSE") {
    return "text-purple-600"; // 저축/투자 (보라색)
  }
  if (code === "SAVINGS_INCOME" || code === "INVESTMENT_INCOME") {
    return "text-sky-500"; // 수익/회수 (하늘색 계열)
  }
  if (code === "TRANSFER_INCOME" || code === "TRANSFER_EXPENSE" || code === "BALANCE_ADJUST_INCOME" || code === "BALANCE_ADJUST_EXPENSE") {
    return "text-gray-500"; // 이체, 잔액 조정 (회색)
  }

  // Default colors
  return transaction.type === "EXPENSE" ? "text-red-600" : "text-green-600";
}

export function getTransactionSign(transaction: any, currentAccountId?: string) {
  // 1. 특정 계좌를 조회 중인 경우 (해당 계좌 입장의 입출금이 명확함)
  if (currentAccountId) {
    return transaction.type === "EXPENSE" ? "-" : "+";
  }

  // 2. 전체 계좌 조회 중일 때 이체/저축인 경우
  if (transaction.transferDetail) {
    const fromType = transaction.transferDetail.fromAccount.type;
    const toType = transaction.transferDetail.toAccount.type;

    const isFromSavings = fromType === "SAVINGS_INVESTMENT";
    const isToSavings = toType === "SAVINGS_INVESTMENT";

    // 저축 -> 일반 (수익/회수 느낌): 내 메인 지갑으로 돈이 들어왔으므로 +
    if (isFromSavings && !isToSavings) return "+";
    // 일반 -> 저축 (저축/투자 느낌): 내 메인 지갑에서 돈이 나갔으므로 -
    if (!isFromSavings && isToSavings) return "-";
    // 같은 성격끼리의 이체 (일반->일반, 저축->저축): 전체 자산 변동이 없으므로 기호 없음
    return "";
  }

  // 3. 일반적인 수입/지출 및 잔액 조정
  return transaction.type === "EXPENSE" ? "-" : "+";
}

export function getAccountIcon(type: string) {
  if (type === "SAVINGS_INVESTMENT") return "🐷";
  if (type === "CASH") return "💵";
  if (type === "BANK") return "🏦";
  if (type === "CREDIT_CARD" || type === "CHECK_CARD") return "💳";
  return "🏷️";
}
