export interface DesktopIconData {
  id: string;
  label: string;
  iconPath: string;
  action: () => void;
}

export interface WindowData {
  id: string;
  title: string;
  iconPath: string;
  zIndex: number;
  isOpen: boolean;
  isMinimized: boolean;
}
