import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './Home'
import Navbar from './Navbar';
import Upload from './Upload';
import About from './About';
import Wardrobe from './Wardrobe';
import './App.scss';

function App() {
  return (
    <Router>
      <div className="app-container">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/wardrobe" element={<Wardrobe />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
