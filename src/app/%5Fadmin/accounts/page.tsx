import { requireSuperAdmin } from "../actions";
import { createAdminClient, listAllUserEmails } from "@/lib/supabase/admin";
import { CreateAccountForm } from "./create-account-form";
import { AccountActions } from "./account-actions";

const ROLE_LABEL: Record<string, string> = {
  super_admin: "슈퍼관리자",
  admin: "관리자",
};

export async function AccountsPanel({ error }: { error?: string } = {}) {
  const { user } = await requireSuperAdmin();

  const admin = createAdminClient();

  const [{ data: profiles }, emailById] = await Promise.all([
    admin
      .from("profiles")
      .select("id, role, must_change_password, created_at")
      .order("created_at", { ascending: false }),
    listAllUserEmails(admin),
  ]);

  const accounts = (profiles ?? []).map((profile) => ({
    ...profile,
    email: emailById.get(profile.id) ?? "(알 수 없음)",
  }));

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <div className="rounded-sm bg-danger-subtle px-3.5 py-3 text-[0.8125rem] text-danger">
          {error}
        </div>
      )}

      <CreateAccountForm />

      <div className="overflow-hidden rounded-md border border-border bg-surface">
        <table className="w-full text-left text-[0.875rem]">
          <thead className="bg-surface-dim text-[0.8125rem] text-text-secondary">
            <tr>
              <th className="px-4 py-3 font-semibold">이메일</th>
              <th className="px-4 py-3 font-semibold">역할</th>
              <th className="px-4 py-3 font-semibold">비밀번호 변경</th>
              <th className="px-4 py-3 font-semibold">생성일</th>
              <th className="px-4 py-3 font-semibold">작업</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((account) => (
              <tr key={account.id} className="border-t border-border">
                <td className="px-4 py-3 text-text-primary">{account.email}</td>
                <td className="px-4 py-3 text-text-primary">
                  {ROLE_LABEL[account.role] ?? account.role}
                </td>
                <td className="px-4 py-3 text-text-secondary">
                  {account.must_change_password ? "대기 중" : "완료"}
                </td>
                <td className="px-4 py-3 text-text-secondary">
                  {new Date(account.created_at).toLocaleDateString("ko-KR")}
                </td>
                <td className="px-4 py-3">
                  <AccountActions
                    accountId={account.id}
                    email={account.email}
                    isSelf={account.id === user.id}
                  />
                </td>
              </tr>
            ))}
            {accounts.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-6 text-center text-text-disabled"
                >
                  계정이 없어요.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return <AccountsPanel error={error} />;
}
