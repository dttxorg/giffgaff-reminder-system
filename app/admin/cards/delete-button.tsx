"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmModal } from "@/app/_components/confirm-modal";

export function CardDeleteButton({ id }: { id: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    if (loading) return;
    setOpen(false);
    setError(null);
  };

  const onConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(`/api/admin/cards/${id}`, { method: "DELETE" });
      const data = await resp.json();
      if (!data.ok) {
        setError(data.error || "删除失败");
        setLoading(false);
        return;
      }
      setOpen(false);
      setLoading(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "网络错误");
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-rose-600 hover:underline text-xs"
      >
        删除
      </button>
      <ConfirmModal
        open={open}
        title="确认删除该未兑换的卡密？"
        tone="danger"
        confirmLabel="删除"
        loading={loading}
        onConfirm={onConfirm}
        onClose={close}
        description={
          error ? (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">
              {error}
            </div>
          ) : (
            <p>删除后无法恢复,仅未兑换的卡密可删除。</p>
          )
        }
      />
    </>
  );
}