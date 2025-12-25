import { Component, resource, signal, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { SettingsComponent } from './settings.component';

interface Charade {
  id: number;
  text: { [key: string]: string };
  flavorText: { [key: string]: string };
  imageUrl: string;
}

interface CharadeSet {
  id: string;
  name: string;
  languages: string[];
  charades: Charade[];
}

interface CharadesData {
  sets: CharadeSet[];
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule, SettingsComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private http = inject(HttpClient);

  sets = signal<CharadeSet[]>([]);
  currentSetId = signal<string>('');
  currentIndex = signal(0);
  currentLanguage = signal('en');
  showSettings = signal(false);
  showFlavorText = signal(true);

  // Swipe gesture tracking
  private touchStartX = 0;
  private touchStartY = 0;
  private minSwipeDistance = 50;

  charadesResource = resource({
    loader: async () => {
      try {
        const data = await this.http.get<CharadesData>('/charades.json').toPromise();
        if (data?.sets && data.sets.length > 0) {
          this.sets.set(data.sets);
          this.selectSet(data.sets[0].id);
          return data.sets;
        }
        throw new Error('No sets in JSON');
      } catch (error) {
        console.error('Error loading charades:', error);
        const demoData = this.getDemoData();
        this.sets.set(demoData.sets);
        this.selectSet(demoData.sets[0].id);
        return demoData;
      }
    }
  });

  private getDemoData(): CharadesData {
    return {
      sets: [
        {
          id: 'demo',
          name: 'Demo',
          languages: ['en'],
          charades: [
            {
              id: 1,
              text: { en: 'Superhero' },
              flavorText: { en: 'Act it out!' },
              imageUrl: 'https://images.unsplash.com/photo-1578926078328-123456789012?w=400&h=400&fit=crop'
            },
            {
              id: 2,
              text: { en: 'Dancing' },
              flavorText: { en: 'Move and groove!' },
              imageUrl: 'https://images.unsplash.com/photo-1511379938547-c1f69b13d835?w=400&h=400&fit=crop'
            }
          ]
        }
      ]
    };
  }

  selectSet(setId: string): void {
    this.currentSetId.set(setId);
    this.currentIndex.set(0);
    this.currentLanguage.set(this.getCurrentSet()?.languages[0] || 'en');
    this.shuffleCharades();
  }

  getCurrentSet(): CharadeSet | null {
    return this.sets().find(s => s.id === this.currentSetId()) || null;
  }

  getAvailableLanguages(): string[] {
    return this.getCurrentSet()?.languages || [];
  }

  shuffleCharades(): void {
    const set = this.getCurrentSet();
    if (!set) return;
    
    const current = [...set.charades];
    for (let i = current.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [current[i], current[j]] = [current[j], current[i]];
    }
    set.charades = current;
  }

  getCurrentCharade(): Charade | null {
    const set = this.getCurrentSet();
    if (!set || set.charades.length === 0) return null;
    return set.charades[this.currentIndex()] || null;
  }

  nextCharade(): void {
    const set = this.getCurrentSet();
    if (!set || set.charades.length === 0) return;
    this.currentIndex.set((this.currentIndex() + 1) % set.charades.length);
  }

  previousCharade(): void {
    const set = this.getCurrentSet();
    if (!set || set.charades.length === 0) return;
    this.currentIndex.set(this.currentIndex() === 0 ? set.charades.length - 1 : this.currentIndex() - 1);
  }

  setLanguage(lang: string): void {
    this.currentLanguage.set(lang);
  }

  toggleSettings(): void {
    this.showSettings.set(!this.showSettings());
  }

  getTopText(): string {
    const charade = this.getCurrentCharade();
    return charade ? (charade.text[this.currentLanguage()] || charade.text['en'] || '') : '';
  }

  getBottomText(): string {
    const charade = this.getCurrentCharade();
    return charade ? (charade.flavorText[this.currentLanguage()] || charade.flavorText['en'] || '') : '';
  }

  getCharadeCount(): number {
    return this.getCurrentSet()?.charades.length || 0;
  }

  // Swipe gesture handlers
  onTouchStart(event: TouchEvent): void {
    this.touchStartX = event.touches[0].clientX;
    this.touchStartY = event.touches[0].clientY;
  }

  onTouchEnd(event: TouchEvent): void {
    const touchEndX = event.changedTouches[0].clientX;
    const touchEndY = event.changedTouches[0].clientY;

    const distanceX = this.touchStartX - touchEndX;
    const distanceY = this.touchStartY - touchEndY;

    // Only register horizontal swipes, not vertical scrolls
    if (Math.abs(distanceX) > Math.abs(distanceY)) {
      if (Math.abs(distanceX) > this.minSwipeDistance) {
        if (distanceX > 0) {
          // Swiped left - show next charade
          this.nextCharade();
        } else {
          // Swiped right - show previous charade
          this.previousCharade();
        }
      }
    }
  }
}
