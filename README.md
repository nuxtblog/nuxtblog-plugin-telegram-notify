# nuxtblog-plugin-telegram-notify

Sends a Telegram message when a post is published (and optionally when updated).

[中文文档](README.zh.md)

## What it does

- Listens to `post.published` — fires after every new publication
- Optionally listens to `post.updated` when the post is already published
- Calls the Telegram Bot API (`sendMessage`) with a configurable message template

## Requirements

1. Create a bot via [@BotFather](https://t.me/BotFather) and copy the token
2. Add the bot to your channel or group as an admin
3. Get the chat ID (negative number for channels/groups, or `@username`)

## Settings

| Key | Type | Required | Description |
|---|---|---|---|
| `bot_token` | password | ✓ | Telegram Bot token from @BotFather |
| `chat_id` | string | ✓ | Target chat ID or `@channel_username` |
| `site_url` | string | | Blog base URL for generating post links (no trailing slash) |
| `template` | textarea | | Message template — supports `{title}`, `{url}`, `{excerpt}` |
| `notify_on_update` | boolean | | Also notify when a published post is updated (default: off) |
| `parse_mode` | select | | Telegram formatting: `Markdown`, `MarkdownV2`, or `HTML` |

## Default template

```
📝 *{title}*

{excerpt}

🔗 [阅读全文]({url})
```

## Notes

- The notification is sent asynchronously and never blocks the publish operation
- If `bot_token` or `chat_id` is not configured, the plugin logs a warning and skips
- Errors from the Telegram API are logged but do not affect the blog

## Installation

```bash
pnpm install
pnpm build
zip plugin.zip package.json index.js
```

Upload the ZIP in the admin panel under **Plugins → Install**.
