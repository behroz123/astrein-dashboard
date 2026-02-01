"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../lib/firebase";
import LogsHistory from "../../components/LogsHistory";

export default function WareneingangPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) {
        router.replace("/login");
        return;
      }
      setReady(true);
    });

    return () => unsub();
  }, [router]);

  if (!ready) {
    return (
      <div className="rounded-[28px] surface p-6 text-sm muted">
        Lädt...
      </div>
    );
  }

  return <LogsHistory logType="wareneingang" />;
}
