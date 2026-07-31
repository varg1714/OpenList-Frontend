# 分享链接自动解析填充 (LinkParse) 设计文档

日期:2026-07-31

## 背景与目标

部分分享类驱动(115_share 等)的虚拟目录 addition 中包含 `shareId`/`sharePwd` 字段。用户在新建目录(Mkdir)或右键重命名编辑目录(EditDir)时,需要粘贴一个分享链接,自动从链接中提取 shareId/sharePwd 并填充到表单字段中。

不同 provider 的分享链接格式各不相同,因此解析规则必须按 provider 提供,且需要能在管理页面动态修改(链接格式变化时无需改代码)。

## 现状机制

- 后端:`driver.MkdirConfig` 可选接口(`MkdirConfig() []Item`),`FsList` 在 `user.CanWrite()` 时检测并填充 `FsListResp.MkdirConfig`(server/handles/fsread.go:125)
- 115_share/189_share/pikpak_share/quark_share 的 `MkdirConfig()` 都委托给共享的 `virtual_file.GetMkdirConfig()`(drivers/virtual_file/util.go:216),其中含 `shareId`/`sharePwd` 字段(`dirType=0` 订阅时可见)
- 驱动 Addition 结构体字段通过反射自动生成管理页表单项(internal/op/driver.go:163 `getAdditionalItems`),可被管理员编辑并持久化到存储的 addition JSON
- 前端:`/fs/list` 响应 → `usePath.ts:181` → `objStore.mkdir_config` → `MkConfigDir`/`EditDir` 传入 `DynamicFormModal`

## 设计决策

1. **规则不塞进 `driver.Item`**:`virtual_file.GetMkdirConfig()` 被 4 个驱动共享,但各 provider 链接格式不同,共享一条规则是错的
2. **不加独立可选接口**:对一个 pattern 字段而言过重
3. **pattern 放在驱动的 `Addition` 结构体中**(管理页可编辑),通过 `Config()` 动态带出,**硬编码默认值兜底**(已有存储 addition 无该字段时开箱即用)

## 后端改动

### 1. `internal/driver/item.go` — 新增类型

```go
type LinkParseConfig struct {
	Pattern string `json:"pattern"` // JS 正则,命名捕获组名 = 前端表单字段名
}
```

### 2. `internal/driver/config.go` — Config 加字段

```go
// 分享链接解析配置,由前端 /fs/list 下发
LinkParse *LinkParseConfig `json:"link_parse,omitempty"`
```

### 3. `server/handles/fsread.go` — FsList 下发

- `FsListResp` 增加 `LinkParse *driver.LinkParseConfig \`json:"link_parse,omitempty"\``
- `FsList` 的 `user.CanWrite()` 分支中,`provider = storage.Config().Name` 旁加一行:

```go
linkParse = storage.Config().LinkParse
```

### 4. `drivers/115_share/meta.go` — Addition 字段 + Config() 动态读

```go
type Addition struct {
	// ...现有字段
	LinkParse string `json:"link_parse" type:"text" help:"分享链接解析正则,命名捕获组名需与字段名一致,如 (?<shareId>...)(?<sharePwd>...)"`
}

var defaultLinkParsePattern = `^https://115\.com/s/(?<shareId>[a-zA-Z0-9]+).*?(?:password=(?<sharePwd>[^&]+))?`

var config = driver.Config{
	Name:        "115 Share",
	DefaultRoot: "0",
	NoUpload:    true,
	LinkParse:   &driver.LinkParseConfig{Pattern: defaultLinkParsePattern},
}

func (d *Pan115Share) Config() driver.Config {
	cfg := config
	if d.Addition.LinkParse != "" {
		cfg.LinkParse = &driver.LinkParseConfig{Pattern: d.Addition.LinkParse}
	}
	return cfg
}
```

- 管理页新增存储时 pattern 由 addition 字段的 default 预填;已有存储走默认值兜底;管理员可随时在管理页修改
- 其他分享驱动(189_share 等)同样机制,各自声明自己的默认 pattern

## 前端改动

### 1. 类型

- `src/types/driver_item.ts` 新增 `LinkParseConfig { pattern: string }`
- `src/types/resp.ts` 的 `FsListResp` 增加 `link_parse?: LinkParseConfig`,顺带修正 `mkdir_config?: Addition` → `DriverItem[]`(实际类型)

### 2. store 与透传

- `src/store/obj.ts`:obj store 增加 `link_parse` state + `setLinkParse`
- `src/hooks/usePath.ts:181` 旁:`ObjStore.setLinkParse(data.link_parse)`

### 3. `src/components/DynamicFormModal.tsx` — 通用解析能力

- 新可选 prop `linkParse?: LinkParseConfig`
- 存在时 ModalBody 顶部渲染"粘贴分享链接"输入框 + "解析填充"按钮
- 解析逻辑:`new RegExp(pattern).exec(link)` → 命名组中,组名与表单字段同名的回填(覆盖);无匹配或组名无对应字段 → `notify.warning`,保留输入便于修改
- 无 `linkParse` 配置时 UI 零变化(向后兼容)

### 4. 接入

- `MkConfigDir.tsx`、`EditDir.tsx` 各加 `linkParse={objStore.link_parse}`

## 数据流

```
管理页编辑 addition.link_parse
  → FsList: storage.Config().LinkParse(addition 有值覆盖默认)
  → /fs/list 响应 link_parse(与 mkdir_config 同分支,CanWrite 时下发)
  → objStore.link_parse
  → MkConfigDir/EditDir → DynamicFormModal 顶部解析框
  → 粘贴链接 → 正则命名组 → 回填 shareId/sharePwd → 提交
```

## 验证

- 后端:`go build ./...`
- 前端:typecheck + lint
- 手动:配置 pattern 的驱动显示解析框、回填正确、坏链接有提示、无配置不显示
