/* eslint-env node */
/* eslint-disable no-undef */

import { Buffer } from "node:buffer";

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  const ASANA_TOKEN = process.env.ASANA_ACCESS_TOKEN;
  const ASANA_WORKSPACE_GID = process.env.ASANA_WORKSPACE_GID;
  const ASANA_PROJECT_GID = process.env.ASANA_PROJECT_GID;
  const ASANA_ASSIGNEE_GID = process.env.ASANA_ASSIGNEE_GID;
  const ASANA_SECTION_GID = process.env.ASANA_DEFAULT_SECTION_GID;

  if (
    !ASANA_TOKEN ||
    !ASANA_WORKSPACE_GID ||
    !ASANA_PROJECT_GID ||
    !ASANA_ASSIGNEE_GID
  ) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Missing Asana environment variables",
      }),
    };
  }

  try {
    const body = JSON.parse(event.body);
    const { description, imageBase64, imageName } = body;

    if (!description) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Se requiere descripción" }),
      };
    }

    // Fecha de hoy
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const todayStr = `${year}-${month}-${day}`;

    // Crear tarea en Asana
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
      return {
        statusCode: createTaskRes.status,
        body: JSON.stringify({
          error: "Error creando la tarea de Asana",
          details: errorText,
        }),
      };
    }

    const createTaskData = await createTaskRes.json();
    const task = createTaskData.data;
    const taskGid = task.gid;

    // Movemos la tarea a la seccion
    //TODO: ver como metemos las etiquetas de urgente, etc....
    let sectionResult = null;

    if (ASANA_SECTION_GID) {
      const sectionRes = await fetch(
        `https://app.asana.com/api/1.0/sections/${ASANA_SECTION_GID}/addTask`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${ASANA_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            data: {
              task: taskGid,
            },
          }),
        }
      );

      if (!sectionRes.ok) {
        const errorText = await sectionRes.text();
        sectionResult = {
          error: "Task created but error adding to section",
          details: errorText,
        };
      } else {
        sectionResult = await sectionRes.json();
      }
    }

    // Return si no tenemos la imagen
    if (!imageBase64) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "Creada la tarea sin imagen",
          task,
          sectionResult,
        }),
      };
    }

    // Si tenemos imagen la añadimos
    const buffer = Buffer.from(imageBase64, "base64");

    const form = new FormData();
    const blob = new Blob([buffer], { type: "image/jpeg" });

    form.append("file", blob, imageName || "attachment.jpg");
    form.append("parent", taskGid);

    const attachRes = await fetch("https://app.asana.com/api/1.0/attachments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ASANA_TOKEN}`,
        // OJO: no ponemos Content-Type... hacer pruebas para comprobar que no salta error..
      },
      body: form,
    });

    if (!attachRes.ok) {
      const errorText = await attachRes.text();
      return {
        statusCode: attachRes.status,
        body: JSON.stringify({
          error:
            "Se ha creado la tarea pero ha ocurrido un error subiendo la imagen", // He probado a subir png y jpg y parece que todo OK
          details: errorText,
          task,
          sectionResult,
        }),
      };
    }

    const attachData = await attachRes.json();

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Se ha credo la tarea y se ha subido la imagen correctamente",
        task,
        sectionResult,
        attachment: attachData.data,
      }),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Internal server error", // Error genérico (entiendo que siempre que no carguemos bien las variables de entorno)
        details: err.message,
      }),
    };
  }
}
