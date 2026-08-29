"use client";

import { useState } from "react";
import { SubmitButton } from "@/components/submit-button";

type McpClient = {
  id: string;
  name: string;
  client_id: string;
  redirect_uris: string[];
  created_at: string;
  revoked_at: string | null;
};

const MOCK_CLIENTS: McpClient[] = [
  {
    id: "mock-1",
    name: "Claude Desktop",
    client_id: "mcp_client_9f3a2b1c",
    redirect_uris: ["https://claude.ai/api/mcp/auth_callback"],
    created_at: "2026-08-20T09:12:00.000Z",
    revoked_at: null,
  },
];

const fieldClass =
  "h-11 w-full rounded-sm border border-border bg-white px-3.5 text-[0.9375rem] text-text-primary placeholder:text-text-disabled focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10";
const labelClass = "mb-1.5 block text-[0.8125rem] font-semibold text-text-primary";

export function McpClients() {
  const [clients, setClients] = useState<McpClient[]>(MOCK_CLIENTS);
  const [error, setError] = useState<string | null>(null);
  const [newSecret, setNewSecret] = useState<{ name: string; secret: string } | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<McpClient | null>(null);

  function handleRegister(formData: FormData) {
    const name = String(formData.get("name") ?? "").trim();
    const redirectUri = String(formData.get("redirect_uri") ?? "").trim();

    if (!name || !redirectUri) {
      setError("이름과 redirect URI를 모두 입력해주세요.");
      return;
    }

    setError(null);
    const client: McpClient = {
      id: `mock-${Date.now()}`,
      name,
      client_id: `mcp_client_${Math.random().toString(16).slice(2, 10)}`,
      redirect_uris: [redirectUri],
      created_at: new Date().toISOString(),
      revoked_at: null,
    };

    setClients((prev) => [client, ...prev]);
    setNewSecret({ name, secret: `mock_secret_${Math.random().toString(16).slice(2, 18)}` });
  }

  function handleRevoke(target: McpClient) {
    setClients((prev) =>
      prev.map((c) => (c.id === target.id ? { ...c, revoked_at: new Date().toISOString() } : c))
    );
    setRevokeTarget(null);
  }

  return (
    <>
      <form
        action={handleRegister}
        className="rounded-md border border-border bg-surface p-6 shadow-sm"
      >
        <h2 className="mb-4 text-[0.9375rem] font-semibold text-text-primary">
          새 클라이언트 등록
        </h2>

        {error && (
          <div className="mb-4 rounded-sm bg-danger-subtle px-3.5 py-3 text-[0.8125rem] text-danger">
            {error}
          </div>
        )}

        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[13.75rem] flex-1">
            <label className={labelClass}>이름</label>
            <input name="name" type="text" required placeholder="Claude Desktop" className={fieldClass} />
          </div>
          <div className="min-w-[16.5rem] flex-1">
            <label className={labelClass}>Redirect URI</label>
            <input
              name="redirect_uri"
              type="url"
              required
              placeholder="https://claude.ai/api/mcp/auth_callback"
              className={fieldClass}
            />
          </div>
          <SubmitButton pendingLabel="등록 중...">클라이언트 등록</SubmitButton>
        </div>
      </form>

      <div className="mt-6 overflow-hidden rounded-md border border-border bg-surface">
        <table className="w-full text-left text-[0.875rem]">
          <thead className="bg-surface-dim text-[0.8125rem] text-text-secondary">
            <tr>
              <th className="px-4 py-3 font-semibold">이름</th>
              <th className="px-4 py-3 font-semibold">Client ID</th>
              <th className="px-4 py-3 font-semibold">Redirect URIs</th>
              <th className="px-4 py-3 font-semibold">발급일</th>
              <th className="px-4 py-3 font-semibold">상태</th>
              <th className="px-4 py-3 font-semibold">작업</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id} className="border-t border-border">
                <td className="px-4 py-3 text-text-primary">{client.name}</td>
                <td className="px-4 py-3">
                  <code className="font-mono text-[0.8125rem] text-text-primary">
                    {client.client_id}
                  </code>
                </td>
                <td className="px-4 py-3 text-text-secondary">
                  {client.redirect_uris.map((uri) => (
                    <div key={uri} className="truncate max-w-[20rem]">
                      {uri}
                    </div>
                  ))}
                </td>
                <td className="px-4 py-3 text-text-secondary">
                  {new Date(client.created_at).toLocaleDateString("ko-KR")}
                </td>
                <td className="px-4 py-3">
                  {client.revoked_at ? (
                    <span className="text-danger">폐기됨</span>
                  ) : (
                    <span className="text-success">활성</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    disabled={!!client.revoked_at}
                    onClick={() => setRevokeTarget(client)}
                    className="inline-flex h-8 items-center whitespace-nowrap rounded-md border border-border bg-white px-2.5 text-xs font-medium text-danger disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    폐기
                  </button>
                </td>
              </tr>
            ))}
            {clients.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-text-disabled">
                  등록된 클라이언트가 없어요.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {newSecret && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111113]/40 p-4">
          <div className="w-full max-w-[28rem] rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-2 text-lg font-bold text-text-primary">
              {newSecret.name} 클라이언트가 생성됐어요
            </h2>
            <p className="mb-1.5 text-sm text-text-secondary">
              아래 client secret은 지금 한 번만 표시돼요. 안전한 곳에 복사해두세요 — 창을 닫으면 다시 볼 수 없습니다.
            </p>
            <div className="mb-5 flex items-center gap-2">
              <code className="block flex-1 truncate rounded-sm bg-surface-dim px-2 py-1.5 font-mono text-[0.8125rem] text-text-primary">
                {newSecret.secret}
              </code>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(newSecret.secret)}
                className="inline-flex h-9 items-center whitespace-nowrap rounded-md border border-border bg-white px-3 text-xs font-medium text-text-primary hover:border-text-primary"
              >
                복사
              </button>
            </div>
            <button
              type="button"
              onClick={() => setNewSecret(null)}
              className="h-11 w-full rounded-sm bg-accent text-[0.9375rem] font-semibold text-white hover:bg-accent-hover"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {revokeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111113]/40 p-4">
          <div className="w-full max-w-[24rem] rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-2 text-lg font-bold text-text-primary">정말 폐기하시겠어요?</h2>
            <p className="text-sm text-text-secondary">
              <span className="font-mono">{revokeTarget.name}</span> 클라이언트를 폐기하면 해당
              클라이언트로 발급된 토큰이 더 이상 동작하지 않아요. 되돌릴 수 없습니다.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setRevokeTarget(null)}
                className="h-11 flex-1 rounded-sm border border-border-strong text-[0.9375rem] font-semibold text-text-primary hover:border-text-primary"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => handleRevoke(revokeTarget)}
                className="h-11 flex-1 rounded-sm border border-danger text-[0.9375rem] font-semibold text-danger hover:bg-danger-subtle"
              >
                폐기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
