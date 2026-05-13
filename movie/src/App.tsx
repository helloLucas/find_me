import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import DeletionLogScene from './scenes/DeletionLogScene';
import SandboxSaveScene from './scenes/SandboxSaveScene';
import GlobalRollbackScene from './scenes/GlobalRollbackScene';
import NexusObservationScene from './scenes/NexusObservationScene';
import LucasDisintegrationScene from './scenes/LucasDisintegrationScene';
import LucasExpansionScene from './scenes/LucasExpansionScene';
import NullBootScene from './scenes/NullBootScene';
import AuthorityPatchScene from './scenes/AuthorityPatchScene';
import './index.css';

function Home() {
  return (
    <div className="home-menu">
      <h1 className="menu-title">CINEMATIC SCENES</h1>
      <h3 className="menu-subtitle">8-1</h3>
      <Link to="/deletion" className="menu-button">LOG WATERFALL</Link>
      <Link to="/save" className="menu-button">SAFE ZONE</Link>
      <h3 className="menu-subtitle">8-2</h3>
      <Link to="/rollback" className="menu-button">GLOBAL ROLLBACK</Link>
      <Link to="/lucas" className="menu-button">LUCAS DISINTEGRATION</Link>
      <Link to="/nexus" className="menu-button">NEXUS OBSERVATION</Link>
      <h3 className="menu-subtitle">8-3</h3>
      <Link to="/authority" className="menu-button">AUTHORITY PATCH</Link>
      <Link to="/lucas-expansion" className="menu-button">LUCAS INTEGRATION</Link>
      <Link to="/null-boot" className="menu-button">NULL BOOT</Link>
      <h3 className="menu-subtitle">8-4</h3>
    </div>
  );
}

function App() {
  return (
    <Router>
      <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 100, display: 'flex', gap: '15px', opacity: 0.5 }}>
        <Link to="/" style={{ color: '#888', textDecoration: 'none', fontSize: '12px' }}>[MENU]</Link>
      </div>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/nexus" element={<NexusObservationScene />} />
        <Route path="/deletion" element={<DeletionLogScene />} />
        <Route path="/save" element={<SandboxSaveScene />} />
        <Route path="/rollback" element={<GlobalRollbackScene />} />
        <Route path="/lucas" element={<LucasDisintegrationScene />} />
        <Route path="/lucas-expansion" element={<LucasExpansionScene />} />
        <Route path="/null-boot" element={<NullBootScene />} />
        <Route path="/authority" element={<AuthorityPatchScene />} />
      </Routes>
    </Router>
  );
}

export default App;
