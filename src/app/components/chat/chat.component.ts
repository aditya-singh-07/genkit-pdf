import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PdfService, ChatMessage } from '../../services/pdf.service';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss'],
})
export class ChatComponent implements OnInit, OnDestroy {
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;
  @ViewChild('messageInput') messageInput!: ElementRef;

  sessionId: string = '';
  messages: ChatMessage[] = [];
  currentMessage: string = '';
  isLoading = false;
  isTyping = false;
  sessionInfo: any = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private pdfService: PdfService,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.sessionId = this.route.snapshot.params['sessionId'];
    if (this.sessionId) {
      this.loadConversation();
    } else {
      this.router.navigate(['/upload']);
    }
  }

  ngOnDestroy() {
    // Cleanup if needed
  }

  loadConversation() {
    this.isLoading = true;
    this.cd.detectChanges();
    
    this.pdfService.getConversation(this.sessionId).subscribe({
      next: (data) => {
        console.log('Conversation loaded:', data);
        
        // Convert timestamp strings to Date objects
        this.messages = (data.conversationHistory || []).map(message => ({
          ...message,
          timestamp: new Date(message.timestamp)
        }));
        
        this.sessionInfo = data.sessionInfo;
        this.isLoading = false;
        
        this.cd.detectChanges();
        
        setTimeout(() => {
          this.scrollToBottom();
        }, 0);
      },
      error: (error) => {
        console.error('Error loading conversation:', error);
        this.isLoading = false;
        this.cd.detectChanges();
      }
    });
  }

  sendMessage() {
    if (!this.currentMessage.trim() || this.isLoading) return;

    const message = this.currentMessage.trim();
    this.currentMessage = '';
    this.isTyping = true;

    // Add user message immediately
    this.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date()
    });
    this.cd.detectChanges(); 
    this.scrollToBottom();

    // Send message to API
    this.pdfService.sendMessage(this.sessionId, message).subscribe({
      next: (response) => {
        // Convert timestamp strings to Date objects
        this.messages = (response.conversationHistory || []).map(message => ({
          ...message,
          timestamp: new Date(message.timestamp)
        }));
        
        this.isTyping = false;
        
        this.cd.detectChanges();
        
        setTimeout(() => {
          this.scrollToBottom();
        }, 0);
      },
      error: (error) => {
        console.error('Error sending message:', error);
        this.isTyping = false;
        this.cd.detectChanges();
      }
    });
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  clearConversation() {
    if (confirm('Are you sure you want to clear the conversation?')) {
      this.pdfService.clearConversation(this.sessionId).subscribe({
        next: () => {
          this.messages = [];
          this.cd.detectChanges();
        },
        error: (error) => {
          console.error('Error clearing conversation:', error);
        }
      });
    }
  }

  goBack() {
    this.router.navigate(['/upload']);
  }

  formatMessage(content: string): string {
    // Basic formatting for better readability
    return content
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>');
  }

  scrollToBottom() {
    setTimeout(() => {
      if (this.messagesContainer) {
        const element = this.messagesContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
      }
    }, 100);
  }

  adjustTextareaHeight() {
    const textarea = this.messageInput?.nativeElement;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    }
  }

  trackByMessage(index: number, message: ChatMessage): any {
    if (message.timestamp && typeof message.timestamp.getTime === 'function') {
      return message.timestamp.getTime();
    }
    // Fallback to index if timestamp is invalid
    return index;
  }
} 