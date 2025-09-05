import React, { useEffect, useRef, useState } from "react";

const CFG = {
  BOT_USERNAME: process.env.NEXT_PUBLIC_BOT_USERNAME || "",
  AUTH_URL: process.env.NEXT_PUBLIC_AUTH_URL || "/api/auth/telegram",
  REQUEST_ACCESS: "write" as const,
};

const FLAGS = {
  USE_WIDGET: true
};

type TgUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date?: string | number;
  hash?: string;
};

export default function IndexPage() {
  return <TelegramAuthApp />;
}

export function TelegramAuthApp() {
  const slotRef = useRef<HTMLDivElement | null>(null);
  const [phase, setPhase] = useState<"auth" | "loading" | "menu">("auth");
  const [user, setUser] = useState<TgUser | null>(null);
  const [widgetError, setWidgetError] = useState<string | null>(null);
  const [widgetReady, setWidgetReady] = useState(false);

  // Виджет логина (используется как фолбэк, когда открыто не в Telegram)
  useEffect(() => {
    if (!FLAGS.USE_WIDGET) return;
    if (!slotRef.current) return;

    (window as any).onTelegramAuth = (u: TgUser) => handleAuthSuccess(u);

    try {
      const existing = document.querySelector(
        `script[src^="https://telegram.org/js/telegram-widget.js"]`
      ) as HTMLScriptElement | null;

      const script = existing || document.createElement("script");
      if (!existing) {
        script.src = "https://telegram.org/js/telegram-widget.js?22";
        script.async = true;
        script.defer = true;
        script.setAttribute("data-telegram-login", CFG.BOT_USERNAME || "");
        script.setAttribute("data-size", "large");
        script.setAttribute("data-userpic", "false");
        script.setAttribute("data-request-access", CFG.REQUEST_ACCESS);
        script.setAttribute("data-onauth", "onTelegramAuth");
        if (CFG.AUTH_URL) script.setAttribute("data-auth-url", CFG.AUTH_URL);
        script.onerror = () => setWidgetError("Widget blocked or failed to load");
        script.onload = () => setWidgetReady(true);
        slotRef.current.appendChild(script);
      } else {
        const clone = existing.cloneNode(true) as HTMLScriptElement;
        clone.setAttribute("data-onauth", "onTelegramAuth");
        if (CFG.AUTH_URL) clone.setAttribute("data-auth-url", CFG.AUTH_URL);
        clone.onerror = () => setWidgetError("Widget blocked or failed to load");
        clone.onload = () => setWidgetReady(true);
        slotRef.current.innerHTML = "";
        slotRef.current.appendChild(clone);
      }
    } catch (err) {
      setWidgetError("Widget injection error");
    }

    return () => {
      try {
        if ((window as any).onTelegramAuth) delete (window as any).onTelegramAuth;
      } catch {}
    };
  }, []);

  // [WEBAPP] Авто-детект, если открыто как Telegram WebApp (Mini App)
  useEffect(() => {
    const tg = (window as any)?.Telegram?.WebApp;
    if (!tg) return;

    tg.ready();
    tg.expand();

    // Показать нижнюю кнопку Telegram
    tg.MainButton.setText("Continue").show();
    tg.MainButton.onClick(() => {
      sendInitDataToBackend();
    });

    // Если Telegram уже дал пользователя — авторизуем локально для UX
    const u = tg.initDataUnsafe?.user;
    if (u) {
      handleAuthSuccess({
        id: u.id,
        first_name: u.first_name,
        last_name: u.last_name,
        username: u.username,
        photo_url: u.photo_url,
        auth_date: Date.now(),
        hash: "webapp",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // [WEBAPP] Отправка initData на бек для проверки подписи и установки сессии
  async function sendInitDataToBackend() {
    const tg = (window as any)?.Telegram?.WebApp;
    if (!tg?.initData) return;
    try {
      const res = await fetch("/api/auth/webapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData: tg.initData }),
      });
      if (res.ok) {
        window.location.href = "/app";
      } else {
        const msg = await res.text();
        alert("Auth error: " + msg);
      }
    } catch {
      alert("Network error");
    }
  }

  function handleAuthSuccess(u: TgUser) {
    setUser(u);
    setPhase("loading");
    setTimeout(() => setPhase("menu"), 1000);
  }

  function simulateAuth() {
    handleAuthSuccess({
      id: 777,
      first_name: "Spectra",
      username: "spectra_demo",
      photo_url: "",
      auth_date: Date.now(),
      hash: "dev",
    });
  }

  function openOAuth() {
    if (!FLAGS.USE_WIDGET) return simulateAuth();
    try {
      const origin = encodeURIComponent(window.location.origin);
      const url = `https://oauth.telegram.org/auth?bot=${CFG.BOT_USERNAME}&origin=${origin}&embed=1&request_access=${CFG.REQUEST_ACCESS}`;
      window.open(url, "tg_oauth", "noopener,noreferrer,width=550,height=700");
    } catch {
      simulateAuth();
    }
  }

  function openCommunity() {
    window.open("https://t.me/+gADPD5Z68f9kNTYy", "_blank");
  }

  // Экраны
  if (phase === "loading") return <LoadingScreen user={user || undefined} />;
  if (phase === "menu")
    return (
      <MainMenu
        user={user || undefined}
        onLogout={() => {
          setUser(null);
          setPhase("auth");
        }}
      />
    );

  // Экран авторизации
  const container: React.CSSProperties = baseContainerStyle;
  return (
    <div style={container}>
      <Panel>
        <Logo />
        <H1>Заходи через Telegram</H1>
        <P>
          Моментальная авторизация без паролей. Мы получим только твои публичные данные Telegram
          (имя, юзернейм, аватар) — и создадим профиль.
        </P>

        <div ref={slotRef} style={{ minHeight: 44, marginTop: 8 }} />
        {FLAGS.USE_WIDGET && (
          <small style={{ color: widgetError ? "#f8c4c4" : "#b8c0ff" }}>
            {!widgetReady && !widgetError && "Загружаем виджет…"}
            {widgetError && `${widgetError}. Используем локальный вход.`}
          </small>
        )}

        <Row>
          <PrimaryButton onClick={openOAuth}>
            <TelegramIcon /> Continue
          </PrimaryButton>
          <SecondaryButton onClick={openCommunity}>Join our Telegram Community</SecondaryButton>
        </Row>

        <Small dim>
          Продолжая, вы соглашаетесь с Политикой конфиденциальности и Условиями сервиса.
        </Small>
      </Panel>
    </div>
  );
}

// =================== LOADING ===================
function LoadingScreen({ user }: { user?: TgUser }) {
  return (
    <div style={baseContainerStyle}>
      <Panel>
        <Logo />
        <div style={{ height: 24 }} />
        <Spinner />
        <H2>Подождите… создаём профиль</H2>
        <P>
          {user?.first_name ? (
            <>
              Привет, <b>{user.first_name}</b>!
            </>
          ) : (
            <>Считываем данные Telegram…</>
          )}
        </P>
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            color: "#d6dbff",
            fontSize: 14,
            lineHeight: "20px",
          }}
        >
          <li>• Проверяем подпись (HMAC)</li>
          <li>• Создаём/обновляем профиль</li>
          <li>• Загружаем аватар и имя</li>
        </ul>
      </Panel>
    </div>
  );
}

function Spinner() {
  const wrap: React.CSSProperties = {
    position: "relative",
    width: 48,
    height: 48,
    margin: "12px auto",
  };
  const ringBase: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    borderRadius: 9999,
    border: "4px solid rgba(255,255,255,.15)",
  };
  const ringSpin: React.CSSProperties = {
    ...ringBase,
    border: "4px solid #fff",
    borderTopColor: "transparent",
    animation: "spin 1s linear infinite",
  };
  return (
    <div style={wrap}>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
      <div style={ringBase} />
      <div style={ringSpin} />
    </div>
  );
}

// =================== MENU ===================
function MainMenu({ user, onLogout }: { user?: TgUser; onLogout: () => void }) {
  return (
    <div style={baseContainerStyle}>
      <Panel>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Logo />
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: "#f0f2ff", fontWeight: 600, fontSize: 14 }}>
                {user?.first_name || "User"} {user?.last_name || ""}
              </div>
              <div style={{ color: "#b8c0ff", fontSize: 12 }}>@{user?.username || "username"}</div>
            </div>
            <Avatar src={user?.photo_url} />
          </div>
        </div>

        <div
          style={{
            marginTop: 24,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))",
            gap: 12,
          }}
        >
          <MenuCard title="Маркет" subtitle="Гифты и коллекции" icon="🛍️" onClick={() => alert("Маркет")} />
          <MenuCard title="Мой профиль" subtitle="Баланс, достижения" icon="👤" onClick={() => alert("Профиль")} />
          <MenuCard title="Мои покупки" subtitle="История подарков" icon="🎁" onClick={() => alert("Покупки")} />
          <MenuCard
            title="Сообщество"
            subtitle="Новости и чат"
            icon="💬"
            onClick={() => window.open("https://t.me/+gADPD5Z68f9kNTYy", "_blank")}
          />
          <MenuCard title="Поддержка" subtitle="Вопросы и помощь" icon="🛠️" onClick={() => alert("Поддержка")} />
          <MenuCard title="Выйти" subtitle="Завершить сессию" icon="🚪" onClick={onLogout} />
        </div>
      </Panel>
    </div>
  );
}

function Avatar({ src }: { src?: string }) {
  const box: React.CSSProperties = {
    width: 40,
    height: 40,
    borderRadius: 999,
    overflow: "hidden",
    border: "1px solid rgba(255,255,255,.2)",
    background: "rgba(255,255,255,.08)",
    display: "grid",
    placeItems: "center",
    color: "#b8c0ff",
    fontSize: 12,
  };
  return src ? (
    <img src={src} alt="avatar" style={{ ...box, objectFit: "cover" }} />
  ) : (
    <div style={box}>TG</div>
  );
}

function MenuCard({
  title,
  subtitle,
  icon,
  onClick,
}: {
  title: string;
  subtitle: string;
  icon: string;
  onClick: () => void;
}) {
  const card: React.CSSProperties = {
    position: "relative",
    textAlign: "left",
    padding: 16,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,.12)",
    background: "rgba(255,255,255,.06)",
    color: "#fff",
    cursor: "pointer",
    overflow: "hidden",
  };
  const hover: React.CSSProperties = {
    position: "absolute",
    inset: -8,
    background:
      "radial-gradient(400px 120px at 100% 0%, rgba(255,255,255,.12), transparent 60%)",
    opacity: 0,
    transition: "opacity .25s",
    pointerEvents: "none",
  };
  const titleCss: React.CSSProperties = { fontWeight: 600, fontSize: 16 };
  const subCss: React.CSSProperties = { color: "#c9ceff", fontSize: 13, marginTop: 2 };
  return (
    <div
      style={card}
      onClick={onClick}
      onMouseEnter={(e) =>
        ((e.currentTarget.querySelector(".hoverFx") as HTMLDivElement).style.opacity = "1")
      }
      onMouseLeave={(e) =>
        ((e.currentTarget.querySelector(".hoverFx") as HTMLDivElement).style.opacity = "0")
      }
    >
      <div className="hoverFx" style={hover} />
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ fontSize: 22 }}>{icon}</div>
        <div>
          <div style={titleCss}>{title}</div>
          <div style={subCss}>{subtitle}</div>
        </div>
      </div>
    </div>
  );
}

// =================== UI PRIMITIVES ===================
const baseContainerStyle: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
  color: "#fff",
  background: "linear-gradient(135deg, #0b1020, #0b0f1a 55%, #0a0d16)",
};

function Panel({ children }: { children: React.ReactNode }) {
  const wrap: React.CSSProperties = {
    position: "relative",
    width: "100%",
    maxWidth: 720,
    borderRadius: 24,
    border: "1px solid rgba(255,255,255,.12)",
    boxShadow: "0 20px 80px rgba(0,0,0,.45)",
    padding: 24,
    background: "rgba(255,255,255,.04)",
    overflow: "hidden",
  };
  const rings: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    opacity: 0.18,
    background:
      "radial-gradient(120px 120px at 10% 10%, rgba(120,170,255,.25), transparent 60%), radial-gradient(160px 140px at 90% 20%, rgba(120,255,210,.2), transparent 60%), radial-gradient(160px 160px at 50% 120%, rgba(180,120,255,.22), transparent 60%)",
  };
  return (
    <div style={wrap}>
      <div style={rings} />
      <div style={{ position: "relative" }}>{children}</div>
    </div>
  );
}

function Logo() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#eaf0ff" }}>
      <TelegramIcon />
      <span style={{ fontWeight: 600, letterSpacing: 0.2 }}>Spectra Market</span>
    </div>
  );
}

function H1({ children }: { children: React.ReactNode }) {
  return <h1 style={{ fontSize: 28, fontWeight: 800, margin: "12px 0 0" }}>{children}</h1>;
}
function H2({ children }: { children: React.ReactNode }) {
  return <h2 style={{ fontSize: 22, fontWeight: 800, margin: "12px 0" }}>{children}</h2>;
}
function P({ children }: { children: React.ReactNode }) {
  return <p style={{ color: "#dfe5ff", marginTop: 8 }}>{children}</p>;
}
function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", gap: 12, marginTop: 12 }}>{children}</div>;
}
function Small({ children, dim }: { children: React.ReactNode; dim?: boolean }) {
  return <div style={{ marginTop: 10, fontSize: 12, color: dim ? "#cfd6ff" : "#fff" }}>{children}</div>;
}

function PrimaryButton({ onClick, children }: { onClick?: () => void; children: React.ReactNode }) {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "12px 18px",
    borderRadius: 12,
    background: "#fff",
    color: "#111827",
    fontWeight: 800,
    fontSize: 16,
    border: "none",
    cursor: "pointer",
  };
  return (
    <button style={base} onClick={onClick}>
      {children}
    </button>
  );
}

function SecondaryButton({ onClick, children }: { onClick?: () => void; children: React.ReactNode }) {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "12px 18px",
    borderRadius: 12,
    background: "rgba(255,255,255,.08)",
    color: "#eaf0ff",
    border: "1px solid rgba(255,255,255,.18)",
    cursor: "pointer",
  };
  return (
    <button style={base} onClick={onClick}>
      {children}
    </button>
  );
}

function TelegramIcon({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden>
      <path d="M9.97 15.2l-.24 3.4c.35 0 .5-.15.68-.33l1.63-1.57 3.38 2.47c.62.34 1.07.16 1.24-.57l2.25-10.55c.2-.9-.33-1.25-.93-1.03L3.8 10.1c-.88.34-.87.83-.15 1.05л3.9 1.2 9.05-5.71c.43-.27.82-.12.5.16l-7.12 6.5z" />
    </svg>
  );
// Определяем, открыто ли внутри Telegram Mini App
const isInsideTelegram =
  typeof window !== "undefined" && !!(window as any)?.Telegram?.WebApp;

const FLAGS = {
  // Включаем Login Widget только если НЕ в Telegram
  USE_WIDGET: !isInsideTelegram && ((process.env.NEXT_PUBLIC_USE_WIDGET || "0") === "1"),
};
