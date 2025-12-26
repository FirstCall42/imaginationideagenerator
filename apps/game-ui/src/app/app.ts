import { Component, resource, signal, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { SettingsComponent } from './settings.component';

interface Charade {
  id: number;
  text: { [key: string]: string };
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
  imageLoaded = signal(false);

  // History and random selection tracking
  private selectionHistory = signal<number[]>([]);
  private usedIndices = signal<Set<number>>(new Set());
  private historyCursor = signal(-1);

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
              imageUrl: 'https://images.unsplash.com/photo-1578926078328-123456789012?w=400&h=400&fit=crop'
            },
            {
              id: 2,
              text: { en: 'Dancing' },
              imageUrl: 'https://images.unsplash.com/photo-1511379938547-c1f69b13d835?w=400&h=400&fit=crop'
            }
          ]
        }
      ]
    };
  }

  onSetChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectSet(value);
  }

  selectSet(setId: string): void {
    this.currentSetId.set(setId);
    this.currentIndex.set(0);
    this.currentLanguage.set(this.getCurrentSet()?.languages[0] || 'en');
    this.selectionHistory.set([]);
    this.usedIndices.set(new Set());
    this.historyCursor.set(-1);
    this.selectRandomCharade();
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
    this.imageLoaded.set(false);

    const history = this.selectionHistory();
    const cursor = this.historyCursor();

    // If we are NOT at the end of history, move forward in history
    if (cursor < history.length - 1) {
      const newCursor = cursor + 1;
      this.historyCursor.set(newCursor);
      this.currentIndex.set(history[newCursor]);
      return;
    }

    // Otherwise, pick a new random one
    this.selectRandomCharade();
  }

  previousCharade(): void {
    this.imageLoaded.set(false);
    
    const cursor = this.historyCursor();
    if (cursor <= 0) return;

    const newCursor = cursor - 1;
    this.historyCursor.set(newCursor);
    this.currentIndex.set(this.selectionHistory()[newCursor]);
  }

  private selectRandomCharade(): void {
    const set = this.getCurrentSet();
    if (!set || set.charades.length === 0) return;

    const used = this.usedIndices();
    let available = Array.from({ length: set.charades.length }, (_, i) => i)
      .filter(i => !used.has(i));

    if (available.length === 0) {
      available = Array.from({ length: set.charades.length }, (_, i) => i);
      this.usedIndices.set(new Set());
    }

    const randomIndex = available[Math.floor(Math.random() * available.length)];

    const history = [...this.selectionHistory(), randomIndex];
    this.selectionHistory.set(history);
    this.historyCursor.set(history.length - 1);

    const newUsed = new Set(this.usedIndices());
    newUsed.add(randomIndex);
    this.usedIndices.set(newUsed);

    this.currentIndex.set(randomIndex);
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
