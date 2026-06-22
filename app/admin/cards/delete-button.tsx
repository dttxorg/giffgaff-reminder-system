"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CardDeleteButton({ id }: { id: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const onDelete = async () => {
    if (!confirm("确认删除该未兑换的卡密?")) return;
    setLoading(true);
    try {
      const resp = await fetch(`/api/admin/cards/${id}`, {
        method: "DELETE",
      });
      const data = await resp.json();
      if (!data.ok) {
        alert(data.error || "删除失败");
        return;
      }
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "网络错误");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onDelete}
      disabled={loading}
      className="text-rose-600 hover:underline text-xs disabled:opacity-50"
    >
      {loading ? "删除中..." : "删除"}
    </button>
  );
}