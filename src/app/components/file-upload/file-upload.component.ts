import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { PdfService } from '../../services/pdf.service';

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.scss']
})
export class FileUploadComponent {
  uploadForm: FormGroup;
  selectedFile: File | null = null;
  isDragOver = false;
  isUploading = false;
  error = '';

  constructor(
    private fb: FormBuilder,
    private pdfService: PdfService,
    private router: Router
  ) {
    this.uploadForm = this.fb.group({
      customPrompt: ['']
    });
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = false;
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === 'application/pdf') {
        this.selectedFile = file;
      } else {
        this.error = 'Please select a PDF file';
      }
    }
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      this.selectedFile = file;
      this.error = '';
    } else {
      this.error = 'Please select a PDF file';
    }
  }

  onSubmit() {
    if (!this.selectedFile) {
      this.error = 'Please select a PDF file';
      return;
    }

    this.isUploading = true;
    this.error = '';

    const customPrompt = this.uploadForm.get('customPrompt')?.value;

    this.pdfService.uploadPdf(this.selectedFile, customPrompt).subscribe({
      next: (response) => {
        this.isUploading = false;
        this.router.navigate(['/chat', response.sessionId]);
      },
      error: (error) => {
        this.isUploading = false;
        this.error = error.error?.message || 'Upload failed. Please try again.';
      }
    });
  }
} 