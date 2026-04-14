import React, { useState, useRef, useEffect } from 'react';

const Terminal = () => {
  const [history, setHistory] = useState([
    "Linux cyber-os 5.15.0-generic x86_64",
    "Welcome to Neon Shell v1.0.4",
    "Type 'help' to see available commands.",
  ]);
  const [input, setInput] = useState('');
  const endRef = useRef(null);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      const newHistory = [...history, `user@cyber-os:~$ ${input}`];
      
      if (input.trim() === 'help') {
        newHistory.push("Available commands: help, clear, ls, echo, whoami");
      } else if (input.trim() === 'clear') {
        setHistory([]);
        setInput('');
        return;
      } else if (input.trim() === 'whoami') {
        newHistory.push("user");
      } else if (input.trim() === 'ls') {
        newHistory.push("Documents  Downloads  Pictures  Music  cyber_keys.pem");
      } else if (input.trim().startsWith('echo ')) {
        newHistory.push(input.substring(5));
      } else if (input.trim() !== '') {
        newHistory.push(`bash: ${input}: command not found`);
      }
      
      setHistory(newHistory);
      setInput('');
    }
  };

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  return (
    <div style={{ backgroundColor: 'var(--terminal-bg)', color: 'var(--terminal-green)', padding: '8px', height: '100%', fontFamily: "'VT323', monospace", fontSize: '1.2rem', overflowY: 'auto' }} onClick={() => document.getElementById('term-input')?.focus()}>
      {history.map((line, i) => (
        <div key={i}>{line}</div>
      ))}
      <div style={{ display: 'flex' }}>
        <span style={{ marginRight: '8px' }}>user@cyber-os:~$</span>
        <input 
          id="term-input"
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{ background: 'transparent', border: 'none', color: 'var(--terminal-green)', outline: 'none', flex: 1, fontFamily: "'VT323', monospace", fontSize: '1.2rem' }}
          autoFocus
        />
      </div>
      <div ref={endRef} />
    </div>
  );
};

export default Terminal;
