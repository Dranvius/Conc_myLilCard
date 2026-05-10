import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private groq: OpenAI | null = null;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GROQ_API_KEY');
    if (apiKey) {
      this.groq = new OpenAI({
        apiKey,
        baseURL: 'https://api.groq.com/openai/v1',
      });
    }
  }

  async generateText(prompt: string): Promise<string> {
    if (!this.groq) {
      this.logger.warn('Groq API Key not configured.');
      return 'IA no configurada. Por favor, añade tu GROQ_API_KEY al archivo .env';
    }

    try {
      const chatCompletion = await this.groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama-3.3-70b-versatile',
      });

      return chatCompletion.choices[0]?.message?.content || 'Sin respuesta de la IA.';
    } catch (error) {
      this.logger.error('Error calling Groq AI:', error);
      return 'Error al procesar la solicitud de IA con Groq.';
    }
  }

  async summarizeOpportunity(opportunityData: any): Promise<string> {
    const prompt = `
      Eres un asistente experto en ventas para el CRM RespiraCRM.
      Analiza la siguiente oportunidad y genera un resumen ejecutivo breve (máximo 3 párrafos).
      Incluye:
      1. Estado actual del cliente.
      2. Riesgos detectados (si los hay).
      3. Sugerencia de "Siguiente Paso" para cerrar la venta.

      Datos de la Oportunidad:
      ${JSON.stringify(opportunityData, null, 2)}

      Responde en español, con un tono profesional y directo.
    `;

    return this.generateText(prompt);
  }
}
