"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.delay = delay;
exports.execOnly = execOnly;
exports.parsePoll = parsePoll;
exports.activate = activate;
exports.deactivate = deactivate;
const child_process_1 = require("child_process");
const chokidar = __importStar(require("chokidar"));
const fs = __importStar(require("fs"));
const net = __importStar(require("net"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
//#region vars
const config = vscode.workspace.getConfiguration('vscode-wgo');
const program = config.get('program', './cmd/http');
const output = config.get('output', './.tmp/app');
const port = config.get('port', 40000);
const poll = config.get('poll', '500ms');
const watchDirs = config.get('watchDirs', ['./cmd', './internal']);
const isWin = os.platform() === 'win32';
let dlvProcess;
let watcher;
let outputChannel;
//#endregion
//#region helpers
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function execOnly(fn) {
    try {
        fn();
    }
    catch {
        // no catches
    }
}
function parsePoll(poll) {
    const match = poll.match(/^(\d+)(ms|s)$/);
    if (!match) {
        return 500;
    }
    const value = parseInt(match[1], 10);
    return match[2] === 's' ? value * 1000 : value;
}
async function retry(fn, retries = 10, delayMs = 100) {
    let lastError;
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        }
        catch (err) {
            lastError = err;
            log(`Retry ${i + 1}/${retries} failed: ${err.message}`);
            await delay(delayMs);
        }
    }
    throw lastError;
}
function log(message) {
    const formatted = `[VSCode WGO] ${message}`;
    outputChannel.appendLine(formatted);
    vscode.debug.activeDebugConsole.appendLine(formatted);
}
//#endregion
function registerCommand(context) {
    const disposable = vscode.commands.registerCommand('vscode-wgo.start', async () => {
        if (dlvProcess) {
            log('Existing dlv process found. Killing...');
            await killDelve();
        }
        const workspace = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspace) {
            vscode.window.showErrorMessage('No workspace folder open.');
            return;
        }
        await restartDelve(workspace, program, port);
        const dirs = watchDirs.map(d => path.join(workspace, d));
        watcher = chokidar.watch(dirs, {
            ignored: ['**/bin/**', '**/.git/**', '**/node_modules/**'],
            ignoreInitial: true,
            usePolling: true,
            interval: parsePoll(poll),
        });
        watcher.on('all', async () => await restartDelve(workspace, program, port));
        log('VSCode WGO started.');
    });
    context.subscriptions.push(disposable);
}
function registerStatusBar(context) {
    const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBar.text = '$(play) WGO';
    statusBar.command = 'vscode-wgo.start';
    statusBar.tooltip = 'Start VSCode WGO hot reload debugger';
    statusBar.show();
    context.subscriptions.push(statusBar);
}
function registerDebugConfig() {
    vscode.debug.registerDebugConfigurationProvider('vscode-wgo', {
        resolveDebugConfiguration(folder, config) {
            return {
                name: 'vscode-wgo',
                program: config.program ?? program,
                output: config.output ?? output,
                port: config.port ?? port,
                poll: config.poll ?? poll,
                watchDirs: config.watchDirs ?? watchDirs,
                request: 'launch',
                type: 'vscode-wgo',
            };
        },
    });
}
function findProcessByBinary(binaryPath) {
    try {
        if (isWin) {
            const normalizedPath = binaryPath.replace(/'/g, "''");
            const psCommand = `powershell -Command "Get-Process | Where-Object { $_.Path -eq '${normalizedPath}' } | Select-Object -ExpandProperty Id"`;
            const out = (0, child_process_1.execSync)(psCommand, { encoding: 'utf-8' });
            return out.split(/\s+/).map(Number).filter(Boolean);
        }
        else {
            const out = (0, child_process_1.execSync)(`pgrep -f "${binaryPath}"`, { encoding: 'utf-8' });
            return out.split('\n').map(Number).filter(Boolean);
        }
    }
    catch (err) {
        console.log(`[findProcessByBinary] error: ${err.message}`);
        return [];
    }
}
async function killDelve(workspace) {
    return new Promise(resolve => {
        const outputBin = workspace ? resolveOutput(workspace, output) : undefined;
        const extraPids = outputBin ? findProcessByBinary(outputBin) : [];
        const allPids = [...(dlvProcess ? [dlvProcess.pid] : []), ...extraPids].filter(Boolean);
        if (!allPids.length) {
            return resolve();
        }
        for (const pid of allPids) {
            execOnly(() => {
                if (isWin) {
                    (0, child_process_1.execSync)(`taskkill /PID ${pid} /T /F`);
                }
                else {
                    dlvProcess.kill('SIGKILL');
                    (0, child_process_1.execSync)(`kill -9 ${pid}`);
                }
            });
        }
        dlvProcess?.once('close', () => {
            log(`dlv process closed (pids=${allPids.join(',')})`);
            resolve();
        });
        dlvProcess = undefined;
    }).then(() => delay(300));
}
async function restartDelve(workspace, program, port) {
    log('Restarting Delve with fresh binary');
    await killDelve();
    await retry(async () => {
        const tmpOutput = resolveOutput(workspace, `${output}`);
        await new Promise((resolve, reject) => {
            const buildProc = (0, child_process_1.spawn)('go', ['build', '-o', tmpOutput, program], {
                cwd: workspace,
                stdio: ['ignore', 'pipe', 'pipe'],
                shell: isWin,
            });
            buildProc.stdout?.on('data', d => log(`[build stdout] ${d.toString().trim()}`));
            buildProc.stderr?.on('data', d => log(`[build stderr] ${d.toString().trim()}`));
            buildProc.on('close', code => {
                if (code === 0) {
                    log(`Build successful → ${tmpOutput}`);
                    cleanupOldBinaries(workspace);
                    startDelve(workspace, tmpOutput, port);
                    resolve();
                }
                else {
                    reject(new Error(`Build failed with code ${code}`));
                }
            });
        });
    }, 5, 500);
}
function startDelve(workspace, output, port) {
    dlvProcess = (0, child_process_1.spawn)('dlv', ['exec', output, '--headless', `--listen=127.0.0.1:${port}`, '--api-version=2', '--accept-multiclient'], { cwd: workspace, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true, shell: isWin });
    dlvProcess.stdout?.on('data', d => vscode.debug.activeDebugConsole.appendLine(d.toString()));
    dlvProcess.stderr?.on('data', d => vscode.debug.activeDebugConsole.appendLine(`[stderr] ${d.toString()}`));
    dlvProcess.on('error', err => log(`[dlv error] ${err.message}`));
    dlvProcess.on('close', code => log(`[dlv exited with code ${code}]`));
    void reattachDebug();
}
function cleanupOldBinaries(workspace) {
    const binDir = path.join(workspace, 'bin');
    if (!fs.existsSync(binDir)) {
        return;
    }
    const files = fs.readdirSync(binDir).filter(f => f.startsWith('app-'));
    if (files.length <= 1) {
        return;
    }
    files.sort();
    const oldOnes = files.slice(0, -1);
    for (const f of oldOnes) {
        try {
            fs.unlinkSync(path.join(binDir, f));
            log(`Deleted old binary ${f}`);
        }
        catch (e) {
            log(`Failed to delete ${f}: ${e.message}`);
        }
    }
}
function resolveOutput(workspace, baseOutput) {
    const ext = isWin ? '.exe' : '';
    return path.join(workspace, baseOutput + ext);
}
async function reattachDebug() {
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!folder) {
        return;
    }
    const cfg = vscode.workspace.getConfiguration('vscode-wgo');
    const port = cfg.get('port', 40000);
    const isPortOpen = (p) => {
        return new Promise(resolve => {
            const s = new net.Socket();
            const to = setTimeout(() => [s.destroy(), resolve(false)], 150);
            s.once('connect', () => [clearTimeout(to), s.destroy(), resolve(true)]);
            s.once('error', () => [clearTimeout(to), resolve(false)]);
            s.connect(p, '127.0.0.1');
        });
    };
    const deadline = Date.now() + 15000;
    let attempt = 0;
    while (Date.now() < deadline) {
        attempt++;
        if (vscode.debug.activeDebugSession?.type === 'go') {
            log(`debug session already active (attempt ${attempt}).`);
            return;
        }
        if (!(await isPortOpen(port))) {
            await delay(100);
            continue;
        }
        try {
            const ok = await vscode.debug.startDebugging(folder, {
                name: 'Attach VSCode WGO',
                type: 'go',
                request: 'attach',
                mode: 'remote',
                host: '127.0.0.1',
                port,
                apiVersion: 2,
            });
            if (ok) {
                log('debugger started');
                return;
            }
        }
        catch (e) {
            log(`reattach failed: ${e.message}`);
        }
        await delay(Math.min(100 + attempt * 50, 400));
    }
    log('failed to attach debugger after retries');
}
function activate(context) {
    outputChannel = vscode.window.createOutputChannel('VSCode WGO');
    registerCommand(context);
    registerStatusBar(context);
    registerDebugConfig();
}
function deactivate() {
    void watcher?.close();
    void killDelve(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath);
    outputChannel?.dispose();
}
process.on('exit', () => execOnly(() => dlvProcess?.kill('SIGKILL')));
process.on('SIGINT', () => process.exit());
process.on('SIGTERM', () => process.exit());
//# sourceMappingURL=extension.js.map