/**
 * Coordinate Converter
 *
 * Converts between GPS coordinates (lat/lon/alt) and local NED (North-East-Down) coordinates
 * Uses flat-earth approximation for short-range drone operations
 *
 * Reference: https://en.wikipedia.org/wiki/North_east_down
 */

const EARTH_RADIUS = 6378137.0 // meters (WGS84 equatorial radius)

/**
 * CoordinateConverter class
 * Maintains a home position reference for local coordinate conversion
 */
export class CoordinateConverter {
  private homeLatitude: number = 0
  private homeLongitude: number = 0
  private homeAltitude: number = 0
  private isHomeSet: boolean = false

  /**
   * Set the home position (reference point for local coordinates)
   */
  setHome(latitude: number, longitude: number, altitude: number): void {
    this.homeLatitude = latitude
    this.homeLongitude = longitude
    this.homeAltitude = altitude
    this.isHomeSet = true
  }

  /**
   * Check if home position is set
   */
  hasHome(): boolean {
    return this.isHomeSet
  }

  /**
   * Get home position
   */
  getHome(): { latitude: number; longitude: number; altitude: number } {
    return {
      latitude: this.homeLatitude,
      longitude: this.homeLongitude,
      altitude: this.homeAltitude,
    }
  }

  /**
   * Convert GPS coordinates (lat/lon/alt) to local NED coordinates (north/east/down)
   *
   * @param latitude - Latitude in degrees
   * @param longitude - Longitude in degrees
   * @param altitude - Altitude in meters (MSL)
   * @returns Local NED coordinates { north, east, down } in meters
   */
  gpsToLocal(
    latitude: number,
    longitude: number,
    altitude: number
  ): { north: number; east: number; down: number } {
    if (!this.isHomeSet) {
      console.warn('[CoordinateConverter] Home position not set, using (0,0,0) as reference')
    }

    // Convert degrees to radians
    const latRad = (latitude * Math.PI) / 180
    const homeLatRad = (this.homeLatitude * Math.PI) / 180
    const lonRad = (longitude * Math.PI) / 180
    const homeLonRad = (this.homeLongitude * Math.PI) / 180

    // Calculate differences
    const dLat = latRad - homeLatRad
    const dLon = lonRad - homeLonRad

    // Flat-earth approximation (valid for short distances < 100km)
    const north = dLat * EARTH_RADIUS
    const east = dLon * EARTH_RADIUS * Math.cos(homeLatRad)
    const down = this.homeAltitude - altitude // NED convention: down is positive

    return { north, east, down }
  }

  /**
   * Convert local NED coordinates to GPS coordinates
   *
   * @param north - North position in meters
   * @param east - East position in meters
   * @param down - Down position in meters (positive down)
   * @returns GPS coordinates { latitude, longitude, altitude }
   */
  localToGPS(
    north: number,
    east: number,
    down: number
  ): { latitude: number; longitude: number; altitude: number } {
    if (!this.isHomeSet) {
      console.warn('[CoordinateConverter] Home position not set, using (0,0,0) as reference')
    }

    // Convert home position to radians
    const homeLatRad = (this.homeLatitude * Math.PI) / 180

    // Calculate latitude and longitude differences
    const dLat = north / EARTH_RADIUS
    const dLon = east / (EARTH_RADIUS * Math.cos(homeLatRad))

    // Convert back to degrees
    const latitude = this.homeLatitude + (dLat * 180) / Math.PI
    const longitude = this.homeLongitude + (dLon * 180) / Math.PI
    const altitude = this.homeAltitude - down // NED convention: down is positive

    return { latitude, longitude, altitude }
  }

  /**
   * Convert MAVLink GLOBAL_POSITION_INT to local coordinates
   * MAVLink uses lat/lon in degrees * 1E7 and altitude in mm
   */
  mavlinkGlobalToLocal(
    lat: number, // degrees * 1E7
    lon: number, // degrees * 1E7
    alt: number, // mm (MSL)
    relativeAlt: number // mm (above ground)
  ): { x: number; y: number; z: number } {
    const { north, east } = this.gpsToLocal(
      lat / 1e7,
      lon / 1e7,
      alt / 1000
    )

    return {
      x: north,
      y: east,
      z: relativeAlt / 1000, // Use relative altitude for z (above ground)
    }
  }

  /**
   * Convert local coordinates to MAVLink GLOBAL_POSITION_INT format
   */
  localToMavlinkGlobal(
    x: number, // meters (north)
    y: number, // meters (east)
    z: number // meters (relative altitude above ground)
  ): { lat: number; lon: number; alt: number; relativeAlt: number } {
    const { latitude, longitude, altitude } = this.localToGPS(x, y, -z)

    return {
      lat: Math.round(latitude * 1e7),
      lon: Math.round(longitude * 1e7),
      alt: Math.round(altitude * 1000),
      relativeAlt: Math.round(z * 1000),
    }
  }

  /**
   * Calculate distance between two GPS coordinates
   * Uses Haversine formula for accurate distance calculation
   */
  gpsDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const lat1Rad = (lat1 * Math.PI) / 180
    const lat2Rad = (lat2 * Math.PI) / 180
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLon = ((lon2 - lon1) * Math.PI) / 180

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1Rad) *
        Math.cos(lat2Rad) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2)

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return EARTH_RADIUS * c
  }

  /**
   * Calculate bearing between two GPS coordinates
   * Returns angle in degrees (0-360, where 0 is North)
   */
  gpsBearing(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const lat1Rad = (lat1 * Math.PI) / 180
    const lat2Rad = (lat2 * Math.PI) / 180
    const dLon = ((lon2 - lon1) * Math.PI) / 180

    const y = Math.sin(dLon) * Math.cos(lat2Rad)
    const x =
      Math.cos(lat1Rad) * Math.sin(lat2Rad) -
      Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon)

    const bearingRad = Math.atan2(y, x)
    const bearingDeg = (bearingRad * 180) / Math.PI

    return (bearingDeg + 360) % 360
  }
}

/**
 * Global singleton instance for coordinate conversion
 */
export const coordinateConverter = new CoordinateConverter()
