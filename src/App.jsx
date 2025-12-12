import "./App.css";
import Formulario from "./components/Formulario.jsx";
import { useState } from "react";

function App() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Botón flotante */}
      <button
        onClick={() => setOpen(!open)}
        className="focus:outline-none fixed bottom-5 right-5 px-4 py-3 rounded-full bg-blue-600 text-white text-lg font-semibold flex items-center justify-center shadow-lg z-50"
      >
        {open ? "×" : "Reportar incidencia"}
      </button>

      {/* Formulario desplegable */}
      {open && (
        <div className="widget-container fixed bottom-24 right-5 w-80 max-h-[80vh] overflow-auto bg-white rounded-xl shadow-2xl z-40 animate-fadeIn">
          <Formulario />
        </div>
      )}

      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fadeIn {
            animation: fadeIn 0.25s ease;
          }
        `}
      </style>
    </>
  );
}

export default App;
