// Package telegramnotify sends Telegram notifications on post events.
package telegramnotify

import (
	"bytes"
	"context"
	_ "embed"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	pluginsdk "github.com/nuxtblog/nuxtblog/sdk"
)

//go:embed plugin.yaml
var manifestYAML []byte

func init() {
	pluginsdk.Register(&TelegramNotify{})
}

type TelegramNotify struct {
	pluginsdk.BasePlugin
	ctx pluginsdk.PluginContext
}

func (p *TelegramNotify) Manifest() pluginsdk.Manifest {
	return pluginsdk.ParseManifestCached("nuxtblog-plugin-telegram-notify", manifestYAML)
}

func (p *TelegramNotify) Activate(ctx pluginsdk.PluginContext) error {
	p.ctx = ctx
	ctx.Log.Info("Telegram Notify plugin activated (Go native)")
	return nil
}

func (p *TelegramNotify) Deactivate() error { return nil }

func (p *TelegramNotify) OnEvent(ctx context.Context, event string, data map[string]any) {
	switch event {
	case "post.published":
		p.notify(data, false)
	case "post.updated":
		if !p.getBool("notify_on_update") {
			return
		}
		// Only notify for published posts
		if status, ok := data["status"]; ok {
			if s, ok := status.(float64); ok && s != 1 {
				return
			}
		}
		p.notify(data, true)
	}
}

func (p *TelegramNotify) notify(data map[string]any, isUpdate bool) {
	token := p.getString("bot_token")
	chatID := p.getString("chat_id")
	if token == "" || chatID == "" {
		p.ctx.Log.Warn("未配置 bot_token 或 chat_id，跳过推送")
		return
	}

	title := fmt.Sprintf("%v", data["title"])
	slug := fmt.Sprintf("%v", data["slug"])
	excerpt := truncate(fmt.Sprintf("%v", data["excerpt"]), 120)

	siteURL := strings.TrimRight(p.getString("site_url"), "/")
	postURL := fmt.Sprintf("%s/posts/%s", siteURL, slug)
	if siteURL == "" {
		postURL = "/posts/" + slug
	}

	tmpl := p.getString("template")
	if tmpl == "" {
		if isUpdate {
			tmpl = "✏️ *{title}* 已更新\n\n{excerpt}\n\n🔗 [查看文章]({url})"
		} else {
			tmpl = "📝 *{title}*\n\n{excerpt}\n\n🔗 [阅读全文]({url})"
		}
	}

	text := strings.NewReplacer(
		"{title}", title,
		"{url}", postURL,
		"{excerpt}", excerpt,
	).Replace(tmpl)

	parseMode := p.getString("parse_mode")
	if parseMode == "" {
		parseMode = "Markdown"
	}

	apiURL := fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage", token)
	body, _ := json.Marshal(map[string]any{
		"chat_id":                  chatID,
		"text":                     text,
		"parse_mode":               parseMode,
		"disable_web_page_preview": false,
	})

	resp, err := http.Post(apiURL, "application/json", bytes.NewReader(body))
	if err != nil {
		p.ctx.Log.Error(fmt.Sprintf("推送失败: %v", err))
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		raw, _ := io.ReadAll(resp.Body)
		p.ctx.Log.Error(fmt.Sprintf("推送失败: HTTP %d — %s", resp.StatusCode, string(raw)))
		return
	}
	p.ctx.Log.Info("推送成功")
}

func (p *TelegramNotify) getString(key string) string {
	v := p.ctx.Settings.Get(key)
	if v == nil {
		return ""
	}
	if s, ok := v.(string); ok {
		return s
	}
	return fmt.Sprintf("%v", v)
}

func (p *TelegramNotify) getBool(key string) bool {
	v := p.ctx.Settings.Get(key)
	if v == nil {
		return false
	}
	switch b := v.(type) {
	case bool:
		return b
	case string:
		return b == "true" || b == "1"
	case float64:
		return b != 0
	}
	return false
}

func truncate(s string, max int) string {
	if len([]rune(s)) <= max {
		return s
	}
	return string([]rune(s)[:max]) + "…"
}
