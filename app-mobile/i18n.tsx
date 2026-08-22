import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setApiLang } from "./api";

export type Lang = "de" | "en" | "ru";
export const LANGS: { key: Lang; label: string }[] = [
  { key: "de", label: "Deutsch" },
  { key: "en", label: "English" },
  { key: "ru", label: "Русский" },
];

const STORAGE_KEY = "plrktok_lang";

type Dict = Record<string, string>;

const de: Dict = {
  "tab.home": "Home",
  "tab.buyers": "Käufer*innen",
  "tab.inbox": "Posteingang",
  "tab.profile": "Profil",

  "rail.like": "Like",
  "rail.ask": "Fragen",
  "rail.save": "Merken",
  "rail.saved": "Gemerkt",
  "rail.share": "Teilen",

  "feed.cta": "Auf Playerok ansehen",
  "feed.errorTitle": "Keine Verbindung",
  "feed.errorBody": "Feed konnte nicht geladen werden.",
  "feed.retry": "Erneut versuchen",

  "ask.title": "Noch nicht verfügbar",
  "ask.body":
    "Fragen an Verkäufer laufen über den Playerok-Chat. Dafür musst du dein Playerok-Konto verbinden.",

  "search.placeholder": "Angebote suchen",
  "search.empty": "Nichts gefunden",
  "search.emptyHint": "Versuch einen anderen Begriff oder eine Kategorie.",
  "search.start": "Suche nach Spielen, Kategorien oder Titeln.",

  "consent.title": "PlrkTok mit deinem Playerok-Konto verbinden?",
  "consent.body":
    "Wir öffnen dafür die echte Anmeldeseite von playerok.com. Du gibst deine Zugangsdaten dort ein, nicht bei uns.",
  "consent.fact1":
    "Deine Anmeldedaten bleiben auf diesem Gerät. Sie werden nicht an unseren Server geschickt.",
  "consent.fact2": "PlrkTok liest damit dein Profil, dein Guthaben und deine Nachrichten.",
  "consent.fact3": "Du kannst dich jederzeit im Profil wieder abmelden.",
  "consent.fact4":
    "PlrkTok ist kein offizielles Playerok-Produkt. Playerok hat diese App nicht geprüft oder freigegeben.",
  "consent.authorize": "Autorisieren",
  "consent.decline": "Ablehnen",
  "consent.hint": "Ohne Verbindung kannst du den Feed weiter normal benutzen.",

  "login.hint": "Melde dich bei Playerok an. Danach geht es automatisch weiter.",
  "logout.hint": "Melde dich hier bei Playerok ab, um die Verbindung zu trennen.",
  "login.openBrowser": "Im Browser öffnen",
  "login.connecting": "Konto wird verbunden…",

  "profile.balance": "Guthaben",
  "profile.reviews": "Bewertungen",
  "profile.unread": "Ungelesen",
  "profile.logout": "Bei Playerok abmelden",
  "profile.logoutHint":
    "PlrkTok speichert deine Anmeldung nicht selbst. Sie liegt im Browser-Speicher dieser App und endet, sobald du dich bei Playerok abmeldest.",
  "profile.cannotPublish":
    "Playerok erlaubt diesem Konto derzeit kein Veröffentlichen von Angeboten.",
  "profile.reconnect": "Neu verbinden",
  "profile.language": "Sprache",

  "buyers.title": "Käufer*innen",
  "buyers.body":
    "Hier siehst du, wer bei dir gekauft hat und welche Deals offen sind. Dafür muss dein Playerok-Konto verbunden sein.",
  "create.title": "Angebot erstellen",
  "create.body":
    "Neue Angebote legst du direkt bei Playerok an. Sobald dein Konto verbunden ist, geht das aus der App heraus.",
  "create.action": "Bei Playerok öffnen",
  "inbox.title": "Posteingang",
  "inbox.body":
    "Nachrichten von Käufern und Verkäufern, Zusagen und Bestätigungen. Läuft über Playeroks Chat und braucht dein verbundenes Konto.",
};

const en: Dict = {
  "tab.home": "Home",
  "tab.buyers": "Buyers",
  "tab.inbox": "Inbox",
  "tab.profile": "Profile",

  "rail.like": "Like",
  "rail.ask": "Ask",
  "rail.save": "Save",
  "rail.saved": "Saved",
  "rail.share": "Share",

  "feed.cta": "View on Playerok",
  "feed.errorTitle": "No connection",
  "feed.errorBody": "Could not load the feed.",
  "feed.retry": "Try again",

  "ask.title": "Not available yet",
  "ask.body":
    "Questions to sellers go through Playerok chat. You need to connect your Playerok account first.",

  "search.placeholder": "Search listings",
  "search.empty": "Nothing found",
  "search.emptyHint": "Try another term or a category.",
  "search.start": "Search for games, categories or titles.",

  "consent.title": "Connect PlrkTok with your Playerok account?",
  "consent.body":
    "We will open the real playerok.com sign-in page. You enter your credentials there, not with us.",
  "consent.fact1": "Your credentials stay on this device. They are never sent to our server.",
  "consent.fact2": "PlrkTok will read your profile, balance and messages.",
  "consent.fact3": "You can sign out again from the profile at any time.",
  "consent.fact4":
    "PlrkTok is not an official Playerok product. Playerok has not reviewed or approved this app.",
  "consent.authorize": "Authorize",
  "consent.decline": "Decline",
  "consent.hint": "Without connecting you can keep using the feed normally.",

  "login.hint": "Sign in to Playerok. We continue automatically afterwards.",
  "logout.hint": "Sign out of Playerok here to disconnect.",
  "login.openBrowser": "Open in browser",
  "login.connecting": "Connecting account…",

  "profile.balance": "Balance",
  "profile.reviews": "Reviews",
  "profile.unread": "Unread",
  "profile.logout": "Sign out of Playerok",
  "profile.logoutHint":
    "PlrkTok does not store your sign-in itself. It lives in this app's browser storage and ends when you sign out of Playerok.",
  "profile.cannotPublish": "Playerok currently does not allow this account to publish listings.",
  "profile.reconnect": "Reconnect",
  "profile.language": "Language",

  "buyers.title": "Buyers",
  "buyers.body":
    "See who bought from you and which deals are open. Requires your connected Playerok account.",
  "create.title": "Create listing",
  "create.body":
    "New listings are created on Playerok. Once your account is connected this works from inside the app.",
  "create.action": "Open on Playerok",
  "inbox.title": "Inbox",
  "inbox.body":
    "Messages from buyers and sellers, offers and confirmations. Runs through Playerok chat and needs your connected account.",
};

const ru: Dict = {
  "tab.home": "Главная",
  "tab.buyers": "Покупатели",
  "tab.inbox": "Входящие",
  "tab.profile": "Профиль",

  "rail.like": "Нравится",
  "rail.ask": "Вопрос",
  "rail.save": "Сохранить",
  "rail.saved": "Сохранено",
  "rail.share": "Поделиться",

  "feed.cta": "Открыть на Playerok",
  "feed.errorTitle": "Нет соединения",
  "feed.errorBody": "Не удалось загрузить лента.",
  "feed.retry": "Повторить",

  "ask.title": "Пока недоступно",
  "ask.body":
    "Вопросы продавцам идут через чат Playerok. Для этого нужно подключить аккаунт Playerok.",

  "search.placeholder": "Поиск предложений",
  "search.empty": "Ничего не найдено",
  "search.emptyHint": "Попробуйте другой запрос или категорию.",
  "search.start": "Искать игры, категории или названия.",

  "consent.title": "Подключить PlrkTok к вашему аккаунту Playerok?",
  "consent.body":
    "Мы откроем настоящую страницу входа playerok.com. Данные вы вводите там, а не у нас.",
  "consent.fact1": "Ваши данные для входа остаются на этом устройстве и не отправляются на наш сервер.",
  "consent.fact2": "PlrkTok будет читать ваш профиль, баланс и сообщения.",
  "consent.fact3": "Вы можете выйти в любой момент в профиле.",
  "consent.fact4":
    "PlrkTok не является официальным продуктом Playerok. Playerok не проверял и не одобрял это приложение.",
  "consent.authorize": "Авторизовать",
  "consent.decline": "Отклонить",
  "consent.hint": "Без подключения лента работает как обычно.",

  "login.hint": "Войдите в Playerok. Дальше всё произойдёт автоматически.",
  "logout.hint": "Выйдите здесь из Playerok, чтобы отключить связь.",
  "login.openBrowser": "Открыть в браузере",
  "login.connecting": "Подключаем аккаунт…",

  "profile.balance": "Баланс",
  "profile.reviews": "Отзывы",
  "profile.unread": "Непрочитанные",
  "profile.logout": "Выйти из Playerok",
  "profile.logoutHint":
    "PlrkTok не хранит ваш вход. Он находится в браузерном хранилище приложения и заканчивается при выходе из Playerok.",
  "profile.cannotPublish": "Playerok сейчас не разрешает этому аккаунту публиковать предложения.",
  "profile.reconnect": "Подключить заново",
  "profile.language": "Язык",

  "buyers.title": "Покупатели",
  "buyers.body":
    "Здесь видно, кто у вас купил и какие сделки открыты. Нужен подключённый аккаунт Playerok.",
  "create.title": "Создать предложение",
  "create.body":
    "Новые предложения создаются на Playerok. После подключения аккаунта это будет работать из приложения.",
  "create.action": "Открыть на Playerok",
  "inbox.title": "Входящие",
  "inbox.body":
    "Сообщения от покупателей и продавцов, договорённости и подтверждения. Работает через чат Playerok и требует подключённого аккаунта.",
};

const DICTS: Record<Lang, Dict> = { de, en, ru };

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (key: string) => string };

const I18nContext = createContext<Ctx>({
  lang: "de",
  setLang: () => {},
  t: (k) => de[k] ?? k,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("de");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (v === "de" || v === "en" || v === "ru") setLangState(v);
      })
      .catch(() => {});
  }, []);

  // Der API-Schicht die Sprache mitteilen, damit Titel uebersetzt kommen.
  useEffect(() => {
    setApiLang(lang);
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    // Fehler beim Speichern darf die Sprachwahl nicht verhindern - sie gilt
    // dann nur bis zum Neustart.
    AsyncStorage.setItem(STORAGE_KEY, l).catch(() => {});
  }, []);

  const t = useCallback(
    (key: string) => DICTS[lang][key] ?? DICTS.de[key] ?? key,
    [lang]
  );

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>
  );
}

export function useI18n(): Ctx {
  return useContext(I18nContext);
}
