import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ChatResponse {
  response: string;
  conversationHistory: ChatMessage[];
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class PdfService {
  private apiUrl = '/api'; // Now using relative path since API is on same server

  constructor(private http: HttpClient) { }

  uploadPdf(file: File, customPrompt?: string): Observable<UploadResponse> {
    const formData = new FormData();
    formData.append('pdf', file);
    if (customPrompt) {
      formData.append('customPrompt', customPrompt);
    }
    
    return this.http.post<UploadResponse>(`${this.apiUrl}/upload-pdf`, formData);
  }

  sendMessage(sessionId: string, message: string): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(`${this.apiUrl}/send-message`, {
      sessionId,
      message
    });
  }

  getConversation(sessionId: string): Observable<{
    conversationHistory: ChatMessage[];
    sessionInfo: any;
  }> {
    return this.http.get<{
      conversationHistory: ChatMessage[];
      sessionInfo: any;
    }>(`${this.apiUrl}/conversation/${sessionId}`);
  }

  clearConversation(sessionId: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/clear-conversation/${sessionId}`, {});
  }
} 