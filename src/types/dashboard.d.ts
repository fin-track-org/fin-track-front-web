/* Res */
// interface Transaction {
//   id: string;
//   date: string; // YYYY-MM-DD
//   amount: number; // 지출은 - , 수입은 +
//   type: TransactionType;
//   category: string; // 지금은 문자열
//   description: string; // 메모/내역
//   // TODO(api 확장): subCategory, paymentMethodId, merchantText 등 추가될 예정
// }
/* interface Transaction {
  id: string;
  date: string;
  type: "EXPENSE" | "INCOME";
  amount: number;
  categoryName: string;
  subcategoryId?: string;
  paymentMethodId: string;
  merchantText?: string;
  note?: string;
} */

/* Summary */
interface Summary {
  income: number;
  expense: number;
  balance: number;
}

/* Chart */
interface GraphData {
  date: string;
  income: number;
  expense: number;
  balance: number;
}

interface CategoryData {
  name: string;
  value: number;
  color: string;
  percentage: number;
}
