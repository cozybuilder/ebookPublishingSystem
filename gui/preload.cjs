/**
 * Ebook Publishing System — Electron preload (contextBridge)
 * 렌더러에 안전한 API 만 노출. nodeIntegration 미사용.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  paths: () => ipcRenderer.invoke('paths'),
  listProjects: () => ipcRenderer.invoke('list-projects'),
  createProject: (name) => ipcRenderer.invoke('create-project', name),
  importManuscript: (payload) => ipcRenderer.invoke('import-manuscript', payload),
  importImages: (payload) => ipcRenderer.invoke('import-images', payload),
  deleteProject: (payload) => ipcRenderer.invoke('delete-project', payload),
  openProjectDir: (payload) => ipcRenderer.invoke('open-project-dir', payload),
  getConfig: (payload) => ipcRenderer.invoke('get-config', payload),
  saveConfig: (payload) => ipcRenderer.invoke('save-config', payload),
  preflight: (payload) => ipcRenderer.invoke('preflight', payload),
  preview: (payload) => ipcRenderer.invoke('preview', payload),
  build: (payload) => ipcRenderer.invoke('build', payload),
  copyText: (text) => ipcRenderer.invoke('copy-text', text),
  openPath: (p) => ipcRenderer.invoke('open-path', p),
  onLog: (cb) => ipcRenderer.on('build-log', (e, s) => cb(s)),
  onStage: (cb) => ipcRenderer.on('build-stage', (e, s) => cb(s)),
});
