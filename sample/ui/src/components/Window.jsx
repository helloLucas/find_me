import React, { useState } from 'react';
import { Rnd } from 'react-rnd';

const Window = ({ 
  title, 
  icon, 
  children, 
  onClose, 
  isActive, 
  onFocus, 
  defaultPosition,
  defaultSize,
  zIndex
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [position, setPosition] = useState(defaultPosition || { x: 100, y: 100 });
  const [size, setSize] = useState(defaultSize || { width: 600, height: 400 });

  const [preMaxPosition, setPreMaxPosition] = useState(position);
  const [preMaxSize, setPreMaxSize] = useState(size);

  const toggleMaximize = () => {
    if (!isMaximized) {
      setPreMaxPosition(position);
      setPreMaxSize(size);
      setPosition({ x: 0, y: 0 });
      setSize({ width: window.innerWidth, height: window.innerHeight });
    } else {
      setPosition(preMaxPosition);
      setSize(preMaxSize);
    }
    setIsMaximized(!isMaximized);
  };

  return (
    <Rnd
      size={{ width: size.width,  height: size.height }}
      position={{ x: position.x, y: position.y }}
      onDragStop={(e, d) => {
        setPosition({ x: d.x, y: d.y });
      }}
      onResizeStop={(e, direction, ref, delta, position) => {
        setSize({ width: ref.style.width, height: ref.style.height });
        setPosition(position);
      }}
      minWidth={300}
      minHeight={200}
      bounds="window"
      className="retro-window-wrapper"
      style={{ zIndex: zIndex }}
      onMouseDown={onFocus}
      dragHandleClassName="retro-window-header"
      disableDragging={isMaximized}
      enableResizing={!isMaximized}
    >
      <div className="retro-window-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {icon && <img src={icon} alt="icon" style={{ width: '20px', height: '20px', imageRendering: 'pixelated' }}/>}
          <span>{title}</span>
        </div>
        <div className="retro-window-buttons">
          <button className="retro-btn" onClick={toggleMaximize}>
            {isMaximized ? '🗗' : '🗖'}
          </button>
          <button className="retro-btn retro-btn-close" onClick={onClose}>
            X
          </button>
        </div>
      </div>
      <div className="retro-window-content">
        {children}
      </div>
    </Rnd>
  );
};

export default Window;
