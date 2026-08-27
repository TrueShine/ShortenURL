"use client";

import { useActionState, useState } from "react";
import { SubmitButton } from "@/components/submit-button";
import {
  deleteAdminAccount,
  resetAdminPassword,
  type ResetPasswordState,
} from "./actions";

const initialResetState: ResetPasswordState = {};

const actionButtonClass =
  "inline-flex h-8 items-center whitespace-nowrap rounded-md border border-border bg-white px-2.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40";

export function AccountActions({
  accountId,
  email,
  isSelf,
}: {
  accountId: string;
  email: string;
  isSelf: boolean;
}) {
  const [resetState, resetAction] = useActionState(resetAdminPassword, initialResetState);
  const [showReset, setShowReset] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  return (
    <>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setShowReset(true)}
          className={`${actionButtonClass} text-text-secondary`}
        >
          비밀번호 재설정
        </button>
        <button
          type="button"
          disabled={isSelf}
          title={isSelf ? "본인 계정은 삭제할 수 없어요" : "삭제"}
          onClick={() => setShowDelete(true)}
          className={`${actionButtonClass} text-danger`}
        >
          삭제
        </button>
      </div>

      {showReset && (
        <ResetPasswordModal
          email={email}
          accountId={accountId}
          state={resetState}
          formAction={resetAction}
          onClose={() => setShowReset(false)}
        />
      )}

      {showDelete && (
        <DeleteAccountModal
          email={email}
          accountId={accountId}
          onClose={() => setShowDelete(false)}
        />
      )}
    </>
  );
}

function ResetPasswordModal({
  email,
  accountId,
  state,
  formAction,
  onClose,
}: {
  email: string;
  accountId: string;
  state: ResetPasswordState;
  formAction: (formData: FormData) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111113]/40 p-4">
      <div className="w-full max-w-[24rem] rounded-lg bg-white p-6 shadow-md">
        <h2 className="mb-2 text-lg font-bold text-text-primary">비밀번호 재설정</h2>

        {state.created ? (
          <>
            <p className="mb-1.5 text-sm text-text-secondary">
              {email} 계정의 새 임시 비밀번호예요. 직접 전달해주세요 — 다시
              표시되지 않습니다.
            </p>
            <code className="mb-5 block w-fit rounded-sm bg-surface-dim px-2 py-1 font-mono text-[0.875rem] text-text-primary">
              {state.created.password}
            </code>
            <button
              type="button"
              onClick={onClose}
              className="h-11 w-full rounded-sm bg-accent text-[0.9375rem] font-semibold text-white hover:bg-accent-hover"
            >
              닫기
            </button>
          </>
        ) : (
          <form action={formAction}>
            <input type="hidden" name="accountId" value={accountId} />
            <p className="mb-4 text-sm text-text-secondary">
              <span className="font-mono">{email}</span> 계정의 비밀번호를 새
              임시 비밀번호로 재설정할까요? 다음 로그인 시 비밀번호 변경이
              강제됩니다.
            </p>
            {state.error && (
              <div className="mb-4 rounded-sm bg-danger-subtle px-3.5 py-3 text-[0.8125rem] text-danger">
                {state.error}
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="h-11 flex-1 rounded-sm border border-border-strong text-[0.9375rem] font-semibold text-text-primary hover:border-text-primary"
              >
                취소
              </button>
              <SubmitButton className="flex-1" pendingLabel="재설정 중...">
                재설정
              </SubmitButton>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function DeleteAccountModal({
  email,
  accountId,
  onClose,
}: {
  email: string;
  accountId: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111113]/40 p-4">
      <div className="w-full max-w-[24rem] rounded-lg bg-white p-6 shadow-md">
        <h2 className="mb-2 text-lg font-bold text-text-primary">
          정말 삭제하시겠어요?
        </h2>
        <p className="text-sm text-text-secondary">
          되돌릴 수 없어요. <span className="font-mono">{email}</span> 계정이
          영구 삭제되고 더 이상 로그인할 수 없습니다. 이 계정이 만든 링크는
          소유자 없이 그대로 유지됩니다.
        </p>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-11 flex-1 rounded-sm border border-border-strong text-[0.9375rem] font-semibold text-text-primary hover:border-text-primary"
          >
            취소
          </button>
          <form action={deleteAdminAccount} className="flex-1" onSubmit={onClose}>
            <input type="hidden" name="accountId" value={accountId} />
            <button
              type="submit"
              className="h-11 w-full rounded-sm border border-danger text-[0.9375rem] font-semibold text-danger hover:bg-danger-subtle"
            >
              삭제
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
