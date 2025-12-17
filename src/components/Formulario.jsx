import { useState } from "react";

export default function Formulario({ onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [error, setError] = useState(null);
  const [imageName, setImageName] = useState("");
  const [urgent, setUrgent] = useState(false);

  const API_BASE = import.meta.env.VITE_API_BASE || "";

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImageName(file.name);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let imageBase64 = null;
      let imageNameLocal = null;

      if (imageFile) {
        imageNameLocal = imageFile.name;
        const reader = new FileReader();

        imageBase64 = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result.split(",")[1]);
          reader.onerror = () => reject(new Error("Error leyendo la imagen"));
          reader.readAsDataURL(imageFile);
        });
      }

      const body = { description, imageBase64, imageName: imageNameLocal, urgent };

      const res = await fetch(`${API_BASE}/api/createTask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      let data;
      try {
        data = await res.json();
      } catch {
        const text = await res.text();
        throw new Error(`Respuesta del servidor no es JSON: ${text}`);
      }

      if (!res.ok) throw new Error(data.error || "Error al enviar el formulario");

      // Limpiar formulario
      setDescription("");
      setImageFile(null);
      setImagePreview(null);
      setImageName("");

      // Pasar mensaje al componente padre
      if (onSuccess) {
        onSuccess(data.message || "Tarea creada correctamente");
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="w-full bg-white p-4 rounded-md shadow-md mx-auto">
        <div className="flex flex-col w-full">
          <textarea
            placeholder="Describe la incidencia..."
            value={description}
            required
            onChange={(e) => setDescription(e.target.value)}
            className="
              w-full
              min-h-[120px]
              p-2
              border border-gray-300
              rounded-sm
              text-sm
              text-gray-700
              focus:outline-none
              focus:border-blue-500
              focus:ring-1
              focus:ring-blue-300
              transition
            "
          />

          <label className="inline-flex items-center gap-2 text-sm text-gray-700 mt-2">
            <input
              type="checkbox"
              checked={urgent}
              onChange={(e) => setUrgent(e.target.checked)}
              className="form-checkbox h-4 w-4 text-blue-600 rounded-sm"
            />
            Incidencia urgente
          </label>

          <label className="flex items-center gap-3 cursor-pointer mt-4 w-fit">
            <span className="bg-gray-200 text-gray-700 text-xs px-3 py-1 rounded-sm hover:bg-gray-300 transition">
              Seleccionar archivo
            </span>
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleImageChange}
            />
          </label>

          {imageName && (
            <p className="text-xs text-gray-600 text-left mt-2">
              Archivo seleccionado: <span className="font-medium">{imageName}</span>
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="
              bg-blue-600
              disabled:bg-blue-400
              text-white
              px-4
              py-2
              rounded-sm
              hover:bg-blue-700
              transition
              mt-6
              w-fit
              right-0
            "
          >
            {loading ? "Enviando..." : "Enviar"}
          </button>
        </div>
        {error && <p className="text-sm text-red-600 mt-2 text-center">Error: {error}</p>}
      </form>

      
    </>
  );
}
