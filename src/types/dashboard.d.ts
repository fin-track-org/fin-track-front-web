/* Res */
interface Transaction {
  id: number;
  date: string;
  category: string;
  description: string;
  amount: number;
}

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
