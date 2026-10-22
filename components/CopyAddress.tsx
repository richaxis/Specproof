"use client";
import {useState} from "react";
import {CONTRACT, hasContract} from "@/lib/network";

export default function CopyAddress() {
  const [done, setDone] = useState(false);
  const text = hasContract ? CONTRACT : "Demo data · deploy the contract to go live";
  return (
    <div className="addr">
      <span>{text}</span>
      {hasContract && (
        <button
          onClick={() => {
            navigator.clipboard?.writeText(CONTRACT).catch(() => {});
            setDone(true);
            setTimeout(() => setDone(false), 1400);
          }}
        >
          {done ? "COPIED" : "COPY"}
        </button>
      )}
    </div>
  );
}
