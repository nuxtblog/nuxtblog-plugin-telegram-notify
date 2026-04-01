# nuxtblog-plugin-telegram-notify

文章发布后通过 Telegram Bot 推送通知到指定频道或群组。

[English](README.md)

## 功能

- 监听 `post.published`，每次发布后触发
- 可选监听 `post.updated`，仅对已发布文章推送更新通知
- 调用 Telegram Bot API（`sendMessage`），消息内容支持自定义模板

## 前置条件

1. 通过 [@BotFather](https://t.me/BotFather) 创建 Bot 并复制 Token
2. 将 Bot 添加为频道/群组管理员
3. 获取 Chat ID（频道/群组为负数，或使用 `@username`）

## 设置

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `bot_token` | password | ✓ | 从 @BotFather 获取的 Bot Token |
| `chat_id` | string | ✓ | 目标频道 ID 或 `@channel` 用户名 |
| `site_url` | string | | 博客地址，用于拼接文章链接（末尾不加斜杠） |
| `template` | textarea | | 消息模板，支持 `{title}`、`{url}`、`{excerpt}` 占位符 |
| `notify_on_update` | boolean | | 文章更新时也推送（默认关闭） |
| `parse_mode` | select | | Telegram 消息格式：`Markdown`、`MarkdownV2` 或 `HTML` |

## 默认模板

```
📝 *{title}*

{excerpt}

🔗 [阅读全文]({url})
```

## 注意事项

- 通知异步发送，不影响文章发布流程
- 未配置 `bot_token` 或 `chat_id` 时插件记录警告并跳过
- Telegram API 返回错误时仅记录日志，不影响博客正常运行

## 安装

```bash
pnpm install
pnpm build
zip plugin.zip package.json index.js
```

在管理后台 **插件 → 安装** 上传 ZIP 文件即可。
