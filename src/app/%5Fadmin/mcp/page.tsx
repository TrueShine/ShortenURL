import { McpClients } from "./mcp-clients";

export default function McpPage() {
  return (
    <div className="flex flex-col gap-6">
      <McpClients />

      <div className="rounded-md border border-border bg-surface p-6 shadow-sm">
        <h2 className="mb-3 text-[0.9375rem] font-semibold text-text-primary">
          Claude에 연결하는 방법
        </h2>
        <ol className="flex flex-col gap-2 text-[0.875rem] text-text-secondary">
          <li>1. Claude 설정 → 커넥터 → 사용자 지정 커넥터 추가</li>
          <li>
            2. MCP 서버 URL:{" "}
            <code className="rounded-sm bg-surface-dim px-1.5 py-0.5 font-mono text-[0.8125rem] text-text-primary">
              https://j1n.uk/api/mcp
            </code>
          </li>
          <li>3. 필요 시 위에서 발급받은 client ID/secret 입력</li>
          <li>4. 로그인 후 &ldquo;허용&rdquo; 승인</li>
        </ol>
      </div>
    </div>
  );
}
