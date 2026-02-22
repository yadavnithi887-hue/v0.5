<div align="center">

  <!-- Animated Logo/Header -->
  <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Travel%20and%20places/Rocket.png" alt="Rocket" width="80" height="80" />
  
  # <span style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">DevStudio AI</span>
  
  ### *The Agentic IDE That Codes With You, Not Just For You*
  
  <!-- Animated Badges -->
  <p>
    <img src="https://img.shields.io/badge/Version-0.5.0-ff6b6b?style=for-the-badge&logo=github&logoColor=white" />
    <img src="https://img.shields.io/badge/Status-Beta%20Release-4ecdc4?style=for-the-badge" />
    <img src="https://img.shields.io/badge/License-MIT-45b7d1?style=for-the-badge" />
  </p>
  
  <!-- Tech Stack Badges with Animation -->
  <p>
    <img src="https://img.shields.io/badge/Node.js-22.x-339933?style=flat-square&logo=nodedotjs&logoColor=white&labelColor=1a1a1a" />
    <img src="https://img.shields.io/badge/Electron-39.x-47848F?style=flat-square&logo=electron&logoColor=white&labelColor=1a1a1a" />
    <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white&labelColor=1a1a1a" />
    <img src="https://img.shields.io/badge/AI-Antigravity-FF6F61?style=flat-square&logo=googlecloud&logoColor=white&labelColor=1a1a1a" />
  </p>

  <!-- Quick Action Buttons -->
  <p>
    <a href="#-quick-start">
      <img src="https://img.shields.io/badge/⚡_Quick_Start-2ecc71?style=for-the-badge" alt="Quick Start" />
    </a>
    <a href="#-architecture">
      <img src="https://img.shields.io/badge/🏗️_Architecture-9b59b6?style=for-the-badge" alt="Architecture" />
    </a>
    <a href="#-telegram-gateway">
      <img src="https://img.shields.io/badge/📱_Telegram_Bot-0088cc?style=for-the-badge&logo=telegram&logoColor=white" alt="Telegram" />
    </a>
  </p>

</div>

---

## 🎬 What Makes It Different?

> **"It's not just an editor. It's a coding partner that understands your codebase, executes commands, and keeps you updated via Telegram—all while running locally on your machine."**

<div align="center">

| 🧠 **Autonomous Agent** | 💻 **VS Code Experience** | 📱 **Remote Control** |
|:---:|:---:|:---:|
| Thinks & acts independently | Monaco Editor + IntelliSense | Telegram integration |
| Multi-step reasoning | Full terminal integration | Real-time activity logs |
| Safe execution guards | Extension ecosystem | Mobile IDE access |

</div>

---

## ✨ Core Capabilities

### 🤖 Agentic AI Engine
```diff
+ Autonomous Code Navigation
+ Smart File Operations (Read/Write/Search)
+ Terminal Command Execution
+ Multi-step Thinking Loop
+ Context-Aware Suggestions
```
🚀 **Antigravity Powered**: Leverages Google Cloud Code Assist for superior reasoning
🛡️ **Safety First**: Built-in confirmation manager for destructive operations
🔄 **Iterative Reasoning**: Complex task breakdown with visible thought process

### 💻 Developer Experience
```diff
+ Monaco Editor (VS Code Core)
+ Xterm.js Terminal (node-pty)
+ Real-time File Watching (Chokidar)
+ Hot Module Replacement
+ Extension API (Beta)
```

### 📱 Telegram Gateway
```diff
+ Mobile IDE Control
+ Real-time Notifications
+ Task Queue Management
+ Secure Bot Integration
+ Activity Dashboard
```

---

## 🏗️ System Architecture

```plain
┌─────────────────────────────────────────────────────────────┐
│                        ELECTRON SHELL                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │   React UI   │  │ Monaco Editor│  │  Xterm Terminal  │   │
│  │  (Vite+TW)   │  │              │  │                  │   │  
│  └──────────────┘  └──────────────┘  └──────────────────┘   │
└────────────────────┬────────────────────────────────────────┘
                     │ Socket.io
┌────────────────────▼────────────────────────────────────────┐
│                        NODE.JS BACKEND                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  AI Core     │  │ File System  │  │   Extension      │   │
│  │  (Antigravity)│  │   Manager    │  │     Host        │   │
│  └──────────────┘  └──────────────┘  └──────────────────┘   │ 
└────────────────────┬────────────────────────────────────────┘
                     │ HTTPS/Webhook
┌────────────────────▼────────────────────────────────────────┐
│                     TELEGRAM GATEWAY                        │
│              Secure Mobile Command Interface                │
└─────────────────────────────────────────────────────────────┘
```

---

## ⚡ Quick Start

### Prerequisites
✅ **Node.js v22+**
✅ **Git**
✅ **4GB RAM minimum**

### 🚀 One-Line Install
```bash
# Clone & Setup
git clone https://github.com/yadavnithi887-hue/v0.5.git && cd v0.5 && npm install && cd backend && npm install
```

### 🏃 Run Development
```bash
# Start everything (Frontend + Backend + Electron)
npm run start:full
```

### 🔐 Connect AI (30 seconds)
1. Open Settings (`Ctrl/Cmd + ,`)
2. Click **"Connect Google Account"**
3. OAuth flow on `localhost:51121`
4. ✅ Auto-discovered `projectId`

### 📱 Telegram Setup (2 Minutes)

<div align="center">

| Step | Action | Command |
| :--- | :--- | :--- |
| 1 | Create Bot | Message @BotFather `/newbot` |
| 2 | Get Token | Copy the API token provided |
| 3 | Get Chat ID | Message @userinfobot |
| 4 | Configure | Paste in DevStudio Settings |
| 5 | Activate | Click "Start Gateway" 🚀 |

</div>

> 💡 **Pro Tip**: Use it to start long builds while away from desk, or get notified when AI completes a complex refactoring!

---

## 🛠️ Tech Stack Deep Dive

### Frontend Layer
![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Radix](https://img.shields.io/badge/Radix_UI-161618?style=for-the-badge&logo=radix-ui&logoColor=white)

### Backend & Desktop
![Node](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Electron](https://img.shields.io/badge/Electron-191970?style=for-the-badge&logo=electron&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white)

### AI & Integration
![GCP](https://img.shields.io/badge/Google_Cloud-4285F4?style=for-the-badge&logo=google-cloud&logoColor=white)
![Telegram](https://img.shields.io/badge/Telegram-2CA5E0?style=for-the-badge&logo=telegram&logoColor=white)

---

## 🗺️ Roadmap 2024-2025

```mermaid
gantt
    title DevStudio AI Development Roadmap
    dateFormat  YYYY-MM-DD
    section Core
    Multi-root Workspaces       :active, 2024-03-01, 30d
    Git Integration Panel       : 2024-04-01, 30d
    section Collaboration
    Live Share (Beta)           : 2024-05-01, 60d
    Voice Control (Telegram)    : 2024-07-01, 45d
    section Ecosystem
    Extension API (Public)     : 2024-09-01, 60d
    Plugin Marketplace          : 2024-11-01, 60d
```

- [x] **v0.5** - Core IDE + AI Agent + Telegram Gateway ✅
- [ ] **v0.6** - Multi-root workspaces & Git panel
- [ ] **v0.7** - Live Share & Voice commands
- [ ] **v0.8** - Public Extension API
- [ ] **v1.0** - Production Ready 🎯

---

## 📊 Project Stats

<div align="center">

![Stars](https://img.shields.io/github/stars/yadavnithi887-hue/v0.5?style=social)
![Forks](https://img.shields.io/github/forks/yadavnithi887-hue/v0.5?style=social)
![Issues](https://img.shields.io/github/issues/yadavnithi887-hue/v0.5)
![License](https://img.shields.io/github/license/yadavnithi887-hue/v0.5)

</div>

---

## 🤝 Contributing

We love contributions! See our [Contributing Guide](CONTRIBUTING.md) for details.

```bash
# Fork and clone
git clone https://github.com/your-username/v0.5.git

# Create feature branch
git checkout -b feature/amazing-feature

# Commit changes
git commit -m "✨ Add amazing feature"

# Push to branch
git push origin feature/amazing-feature

# Open Pull Request
```

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

<div align="center">

🌟 **Star us on GitHub** — it motivates us a lot!

Made with ❤️ by the DevStudio Team

[X.com](https://x.com/NitishYadav1947) | [E-mail](nitishyadav2976@gmail.com)

</div>

<!-- Animated footer -->
<p align="center">
  <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Travel%20and%20places/Star.png" width="20" />
  <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Travel%20and%20places/Star.png" width="20" />
  <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Travel%20and%20places/Star.png" width="20" />
</p>

