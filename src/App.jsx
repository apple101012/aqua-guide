import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import { ToastProvider } from "./components/Toast";
import HomePage from "./pages/HomePage";
import CountryPage from "./pages/CountryPage";
import MapPage from "./pages/MapPage";
import AssistantPage from "./pages/AssistantPage";

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="countries" element={<CountryPage />} />
          <Route path="map" element={<MapPage />} />
          <Route path="assistant" element={<AssistantPage />} />
        </Route>
      </Routes>
    </ToastProvider>
  );
}
