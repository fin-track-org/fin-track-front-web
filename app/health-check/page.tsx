"use client"; // 👈 버튼 클릭, 상태 저장을 위해 클라이언트 컴포넌트여야 합니다.

import { useState } from 'react';

export default function HealthCheckPage() {
    // 각 API 호출 결과를 저장할 State
    const [pingResult, setPingResult] = useState<string | null>(null);
    const [pingDbResult, setPingDbResult] = useState<string | null>(null);

    // 로딩 상태
    const [loadingPing, setLoadingPing] = useState(false);
    const [loadingPingDb, setLoadingPingDb] = useState(false);

    // Spring Boot 서버 주소
    const springBootUrl = 'http://localhost:8080/fin-track';

    // 1. /ping 테스트 핸들러
    const handlePing = async () => {
        setLoadingPing(true);
        setPingResult(null);
        try {
            const response = await fetch(`${springBootUrl}/ping`);
            const data = await response.text(); // "pong" 같은 텍스트 응답을 기대

            if (!response.ok) {
                throw new Error(`서버 응답: ${response.status} ${data}`);
            }
            setPingResult(`✅ 성공: ${data}`);

        } catch (error: any) {
            console.error("/ping 에러:", error);
            // "TypeError: Failed to fetch"는 보통 CORS 에러입니다.
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                setPingResult("❌ 실패: CORS 정책 위반 또는 네트워크 에러. (백엔드 CORS 설정을 확인하세요!)");
            } else {
                setPingResult(`❌ 실패: ${error.message}`);
            }
        }
        setLoadingPing(false);
    };

    // 2. /ping-db 테스트 핸들러
    const handlePingDb = async () => {
        setLoadingPingDb(true);
        setPingDbResult(null);
        try {
            const response = await fetch(`${springBootUrl}/ping-db`);
            const data = await response.text(); // "DB OK" 같은 텍스트 응답을 기대

            if (!response.ok) {
                throw new Error(`서버 응답: ${response.status} ${data}`);
            }
            setPingDbResult(`✅ 성공: ${data}`);

        } catch (error: any) {
            console.error("/ping-db 에러:", error);
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                setPingDbResult("❌ 실패: CORS 정책 위반 또는 네트워크 에러. (백엔드 CORS 설정을 확인하세요!)");
            } else {
                setPingDbResult(`❌ 실패: ${error.message}`);
            }
        }
        setLoadingPingDb(false);
    };

    // --- UI 부분 ---
    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-xl mx-auto bg-white rounded-lg shadow-md p-6">
                <h1 className="text-2xl font-bold text-gray-800 mb-6">
                    Next.js → Spring Boot 연결 테스트
                </h1>

                {/* === 서버 Ping 테스트 === */}
                <div className="mb-6">
                    <button
                        onClick={handlePing}
                        disabled={loadingPing}
                        className="bg-sky-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-sky-600 transition-colors disabled:opacity-50"
                    >
                        {loadingPing ? '테스트 중...' : '1. 서버 연결 테스트 (/ping)'}
                    </button>

                    {/* 결과 표시 */}
                    {pingResult && (
                        <pre className={`mt-3 p-3 rounded-md text-sm whitespace-pre-wrap ${pingResult.startsWith('❌')
                            ? 'bg-red-100 text-red-700'
                            : 'bg-green-100 text-green-700'
                            }`}>
                            {pingResult}
                        </pre>
                    )}
                </div>

                {/* === DB Ping 테스트 === */}
                <div>
                    <button
                        onClick={handlePingDb}
                        disabled={loadingPingDb}
                        className="bg-indigo-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-600 transition-colors disabled:opacity-50"
                    >
                        {loadingPingDb ? '테스트 중...' : '2. DB 연결 테스트 (/ping-db)'}
                    </button>

                    {/* 결과 표시 */}
                    {pingDbResult && (
                        <pre className={`mt-3 p-3 rounded-md text-sm whitespace-pre-wrap ${pingDbResult.startsWith('❌')
                            ? 'bg-red-100 text-red-700'
                            : 'bg-green-100 text-green-700'
                            }`}>
                            {pingDbResult}
                        </pre>
                    )}
                </div>

                {/* === CORS 에러 발생 시 도움말 === */}
                {(pingResult?.includes('CORS') || pingDbResult?.includes('CORS')) && (
                    <div className="mt-6 p-4 bg-yellow-100 text-yellow-800 rounded-lg">
                        <h3 className="font-bold">🚨 CORS 에러가 발생했습니다!</h3>
                        <p className="text-sm mt-1">
                            Spring Boot 컨트롤러에 <strong>`@CrossOrigin("http://localhost:3000")`</strong> 어노테이션을 추가하거나,
                            글로벌 <storng>`WebConfig`</storng> 파일을 만들어 `localhost:3000`을 허용해야 합니다.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}