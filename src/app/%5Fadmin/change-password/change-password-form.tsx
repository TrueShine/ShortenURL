"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { changePassword, type ChangePasswordState } from "./actions";

const fieldClass =
  "h-11 w-full rounded-sm border border-border bg-white px-3.5 text-[15px] text-text-primary placeholder:text-text-disabled focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10";
const labelClass = "mb-1.5 block text-[13px] font-semibold text-text-primary";

export function ChangePasswordForm() {
  const [state, formAction] = useActionState<ChangePasswordState, FormData>(
    changePassword,
    null
  );

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-md border border-border bg-surface p-6 shadow-sm"
    >
      {state?.error && (
        <div className="rounded-sm bg-danger-subtle px-3.5 py-3 text-[13px] text-danger">
          {state.error}
        </div>
      )}

      <div>
        <label className={labelClass}>새 비밀번호</label>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={fieldClass}
        />
      </div>

      <div>
        <label className={labelClass}>새 비밀번호 확인</label>
        <input
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={fieldClass}
        />
      </div>

      <SubmitButton pendingLabel="변경 중...">비밀번호 변경</SubmitButton>
    </form>
  );
}
