import path from 'path';
import fs from 'fs';
import { homedir } from 'os';
import * as vscode from 'vscode';

import defaultConfig, { EditorInfo } from './config';

const genNonce = (): string => {
  const s = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array(32)
    .fill('')
    .map(() => s[Math.floor(Math.random() * s.length)])
    .join('');
};

const saveImage = ({ data, fileType }: { data: string; fileType: 'svg' | 'png' }): void => {
  const imageUri = vscode.Uri.file(path.resolve(homedir(), `Desktop/coldcode.${fileType}`));
  vscode.window
    .showSaveDialog({
      filters: { Images: [fileType] },
      defaultUri: imageUri,
    })
    .then((uri) => {
      if (uri) {
        if (fileType === 'svg') {
          fs.writeFileSync(uri.fsPath, Buffer.from(data));
        } else {
          fs.writeFileSync(uri.fsPath, Buffer.from(data, 'base64'));
        }
      }
    });
};

class ColdCode {
  public static currentPanel: ColdCode | undefined;
  public static readonly webviewDir = 'src/webview';
  private readonly _state: vscode.Memento;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionPath: string;
  private _disposables: vscode.Disposable[] = [];

  private constructor(panel: vscode.WebviewPanel, extensionPath: string, state: vscode.Memento) {
    this._panel = panel;
    this._extensionPath = extensionPath;
    this._state = state;

    // initial
    // 1. set webview's html; 2. post configuration to webview; 3. copy code if it exists
    this._setWebviewHTML(this._panel.webview);
    this._postCfg();
    const editor = vscode.window.activeTextEditor;
    editor && this._copy(editor.selections);

    // register listeners
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    this._panel.onDidChangeViewState(() => this._panel.visible && this._postCfg(), null, this._disposables);
    this._panel.webview.onDidReceiveMessage((e) => this._msgHandler(e), null, this._disposables);
    vscode.window.onDidChangeTextEditorSelection((e) => this._copy(e.selections), null, this._disposables);
  }

  private _postCfg(): void {
    this._panel.webview
      .postMessage({
        action: 'getCfg',
        payload: this._state.get('config', defaultConfig),
      })
      .then(undefined, () => null);
  }

  private _msgHandler({ action, payload }): void {
    switch (action) {
      case 'saveImage':
        saveImage(payload);
        break;
      case 'setCfg':
        this._state.update('config', payload).then(() => this._postCfg());
        break;
      case 'resetCfg':
        this._state.update('config', defaultConfig).then(() => this._postCfg());
        break;
      case 'info':
        vscode.window.setStatusBarMessage(payload, 4000);
        break;
    }
  }

  private _copy(selections: readonly vscode.Selection[]): void {
    if (selections && selections.length === 1 && !selections[0].isEmpty) {
      vscode.commands.executeCommand('editor.action.clipboardCopyWithSyntaxHighlightingAction').then(() => {
        this._panel.webview.postMessage({
          action: 'copy',
          payload: this._getEditorInfo(),
        });
      });
    }
  }

  private _getEditorInfo(): EditorInfo {
    const editor = vscode.window.activeTextEditor;
    let windowTitle = '';
    let startLine = 0;
    if (editor) {
      const activeFileName = editor.document.uri.path.split('/').pop();
      windowTitle = `${vscode.workspace.name} - ${activeFileName}`;
      startLine = editor.selection ? editor.selection.start.line : 0;
    }
    return { windowTitle, startLine };
  }

  private _setWebviewHTML(webview: vscode.Webview): void {
    const resolve = (filepath: string[]): string => path.resolve(this._extensionPath, ...filepath);
    webview.html = fs
      .readFileSync(resolve([`${ColdCode.webviewDir}/index.html`]), 'utf-8')
      .replace(/%NONCE%/gu, genNonce())
      .replace(/%CSP_SOURCE%/gu, webview.cspSource)
      .replace(
        /(href|src)="([^"]*)"/gu,
        (_, k, v) => `${k}=${webview.asWebviewUri(vscode.Uri.file(resolve([ColdCode.webviewDir, v])))}`
      );
  }

  public static showPanel(extensionPath: string, globalState: vscode.Memento): void {
    const columnToShow = vscode.window.activeTextEditor ? vscode.ViewColumn.Two : undefined;
    if (ColdCode.currentPanel) {
      ColdCode.currentPanel._panel.reveal(columnToShow);
    } else {
      const panel = vscode.window.createWebviewPanel('coldcode', 'ColdCode', columnToShow, {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.file(path.join(extensionPath, ColdCode.webviewDir))],
      });
      ColdCode.currentPanel = new ColdCode(panel, extensionPath, globalState);
    }
  }

  public dispose(): void {
    ColdCode.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const x = this._disposables.pop();
      x && x.dispose();
    }
  }
}

export const activate = (ctx: vscode.ExtensionContext): void => {
  ctx.subscriptions.push(
    vscode.commands.registerCommand('coldcode.start', () => ColdCode.showPanel(ctx.extensionPath, ctx.globalState))
  );
};
