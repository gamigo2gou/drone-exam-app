import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import ChapterSelect from './pages/ChapterSelect'
import Quiz from './pages/Quiz'
import Result from './pages/Result'
import ExamHome from './pages/ExamHome'
import ExamQuiz from './pages/ExamQuiz'
import ExamResult from './pages/ExamResult'
import Progress from './pages/Progress'
import Admin from './pages/Admin'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/chapter/:chapterId" element={<ChapterSelect />} />
        <Route path="/quiz" element={<Quiz />} />
        <Route path="/result" element={<Result />} />
        <Route path="/exam" element={<ExamHome />} />
        <Route path="/exam/quiz" element={<ExamQuiz />} />
        <Route path="/exam/result" element={<ExamResult />} />
        <Route path="/progress" element={<Progress />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  )
}
