import { authService } from "./auth";

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private listeners: Map<string, ((data: any) => void)[]> = new Map();

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      // Authenticate
      const token = authService.getToken();
      if (token) {
        this.send({ type: 'authenticate', token });
      }
    };

    this.ws.onmessage = (event) => {
      try {
        // Validate that event.data is a string before parsing
        if (typeof event.data !== 'string') {
          console.warn('WebSocket received non-string data:', typeof event.data);
          return;
        }
        
        const data = JSON.parse(event.data);
        
        // Validate message structure
        if (!data || typeof data !== 'object' || !data.type) {
          console.warn('WebSocket received invalid message structure:', data);
          return;
        }
        
        // Sanitize message type to prevent XSS
        const messageType = String(data.type).replace(/[<>]/g, '');
        
        this.notifyListeners(messageType, data);
      } catch (error) {
        console.error('WebSocket message parsing error:', error);
      }
    };

    this.ws.onclose = () => {
      this.scheduleReconnect();
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket connection error:', error);
    };
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  send(data: any) {
    try {
      if (this.ws?.readyState === WebSocket.OPEN) {
        // Validate and sanitize data before sending
        if (!data || typeof data !== 'object') {
          console.warn('Invalid WebSocket data:', data);
          return;
        }
        
        // Create a clean copy of the data with sanitized string values
        const sanitizedData = this.sanitizeWebSocketData(data);
        this.ws.send(JSON.stringify(sanitizedData));
      }
    } catch (error) {
      console.error('WebSocket send error:', error);
    }
  }

  private sanitizeWebSocketData(data: any): any {
    if (typeof data === 'string') {
      return data.replace(/[<>]/g, '').substring(0, 10000);
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeWebSocketData(item));
    }
    
    if (data && typeof data === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        const sanitizedKey = String(key).replace(/[<>]/g, '');
        sanitized[sanitizedKey] = this.sanitizeWebSocketData(value);
      }
      return sanitized;
    }
    
    return data;
  }

  on(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: (data: any) => void) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(callback);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  private notifyListeners(event: string, data: any) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in WebSocket listener for event ${event}:`, error);
        }
      });
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (authService.isAuthenticated()) {
        try {
          this.connect();
        } catch (error) {
          console.error('WebSocket reconnection error:', error);
        }
      }
    }, 3000);
  }
}

export const wsService = new WebSocketService();
