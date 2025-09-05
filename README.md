# VSCode WGO

> Hot reload debugging para projetos **Go** usando [Delve](https://github.com/go-delve/delve) + [wgo](https://github.com/wgo) sem perder breakpoints no VSCode.

---

## ✨ Recursos

- 🔥 **Hot reload**: recompila e reinicia o binário Go ao salvar arquivos.  
- 🐞 **Debug sem dor**: sempre reanexa o Delve no mesmo porto, mantendo os breakpoints ativos.  
- ⚡ **Configuração simples**: use `settings.json` ou `launch.json`.  
- 🖥️ **Integração com status bar** e botão no editor (`$(play)` no canto superior direito).  
- 🧹 **Limpeza automática** de binários temporários antigos.  
- 🛡️ **Kill seguro**: garante que `dlv` e o binário debugado sejam encerrados mesmo após reload da janela.  

---

## 📦 Instalação

### Local (teste com `.vsix`)
```bash
npm install
npm run compile
npm run package
```

No VSCode:  
**Command Palette → Extensions: Install from VSIX...** e selecione `vscode-wgo-0.0.1.vsix`.

### Marketplace
*(opcional)*  
Após registrar seu publisher:
```bash
vsce publish
```

---

## ⚙️ Configuração

A extensão expõe as seguintes opções no **Settings** (`settings.json`):

```jsonc
{
  // Caminho para o pacote principal
  "vscode-wgo.program": "./cmd/http",

  // Caminho do binário de saída
  "vscode-wgo.output": "./.tmp/app",

  // Porta usada pelo Delve (headless)
  "vscode-wgo.port": 40000,

  // Intervalo de polling do watcher
  "vscode-wgo.poll": "500ms",

  // Diretórios observados para hot reload
  "vscode-wgo.watchDirs": ["./cmd", "./internal"]
}
```

---

## ▶️ Uso

- **Status bar**: clique em `$(play) WGO` para iniciar.  
- **Editor .go**: botão `$(play)` no canto superior direito.  
- **Atalho**: `Ctrl+Alt+D` (em arquivos Go).  

Sempre que você salvar arquivos em `watchDirs`, o binário será recompilado e o Delve reiniciado com attach automático do debugger.

---

## 🐞 Debug pelo `launch.json`

Também é possível configurar pelo `launch.json`:

```jsonc
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "VSCode WGO (Hot Reload)",
      "type": "vscode-wgo",
      "request": "launch",
      "program": "./cmd/api",
      "output": "./.tmp/server",
      "port": 43000,
      "poll": "1s",
      "watchDirs": ["./cmd", "./pkg"]
    }
  ]
}
```

---

## 🔨 Requisitos

- Go 1.21+  
- [Delve](https://github.com/go-delve/delve) instalado (`dlv` disponível no PATH)  
- VSCode 1.80.0 ou superior  

---

## 📜 Licença

MIT
