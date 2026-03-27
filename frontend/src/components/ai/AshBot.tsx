"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./ashbot.module.css";

interface Message {
  id: number;
  text: string;
  sender: "bot" | "user";
  timestamp: Date;
}

const greetings = [
  "🔥 Hey burner! Ready to test your luck?",
  "👋 Welcome back! The fire's burning bright today!",
  "🎰 Hey there! Got a feeling today's your day!",
];

const burnTips = [
  "💡 Tip: Higher burns = higher weight = better odds!",
  "🎯 Pro tip: Get 5 referrals for a +0.20 weight bonus!",
  "⚡ Boost with 1000 ASH for +0.50 weight for an hour!",
  "👑 Holy Fire VIPs get +0.50 weight on EVERY burn!",
  "📊 Your effective chance = Weight / (Weight + 100)",
  "🎲 Each burn has an independent random outcome via VRF.",
  "💰 Even when you lose, you earn 200-500 ASH tokens!",
  "🏆 Jackpot is 1% of all wins — someone's gotta win it!",
];

const encouragement = [
  "🔥 Keep burning! Fortune favors the bold!",
  "💪 The ashes remember every burn. Your time will come!",
  "🎯 Every burn earns you ASH tokens — nothing is wasted!",
  "⚡ Feeling lucky? Trust the fire!",
  "🌟 The bigger the burn, the brighter the reward!",
];

const winResponses = [
  "🎉 AMAZING! The fire gods are smiling on you today!",
  "🏆 INCREDIBLE WIN! Screenshot this and share it!",
  "💰 WINNER WINNER! Your wallet is getting fatter!",
];

const loseResponses = [
  "🌧️ Not this time, but you earned some sweet ASH tokens!",
  "💎 The ashes hold power — keep collecting!",
  "🔄 Every burn gets you closer to the big one!",
];

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getBotResponse(userMsg: string): string {
  const msg = userMsg.toLowerCase();

  if (msg.includes("help") || msg.includes("how")) {
    return "🔥 Burn USDC → Random chance to win prizes (up to $2,500!) or earn ASH tokens. Your weight determines your odds. Type 'weight' to learn more!";
  }
  if (msg.includes("weight")) {
    return "⚖️ Weight = (Burn Amount / $4.99) + VIP Bonus + Referral Bonus + ASH Boost. Higher weight = better odds! EffectiveChance = Weight / (Weight + 100)";
  }
  if (msg.includes("vip") || msg.includes("holy fire")) {
    return "👑 Holy Fire VIP ($24.99/mo): +0.50 weight, +20% ASH on loss, weekly raffle, priority hints, and VIP badge!";
  }
  if (msg.includes("referral") || msg.includes("refer")) {
    return "👥 Share your referral link → earn 10% of every burn your friends make! Get 5 referrals = +0.20 weight bonus!";
  }
  if (msg.includes("ash") || msg.includes("token")) {
    return "🪙 ASH tokens: Earned on every loss (200-500). Burn 1000 ASH for +0.50 weight boost (1hr). Future staking rewards planned!";
  }
  if (msg.includes("prize") || msg.includes("win")) {
    return "🏆 Prize tiers: Jackpot $2,500 (1%), Big $500 (4%), Medium $200 (15%), Small $50 (80%). All from the Reward Pool!";
  }
  if (msg.includes("tip") || msg.includes("strategy")) {
    return getRandomItem(burnTips);
  }
  if (msg.includes("luck") || msg.includes("feeling")) {
    return getRandomItem(encouragement);
  }

  // Default: random tip
  return getRandomItem(burnTips);
}

export default function AshBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, text: getRandomItem(greetings), sender: "bot", timestamp: new Date() },
  ]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const msgCounter = useRef(2);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const userMsg: Message = {
      id: msgCounter.current++,
      text: inputValue,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");

    const delay = 700;
    // Bot response after slight delay
    setTimeout(() => {
      const botMsg: Message = {
        id: msgCounter.current++,
        text: getBotResponse(inputValue),
        sender: "bot",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMsg]);
    }, delay);
  };

  return (
    <>
      {/* Floating Icon */}
      <button
        className={`${styles.ashBotIcon} ${isOpen ? styles.iconHidden : ""}`}
        onClick={() => setIsOpen(true)}
        title="Ask AshBot"
      >
        <span className={styles.botEmoji}>🤖</span>
        <span className={styles.botPulse} />
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className={styles.chatWindow}>
          <div className={styles.chatHeader}>
            <div className={styles.chatHeaderLeft}>
              <span>🤖</span>
              <div>
                <strong>AshBot</strong>
                <span className={styles.onlineStatus}>● Online</span>
              </div>
            </div>
            <button className={styles.closeBtn} onClick={() => setIsOpen(false)}>✕</button>
          </div>

          <div className={styles.chatMessages}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`${styles.message} ${msg.sender === "bot" ? styles.botMessage : styles.userMessage}`}
              >
                {msg.text}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className={styles.chatQuickActions}>
            {["💡 Tips", "🏆 Prizes", "👑 VIP", "👥 Referrals"].map((label) => (
              <button
                key={label}
                className={styles.quickAction}
                onClick={() => {
                  setInputValue(label.split(" ")[1]);
                  setTimeout(() => {
                    const userMsg: Message = {
                      id: msgCounter.current++,
                      text: label.split(" ")[1],
                      sender: "user",
                      timestamp: new Date(),
                    };
                    setMessages((prev) => [...prev, userMsg]);
                    setTimeout(() => {
                      const botMsg: Message = {
                        id: msgCounter.current++,
                        text: getBotResponse(label.split(" ")[1]),
                        sender: "bot",
                        timestamp: new Date(),
                      };
                      setMessages((prev) => [...prev, botMsg]);
                    }, 400);
                  }, 100);
                  setInputValue("");
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <div className={styles.chatInput}>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask about burns, weight, prizes..."
            />
            <button onClick={handleSend} className={styles.sendBtn}>🔥</button>
          </div>
        </div>
      )}
    </>
  );
}

// Export event-based triggers for integration with burn results
export function getWinMessage() { return getRandomItem(winResponses); }
export function getLoseMessage() { return getRandomItem(loseResponses); }
export function getTipMessage() { return getRandomItem(burnTips); }
