# Hamibot MCP Server

Hamibot MCP Server 是一个基于 Model Context Protocol (MCP) 的服务器实现，用于与 Hamibot API 进行交互。它提供了一系列工具来管理和控制 Hamibot 设备及脚本。

## 功能特性

- 设备管理：列出所有连接的设备
- 脚本管理：查看和运行自动化脚本
- 代码执行：在指定设备上执行自定义 JavaScript 代码
- 支持变量传递：可以向脚本传递自定义参数

## Installation

### Manual Installation

```bash
npm install -g @hmbt/hamibot-mcp-server
```

## Setup

### 获取访问令牌

1. 访问 https://hamibot.com/account/tokens
2. 点击生成

### Usage with Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "todoist": {
      "command": "npx",
      "args": ["-y", "@hmbt/hamibot-mcp-server"],
      "env": {
        "HAMIBOT_PERSONAL_ACCESS_TOKEN": "你的访问令牌"
      }
    }
  }
}
```

## 可用工具

### list-devices

列出所有已连接的设备。

### list-scripts

列出所有可用的自动化脚本。

### run-script

在指定设备上运行脚本。

参数：

- scriptId: 24 位十六进制字符串，表示要运行的脚本 ID
- devices: 设备列表，包含设备 ID 和可选的设备名称
- vars: (可选) 传递给脚本的变量

### execute

在指定设备上执行自定义 JavaScript 代码。

参数：

- code: JavaScript Hamibot 代码
- devices: 设备列表，包含设备 ID 和可选的设备名称
- vars: (可选) 传递给代码的变量

## 开发

```bash
# 构建项目
npm run build

# 启动服务器
npm start

# 开发模式（监视文件变化）
npm run watch
```
