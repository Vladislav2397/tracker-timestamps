// Интерфейс для записи штампа времени
export interface TimestampRecord {
  id: number;
  timestamp: string;
  suffix: string;
  createdAt: Date;
}

// Класс для работы с IndexedDB
export class TimestampDatabase {
  private dbName = 'TimestampTracker';
  private dbVersion = 1;
  private storeName = 'timestamps';
  private db: IDBDatabase | null = null;

  // Инициализация базы данных
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id', autoIncrement: true });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
    });
  }

  // Добавление нового штампа времени
  async addTimestamp(suffix: string = ''): Promise<TimestampRecord> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const record: Omit<TimestampRecord, 'id'> = {
      timestamp: new Date().toLocaleString('ru-RU'),
      suffix,
      createdAt: new Date()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.add(record);

      request.onsuccess = () => {
        const newRecord: TimestampRecord = {
          id: request.result as number,
          ...record
        };
        resolve(newRecord);
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Получение всех записей
  async getAllTimestamps(): Promise<TimestampRecord[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Удаление записи
  async deleteTimestamp(id: number): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}
