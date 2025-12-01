"use client"; 

import { useState, useEffect } from 'react';
// ⬇️ 임포트 경로를 상대 경로로 수정했습니다.
import { createClient } from '../../../lib/supabase/client'; 
import AddTransactionModal from '../../../components/AddTransactionModal'; 

// (3) .env.local에서 Spring Boot URL을 읽어옵니다. (서버 재시작 필수!)
const SPRING_BOOT_URL = process.env.NEXT_PUBLIC_SPRING_BOOT_URL!;

// (4) API 응답 데이터의 타입 정의 (Transaction 엔티티와 일치)
interface Transaction {
  id: number;
  date: string;
  category: string;
  description: string;
  amount: number;
}

export default function LedgerPage() {
  const supabase = createClient();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  // ⬇️ (A) 수정할 거래 내역의 상태를 추가합니다. (null이면 추가 모드)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // (5) API로부터 가계부 목록을 불러오는 함수
const fetchTransactions = async () => {
setLoading(true);
setError(null);
try {
// [JWT 가져오기]
const { data: { session } } = await supabase.auth.getSession();
if (!session) {
throw new Error("로그인이 필요합니다.");
}
const token = session.access_token;


console.log(token);

// (6) 환경 변수와 context path가 적용된 URL 사용
const response = await fetch(`${SPRING_BOOT_URL}/api/v1/transactions`, {
method: 'GET',
headers: {
'Authorization': `Bearer ${token}`
}
});

if (!response.ok) {
throw new Error("데이터를 불러오는 데 실패했습니다.");
}

const responseData = await response.json();

// (7) Spring Boot의 CommonResponse 형식에 맞게 데이터 파싱
if (responseData.statusCode === 0 && responseData.data) {
setTransactions(responseData.data); 
} else {
throw new Error(responseData.message || "데이터 형식이 올바르지 않습니다.");
}

} catch (err: any) {
console.error("Fetch Error:", err);
setError(err.message);
} finally {
setLoading(false);
}
};

// (8) 페이지가 처음 로드될 때, 목록을 1번 불러옵니다.
useEffect(() => {
fetchTransactions();
}, []); 

// (9) 삭제 버튼 클릭 시 실행되는 함수
const handleDelete = async (id: number) => {
if (!confirm("정말 이 내역을 삭제하시겠습니까?")) {
return;
}

try {
// [JWT 가져오기]
const { data: { session } } = await supabase.auth.getSession();
if (!session) throw new Error("로그인이 필요합니다.");
const token = session.access_token;

// (10) 환경 변수와 context path가 적용된 URL 사용
const response = await fetch(`${SPRING_BOOT_URL}/api/v1/transactions/${id}`, {
method: 'DELETE',
headers: {
'Authorization': `Bearer ${token}`
}
});

if (!response.ok) { 
throw new Error("삭제에 실패했습니다.");
}

// (11) API에서 성공 시, 화면(State)에서도 해당 아이템을 제거
setTransactions(transactions.filter(t => t.id !== id));
alert("삭제되었습니다."); 

} catch (err: any) {
console.error("Delete Error:", err);
setError(err.message);
}
};

  // ⬇️ (B) 수정 버튼 클릭 핸들러: 모달을 열고 수정할 데이터를 설정
  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsModalOpen(true);
  };
  
  // ⬇️ (C) 모달 닫기 핸들러
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTransaction(null); // 수정 모드 해제
  };

// ⬇️ (12) 👈 "저장 성공" 시 모달이 호출할 함수 (onSaveSuccess 에러 해결)
const handleSaveSuccess = () => {
fetchTransactions(); // 목록을 다시 불러옵니다.
    setEditingTransaction(null); // 수정 모드 해제
};

return (
<> 
<section className="bg-white rounded-lg shadow-md overflow-hidden">
{/* 페이지 헤더 (새 거래 추가 버튼) */}
<div className="p-6 flex justify-between items-center border-b border-gray-200">
<h2 className="text-xl font-semibold text-gray-800">
전체 가계부 내역
</h2>
<button 
// ⬇️ (D) 새 거래 추가 버튼 클릭 시, 수정 데이터는 null로 초기화
onClick={() => { setEditingTransaction(null); setIsModalOpen(true); }}
className="bg-sky-500 text-white px-5 py-2 rounded-lg font-medium hover:bg-sky-600 transition-colors"
>
+ 새 거래 추가
</button>
</div>

{/* 필터 및 검색 (선택 사항) */}
<div className="p-4 bg-gray-50 border-b border-gray-200">
<input
type="text"
placeholder="내역 검색..."
className="px-3 py-2 border border-gray-300 rounded-md shadow-sm"
/>
</div>

{/* 엑셀 시트형 테이블 */}
<table className="w-full min-w-full">
<thead className="bg-gray-100">
<tr>
<th className="text-left p-4 font-semibold text-gray-600">날짜</th>
<th className="text-left p-4 font-semibold text-gray-600">카테고리</th>
<th className="text-left p-4 font-semibold text-gray-600">내역</th>
<th className="text-right p-4 font-semibold text-gray-600">금액</th>
<th className="text-center p-4 font-semibold text-gray-600">관리</th>
</tr>
</thead>
<tbody>
{/* (13) 로딩 및 에러 상태 처리 */}
{loading && (<tr><td colSpan={5} className="p-4 text-center text-gray-500">데이터를 불러오는 중...</td></tr>)}
{error && (<tr><td colSpan={5} className="p-4 text-center text-red-500">{error}</td></tr>)}
{!loading && !error && transactions.length === 0 && (<tr><td colSpan={5} className="p-4 text-center text-gray-500">거래 내역이 없습니다.</td></tr>)}

{/* (14) API 데이터로 목록을 렌더링 */}
{transactions.map((item) => (
<tr key={item.id} className="border-b border-gray-200 hover:bg-gray-50">
<td className="p-4 text-gray-700">{item.date}</td>
<td className="p-4 text-gray-700">{item.category}</td>
<td className="p-4 text-gray-900 font-medium">{item.description}</td>
<td
className={`p-4 font-medium text-right ${item.amount > 0 ? 'text-sky-600' : 'text-red-500'
}`}
>
{item.amount.toLocaleString()}원
</td>
<td className="p-4 text-center">
{/* ⬇️ (E) 수정 버튼 클릭 시 handleEdit 호출 */}
<button 
                      onClick={() => handleEdit(item)}
                      className="text-yellow-600 hover:underline px-2"
                    >
                      수정
                    </button>
<button 
onClick={() => handleDelete(item.id)}
className="text-red-600 hover:underline px-2"
>
삭제
</button>
</td>
</tr>
))}
</tbody>
</table>
</section>

{/* ⬇️ (15) 👈 모달의 상태와 데이터를 처리 */}
{(isModalOpen || editingTransaction) && (
<AddTransactionModal 
onClose={handleCloseModal} // 수정 모드 해제 로직 포함
onSaveSuccess={handleSaveSuccess}
          currentTransaction={editingTransaction || undefined} // 수정 모드일 때만 데이터 전달
/>
)}
</>
);
}