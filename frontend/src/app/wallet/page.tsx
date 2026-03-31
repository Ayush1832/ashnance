"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import styles from "./wallet.module.css";

// ---- Types ----
interface WalletData {
  usdcBalance: number;
  ashBalance: number;
  depositAddress: string;
}

interface Transaction {
  id: string;
  type: string;
  amountUsdc?: number;
  amountAsh?: number;
  prizeAmount?: number;
  status: string;
  createdAt: string;
  toAddress?: string;
}

type ModalType = "deposit" | "withdraw" | null;
type TxFilter = "all" | "deposit" | "burn" | "win" | "withdraw" | "referral";

const TX_FILTERS: { key: TxFilter; label: string }[] = [
  { key: "all",      label: "ALL"       },
  { key: "deposit",  label: "DEPOSITS"  },
  { key: "burn",     label: "BURNS"     },
  { key: "win",      label: "WINS"      },
  { key: "withdraw", label: "WITHDRAWS" },
  { key: "referral", label: "REFERRALS" },
];

function txIcon(type: string) {
  switch (type) {
    case "burn":     return "🔥";
    case "win":      return "🏆";
    case "deposit":  return "💳";
    case "withdraw": return "💸";
    case "referral": return "👥";
    default:         return "📋";
  }
}

function txAmtClass(type: string) {
  return (type === "win" || type === "deposit" || type === "referral") ? "pos" : "neg";
}

const n = (v: unknown) => Number(v ?? 0);

function fmtAmt(tx: Transaction): string {
  switch (tx.type) {
    case "win":      return `+$${n(tx.prizeAmount).toFixed(2)} USDC`;
    case "deposit":  return `+$${n(tx.amountUsdc).toFixed(2)} USDC`;
    case "burn":     return `-$${n(tx.amountUsdc).toFixed(2)} USDC`;
    case "withdraw": return `-$${n(tx.amountUsdc).toFixed(2)} USDC`;
    case "referral": return `+$${n(tx.amountUsdc).toFixed(2)} USDC`;
    default:
      if (tx.amountAsh) return `+${tx.amountAsh} ASH`;
      return `$${n(tx.amountUsdc).toFixed(2)} USDC`;
  }
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

// ---- DEPOSIT MODAL ----
function DepositModal({
  address,
  onClose,
}: {
  address: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  function copyAddress() {
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <span className={styles.modalTitle}>DEPOSIT</span>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        <div className={styles.modalBody}>
          <div className="form-group">
            <label>YOUR SOLANA USDC DEPOSIT ADDRESS</label>
            <div className="copy-box">
              <span className="addr">{address || "LOADING..."}</span>
              <button className="copy-btn" onClick={copyAddress}>
                {copied ? "COPIED!" : "COPY"}
              </button>
            </div>
          </div>

          <div className={styles.noticeBox}>
            <strong>⚠ SOLANA NETWORK ONLY.</strong><br />
            SEND USDC (SPL TOKEN) ONLY. MINIMUM: 1 USDC.
            DEPOSITS REFLECT WITHIN 1–2 MINUTES.
          </div>

          <button className={`${styles.walletConnectBtn}`} style={{ marginTop: "20px" }}>
            <span style={{ fontSize: "20px" }}>👻</span>
            CONNECT PHANTOM WALLET
          </button>
          <button className={styles.walletConnectBtn}>
            <span style={{ fontSize: "20px" }}>☀️</span>
            CONNECT SOLFLARE
          </button>
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
  const [walletData,  setWalletData]  = useState<WalletData | null>(null);
  const [txList,      setTxList]      = useState<Transaction[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [txLoading,   setTxLoading]   = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [modal,       setModal]       = useState<ModalType>(null);
  const [txFilter,    setTxFilter]    = useState<TxFilter>("all");

  // Load wallet balance
  const loadWallet = useCallback(async () => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
      if (token) api.setToken(token);

      const res = await api.wallet.balance() as { data?: WalletData } & WalletData;
      const data = res.data ?? res;
      setWalletData(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load wallet";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load tx history
  const loadTx = useCallback(async (filter: TxFilter) => {
    try {
      setTxLoading(true);
      const type = filter === "all" ? undefined : filter;
      const res  = await api.wallet.transactions(type, 1, 20) as { data?: { transactions: Transaction[] } } & { transactions?: Transaction[] };
      const arr  = res.data?.transactions ?? res.transactions ?? (Array.isArray(res) ? res : []);
      setTxList(arr);
    } catch {
      setTxList([]);
    } finally {
      setTxLoading(false);
    }
  }, []);

  useEffect(() => { loadWallet(); }, [loadWallet]);
  useEffect(() => { loadTx(txFilter); }, [loadTx, txFilter]);

  const usdc    = Number(walletData?.usdcBalance    ?? 0);
  const ash     = Number(walletData?.ashBalance     ?? 0);
  const depAddr = walletData?.depositAddress ?? "";

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
                      <div className="tx-type">{tx.type.toUpperCase()}</div>
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
        <DepositModal address={depAddr} onClose={() => setModal(null)} />
      )}
      {modal === "withdraw" && (
        <WithdrawModal usdcBalance={usdc} onClose={() => { setModal(null); loadWallet(); }} />
      )}
    </>
  );
}
