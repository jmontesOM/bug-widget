import { useState } from "react";

export default function Formulario() {
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [imageName, setImageName] = useState("");
  const [urgent, setUrgent] = useState(false);

  const API_BASE = import.meta.env.VITE_API_BASE || "";

  // Manejar selección de imagen y generar previsualización
  const handleImageChange = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  setImageFile(file);
  setImageName(file.name); // << nombre del archivo
};


  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      let imageBase64 = null;
      let imageName = null;

      // Convertir imagen a Base64 si hay
      if (imageFile) {
        imageName = imageFile.name;
        const reader = new FileReader();

        imageBase64 = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result.split(",")[1]); // Solo Base64
          reader.onerror = () => reject(new Error("Error leyendo la imagen"));
          reader.readAsDataURL(imageFile);
        });
      }

      const body = { description, imageBase64, imageName, urgent };
      console.log("Body que se enviará a Netlify:", body);

      // Llamada a Netlify Function
      const res = await fetch(`${API_BASE}/api/createTask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      // Manejar respuesta no JSON
      let data;
      try {
        data = await res.json();
      } catch {
        const text = await res.text();
        throw new Error(`Respuesta del servidor no es JSON: ${text}`);
      }

      console.log("Respuesta del server:", data);

      if (!res.ok) throw new Error(data.error || "Error al enviar el formulario");

      setSuccess(data.message || "Tarea creada correctamente");
      setDescription("");
      setImageFile(null);
      setImagePreview(null);
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

    {/* Textarea */}
    <textarea
      placeholder="Describe la incidencia..."
      value={description}
      onChange={(e) => setDescription(e.target.value)}
      required
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

    {/* Nombre del archivo */}
    {imageName && (
      <p className="text-xs text-gray-600 text-left mt-2">
        Archivo seleccionado: <span className="font-medium">{imageName}</span>
      </p>
    )}

    {/* Botón Enviar */}
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
</form>

{/* Mensajes */}
{error && <p className="text-red-600 mt-2 text-center">Error: {error}</p>}
{success && <p className="text-green-600 mt-2 text-center">{success}</p>}

    </>
  );
}
