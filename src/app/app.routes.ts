import { Routes } from '@angular/router';
import { FileUploadComponent } from './components/file-upload/file-upload.component';
import { ChatComponent } from './components/chat/chat.component';

export const routes: Routes = [
  { path: '', redirectTo: '/upload', pathMatch: 'full' },
  { path: 'upload', component: FileUploadComponent },
  { 
    path: 'chat/:sessionId', 
    component: ChatComponent
  },
  { path: '**', redirectTo: '/upload' }
];