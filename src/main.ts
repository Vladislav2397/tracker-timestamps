import './style.css'
import { TimestampDatabase } from './database'
import type { TimestampRecord } from './database'

class TimestampTracker {
  private db: TimestampDatabase;
  private timestampsList!: HTMLUListElement;
  private addButton!: HTMLButtonElement;
  private addUrgentButton!: HTMLButtonElement;

  constructor() {
    this.db = new TimestampDatabase();
    this.initializeUI();
    this.setupEventListeners();
    this.init();
  }

  private initializeUI() {
    document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
        <div class="tracker-header">
          <h1 class="tracker-title">Трекер Времени</h1>
        </div>
        
        <div class="timestamps-list">
          <ul id="timestamps-list"></ul>
        </div>
        
        <div class="buttons-container">
          <button id="add-timestamp" class="tracker-button" type="button">
            Время
          </button>
          <button id="add-urgent-timestamp" class="tracker-button urgent" type="button">
            Время !!!
          </button>
        </div>
    `;

    this.timestampsList = document.querySelector<HTMLUListElement>('#timestamps-list')!;
    this.addButton = document.querySelector<HTMLButtonElement>('#add-timestamp')!;
    this.addUrgentButton = document.querySelector<HTMLButtonElement>('#add-urgent-timestamp')!;
  }

  private setupEventListeners() {
    this.addButton.addEventListener('click', () => this.addTimestamp(''));
    this.addUrgentButton.addEventListener('click', () => this.addTimestamp('!'));
  }

  private async init() {
    try {
      await this.db.init();
      await this.loadTimestamps();
    } catch (error) {
      console.error('Ошибка инициализации:', error);
      this.showError('Ошибка инициализации базы данных');
    }
  }

  private async addTimestamp(suffix: string) {
    try {
      await this.db.addTimestamp(suffix);
      await this.loadTimestamps();
    } catch (error) {
      console.error('Ошибка добавления записи:', error);
      this.showError('Ошибка добавления записи');
    }
  }

  private async loadTimestamps() {
    try {
      const timestamps = await this.db.getAllTimestamps();
      this.renderTimestamps(timestamps);
    } catch (error) {
      console.error('Ошибка загрузки записей:', error);
      this.showError('Ошибка загрузки записей');
    }
  }

  private renderTimestamps(timestamps: TimestampRecord[]) {
    if (timestamps.length === 0) {
      this.timestampsList.innerHTML = '<li class="empty-state">Нет записей времени</li>';
      return;
    }

    // Сортируем по дате создания (новые сверху)
    const sortedTimestamps = timestamps.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    this.timestampsList.innerHTML = sortedTimestamps.map(timestamp => `
      <li class="timestamp-item ${timestamp.suffix ? 'urgent' : ''}">
        <div class="timestamp-content">
          <div class="timestamp-time">${timestamp.timestamp}</div>
          ${timestamp.suffix ? `<div class="timestamp-suffix urgent">${timestamp.suffix}</div>` : ''}
        </div>
        <div class="timestamp-actions">
          <button class="delete-button" data-id="${timestamp.id}">Удалить</button>
        </div>
      </li>
    `).join('');

    // Добавляем обработчики для кнопок удаления
    this.timestampsList.querySelectorAll('.delete-button').forEach(button => {
      button.addEventListener('click', async (e) => {
        const id = parseInt((e.target as HTMLButtonElement).dataset.id!);
        try {
          await this.db.deleteTimestamp(id);
          await this.loadTimestamps();
        } catch (error) {
          console.error('Ошибка удаления записи:', error);
          this.showError('Ошибка удаления записи');
        }
      });
    });
  }

  private showError(message: string) {
    // Простое уведомление об ошибке
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background-color: #ff4757;
      color: white;
      padding: 1rem;
      border-radius: 8px;
      z-index: 1000;
    `;
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
      document.body.removeChild(errorDiv);
    }, 3000);
  }
}

// Инициализация приложения
new TimestampTracker();

// Регистрация Service Worker для PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/tracker-timestamps/sw.js');
      console.log('Service Worker зарегистрирован:', registration);
      
      // Проверка обновлений
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Новое обновление доступно
              if (confirm('Доступно обновление приложения. Перезагрузить страницу?')) {
                window.location.reload();
              }
            }
          });
        }
      });
      
    } catch (error) {
      console.error('Ошибка регистрации Service Worker:', error);
    }
  });
  
  // Обработка сообщений от Service Worker
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SW_UPDATE_AVAILABLE') {
      if (confirm('Доступно обновление приложения. Перезагрузить страницу?')) {
        window.location.reload();
      }
    }
  });
}
