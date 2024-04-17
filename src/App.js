import * as React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Main from "./Main";
import Admin from "./Admin";
import Redirection from "./Redirection";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Main />}></Route>
        <Route path="/_admin" element={<Admin />}></Route>
        <Route path="/*" element={<Redirection />}></Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
