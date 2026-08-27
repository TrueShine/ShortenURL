import { ChangePasswordForm } from "./change-password-form";

export default function ChangePasswordPage() {
  return (
    <div className="mx-auto w-full max-w-[420px]">
      <h1 className="mb-2 text-lg font-bold text-text-primary">비밀번호 변경</h1>
      <p className="mb-6 text-[14px] text-text-secondary">
        발급받은 임시 비밀번호로 로그인하셨어요. 계속하려면 새 비밀번호로
        변경해주세요.
      </p>
      <ChangePasswordForm />
    </div>
  );
}
