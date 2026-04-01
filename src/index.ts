// ─────────────────────────────────────────────────────────────────────────────
// telegram-notify
//
// post.published / post.updated 事件后，通过 Telegram Bot API 推送通知。
// 需要在插件设置中填写 Bot Token 和 Chat ID。
// ─────────────────────────────────────────────────────────────────────────────

// ── 类型 ──────────────────────────────────────────────────────────────────

interface TelegramSendMessageBody {
  chat_id: string;
  text: string;
  parse_mode?: string;
  disable_web_page_preview?: boolean;
}

interface TelegramResponse {
  ok: boolean;
  description?: string;
}

// ── 读取设置 ──────────────────────────────────────────────────────────────

function getBotToken(): string {
  return (nuxtblog.settings.get("bot_token") as string | null) ?? "";
}

function getChatId(): string {
  return (nuxtblog.settings.get("chat_id") as string | null) ?? "";
}

function getSiteUrl(): string {
  const v = (nuxtblog.settings.get("site_url") as string | null) ?? "";
  return v.replace(/\/$/, "");
}

function getTemplate(): string {
  const v = nuxtblog.settings.get("template") as string | null;
  return v && v.trim()
    ? v
    : "📝 *{title}*\n\n{excerpt}\n\n🔗 [阅读全文]({url})";
}

function getParseMode(): string {
  const v = nuxtblog.settings.get("parse_mode") as string | null;
  return v === "MarkdownV2" ? "MarkdownV2" : v === "HTML" ? "HTML" : "Markdown";
}

function isNotifyOnUpdate(): boolean {
  const v = nuxtblog.settings.get("notify_on_update");
  return v === true || v === "true" || v === 1;
}

// ── 核心逻辑 ──────────────────────────────────────────────────────────────

/**
 * 简单截断摘要，避免消息过长。
 */
function truncateExcerpt(excerpt: string, maxLen = 120): string {
  if (!excerpt) return "";
  if (excerpt.length <= maxLen) return excerpt;
  return excerpt.slice(0, maxLen).replace(/[\s,.!?，。！？]*$/, "") + "…";
}

/**
 * 将模板中的 {title} / {url} / {excerpt} 替换为实际值。
 */
function renderTemplate(
  template: string,
  title: string,
  url: string,
  excerpt: string
): string {
  return template
    .replace(/\{title\}/g, title)
    .replace(/\{url\}/g, url)
    .replace(/\{excerpt\}/g, excerpt);
}

/**
 * 调用 Telegram Bot API 发送消息。
 * 失败时仅记录日志，不抛出异常（事件处理器中不影响主流程）。
 */
function sendTelegramMessage(text: string): void {
  const token = getBotToken();
  const chatId = getChatId();

  if (!token || !chatId) {
    nuxtblog.log.warn("[telegram-notify] 未配置 bot_token 或 chat_id，跳过推送");
    return;
  }

  const parseMode = getParseMode();
  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  const body: TelegramSendMessageBody = {
    chat_id: chatId,
    text,
    parse_mode: parseMode,
    disable_web_page_preview: false,
  };

  const res = nuxtblog.http.fetch<TelegramResponse>(url, {
    method: "POST",
    body: body as unknown as Record<string, unknown>,
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok || (res.body && !res.body.ok)) {
    const desc = res.body?.description ?? res.error ?? `HTTP ${res.status}`;
    nuxtblog.log.error(`[telegram-notify] 推送失败: ${desc}`);
  } else {
    nuxtblog.log.info("[telegram-notify] 推送成功");
  }
}

// ── post.published ────────────────────────────────────────────────────────

nuxtblog.on("post.published", (data) => {
  const siteUrl = getSiteUrl();
  const postUrl = siteUrl ? `${siteUrl}/posts/${data.slug}` : `/posts/${data.slug}`;
  const excerpt = truncateExcerpt(data.excerpt);
  const text = renderTemplate(getTemplate(), data.title, postUrl, excerpt);

  nuxtblog.log.info(`[telegram-notify] 文章发布，准备推送: "${data.title}"`);
  sendTelegramMessage(text);
});

// ── post.updated ──────────────────────────────────────────────────────────

nuxtblog.on("post.updated", (data) => {
  if (!isNotifyOnUpdate()) return;
  // 仅对已发布文章推送更新通知
  if (data.status !== 1) return;

  const siteUrl = getSiteUrl();
  const postUrl = siteUrl ? `${siteUrl}/posts/${data.slug}` : `/posts/${data.slug}`;
  const excerpt = truncateExcerpt(data.excerpt);

  const updateTemplate = `✏️ *{title}* 已更新\n\n{excerpt}\n\n🔗 [查看文章]({url})`;
  const text = renderTemplate(updateTemplate, data.title, postUrl, excerpt);

  nuxtblog.log.info(`[telegram-notify] 文章更新，准备推送: "${data.title}"`);
  sendTelegramMessage(text);
});
