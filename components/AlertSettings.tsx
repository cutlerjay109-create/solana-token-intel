"use client";

import { useState, useEffect } from "react";

interface AlertSettings {
  enabled: boolean;
  discord: string;
  telegramToken: string;
  telegramChatId: string;
  threshold: number;
  direction: "up" | "down" | "both";
  watchedAddresses: string[];
}

const DEFAULT: AlertSettings = {
  enabled: false,
  discord: "",
  telegramToken: "",
  telegramChatId: "",
  threshold: 50,
  direction: "up",
  watchedAddresses: [],
};

const STORAGE_KEY = "solana_alert_settings";

export function useAlertSettings() {
  const [settings, setSettings] = useState<AlertSettings>(DEFAULT);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setSettings(JSON.parse(saved));
    } catch {}
  }, []);

  const save = (s: AlertSettings) => {
    setSettings(s);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  };

  return { settings, save };
}

export async function sendBreakoutAlert(settings: AlertSettings, token: any) {
  const chg = token.price24hChangePercent ?? token.priceChange?.h24 ?? 0;
  const price = parseFloat(token.price ?? token.priceUsd ?? 0);
  const vol = (token.volume24hUSD ?? token.volume?.h24 ?? 0);

  const fmtVol = vol >= 1_000_000 ? `$${(vol/1_000_000).toFixed(2)}M`
    : vol >= 1_000 ? `$${(vol/1_000).toFixed(1)}K` : `$${vol.toFixed(0)}`;

  const fmtPrice = price < 0.0001 ? `$${price.toFixed(8)}`
    : price < 1 ? `$${price.toFixed(6)}` : `$${price.toFixed(2)}`;

  const birdeyeUrl = `https://birdeye.so/token/${token.address}?chain=solana`;

  const promises = [];

  if (settings.discord) {
    promises.push(
      fetch(settings.discord, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          embeds: [{
            title: `${chg >= 0 ? "🚀" : "📉"} ${chg >= 0 ? "Breakout" : "Dump"} Alert: ${token.symbol || "Unknown"}`,
            description: `**${token.name || token.symbol}** has moved ${chg >= 0 ? "+" : ""}${chg.toFixed(1)}% — ${chg >= 0 ? "above" : "below"} your ${settings.threshold}% threshold!`,
            color: 0x1D9E75,
            fields: [
              { name: "Token",          value: `${token.symbol} — ${token.name}`,  inline: false },
              { name: "Price",          value: fmtPrice,                            inline: true  },
              { name: "24h Change",     value: `+${chg.toFixed(2)}%`,              inline: true  },
              { name: "Volume 24h",     value: fmtVol,                             inline: true  },
              { name: "Risk Score",     value: `${token.score ?? "N/A"}/100`,      inline: true  },
              { name: "Risk Label",     value: token.label ?? "Unknown",           inline: true  },
              { name: "Contract",       value: `\`${token.address}\``,             inline: false },
              { name: "View on Birdeye",value: birdeyeUrl,                         inline: false },
            ],
            footer: { text: "Solana Token Intel · Powered by Birdeye Data" },
            timestamp: new Date().toISOString(),
          }],
        }),
      })
    );
  }

  if (settings.telegramToken && settings.telegramChatId) {
    const msg =
      `🚀 *Breakout Alert: ${token.symbol || "Unknown"}*

` +
      `*${token.name || token.symbol}* has moved *+${chg.toFixed(1)}%*
` +
      `Above your threshold of ${settings.threshold}%

` +
      `💰 *Price:* ${fmtPrice}
` +
      `📈 *24h Change:* +${chg.toFixed(2)}%
` +
      `📊 *Volume 24h:* ${fmtVol}
` +
      `🛡 *Risk Score:* ${token.score ?? "N/A"}/100 (${token.label ?? "Unknown"})

` +
      `📋 *Contract:*
\`${token.address}\`

` +
      `🔗 [View on Birdeye](${birdeyeUrl})

` +
      `_Solana Token Intel · Birdeye Data_`;

    promises.push(
      fetch(`https://api.telegram.org/bot${settings.telegramToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: settings.telegramChatId,
          text: msg,
          parse_mode: "Markdown",
          disable_web_page_preview: false,
        }),
      })
    );
  }

  await Promise.allSettled(promises);
}

export default function AlertSettingsModal({ onClose, dark = false }: { onClose: () => void; dark?: boolean }) {
  const bg     = dark ? "#1e1e1c" : "#ffffff";
  const bg2    = dark ? "#2a2a28" : "#F1EFE8";
  const border  = dark ? "#3a3a38" : "#D3D1C7";
  const text    = dark ? "#e8e6df" : "#2c2c2a";
  const text2   = dark ? "#9c9a92" : "#888780";
  const text3   = dark ? "#6a6a68" : "#B4B2A9";
  const blue    = dark ? "#5ba3e8" : "#185FA5";
  const blueBg  = dark ? "#0f2035" : "#E6F1FB";
  const green   = dark ? "#7bc96f" : "#3B6D11";
  const greenBg = dark ? "#1a2e14" : "#EAF3DE";
  const red     = dark ? "#f47c7c" : "#A32D2D";
  const redBg   = dark ? "#2e1414" : "#FCEBEB";
  const amber   = dark ? "#e8a44a" : "#854F0B";
  const amberBg = dark ? "#2e2210" : "#FAEEDA";

  const { settings, save } = useAlertSettings();
  const [form, setForm] = useState<AlertSettings>(settings);
  const [newAddress, setNewAddress] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState("");

  useEffect(() => { setForm(settings); }, [settings]);

  const update = (key: keyof AlertSettings, value: any) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const addAddress = () => {
    const addr = newAddress.trim();
    if (!addr || form.watchedAddresses.includes(addr)) return;
    update("watchedAddresses", [...form.watchedAddresses, addr]);
    setNewAddress("");
  };

  const removeAddress = (addr: string) =>
    update("watchedAddresses", form.watchedAddresses.filter(a => a !== addr));

  const handleSave = () => { save(form); onClose(); };

  const handleTest = async () => {
    setTesting(true);
    setTestResult("");
    const mockToken = {
      symbol: "BONK", name: "Bonk",
      price: 0.00000621, priceUsd: "0.00000621",
      price24hChangePercent: form.threshold + 10,
      volume24hUSD: 2_450_000,
      score: 68, label: "caution",
      address: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    };
    try {
      await sendBreakoutAlert(form, mockToken);
      setTestResult("✓ Test alert sent! Check your Discord/Telegram.");
    } catch (e: any) {
      setTestResult("✗ Failed: " + e.message);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, padding: 20,
    }}>
      <div onClick={e => e.stopPropagation()} className="card modal-card" style={{
        background: bg, borderRadius: 16, padding: 24,
        width: "100%", maxWidth: 460, maxHeight: "90vh", overflowY: "auto",
        display: "flex", flexDirection: "column", gap: 16,
      }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 600, color: text }}>Breakout Alerts</div>
            <div style={{ fontSize: 12, color: text2, marginTop: 2 }}>
              Get notified on Discord or Telegram when tokens break out
            </div>
          </div>
          <button onClick={onClose} style={{ background: bg2, border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 14, color: text2 }}>X</button>
        </div>

        {/* Enable toggle */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: bg2, borderRadius: 10, padding: "12px 16px" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: text }}>Enable alerts</div>
            <div style={{ fontSize: 12, color: text2 }}>Monitor watched tokens for breakouts</div>
          </div>
          <div onClick={() => update("enabled", !form.enabled)} style={{
            width: 40, height: 22, borderRadius: 11, cursor: "pointer",
            background: form.enabled ? "#185FA5" : "#D3D1C7",
            position: "relative", transition: "background 0.2s", flexShrink: 0,
          }}>
            <div style={{
              width: 16, height: 16, borderRadius: "50%", background: bg,
              position: "absolute", top: 3,
              left: form.enabled ? 21 : 3,
              transition: "left 0.2s",
            }} />
          </div>
        </div>

        {/* Threshold */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8 }}>
            <span style={{ fontWeight: 500, color: text }}>Alert threshold</span>
            <span style={{ fontWeight: 500, color: form.direction === "down" ? "#A32D2D" : "#185FA5" }}>
              {form.direction === "down" ? "-" : "+"}{form.threshold}%
            </span>
          </div>
          <input type="range" min={10} max={500} step={10} value={form.threshold}
            onChange={e => update("threshold", Number(e.target.value))}
            style={{
              width: "100%",
              accentColor: form.direction === "down" ? "#E24B4A" : "#185FA5",
            }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: text3, marginTop: 4 }}>
            <span>{form.direction === "down" ? "-10%" : "+10%"}</span>
            <span>{form.direction === "down" ? "Alert when price drops below" : "Alert when price rises above"}</span>
            <span>{form.direction === "down" ? "-500%" : "+500%"}</span>
          </div>
        </div>

        {/* Direction */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: text, marginBottom: 8 }}>Alert direction</div>
          <div style={{ display: "flex", gap: 8 }}>
            {([
              { key: "up",   label: "▲ Above",  desc: "Price rises above threshold" },
              { key: "down", label: "▼ Below",  desc: "Price drops below threshold" },
            ] as const).map(({ key, label, desc }) => (
              <div key={key} onClick={() => update("direction", key)} style={{
                flex: 1, padding: "10px", borderRadius: 8, cursor: "pointer", textAlign: "center",
                border: form.direction === key ? `2px solid ${key === "up" ? "#185FA5" : "#A32D2D"}` : "0.5px solid #D3D1C7",
                background: form.direction === key ? (key === "up" ? "#E6F1FB" : "#FCEBEB") : "transparent",
              }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: form.direction === key ? (key === "up" ? "#0C447C" : "#A32D2D") : "#2c2c2a" }}>{label}</div>
                <div style={{ fontSize: 11, color: text2, marginTop: 2 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Watched addresses */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: text, marginBottom: 8 }}>
            Watched token addresses
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input
              type="text"
              placeholder="Paste contract address..."
              value={newAddress}
              onChange={e => setNewAddress(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addAddress()}
              style={{ flex: 1, fontSize: 12, padding: "8px 12px", border: "0.5px solid #D3D1C7", borderRadius: 8, outline: "none", background: "transparent", color: "inherit" }}
            />
            <button onClick={addAddress} style={{
              padding: "8px 14px", fontSize: 12, cursor: "pointer", borderRadius: 8,
              background: blue, color: bg, border: "none", fontWeight: 500,
            }}>Add</button>
          </div>
          {form.watchedAddresses.length === 0 ? (
            <div style={{ fontSize: 12, color: text3, padding: "8px 0" }}>
              No tokens watched yet. Add contract addresses above.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {form.watchedAddresses.map(addr => (
                <div key={addr} style={{ display: "flex", alignItems: "center", gap: 8, background: bg2, borderRadius: 8, padding: "8px 12px" }}>
                  <div style={{ flex: 1, fontSize: 11, fontFamily: "monospace", color: text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {addr}
                  </div>
                  <button onClick={() => removeAddress(addr)} style={{
                    background: redBg, border: "none", borderRadius: 6,
                    fontSize: 11, color: red, padding: "2px 8px", cursor: "pointer", flexShrink: 0,
                  }}>Remove</button>
                </div>
              ))}
            </div>
          )}
          <div style={{ fontSize: 11, color: text2, marginTop: 6 }}>
            Copy any contract address from a token card and paste it here.
            You will be alerted when that token exceeds your threshold.
          </div>
        </div>

        {/* Discord */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: text, marginBottom: 6 }}>Discord Webhook URL</div>
          <input type="text" placeholder="https://discord.com/api/webhooks/..."
            value={form.discord} onChange={e => update("discord", e.target.value)}
            style={{ width: "100%", fontSize: 12, padding: "8px 12px", border: "0.5px solid #D3D1C7", borderRadius: 8, outline: "none", background: "transparent", color: "inherit" }} />
          <div style={{ fontSize: 11, color: text2, marginTop: 4 }}>
            Discord → Server Settings → Integrations → Webhooks → New Webhook
          </div>
        </div>

        {/* Telegram */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: text, marginBottom: 6 }}>Telegram</div>
          <input type="text" placeholder="Bot token from @BotFather"
            value={form.telegramToken} onChange={e => update("telegramToken", e.target.value)}
            style={{ width: "100%", fontSize: 12, padding: "8px 12px", border: "0.5px solid #D3D1C7", borderRadius: 8, outline: "none", background: "transparent", color: "inherit", marginBottom: 8 }} />
          <input type="text" placeholder="Chat ID (e.g. -1001234567890)"
            value={form.telegramChatId} onChange={e => update("telegramChatId", e.target.value)}
            style={{ width: "100%", fontSize: 12, padding: "8px 12px", border: "0.5px solid #D3D1C7", borderRadius: 8, outline: "none", background: "transparent", color: "inherit" }} />
          <div style={{ fontSize: 11, color: text2, marginTop: 4 }}>
            Create bot via @BotFather · Get Chat ID via @userinfobot
          </div>
        </div>

        {/* Test result */}
        {testResult && (
          <div style={{
            fontSize: 12, padding: "8px 12px", borderRadius: 8,
            background: testResult.startsWith("✓") ? "#EAF3DE" : "#FCEBEB",
            color: testResult.startsWith("✓") ? "#3B6D11" : "#A32D2D",
          }}>{testResult}</div>
        )}

        {/* Buttons */}
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={handleTest} disabled={testing || (!form.discord && !form.telegramToken)}
            style={{ flex: 1, padding: "9px 0", fontSize: 13, cursor: "pointer", borderRadius: 8, border: "0.5px solid #D3D1C7", background: "transparent", color: text, fontWeight: 500 }}>
            {testing ? "Sending..." : "Send test alert"}
          </button>
          <button onClick={handleSave}
            style={{ flex: 1, padding: "9px 0", fontSize: 13, cursor: "pointer", borderRadius: 8, border: "none", background: blue, color: bg, fontWeight: 500 }}>
            Save settings
          </button>
        </div>

      </div>
    </div>
  );
}
