
import { GoogleGenAI } from "@google/genai";
import { Sale, Service } from "../types";

// Always create a new GoogleGenAI instance right before making an API call 
// and obtain the API key exclusively from process.env.API_KEY.
const getAI = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const getSalesInsights = async (sales: Sale[], services: Service[]) => {
  try {
    const ai = getAI();

    // Provide context about last 50 sales to stay within reasonable token limits for simple analysis
    const salesSummary = sales.slice(0, 50).map(s => ({
      date: s.date,
      total: s.total,
      items: s.items.map(i => i.serviceName).join(', '),
      status: s.status
    }));

    const prompt = `
      Actúa como un gerente experto de una fábrica de insumos de limpieza llamada "Winter Clean".
      
      Contexto:
      - Estados de orden: "pendiente", "en_preparacion", "en_ruta", "entregado".
      
      Datos de Ventas Recientes (Últimas 50):
      ${JSON.stringify(salesSummary)}

      Productos Disponibles en Catálogo:
      ${services.map(s => s.name).join(', ')}

      Tarea: Analiza los datos y genera un reporte JSON con estos campos exactos:
      {
        "insight": "Un análisis breve (max 2 frases) sobre tendencias recientes o volumen de trabajo.",
        "recommendation": "Una acción operativa recomendada (ej. promociones, gestión de personal).",
        "popularService": "El nombre del producto más vendido basado en los datos.",
        "mood": "Una frase corta inspiradora para el equipo."
      }
      Responde SOLO con el JSON válido.
    `;

    // Use gemini-3-flash-preview for basic text analysis tasks.
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    // Access the .text property directly as it is not a method.
    return response.text;
  } catch (error) {
    console.error("Error fetching Gemini insights:", error);
    // Return null silently to avoid breaking the UI
    return null; 
  }
};
