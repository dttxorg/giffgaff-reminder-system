"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { RedeemClient } from "./redeem-client";
import { RedeemStepIndicator } from "./_components/redeem-step-indicator";
import {
  clearClientSessionCache,
  getRedeemSessionContext,
} from "@/lib/client-session";

type RedeemSessionContext =
  | { status: "loading" }
  | {
      status: "ready";
      isLoggedIn: boolean;
      username?: string;
      simCount: number;
    }
  | { status: "error" };

export function RedeemExperience() {
  const searchParams = useSearchParams();
  const initialCode = searchParams.get("code") ?? "";
  const initialStep: 1 | 2 = initialCode ? 2 : 1;
  const [sessionContext, setSessionContext] =
    useState<RedeemSessionContext>({ status: "loading" });
  const [sessionAttempt, setSessionAttempt] = useState(0);

  useEffect(() => {
    let active = true;

    void getRedeemSessionContext()
      .then((data) => {
        if (!active) return;
        setSessionContext({
          status: "ready",
          isLoggedIn: data.authenticated === true,
          username: data.username,
          simCount: data.simCount ?? 0,
        });
      })
      .catch(() => {
        if (!active) return;
        setSessionContext({ status: "error" });
      });

    return () => {
      active = false;
    };
  }, [sessionAttempt]);

  const sessionReady = sessionContext.status === "ready";
  const isLoggedIn = sessionReady && sessionContext.isLoggedIn;

  return (
    <div className="mx-auto max-w-md px-4 py-8 sm:py-12">
      <div className="mb-6 text-center">
        <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white">
          <svg
            width={28}
            height={28}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 9V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4Z" />
            <path d="M13 5v14" strokeDasharray="2 2" />
          </svg>
        </div>
        <h1 className="mb-2 text-2xl font-bold text-slate-900 sm:text-3xl">
          {isLoggedIn ? "绑定新的 SIM 卡" : "兑换卡密"}
        </h1>
        <p className="text-sm text-slate-600">
          {isLoggedIn
            ? "把新卡密绑定到当前账号，登录一次提醒多个号码"
            : "输入卡密，绑定 Giffgaff SIM 卡保号提醒"}
        </p>
      </div>

      {sessionContext.status === "error" && (
        <div
          className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900"
          role="alert"
        >
          <span>账号状态暂时无法确认</span>
          <button
            type="button"
            onClick={() => {
              clearClientSessionCache();
              setSessionContext({ status: "loading" });
              setSessionAttempt((attempt) => attempt + 1);
            }}
            className="min-h-9 shrink-0 rounded-md px-2.5 font-medium text-amber-900 hover:bg-amber-100"
          >
            重试
          </button>
        </div>
      )}

      <RedeemStepIndicator step={initialStep} />
      <RedeemClient
        key={initialCode || "empty"}
        initialCode={initialCode}
        sessionReady={sessionReady}
        isLoggedIn={isLoggedIn}
        currentUsername={sessionReady ? sessionContext.username : undefined}
        existingSimCount={sessionReady ? sessionContext.simCount : 0}
      />
    </div>
  );
}
