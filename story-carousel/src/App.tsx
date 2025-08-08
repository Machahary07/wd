import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import VideoCarouselPage from './pages/VideoCarouselPage'
import PhotoCarouselPage from './pages/PhotoCarouselPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/videos" replace />} />
        <Route path="/videos" element={<VideoCarouselPage />} />
        <Route path="/photos" element={<PhotoCarouselPage />} />
        <Route path="*" element={<Navigate to="/videos" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
