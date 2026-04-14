import React, { useState } from 'react';

const Browser = () => {
  const [url, setUrl] = useState('http://www.geocities.com/retro-news');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#c0c0c0', color: '#000', fontFamily: "'W95FA', 'VT323', sans-serif" }}>
      <div style={{ display: 'flex', padding: '4px', borderBottom: '2px solid #dfdfdf', gap: '4px' }}>
        <button className="retro-btn" style={{ width: 'auto', padding: '0 8px' }}>Back</button>
        <button className="retro-btn" style={{ width: 'auto', padding: '0 8px' }}>Forward</button>
        <button className="retro-btn" style={{ width: 'auto', padding: '0 8px' }}>Stop</button>
        <div style={{ padding: '4px', borderTop: '1px solid #808080', borderLeft: '1px solid #808080', borderRight: '1px solid #ffffff', borderBottom: '1px solid #ffffff', background: '#fff', flex: 1, display: 'flex' }}>
          <span style={{color: '#808080', marginRight: '4px'}}>Address:</span>
          <input 
            type="text" 
            value={url} 
            onChange={(e) => setUrl(e.target.value)}
            style={{ flex: 1, border: 'none', outline: 'none' }}
          />
        </div>
      </div>
      <div style={{ flex: 1, padding: '16px', overflowY: 'auto', background: '#fff', borderTop: '2px solid #808080', borderLeft: '2px solid #808080', borderRight: '1px solid #dfdfdf', borderBottom: '1px solid #dfdfdf' }}>
        <h1 style={{ color: '#000080', fontFamily: "Times New Roman, serif", fontSize: '2.5rem', margin: '0 0 16px 0', borderBottom: '2px solid #000080', width: 'fit-content' }}>Retro Web News</h1>
        
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '8px', color: '#800000' }}>Internet Explorer 3.0 Released!</h2>
          <p style={{ lineHeight: '1.4', fontFamily: 'Times New Roman, serif', fontSize: '1.1rem' }}>Microsoft has just released the highly anticipated version 3 of its Internet Explorer browser. Users can now enjoy support for CSS and MIDI background music.</p>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '8px', color: '#800000' }}>Y2K Bug Looming</h2>
          <p style={{ lineHeight: '1.4', fontFamily: 'Times New Roman, serif', fontSize: '1.1rem' }}>Experts warn that the impending year 2000 bug could cause computers world-wide to crash. Prepare your floppy disks and backups today.</p>
        </div>
      </div>
    </div>
  );
};

export default Browser;
