export const DESKTOP_TASKBAR_HEIGHT = 40;

export const DESKTOP_LAYER = {
  windowBase: 100,
  windowStep: 10,
  taskbar: 4000,
  notification: 4500,
  assistant: 5000,
  overlay: 10000,
} as const;

export type DesktopWindowId = "chrome" | "terminal" | "terminal2" | "messenger" | "document_viewer" | "email";
export type DesktopWindowType = "browser" | "terminal" | "messenger" | "document_viewer" | "email";

export interface DesktopWindowDefinition {
  id: DesktopWindowId;
  type: DesktopWindowType;
  title: string;
  iconPath: string;
}

export const DESKTOP_WINDOW_DEFINITIONS: Record<DesktopWindowId, DesktopWindowDefinition> = {
  chrome: {
    id: "chrome",
    type: "browser",
    title: "Web Browser",
    iconPath: "/pixel_chrome_icon.svg",
  },
  terminal: {
    id: "terminal",
    type: "terminal",
    title: "Terminal",
    iconPath: "/pixel_terminal_icon.svg",
  },
  terminal2: {
    id: "terminal2",
    type: "browser",
    title: "Terminal 2",
    iconPath: "/pixel_terminal_icon.svg",
  },
  messenger: {
    id: "messenger",
    type: "messenger",
    title: "Messenger",
    iconPath: "/pixel_messanger_icon.svg",
  },
  document_viewer: {
    id: "document_viewer",
    type: "document_viewer",
    title: "Document Viewer",
    iconPath: "/pixel_notepad_icon.svg",
  },
  email: {
    id: "email",
    type: "email",
    title: "Bug Report",
    iconPath: "/pixel_email_cyberpunk.png",
  },
};
