import { db } from '../db/offlineDB';

class GpsService {
  private intervalId: number | null = null;
  private isTracking = false;

  // Start tracking if there is an active trip
  startTracking(idOS: string) {
    if (this.isTracking) return;
    this.isTracking = true;

    // Ping immediately
    this.recordLocation(idOS);

    // Then every 2 minutes
    this.intervalId = window.setInterval(() => {
      this.recordLocation(idOS);
    }, 2 * 60 * 1000); // 2 minutes
  }

  stopTracking() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isTracking = false;
  }

  private recordLocation(idOS: string) {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            await db.gpsPings.add({
              idOS,
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              timestamp: new Date().toISOString(),
              synced: false
            });
            console.log('GPS ping recorded offline');
          } catch (e) {
            console.error('Failed to save GPS ping to offlineDB', e);
          }
        },
        (error) => {
          console.error('Error getting location', error);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      console.warn('Geolocation is not supported by this browser.');
    }
  }

  // Called to initialize global tracking monitor
  async initGlobalTracker() {
    // Check periodically or subscribe to db changes to see if we have an active trip
    // Using a simple interval to keep it decoupled from react lifecycle if needed
    setInterval(async () => {
      try {
        const activeTrip = await db.viagens.where('status').equals('em_execucao').first();
        if (activeTrip) {
          if (!this.isTracking) {
            this.startTracking(activeTrip.idOS);
          }
        } else {
          if (this.isTracking) {
            this.stopTracking();
          }
        }
      } catch (e) {
        console.error('Error in global tracker', e);
      }
    }, 15000); // Check every 15 seconds
  }
}

export const gpsService = new GpsService();
