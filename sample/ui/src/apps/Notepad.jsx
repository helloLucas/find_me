import React, { useState } from 'react';

const Notepad = () => {
  const [text, setText] = useState("Meeting at Sector 7 tonight.\nBring the drives.\n\nDon't trust the street samurais.");

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#fff', color: '#000' }}>
      <div style={{ padding: '4px', background: '#f0f0f0', borderBottom: '1px solid #ccc', fontSize: '0.9rem', display: 'flex', gap: '12px' }}>
        <span style={{ cursor: 'pointer' }}>File</span>
        <span style={{ cursor: 'pointer' }}>Edit</span>
        <span style={{ cursor: 'pointer' }}>View</span>
      </div>
      <textarea 
        value={text}
        onChange={(e) => setText(e.target.value)}
        style={{ flex: 1, border: 'none', outline: 'none', padding: '8px', resize: 'none', fontFamily: "'VT323', monospace", fontSize: '1.2rem' }}
      />
    </div>
  );
};

export default Notepad;
