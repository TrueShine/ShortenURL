"use client";

import { useEffect, useRef, useState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { useCopyFeedback } from "@/lib/use-copy-feedback";

type McpClient = {
  id: string;
  name: string;
  client_id: string;
  redirect_uris: string[];
  created_at: string;
  revoked_at: string | null;
};

const API_BASE = "/api/admin/mcp-clients";

const fieldClass =
  "h-11 w-full rounded-sm border border-border bg-white px-3.5 text-[0.9375rem] text-text-primary placeholder:text-text-disabled focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10";
const labelClass = "mb-1.5 block text-[0.8125rem] font-semibold text-text-primary";

// GET/POST/DELETE 응답 스키마는 채널 공유 스펙(id, name, client_id,
// redirect_uris, created_at, revoked_at)만 명시하고 JSON 봉투 형태는 정하지
//않았음 — API-Bee 라우트가 배열을 바로 주든 { clients: [...] }로 감싸든
// 받아들이도록 방어적으로 처리한다.
function extractClients(payload: unknown): McpClient[] {
  if (Array.isArray(payload)) return payload as McpClient[];
  if (payload && typeof payload === "object" && Array.isArray((payload as { clients?: unknown }).clients)) {
    return (payload as { clients: McpClient[] }).clients;
  }
  return [];
}

async function parseErrorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (body && typeof body.error === "string") return body.error;
  } catch {
    // 응답이 JSON이 아니면 상태 코드로 대체
  }
  return `요청이 실패했어요 (HTTP ${res.status}).`;
}

export function McpClients() {
  const [clients, setClients] = useState<McpClient[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);
  const [newSecret, setNewSecret] = useState<{ name: string; secret: string } | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<McpClient | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  // GET 응답은 마운트 시 1회, POST/DELETE는 그 뒤 임의 시점에 완료된다.
  // 늦게 도착한 GET 응답이 이미 반영된 등록/폐기 결과를 덮어쓰지 않도록
  // 매 요청에 순번을 매기고, 최신 순번의 응답만 상태에 반영한다.
  const loadSeqRef = useRef(0);

  useEffect(() => {
    async function load() {
      const seq = ++loadSeqRef.current;
      setLoadError(null);
      try {
        const res = await fetch(API_BASE, { credentials: "same-origin" });
        if (!res.ok) throw new Error(await parseErrorMessage(res));
        const payload = await res.json();
        if (loadSeqRef.current === seq) setClients(extractClients(payload));
      } catch (err) {
        if (loadSeqRef.current === seq) {
          setClients((prev) => prev ?? []);
          setLoadError(err instanceof Error ? err.message : "클라이언트 목록을 불러오지 못했어요.");
        }
      }
    }

    load();
  }, []);

  async function handleRegister(formData: FormData) {
    const name = String(formData.get("name") ?? "").trim();
    const redirectUri = String(formData.get("redirect_uri") ?? "").trim();

    if (!name || !redirectUri) {
      setFormError("이름과 redirect URI를 모두 입력해주세요.");
      return;
    }

    setFormError(null);
    setRegistering(true);
    try {
      const res = await fetch(API_BASE, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, redirect_uris: [redirectUri] }),
      });
      if (!res.ok) throw new Error(await parseErrorMessage(res));

      const created = await res.json();
      // 아직 응답이 안 돌아온 이전 GET이 있다면 무효화 — 그 결과가 나중에
      // 도착해도 방금 등록한 클라이언트를 목록에서 지우지 못하게 한다.
      loadSeqRef.current++;
      setLoadError(null);
      setClients((prev) => [created, ...(prev ?? [])]);
      setNewSecret({ name: created.name, secret: created.client_secret });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "클라이언트 등록에 실패했어요.");
    } finally {
      setRegistering(false);
    }
  }

  async function handleRevoke(target: McpClient) {
    setRevoking(true);
    setRevokeError(null);
    try {
      const res = await fetch(`${API_BASE}/${target.id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error(await parseErrorMessage(res));

      loadSeqRef.current++;
      setLoadError(null);
      setClients((prev) =>
        (prev ?? []).map((c) =>
          c.id === target.id ? { ...c, revoked_at: new Date().toISOString() } : c
        )
      );
      setRevokeTarget(null);
    } catch (err) {
      setRevokeError(err instanceof Error ? err.message : "클라이언트 폐기에 실패했어요.");
    } finally {
      setRevoking(false);
    }
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

        {formError && (
          <div className="mb-4 rounded-sm bg-danger-subtle px-3.5 py-3 text-[0.8125rem] text-danger">
            {formError}
          </div>
        )}

        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[13.75rem] flex-1">
            <label className={labelClass}>이름</label>
            <input
              name="name"
              type="text"
              required
              disabled={registering}
              placeholder="Claude Desktop"
              className={fieldClass}
            />
          </div>
          <div className="min-w-[16.5rem] flex-1">
            <label className={labelClass}>Redirect URI</label>
            <input
              name="redirect_uri"
              type="url"
              required
              disabled={registering}
              placeholder="https://claude.ai/api/mcp/auth_callback"
              className={fieldClass}
            />
          </div>
          <SubmitButton pendingLabel="등록 중...">클라이언트 등록</SubmitButton>
        </div>
      </form>

      <div className="mt-6 overflow-hidden rounded-md border border-border bg-surface">
        {loadError && (
          <div className="border-b border-border bg-danger-subtle px-4 py-3 text-[0.8125rem] text-danger">
            {loadError}
          </div>
        )}
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
            {clients === null && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-text-disabled">
                  불러오는 중...
                </td>
              </tr>
            )}
            {clients?.map((client) => (
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
                    onClick={() => {
                      setRevokeError(null);
                      setRevokeTarget(client);
                    }}
                    className="inline-flex h-8 items-center whitespace-nowrap rounded-md border border-border bg-white px-2.5 text-xs font-medium text-danger disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    폐기
                  </button>
                </td>
              </tr>
            ))}
            {clients !== null && clients.length === 0 && !loadError && (
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
            {revokeError && (
              <div className="mt-3 rounded-sm bg-danger-subtle px-3.5 py-3 text-[0.8125rem] text-danger">
                {revokeError}
              </div>
            )}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                disabled={revoking}
                onClick={() => setRevokeTarget(null)}
                className="h-11 flex-1 rounded-sm border border-border-strong text-[0.9375rem] font-semibold text-text-primary hover:border-text-primary disabled:cursor-not-allowed disabled:opacity-40"
              >
                취소
              </button>
              <button
                type="button"
                disabled={revoking}
                onClick={() => handleRevoke(revokeTarget)}
                className="h-11 flex-1 rounded-sm border border-danger text-[0.9375rem] font-semibold text-danger hover:bg-danger-subtle disabled:cursor-not-allowed disabled:opacity-40"
              >
                {revoking ? "폐기 중..." : "폐기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Lives here (not in page.tsx) so admin-tabs.tsx can render it inline for
// the "mcp" tab without importing from a page.tsx module — Next.js's
// typed-routes generator only allows page.tsx to export `default` and a
// fixed set of recognized names (metadata, generateStaticParams, ...), so
// re-exporting an arbitrary named component from there fails type checking.
const MCP_SERVER_URL = "https://j1n.uk/api/mcp";

function McpServerUrlCopyButton() {
  const { copied, copy } = useCopyFeedback();

  return (
    <button
      type="button"
      onClick={() => copy(MCP_SERVER_URL)}
      className="inline-flex h-7 items-center whitespace-nowrap rounded-md border border-border bg-white px-2.5 text-xs font-medium text-text-primary hover:border-text-primary"
    >
      {copied ? "복사됨" : "복사"}
    </button>
  );
}

export function McpPanel() {
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
            <span className="inline-flex items-center gap-1.5">
              <code className="rounded-sm bg-surface-dim px-1.5 py-0.5 font-mono text-[0.8125rem] text-text-primary">
                {MCP_SERVER_URL}
              </code>
              <McpServerUrlCopyButton />
            </span>
          </li>
          <li>3. 로그인 후 &ldquo;허용&rdquo; 승인 — 자동으로 연결돼요</li>
        </ol>
        <p className="mt-3 text-[0.8125rem] text-text-secondary">
          위 클라이언트 목록/등록은 연결에 필수가 아니라, 발급된 커넥터를
          관리하거나 폐기할 때만 사용하는 옵션이에요.
        </p>
      </div>
    </div>
  );
}
