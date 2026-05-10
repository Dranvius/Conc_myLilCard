import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ No se encontró GEMINI_API_KEY en el .env');
    return;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  
  try {
    console.log('🔍 Consultando modelos disponibles...');
    // No hay un método directo "listModels" en el SDK básico, pero probaremos 
    // a inicializar el más común y ver el error detallado.
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent('Hola');
    console.log('✅ Conexión exitosa con gemini-1.5-flash!');
    console.log('Respuesta:', (await result.response).text());
  } catch (e: any) {
    console.error('❌ Error detallado:', e);
    if (e.status === 404) {
      console.log('\n💡 Tip: Tu API Key parece estar activa pero no tiene acceso a ese modelo.');
      console.log('Asegúrate de que creaste la clave en https://aistudio.google.com/ y no en Google Cloud Console.');
    }
  }
}

main();
