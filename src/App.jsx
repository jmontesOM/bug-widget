import "./App.css";
import Formulario from "./components/Formulario.jsx";
import { useState } from "react";

function App() {
  const [open, setOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const handleOpen = () => {
    setSuccessMessage(""); // limpiar mensaje antiguo
    setOpen(!open);
  };

  return (
    <>
      {/* Formulario desplegable */}
      {open && (
        <div className="widget-container bottom-24 max-h-[80vh] overflow-auto bg-white rounded-xl shadow-2xl z-40 animate-fadeIn">
          <Formulario
            onSuccess={(message) => {
              setSuccessMessage(message); // Guardar mensaje de éxito
              setOpen(false); // Cerrar formulario
            }}
          />
        </div>
      )}

      {/* Mensaje de éxito fuera del formulario */}
      {successMessage && (
        <p className="text-green-600 mt-2 text-right relative top-[240px]">{successMessage}</p>
      )}

      {/* Botón flotante */}
      <button
        onClick={handleOpen} // usar handleOpen en vez de setOpen directo
        className="focus:outline-none bottom-5 px-4 py-3 rounded-full bg-blue-600 text-white text-lg font-semibold flex items-center justify-center shadow-lg z-50"
      >
        {open ? "×" : "Reportar incidencia"}
      </button>

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
