"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import styles from "./wallet.module.css";

// ---- Types ----
interface WalletData {
  usdcBalance: number;
  ashBalance: number;
}

interface Transaction {
  id: string;
  type: string;       // uppercase from backend: DEPOSIT, BURN, WIN, WITHDRAWAL, REFERRAL_REWARD
  amount: number;
  currency: string;   // USDC or ASH
  status: string;
  createdAt: string;
  metadata?: { ashEarned?: number };
}

type ModalType = "deposit" | "withdraw" | null;
type TxFilter = "all" | "DEPOSIT" | "BURN" | "WIN" | "WITHDRAWAL" | "REFERRAL_REWARD";

const TX_FILTERS: { key: TxFilter; label: string }[] = [
  { key: "all",             label: "ALL"       },
  { key: "DEPOSIT",         label: "DEPOSITS"  },
  { key: "BURN",            label: "BURNS"     },
  { key: "WIN",             label: "WINS"      },
  { key: "WITHDRAWAL",      label: "WITHDRAWS" },
  { key: "REFERRAL_REWARD", label: "REFERRALS" },
];

function txIcon(type: string) {
  switch (type) {
    case "BURN":            return "🔥";
    case "WIN":             return "🏆";
    case "DEPOSIT":         return "💳";
    case "WITHDRAWAL":      return "💸";
    case "REFERRAL_REWARD": return "👥";
    default:                return "📋";
  }
}

function txAmtClass(type: string) {
  return (type === "WIN" || type === "DEPOSIT" || type === "REFERRAL_REWARD") ? "pos" : "neg";
}

const n = (v: unknown) => Number(v ?? 0);

function fmtAmt(tx: Transaction): string {
  const amt = n(tx.amount).toFixed(2);
  const isAsh = tx.currency === "ASH";
  switch (tx.type) {
    case "WIN":             return `+$${amt} USDC`;
    case "DEPOSIT":         return `+$${amt} USDC`;
    case "BURN":            return isAsh ? `+${n(tx.amount).toLocaleString()} ASH` : `-$${amt} USDC`;
    case "WITHDRAWAL":      return `-$${amt} USDC`;
    case "REFERRAL_REWARD": return `+$${amt} USDC`;
    default:                return isAsh ? `${n(tx.amount).toLocaleString()} ASH` : `$${amt} USDC`;
  }
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

// ---- DEPOSIT MODAL ----
function DepositModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [amount,     setAmount]     = useState("");
  const [status,     setStatus]     = useState<string | null>(null);
  const [error,      setError]      = useState<string | null>(null);
  const [sending,    setSending]    = useState(false);
  const [wallets,    setWallets]    = useState<import("@/lib/wallets").WalletProvider[]>([]);
  const [masterWallet, setMasterWallet] = useState<string>("");

  useEffect(() => {
    import("@/lib/wallets").then(({ detectWallets }) => setWallets(detectWallets()));
    api.wallet.platformInfo().then((res: any) => {
      const d = res.data ?? res;
      if (d.masterWallet) setMasterWallet(d.masterWallet);
    }).catch(() => {});
  }, []);

  async function handleDeposit(walletProvider: any, walletName: string) {
    setError(null);
    const amt = parseFloat(amount);
    if (!amt || amt < 1) { setError("MINIMUM DEPOSIT IS 1 USDC"); return; }
    if (!masterWallet)   { setError("COULD NOT LOAD PLATFORM WALLET. REFRESH AND TRY AGAIN."); return; }

    setSending(true);
    try {
      setStatus(`CONNECTING ${walletName.toUpperCase()}...`);
      await walletProvider.connect();
      const sender = walletProvider.publicKey;
      if (!sender) throw new Error("Could not get public key from wallet");

      setStatus("BUILDING TRANSACTION...");

      const { Connection, PublicKey, Transaction } = await import("@solana/web3.js");
      const {
        getAssociatedTokenAddressSync,
        createAssociatedTokenAccountInstruction,
        createTransferInstruction,
      } = await import("@solana/spl-token");

      const SOLANA_RPC  = process.env.NEXT_PUBLIC_SOLANA_RPC || "https://api.devnet.solana.com";
      const USDC_MINT   = process.env.NEXT_PUBLIC_USDC_MINT  || "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr";

      const connection  = new Connection(SOLANA_RPC, "confirmed");
      const usdcMint    = new PublicKey(USDC_MINT);
      const masterPubkey = new PublicKey(masterWallet);

      const fromAta = getAssociatedTokenAddressSync(usdcMint, sender);
      const toAta   = getAssociatedTokenAddressSync(usdcMint, masterPubkey);

      const instructions = [];
      const toAtaInfo = await connection.getAccountInfo(toAta);
      if (!toAtaInfo) {
        instructions.push(
          createAssociatedTokenAccountInstruction(sender, toAta, masterPubkey, usdcMint)
        );
      }
      instructions.push(
        createTransferInstruction(fromAta, toAta, sender, BigInt(Math.round(amt * 1_000_000)))
      );

      const { blockhash } = await connection.getLatestBlockhash("confirmed");
      const tx = new Transaction({ recentBlockhash: blockhash, feePayer: sender });
      tx.add(...instructions);

      setStatus(`APPROVE IN ${walletName.toUpperCase()}...`);

      // Use signAndSendTransaction if available (Phantom, Backpack, Solflare),
      // otherwise fall back to signTransaction + manual broadcast (OKX, Coinbase, others)
      let signature: string;
      if (typeof walletProvider.signAndSendTransaction === "function") {
        const result = await walletProvider.signAndSendTransaction(tx);
        signature = result?.signature ?? result;
      } else {
        const signed = await walletProvider.signTransaction(tx);
        signature = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: false });
      }

      setStatus("CONFIRMING ON CHAIN...");
      const latestBlockhash = await connection.getLatestBlockhash();
      await connection.confirmTransaction({ signature, ...latestBlockhash }, "confirmed");

      setStatus("VERIFYING DEPOSIT...");
      const token = localStorage.getItem("accessToken");
      if (token) api.setToken(token);
      await api.wallet.deposit(signature); // amount verified server-side from chain

      setStatus(`✓ ${amt} USDC DEPOSITED SUCCESSFULLY`);
      setTimeout(() => onSuccess(), 1500);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Transaction failed";
      setError(msg.toLowerCase().includes("rejected") ? "TRANSACTION REJECTED IN WALLET." : msg.toUpperCase());
      setStatus(null);
    } finally {
      setSending(false);
    }
  }

  const installedWallets = wallets.filter((w) => w.installed);
  const otherWallets     = wallets.filter((w) => !w.installed);

  return (
    <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <span className={styles.modalTitle}>DEPOSIT USDC</span>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.noticeBox}>
            ⚡ SEND USDC DIRECTLY FROM YOUR WALLET. NO ADDRESS COPYING NEEDED.
            MINIMUM: 1 USDC.{" "}
            {(process.env.NEXT_PUBLIC_USDC_MINT || "") === "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" ? "MAINNET." : "DEVNET (TESTNET ONLY)."}
          </div>

          {/* Amount input */}
          <div className="form-group" style={{ marginTop: "16px" }}>
            <label>AMOUNT (USDC)</label>
            <input
              type="number" min="1" step="0.01" placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={sending}
            />
          </div>

          {/* Status / Error */}
          {status && (
            <div style={{ fontSize: "10px", color: status.startsWith("✓") ? "#4ade80" : "#FF4D00", letterSpacing: "1px", marginBottom: "12px", textAlign: "center" }}>
              {status}
            </div>
          )}
          {error && (
            <div style={{ fontSize: "10px", color: "#ff6b6b", letterSpacing: "1px", marginBottom: "12px", textAlign: "center" }}>
              ⚠ {error}
            </div>
          )}

          {/* Installed wallets */}
          {installedWallets.length > 0 && (
            <>
              <div style={{ fontSize: "9px", color: "var(--text-dim)", letterSpacing: "2px", marginBottom: "10px" }}>
                SELECT WALLET
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
                {installedWallets.map((w) => (
                  <button
                    key={w.name}
                    className={styles.walletConnectBtn}
                    onClick={() => handleDeposit(w.provider, w.name)}
                    disabled={sending}
                    style={{ opacity: sending ? 0.5 : 1 }}
                  >
                    <span style={{ fontSize: "18px" }}>{w.icon}</span>
                    {sending ? (status ?? "PROCESSING...") : `DEPOSIT WITH ${w.name.toUpperCase()}`}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Not installed wallets */}
          {otherWallets.length > 0 && (
            <>
              <div style={{ fontSize: "9px", color: "var(--text-dim)", letterSpacing: "2px", marginBottom: "8px" }}>
                {installedWallets.length === 0 ? "NO WALLET DETECTED — INSTALL ONE:" : "MORE WALLETS"}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {otherWallets.map((w) => (
                  <a
                    key={w.name}
                    href={w.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: "9px", color: "#555", letterSpacing: "1px",
                      border: "1px solid rgba(255,255,255,0.06)", borderRadius: "4px",
                      padding: "6px 12px", textDecoration: "none",
                    }}
                  >
                    {w.icon} {w.name} ↗
                  </a>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- WITHDRAW MODAL ----
function WithdrawModal({
  usdcBalance,
  onClose,
}: {
  usdcBalance: number;
  onClose: () => void;
}) {
  const [token,       setToken]       = useState<"USDC" | "ASH">("USDC");
  const [amount,      setAmount]      = useState("");
  const [address,     setAddress]     = useState("");
  const [twoFa,       setTwoFa]       = useState("");
  const [submitting,  setSubmitting]  = useState(false);
  const [submitErr,   setSubmitErr]   = useState<string | null>(null);
  const [submitted,   setSubmitted]   = useState(false);

  async function handleWithdraw(e: React.FormEvent) {
    e.preventDefault();
    setSubmitErr(null);

    const num = parseFloat(amount);
    if (!num || num < 10) { setSubmitErr("MINIMUM WITHDRAWAL: $10 USDC"); return; }
    if (!address)          { setSubmitErr("SOLANA ADDRESS REQUIRED");      return; }
    if (!twoFa)            { setSubmitErr("2FA CODE REQUIRED");            return; }

    try {
      setSubmitting(true);
      await api.wallet.withdraw(num, address, twoFa);
      setSubmitted(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "WITHDRAWAL FAILED";
      setSubmitErr(msg.toUpperCase());
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className={styles.modal}>
          <div className={styles.modalHeader}>
            <span className={styles.modalTitle}>SUBMITTED</span>
            <button className={styles.modalClose} onClick={onClose}>✕</button>
          </div>
          <div className={styles.modalBody}>
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>✅</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "20px", letterSpacing: "3px", color: "var(--usdc-green)", marginBottom: "10px" }}>
                WITHDRAWAL SUBMITTED
              </div>
              <div style={{ fontSize: "10px", color: "var(--text-dim)", letterSpacing: "1px" }}>
                PROCESSING IN 10–30 MINUTES
              </div>
            </div>
            <button className="btn btn-ghost" style={{ width: "100%", marginTop: "20px" }} onClick={onClose}>
              CLOSE
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <span className={styles.modalTitle}>WITHDRAW</span>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.tokenTabs}>
            <button
              className={`${styles.tokenTab}${token === "USDC" ? " " + styles.active : ""}`}
              onClick={() => setToken("USDC")}
            >
              USDC
            </button>
            <button
              className={`${styles.tokenTab}${token === "ASH" ? " " + styles.active : ""}`}
              onClick={() => setToken("ASH")}
            >
              ASH
            </button>
          </div>

          <form className={styles.withdrawForm} onSubmit={handleWithdraw}>
            <div className="form-group">
              <label>AMOUNT ({token})</label>
              <input
                type="number"
                min="10"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
              <div style={{ fontSize: "9px", color: "var(--text-dim)", marginTop: "4px", letterSpacing: "1px" }}>
                AVAILABLE: ${Number(usdcBalance).toFixed(2)} USDC &nbsp;•&nbsp; MIN: $10.00
              </div>
            </div>

            <div className="form-group">
              <label>SOLANA WALLET ADDRESS</label>
              <input
                type="text"
                placeholder="YOUR SOLANA ADDRESS"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>2FA CODE</label>
              <input
                type="text"
                placeholder="6-DIGIT CODE"
                maxLength={6}
                value={twoFa}
                onChange={(e) => setTwoFa(e.target.value)}
                required
              />
            </div>

            <div className={styles.twoFaNotice}>
              🔐 2FA VERIFICATION REQUIRED TO COMPLETE WITHDRAWAL
            </div>

            {submitErr && (
              <div className={styles.errorState}>{submitErr}</div>
            )}

            <button
              type="submit"
              className="btn btn-fire"
              style={{ width: "100%" }}
              disabled={submitting}
            >
              {submitting ? "PROCESSING..." : "💸 REQUEST WITHDRAWAL"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ---- MAIN PAGE ----
export default function WalletPage() {
  const router = useRouter();
  const [walletData,  setWalletData]  = useState<WalletData | null>(null);
  const [txList,      setTxList]      = useState<Transaction[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [txLoading,   setTxLoading]   = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [modal,       setModal]       = useState<ModalType>(null);
  const [txFilter,    setTxFilter]    = useState<TxFilter>("all");
  const pollRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const balanceRef   = useRef<number>(0);

  // Load wallet balance
  const loadWallet = useCallback(async () => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
      if (!token) { router.replace("/login"); return; }
      api.setToken(token);

      const res = await api.wallet.balance() as { data?: WalletData } & WalletData;
      const data = res.data ?? res;
      setWalletData(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load wallet";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Load tx history
  const loadTx = useCallback(async (filter: TxFilter) => {
    try {
      setTxLoading(true);
      const type = filter === "all" ? undefined : filter; // already uppercase
      const res  = await api.wallet.transactions(type, 1, 20) as { data?: { transactions: Transaction[] } } & { transactions?: Transaction[] };
      const arr  = res.data?.transactions ?? res.transactions ?? (Array.isArray(res) ? res : []);
      setTxList(arr);
    } catch {
      setTxList([]);
    } finally {
      setTxLoading(false);
    }
  }, []);

  // Poll balance after deposit until it increases (max 90 seconds)
  const startDepositPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    balanceRef.current = Number(walletData?.usdcBalance ?? 0);
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
        if (!token) return;
        api.setToken(token);
        const res = await api.wallet.balance() as { data?: WalletData } & WalletData;
        const data = res.data ?? res;
        const newBal = Number(data.usdcBalance ?? 0);
        setWalletData(data);
        if (newBal > balanceRef.current || attempts >= 18) {
          clearInterval(pollRef.current!);
          pollRef.current = null;
          if (newBal > balanceRef.current) loadTx(txFilter);
        }
      } catch { /* ignore poll errors */ }
    }, 5000);
  }, [walletData, loadTx, txFilter]);

  // Cleanup poll on unmount
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  useEffect(() => { loadWallet(); }, [loadWallet]);
  useEffect(() => { loadTx(txFilter); }, [loadTx, txFilter]);

  const usdc = Number(walletData?.usdcBalance ?? 0);
  const ash  = Number(walletData?.ashBalance  ?? 0);

  return (
    <>
      {/* ===== DASH HEADER ===== */}
      <div className="dash-header">
        <div className="dash-title">WALLET</div>
      </div>

      {error && <div className={styles.errorState}>⚠ {error}</div>}

      {loading ? (
        <div className={styles.loadingState}>LOADING WALLET...</div>
      ) : (
        <>
          {/* ===== BALANCE CARDS ===== */}
          <div className={styles.balanceGrid}>
            <div className={styles.balCard}>
              <div className={styles.balLabel}>💵 USDC BALANCE</div>
              <div className={`${styles.balValue} ${styles.balUsdc}`}>${usdc.toFixed(2)}</div>
              <div className={styles.balSub}>AVAILABLE FOR BURN / WITHDRAW</div>
            </div>
            <div className={styles.balCard}>
              <div className={styles.balLabel}>🔥 ASH TOKENS</div>
              <div className={`${styles.balValue} ${styles.balAsh}`}>{ash.toLocaleString()}</div>
              <div className={styles.balSub}>USE FOR BOOSTS &amp; TRADING</div>
            </div>
          </div>

          {/* ===== ACTION BUTTONS ===== */}
          <div className={styles.actionRow}>
            <button className="btn btn-fire"  onClick={() => setModal("deposit")}>💳 DEPOSIT</button>
            <button className="btn btn-ghost" onClick={() => setModal("withdraw")}>💸 WITHDRAW</button>
          </div>

          {/* ===== TX HISTORY ===== */}
          <div className="panel-box">
            <div className="panel-title">TRANSACTION HISTORY</div>

            <div className={styles.txFilters}>
              {TX_FILTERS.map((f) => (
                <button
                  key={f.key}
                  className={`${styles.txFilter}${txFilter === f.key ? " " + styles.active : ""}`}
                  onClick={() => setTxFilter(f.key)}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {txLoading ? (
              <div className={styles.loadingState}>LOADING...</div>
            ) : txList.length === 0 ? (
              <div className={styles.emptyState}>NO TRANSACTIONS FOUND</div>
            ) : (
              <div className="tx-list">
                {txList.map((tx) => (
                  <div key={tx.id} className="tx-item">
                    <div className="tx-icon">{txIcon(tx.type)}</div>
                    <div className="tx-details">
                      <div className="tx-type">{tx.type === "REFERRAL_REWARD" ? "REFERRAL" : tx.type}</div>
                      <div className="tx-date">{fmtDate(tx.createdAt)}</div>
                    </div>
                    <div className="tx-amount">
                      <div className={`amount ${txAmtClass(tx.type)}`}>{fmtAmt(tx)}</div>
                      <div className="tx-status">{tx.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ===== MODALS ===== */}
      {modal === "deposit" && (
        <DepositModal
          onClose={() => setModal(null)}
          onSuccess={() => { setModal(null); startDepositPolling(); }}
        />
      )}
      {modal === "withdraw" && (
        <WithdrawModal usdcBalance={usdc} onClose={() => { setModal(null); loadWallet(); }} />
      )}
    </>
  );
}
