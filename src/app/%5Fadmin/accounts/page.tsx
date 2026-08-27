import { requireSuperAdmin } from "../actions";
import { createAdminClient } from "@/lib/supabase/admin";
import { CreateAccountForm } from "./create-account-form";

const ROLE_LABEL: Record<string, string> = {
  super_admin: "슈퍼관리자",
  admin: "관리자",
};

// auth.admin.listUsers() only returns one page (50 users by default) —
// walk every page so accounts past the first page don't show up as
// "(알 수 없음)" once there are more than a handful of admins.
async function listAllUserEmails(admin: ReturnType<typeof createAdminClient>) {
  const perPage = 200;
  const emailById = new Map<string, string | undefined>();

  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error || !data) break;

    for (const user of data.users) {
      emailById.set(user.id, user.email);
    }

    if (data.users.length < perPage) break;
  }

  return emailById;
}

export default async function AccountsPage() {
  await requireSuperAdmin();

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
      <CreateAccountForm />

      <div className="overflow-hidden rounded-md border border-border bg-surface">
        <table className="w-full text-left text-[0.875rem]">
          <thead className="bg-surface-dim text-[0.8125rem] text-text-secondary">
            <tr>
              <th className="px-4 py-3 font-semibold">이메일</th>
              <th className="px-4 py-3 font-semibold">역할</th>
              <th className="px-4 py-3 font-semibold">비밀번호 변경</th>
              <th className="px-4 py-3 font-semibold">생성일</th>
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
              </tr>
            ))}
            {accounts.length === 0 && (
              <tr>
                <td
                  colSpan={4}
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
