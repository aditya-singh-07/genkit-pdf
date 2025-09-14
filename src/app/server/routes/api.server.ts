import { Injectable } from '@angular/core';
import { PdfApiServer } from '../api/pdf-api.server';

@Injectable({
  providedIn: 'root'
})
export class ApiRoutes {
  constructor(private pdfApi: PdfApiServer) {}

  async handleRequest(req: any, res: any): Promise<void> {
    const { method, url } = req;
    console.log('Received request api.server:', { method, url });
    try {
      const routePath = url;
      if (method === 'POST' && routePath === '/upload-pdf') {
        await this.handleUploadPdf(req, res);
      } else if (method === 'POST' && routePath === '/send-message') {
        await this.handleSendMessage(req, res);
      } else if (method === 'GET' && routePath.startsWith('/conversation/')) {
        await this.handleGetConversation(req, res);
      } else if (method === 'POST' && routePath.startsWith('/clear-conversation/')) {
        await this.handleClearConversation(req, res);
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
      }
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: (error as Error).message }));
    }
  }

  private async handleUploadPdf(req: any, res: any): Promise<void> {
    console.log('Received request handleUploadPdf');
    const chunks: Buffer[] = [];
    
    req.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    req.on('end', async () => {
      try {
        const body = Buffer.concat(chunks);
        const boundary = req.headers['content-type']?.split('boundary=')[1];
        
        if (!boundary) {
          throw new Error('No boundary found in content-type');
        }

        const parts = this.parseMultipartFormData(body, boundary);
        const file = parts.find(part => part.name === 'pdf');
        const customPrompt = parts.find(part => part.name === 'customPrompt')?.data.toString();

        if (!file) {
          throw new Error('No PDF file uploaded');
        }

        // Create the expected file object structure
        const fileObject = {
          buffer: file.data,
          originalname: file.filename || 'uploaded.pdf'
        };

        const result = await this.pdfApi.handleUploadPdf(fileObject, customPrompt);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: (error as Error).message }));
      }
    });
  }

  private async handleSendMessage(req: any, res: any): Promise<void> {
    const chunks: Buffer[] = [];
    
    req.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    req.on('end', async () => {
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString());
        const { sessionId, message } = body;

        if (!sessionId || !message) {
          throw new Error('Session ID and message are required');
        }

        const result = await this.pdfApi.handleSendMessage(sessionId, message);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: (error as Error).message }));
      }
    });
  }

  private async handleGetConversation(req: any, res: any): Promise<void> {
    try {
      const sessionId = req.url.split('/').pop();
      const result = this.pdfApi.getConversation(sessionId);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (error) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: (error as Error).message }));
    }
  }

  private async handleClearConversation(req: any, res: any): Promise<void> {
    try {
      const sessionId = req.url.split('/').pop();
      this.pdfApi.clearConversation(sessionId);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Conversation cleared successfully' }));
    } catch (error) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: (error as Error).message }));
    }
  }

  private parseMultipartFormData(buffer: Buffer, boundary: string): Array<{ name: string; data: Buffer; filename?: string }> {
    const parts: Array<{ name: string; data: Buffer; filename?: string }> = [];
    const boundaryBuffer = Buffer.from(`--${boundary}`);
    const endBoundaryBuffer = Buffer.from(`--${boundary}--`);
    
    let start = buffer.indexOf(boundaryBuffer);
    let end = buffer.indexOf(endBoundaryBuffer);
    
    if (start === -1 || end === -1) {
      throw new Error('Invalid multipart form data');
    }
    
    const content = buffer.slice(start + boundaryBuffer.length, end);
    const partBoundary = Buffer.from(`\r\n--${boundary}\r\n`);
    
    let partStart = 0;
    let partEnd = content.indexOf(partBoundary);
    
    while (partEnd !== -1) {
      const part = content.slice(partStart, partEnd);
      const parsedPart = this.parsePart(part);
      if (parsedPart) {
        parts.push(parsedPart);
      }
      
      partStart = partEnd + partBoundary.length;
      partEnd = content.indexOf(partBoundary, partStart);
    }
    
    // Parse the last part
    const lastPart = content.slice(partStart);
    const parsedLastPart = this.parsePart(lastPart);
    if (parsedLastPart) {
      parts.push(parsedLastPart);
    }
    
    return parts;
  }

  private parsePart(part: Buffer): { name: string; data: Buffer; filename?: string } | null {
    const headerEnd = part.indexOf(Buffer.from('\r\n\r\n'));
    if (headerEnd === -1) return null;
    
    const headers = part.slice(0, headerEnd).toString();
    const data = part.slice(headerEnd + 4);
    
    const nameMatch = headers.match(/name="([^"]+)"/);
    const filenameMatch = headers.match(/filename="([^"]+)"/);
    
    if (!nameMatch) return null;
    
    return {
      name: nameMatch[1],
      data,
      filename: filenameMatch ? filenameMatch[1] : undefined
    };
  }
} 