import { Navigate, Route, Routes } from "react-router-dom";
import { RequireChild, RequireParent } from "./auth";
import { Activities } from "./pages/Activities";
import { Album } from "./pages/Album";
import { Gate } from "./pages/Gate";
import { Parent } from "./pages/Parent";
import { Reader } from "./pages/Reader";
import { Rewards } from "./pages/Rewards";
import { Shelf } from "./pages/Shelf";
import { Studio } from "./pages/Studio";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Gate />} />
      <Route path="/shelf" element={<RequireChild><Shelf /></RequireChild>} />
      <Route path="/read/:bookId" element={<RequireChild><Reader /></RequireChild>} />
      <Route path="/activities/:bookId" element={<RequireChild><Activities /></RequireChild>} />
      <Route path="/studio/:bookId" element={<RequireChild><Studio /></RequireChild>} />
      <Route path="/rewards/:bookId" element={<RequireChild><Rewards /></RequireChild>} />
      <Route path="/album" element={<RequireChild><Album /></RequireChild>} />
      <Route path="/parent" element={<RequireParent><Parent /></RequireParent>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
