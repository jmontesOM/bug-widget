/* eslint-env node */
/* eslint-disable no-undef */

import { Buffer } from "node:buffer";

// Utilidad simple para leer JSON sin Express
async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function setCors(res) {
  // Si frontend y API están en el mismo dominio, puedes dejarlo en "*"
  // o restringirlo a tu dominio de Vercel.
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    // Preflight
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const ASANA_TOKEN = process.env.ASANA_ACCESS_TOKEN;
  const ASANA_WORKSPACE_GID = process.env.ASANA_WORKSPACE_GID;
  const ASANA_PROJECT_GID = process.env.ASANA_PROJECT_GID;
  const ASANA_ASSIGNEE_GID = process.env.ASANA_ASSIGNEE_GID;
  const ASANA_SECTION_GID = process.env.ASANA_DEFAULT_SECTION_GID;
  const ASANA_URGENTE_GID = process.env.ASANA_URGENTE_SECTION_GID;

  if (!ASANA_TOKEN || !ASANA_WORKSPACE_GID || !ASANA_PROJECT_GID || !ASANA_ASSIGNEE_GID) {
    return res.status(500).json({ error: "Missing Asana environment variables" });
  }

  try {
    const body = await readJson(req);
    const { description, imageBase64, imageName, urgent } = body;

    const sectionGID = urgent ? ASANA_URGENTE_GID : ASANA_SECTION_GID;

    if (!description) {
      return res.status(400).json({ error: "Se requiere descripción" });
    }

    // Fecha de hoy (YYYY-MM-DD)
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const todayStr = `${year}-${month}-${day}`;

    // Crear tarea
    const taskPayload = {
      data: {
        name: description.slice(0, 80) || "Nueva tarea desde formulario",
        notes: description,
        workspace: ASANA_WORKSPACE_GID,
        assignee: ASANA_ASSIGNEE_GID,
        projects: [ASANA_PROJECT_GID],
        due_on: todayStr,
      },
    };

    const createTaskRes = await fetch("https://app.asana.com/api/1.0/tasks", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ASANA_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(taskPayload),
    });

    if (!createTaskRes.ok) {
      const errorText = await createTaskRes.text();
      return res.status(createTaskRes.status).json({
        error: "Error creando la tarea de Asana",
        details: errorText,
      });
    }

    const createTaskData = await createTaskRes.json();
    const task = createTaskData.data;
    const taskGid = task.gid;

    // Añadir a sección
    let sectionResult = null;

    if (sectionGID) {
      const sectionRes = await fetch(
        `https://app.asana.com/api/1.0/sections/${sectionGID}/addTask`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${ASANA_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ data: { task: taskGid } }),
        }
      );

      if (!sectionRes.ok) {
        const errorText = await sectionRes.text();
        sectionResult = { error: "Task created but error adding to section", details: errorText };
      } else {
        sectionResult = await sectionRes.json();
      }
    }

    // Sin imagen
    if (!imageBase64) {
      return res.status(200).json({
        message: "Creada la tarea sin imagen",
        task,
        sectionResult,
      });
    }

    // Con imagen (base64 -> multipart)
    const buffer = Buffer.from(imageBase64, "base64");

    const form = new FormData();
    const blob = new Blob([buffer], { type: "image/jpeg" }); // si quieres soportar png, envía también el mime

    form.append("file", blob, imageName || "attachment.jpg");
    form.append("parent", taskGid);

    const attachRes = await fetch("https://app.asana.com/api/1.0/attachments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ASANA_TOKEN}`,
      },
      body: form,
    });

    if (!attachRes.ok) {
      const errorText = await attachRes.text();
      return res.status(attachRes.status).json({
        error: "Se ha creado la tarea pero ha ocurrido un error subiendo la imagen",
        details: errorText,
        task,
        sectionResult,
      });
    }

    const attachData = await attachRes.json();

    return res.status(200).json({
      message: "Su incidencia ha sido reportada",
      task,
      sectionResult,
      attachment: attachData.data,
    });
  } catch (err) {
    return res.status(500).json({
      error: "Internal server error",
      details: err?.message || String(err),
    });
  }
}
