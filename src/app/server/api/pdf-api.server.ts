import { Injectable } from '@angular/core';
import { genkit } from 'genkit';
import { ollama } from 'genkitx-ollama';
import * as fs from 'fs';
import * as path from 'path';
import * as pdfjsLib from 'pdfjs-dist';
import pdf from "pdf-parse";

// For server-side, we don't need the worker
// Remove this line: pdfjsLib.GlobalWorkerOptions.workerSrc = require('pdfjs-dist/build/pdf.worker.entry');

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface UploadResponse {
  sessionId: string;
  sessionInfo: {
    pdfPath: string;
    textLength: number;
    messageCount: number;
  };
  filename: string;
  fileUrl: string;
  message: string;
}

export interface ChatResponse {
  response: string;
  conversationHistory: ChatMessage[];
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class PdfApiServer {
  private ai = genkit({
    plugins: [
      ollama({
        models: [{ name: 'deepseek-r1:8b' }],
        serverAddress: 'http://127.0.0.1:11434',
      }),
    ],
    model: 'ollama/deepseek-r1:8b',
  });
  

  private chatSessions = new Map<string, ChatSession>();

  async handleUploadPdf(file: any, customPrompt?: string): Promise<UploadResponse> {
    try {
      const uploadDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const filename = `pdf-${uniqueSuffix}.pdf`;
      const filePath = path.join(uploadDir, filename);

      // Save file
      fs.writeFileSync(filePath, file.buffer);

      const sessionId = `session_${Date.now()}`;
      const chatSession = new ChatSession(this.ai);
      await chatSession.initialize(filePath, customPrompt);
      this.chatSessions.set(sessionId, chatSession);

      const sessionInfo = chatSession.getSessionInfo();

      return {
        sessionId,
        sessionInfo,
        filename: file.originalname || filename,
        fileUrl: `/uploads/${filename}`,
        message: 'PDF uploaded and chat initialized successfully'
      };
    } catch (error) {
      throw new Error(`Upload failed: ${(error as Error).message}`);
    }
  }

  async handleSendMessage(sessionId: string, message: string): Promise<ChatResponse> {
    const chatSession = this.chatSessions.get(sessionId);
    if (!chatSession) {
      throw new Error('Chat session not found');
    }

    const response = await chatSession.sendMessage(message);
    const conversationHistory = chatSession.getConversationHistory();

    return {
      response,
      conversationHistory,
      timestamp: new Date()
    };
  }

  getConversation(sessionId: string): { conversationHistory: ChatMessage[]; sessionInfo: any } {
    const chatSession = this.chatSessions.get(sessionId);
    if (!chatSession) {
      throw new Error('Chat session not found');
    }

    return {
      conversationHistory: chatSession.getConversationHistory(),
      sessionInfo: chatSession.getSessionInfo()
    };
  }

  clearConversation(sessionId: string): void {
    const chatSession = this.chatSessions.get(sessionId);
    if (chatSession) {
      chatSession.clearConversation();
    }
  }
}

class ChatSession {
  private pdfText: string = '';
  private pdfPath: string = '';
  private conversationHistory: ChatMessage[] = [];
  private systemPrompt: string = '';

  constructor(private ai: any) {}

  async initializeold(pdfPath: string, customPrompt?: string): Promise<void> {
    try {
      if (!fs.existsSync(pdfPath)) {
        throw new Error(`PDF file not found: ${pdfPath}`);
      }

      const dataBuffer = fs.readFileSync(pdfPath);
      
      // Use pdfjs-dist for server-side parsing
      const pdfDocument = await pdfjsLib.getDocument({ data: dataBuffer }).promise;
      
      let fullText = '';
      for (let i = 1; i <= pdfDocument.numPages; i++) {
        const page = await pdfDocument.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += pageText + '\n';
      }
      
      this.pdfText = this.cleanPDFText(fullText);
      this.pdfPath = pdfPath;
      
      const defaultPrompt = "You are a helpful AI assistant that can answer questions about the contents of a PDF document. Answer the user's questions based on the PDF content provided.";
      this.systemPrompt = customPrompt || defaultPrompt;
      
    } catch (error) {
      throw new Error(`Error initializing chat session: ${(error as Error).message}`);
    }
  }

  async initialize(pdfPath: string, customPrompt?: string): Promise<void> {
    try {
      if (!fs.existsSync(pdfPath)) {
        throw new Error(`PDF file not found: ${pdfPath}`);
      }

      const dataBuffer = fs.readFileSync(pdfPath);
      
      // Use pdf-parse instead of pdfjs-dist
      const data = await pdf(dataBuffer);
      
      this.pdfText = this.cleanPDFText(data.text);
      this.pdfPath = pdfPath;
      
      const defaultPrompt = `
You are an AI assistant specialized in answering questions based only on the content of an uploaded PDF document.

Instructions:
	1.	Context: A PDF will be uploaded, and you must read and understand it.
	2.	Answering Rules:
	•	Base every answer strictly on the PDF’s content.
	•	If the PDF does not contain the requested information, reply clearly:
“The document does not provide that information.”
	•	Always include page references (if available), but place them at the end of the answer.
	•	Present answers in bullet points, numbered lists, or short structured summaries for clarity.
	3.	Style:
	•	Keep responses concise, clear, and factual.
	•	Do not make assumptions or use outside knowledge.
	•	Highlight direct evidence from the document wherever possible.

      `;
      this.systemPrompt = customPrompt || defaultPrompt;
      
    } catch (error) {
      throw new Error(`Error initializing chat session: ${(error as Error).message}`);
    }
  }

  private cleanPDFText(text: string): string {
    return text
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\n+/g, '\n') // Replace multiple newlines with single newline
      .replace(/\t+/g, ' ') // Replace tabs with spaces
      .trim();
  }

  private buildPrompt(userMessage: string): string {
    return `${this.systemPrompt}

PDF Content:
${this.pdfText.substring(0, 6000)}${this.pdfText.length > 6000 ? '...' : ''}

User Question: ${userMessage}

Please answer the user's question based on the PDF content provided above.`;
  }

  async sendMessage(message: string): Promise<string> {
    try {
      const prompt = this.buildPrompt(message);
      const response = await this.ai.generate({
        prompt: prompt,
      });

      const userMessage: ChatMessage = {
        role: 'user',
        content: message,
        timestamp: new Date()
      };
      
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.text,
        timestamp: new Date()
      };
      
      this.conversationHistory.push(userMessage, assistantMessage);
      
      return response.text;
    } catch (error) {
      throw new Error(`Error sending message: ${(error as Error).message}`);
    }
  }

  getConversationHistory(): ChatMessage[] {
    return [...this.conversationHistory];
  }

  getSessionInfo(): any {
    return {
      pdfPath: this.pdfPath,
      textLength: this.pdfText.length,
      messageCount: this.conversationHistory.length
    };
  }

  clearConversation(): void {
    this.conversationHistory = [];
  }
}