import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import GM from "./pages/GM";
import Player from "./pages/Player";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/gm" replace />} />
        <Route path="/gm" element={<GM />} />
        <Route path="/player/:playerName" element={<Player />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
