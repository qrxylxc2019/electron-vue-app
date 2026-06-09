# 微信公众号RSS订阅功能

## 功能说明

这是一个集成到项目中的微信公众号RSS爬虫功能,参考了 `we-mp-rss` 项目的实现。

## 目录结构

```
D:\学瑞软件
├── frontend/src/views/Weixin/
│   └── Weixin.vue                    # 前端页面
├── houduan/app/service/weixin/
│   ├── rss/
│   │   ├── __init__.py              # RSS模块初始化
│   │   └── rss_service.py           # RSS服务类
│   ├── rss.py                       # RSS API路由
│   ├── router.py                    # 微信路由(已更新)
│   └── we-mp-rss/                   # 原始爬虫项目
```

## 功能特性

1. **添加订阅号**: 支持搜索和添加微信公众号
2. **爬取文章**: 自动爬取公众号的历史文章
3. **文章管理**: 查看、搜索已爬取的文章
4. **订阅管理**: 管理订阅列表,支持删除订阅

## API接口

### 1. 获取订阅列表
```
GET /api/weixin/rss/subscriptions
参数:
  - limit: 每页数量 (默认10)
  - offset: 偏移量 (默认0)
  - keyword: 搜索关键词
```

### 2. 添加订阅
```
POST /api/weixin/rss/subscriptions
Body:
  - mp_name: 公众号名称
  - mp_id: 公众号ID
  - mp_cover: 公众号头像
  - mp_intro: 公众号简介
```

### 3. 删除订阅
```
DELETE /api/weixin/rss/subscriptions/{mp_id}
```

### 4. 获取文章列表
```
GET /api/weixin/rss/articles
参数:
  - mp_id: 公众号ID (可选)
  - limit: 每页数量 (默认10)
  - offset: 偏移量 (默认0)
```

### 5. 爬取文章
```
POST /api/weixin/rss/crawl/{mp_id}
Body:
  - page: 爬取页数 (默认1)
```

### 6. 搜索公众号
```
GET /api/weixin/rss/search
参数:
  - keyword: 搜索关键词
```

## 前端路由

访问路径: `/Weixin`

## 使用说明

1. **访问页面**: 在前端导航到 `/Weixin` 路由
2. **添加订阅**: 点击"添加订阅号"按钮,搜索或手动输入公众号信息
3. **爬取文章**: 在订阅卡片中点击"爬取文章"按钮
4. **查看文章**: 点击"查看文章"按钮查看已爬取的文章列表

## 依赖说明

本功能依赖 `we-mp-rss` 项目的核心模块:
- `core.db`: 数据库操作
- `core.models`: 数据模型
- `core.wx`: 微信爬虫核心
- `core.config`: 配置管理

如果这些模块不可用,服务会降级为简化模式。

## 注意事项

1. 需要配置微信公众号平台的Cookie和Token才能正常爬取
2. 爬取频率不宜过高,避免被封禁
3. 数据库需要正确配置才能持久化存储

## 配置文件

参考 `we-mp-rss/config.yaml` 进行配置:
```yaml
cookie: "your_cookie_here"
token: "your_token_here"
user_agent: "Mozilla/5.0..."
db: "sqlite:///data/weixin.db"
```
