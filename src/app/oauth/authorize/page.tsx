import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { MCP_SCOPE } from "@/lib/oauth/jwt";
import { decideAuthorization } from "./actions";

type AuthorizeParams = {
  response_type?: string;
  client_id?: string;
  redirect_uri?: string;
  state?: string;
  code_challenge?: string;
  code_challenge_method?: string;
};

function buildQueryString(params: AuthorizeParams) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) qs.set(key, value);
  }
  return qs.toString();
}

export default async function AuthorizePage({
  searchParams,
}: {
  searchParams: Promise<AuthorizeParams>;
}) {
  const params = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const redirectTarget = `/oauth/authorize?${buildQueryString(params)}`;
    redirect(`/_login?redirect=${encodeURIComponent(redirectTarget)}`);
  }

  const { client_id: clientId, redirect_uri: redirectUri } = params;

  if (!clientId || !redirectUri) {
    return (
      <ErrorCard message="잘못된 요청입니다. client_id와 redirect_uri가 필요합니다." />
    );
  }

  const admin = createAdminClient();
  const { data: client } = await admin
    .from("oauth_clients")
    .select("id, name, redirect_uris, revoked_at")
    .eq("client_id", clientId)
    .maybeSingle();

  // redirect_uri must be one of the client's registered URIs before we ever
  // redirect back to it with an error — an unregistered redirect_uri could
  // point anywhere, so a mismatch here fails as an in-page error instead of
  // bouncing the browser there.
  if (!client || client.revoked_at || !client.redirect_uris.includes(redirectUri)) {
    return (
      <ErrorCard message="등록되지 않은 클라이언트이거나 redirect_uri가 일치하지 않습니다." />
    );
  }

  const {
    response_type: responseType,
    code_challenge: codeChallenge,
    code_challenge_method: codeChallengeMethod,
    state,
  } = params;

  if (responseType !== "code" || !codeChallenge || codeChallengeMethod !== "S256") {
    const errorUrl = new URL(redirectUri);
    errorUrl.searchParams.set("error", "invalid_request");
    if (state) errorUrl.searchParams.set("state", state);
    redirect(errorUrl.toString());
  }

  return (
    <div className="flex flex-1 flex-col items-center bg-bg px-4 py-14 sm:py-16">
      <div className="w-full max-w-[22.5rem]">
        <Logo />
        <h1 className="mb-1 text-center text-2xl font-bold text-text-primary">
          MCP 연동 허용
        </h1>
        <p className="mb-6 text-center text-[0.9375rem] text-text-secondary">
          <strong>{client.name}</strong>이(가) 내 단축 URL 계정에 접근하려고 합니다.
        </p>

        <div className="rounded-md border border-border bg-surface p-6 shadow-sm">
          <p className="mb-4 text-[0.8125rem] text-text-secondary">
            요청 권한: 단축 링크 생성 · 목록 조회 · 통계 조회 ({MCP_SCOPE})
          </p>
          <form action={decideAuthorization} className="flex gap-3">
            <input type="hidden" name="client_id" value={clientId} />
            <input type="hidden" name="redirect_uri" value={redirectUri} />
            <input type="hidden" name="code_challenge" value={codeChallenge} />
            <input
              type="hidden"
              name="code_challenge_method"
              value={codeChallengeMethod}
            />
            {state && <input type="hidden" name="state" value={state} />}
            <button
              type="submit"
              name="decision"
              value="deny"
              className="h-11 flex-1 rounded-sm border border-border text-[0.9375rem] font-semibold text-text-secondary hover:bg-surface-dim"
            >
              거부
            </button>
            <button
              type="submit"
              name="decision"
              value="allow"
              className="h-11 flex-1 rounded-sm bg-accent text-[0.9375rem] font-semibold text-white hover:bg-accent-hover"
            >
              허용
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="flex flex-1 flex-col items-center bg-bg px-4 py-14 sm:py-16">
      <div className="w-full max-w-[22.5rem] text-center">
        <Logo />
        <div className="rounded-md border border-danger bg-danger-subtle px-4 py-3 text-[0.875rem] text-danger">
          {message}
        </div>
      </div>
    </div>
  );
}
