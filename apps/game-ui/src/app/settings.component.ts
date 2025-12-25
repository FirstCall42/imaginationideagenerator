import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css'
})
export class SettingsComponent {
  @Input() isOpen = false;
  @Input() currentLanguage = signal('en');
  @Input() showFlavorText = signal(true);
  @Input() availableLanguages: string[] = ['en'];
  
  @Output() close = new EventEmitter<void>();
  @Output() languageChange = new EventEmitter<string>();
  @Output() flavorTextToggle = new EventEmitter<boolean>();

  onLanguageChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.languageChange.emit(select.value);
  }

  toggleFlavorText(): void {
    const newValue = !this.showFlavorText();
    this.showFlavorText.set(newValue);
    this.flavorTextToggle.emit(newValue);
  }

  closeSettings(): void {
    this.close.emit();
  }
}
