"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {useState} from "react";
import {shortAddr} from "@/lib/chain";
import {useWallet} from "./Providers";

export function Mark() {
  return (
    <Link href="/" className="mark" aria-label="SpecProof home">
      specproof<i>✓</i>
    </Link>
  );
}

export default function Header() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const {account, connect, connecting} = useWallet();
  const link = (href: string, label: string) => (
    <Link href={href} className={path === href ? "active" : ""} onClick={() => setOpen(false)}>
      {label}
    </Link>
  );
  return (
    <header className="header">
      <div className="wrap">
        <Mark />
        <nav className={`nav ${open ? "open" : ""}`}>
          {link("/dashboard", "Guarantees")}
          {link("/create", "Create")}
          {link("/evidence", "Evidence")}
          {link("/#how", "How it works")}
          {link("/#safety", "Safety")}
        </nav>
        <div className="row">
          <button className="btn small primary" onClick={connect} disabled={connecting || Boolean(account)}>
            {account ? shortAddr(account) : connecting ? "Connecting…" : "Connect wallet"}
          </button>
          <button className="menu-btn" onClick={() => setOpen(!open)} aria-label="Menu">
            Menu
          </button>
        </div>
      </div>
    </header>
  );
}
