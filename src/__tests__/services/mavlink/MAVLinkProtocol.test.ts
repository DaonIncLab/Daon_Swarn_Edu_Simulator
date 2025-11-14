/**
 * MAVLink Protocol Unit Tests
 *
 * Tests packet creation, parsing, serialization, and helper functions
 */

import {
  MAVLINK_V2_MAGIC,
  MAV_MSG_ID,
  CRC_EXTRA,
  createMAVLinkPacket,
  serializePacket,
  parsePacket,
  parsePacketSafe,
  crcCalculate,
  packUint8,
  packUint16,
  packInt16,
  packUint32,
  packInt32,
  packFloat,
  unpackUint8,
  unpackUint16,
  unpackInt16,
  unpackUint32,
  unpackInt32,
  unpackFloat,
} from '@/services/mavlink/MAVLinkProtocol'
import { MAVLinkProtocolError, MAVLinkCRCError } from '@/services/mavlink/MAVLinkError'

describe('MAVLink Protocol - Pack/Unpack Functions', () => {
  describe('uint8', () => {
    test('packs and unpacks correctly', () => {
      const value = 42
      const packed = packUint8(value)
      expect(packed).toEqual(new Uint8Array([42]))
      expect(unpackUint8(packed, 0)).toBe(42)
    })

    test('handles 0', () => {
      const packed = packUint8(0)
      expect(unpackUint8(packed, 0)).toBe(0)
    })

    test('handles max value (255)', () => {
      const packed = packUint8(255)
      expect(unpackUint8(packed, 0)).toBe(255)
    })
  })

  describe('uint16', () => {
    test('packs and unpacks correctly (little-endian)', () => {
      const value = 0x1234
      const packed = packUint16(value)
      expect(packed).toEqual(new Uint8Array([0x34, 0x12]))
      expect(unpackUint16(packed, 0)).toBe(0x1234)
    })

    test('handles max value (65535)', () => {
      const value = 65535
      const packed = packUint16(value)
      expect(unpackUint16(packed, 0)).toBe(65535)
    })
  })

  describe('int16 (signed)', () => {
    test('packs and unpacks positive values', () => {
      const value = 1000
      const packed = packInt16(value)
      expect(unpackInt16(packed, 0)).toBe(1000)
    })

    test('packs and unpacks negative values correctly', () => {
      const value = -500
      const packed = packInt16(value)
      expect(unpackInt16(packed, 0)).toBe(-500)
    })

    test('handles min value (-32768)', () => {
      const value = -32768
      const packed = packInt16(value)
      expect(unpackInt16(packed, 0)).toBe(-32768)
    })

    test('handles max value (32767)', () => {
      const value = 32767
      const packed = packInt16(value)
      expect(unpackInt16(packed, 0)).toBe(32767)
    })

    test('clamps values outside range', () => {
      const tooBig = 40000
      const tooSmall = -40000
      expect(unpackInt16(packInt16(tooBig), 0)).toBe(32767)
      expect(unpackInt16(packInt16(tooSmall), 0)).toBe(-32768)
    })

    test('handles velocity use case: -5 m/s → -500 cm/s', () => {
      const velocityMs = -5
      const velocityCms = velocityMs * 100 // -500
      const packed = packInt16(velocityCms)
      const unpacked = unpackInt16(packed, 0)
      expect(unpacked).toBe(-500)
      expect(unpacked / 100).toBe(-5)
    })
  })

  describe('uint32', () => {
    test('packs and unpacks correctly', () => {
      const value = 0x12345678
      const packed = packUint32(value)
      expect(packed).toEqual(new Uint8Array([0x78, 0x56, 0x34, 0x12]))
      expect(unpackUint32(packed, 0)).toBe(0x12345678)
    })

    test('handles max value', () => {
      const value = 0xFFFFFFFF
      const packed = packUint32(value)
      expect(unpackUint32(packed, 0)).toBe(0xFFFFFFFF)
    })
  })

  describe('int32', () => {
    test('packs and unpacks correctly', () => {
      const value = -123456
      const packed = packInt32(value)
      expect(unpackInt32(packed, 0)).toBe(-123456)
    })

    test('handles GPS coordinates: lat/lon * 1E7', () => {
      const lat = 37.7749 // San Francisco
      const latInt = Math.round(lat * 1e7) // 377749000
      const packed = packInt32(latInt)
      const unpacked = unpackInt32(packed, 0)
      expect(unpacked).toBe(latInt)
      expect(unpacked / 1e7).toBeCloseTo(lat, 6)
    })
  })

  describe('float', () => {
    test('packs and unpacks correctly', () => {
      const value = 3.14159
      const packed = packFloat(value)
      const unpacked = unpackFloat(packed, 0)
      expect(unpacked).toBeCloseTo(value, 5)
    })

    test('handles negative values', () => {
      const value = -123.456
      const packed = packFloat(value)
      expect(unpackFloat(packed, 0)).toBeCloseTo(value, 3)
    })
  })
})

describe('MAVLink Protocol - CRC Calculation', () => {
  test('calculates CRC correctly', () => {
    const data = new Uint8Array([1, 2, 3, 4, 5])
    const crc = crcCalculate(data)
    expect(crc).toBeGreaterThan(0)
    expect(crc).toBeLessThan(0x10000)
  })

  test('different data produces different CRC', () => {
    const data1 = new Uint8Array([1, 2, 3])
    const data2 = new Uint8Array([1, 2, 4])
    const crc1 = crcCalculate(data1)
    const crc2 = crcCalculate(data2)
    expect(crc1).not.toBe(crc2)
  })

  test('CRC_EXTRA exists for common messages', () => {
    expect(CRC_EXTRA[MAV_MSG_ID.HEARTBEAT]).toBeDefined()
    expect(CRC_EXTRA[MAV_MSG_ID.SYS_STATUS]).toBeDefined()
    expect(CRC_EXTRA[MAV_MSG_ID.GLOBAL_POSITION_INT]).toBeDefined()
    expect(CRC_EXTRA[MAV_MSG_ID.COMMAND_LONG]).toBeDefined()
    expect(CRC_EXTRA[MAV_MSG_ID.COMMAND_ACK]).toBeDefined()
  })
})

describe('MAVLink Protocol - Packet Creation', () => {
  test('creates valid packet structure', () => {
    const payload = new Uint8Array([1, 2, 3, 4, 5])
    const packet = createMAVLinkPacket(MAV_MSG_ID.HEARTBEAT, payload, 1, 1, 42)

    expect(packet.magic).toBe(MAVLINK_V2_MAGIC)
    expect(packet.len).toBe(5)
    expect(packet.sysid).toBe(1)
    expect(packet.compid).toBe(1)
    expect(packet.seq).toBe(42)
    expect(packet.msgid).toBe(MAV_MSG_ID.HEARTBEAT)
    expect(packet.payload).toEqual(payload)
    expect(packet.checksum).toBeGreaterThan(0)
  })

  test('handles empty payload', () => {
    const payload = new Uint8Array([])
    const packet = createMAVLinkPacket(MAV_MSG_ID.HEARTBEAT, payload)
    expect(packet.len).toBe(0)
    expect(packet.payload.length).toBe(0)
  })

  test('uses default system/component IDs', () => {
    const payload = new Uint8Array([1, 2, 3])
    const packet = createMAVLinkPacket(MAV_MSG_ID.HEARTBEAT, payload)
    expect(packet.sysid).toBe(1)
    expect(packet.compid).toBe(1)
  })

  test('wraps sequence number at 255', () => {
    const payload = new Uint8Array([1])
    const packet = createMAVLinkPacket(MAV_MSG_ID.HEARTBEAT, payload, 1, 1, 300)
    expect(packet.seq).toBe(300 & 0xFF) // Should be 44
  })
})

describe('MAVLink Protocol - Packet Serialization', () => {
  test('serializes packet to correct format', () => {
    const payload = new Uint8Array([0xAA, 0xBB])
    const packet = createMAVLinkPacket(MAV_MSG_ID.HEARTBEAT, payload, 1, 1, 10)
    const serialized = serializePacket(packet)

    // Header (10 bytes) + payload (2 bytes) + checksum (2 bytes) = 14 bytes
    expect(serialized.length).toBe(14)

    // Check header
    expect(serialized[0]).toBe(MAVLINK_V2_MAGIC) // magic
    expect(serialized[1]).toBe(2) // length
    expect(serialized[4]).toBe(10) // sequence
    expect(serialized[5]).toBe(1) // sysid
    expect(serialized[6]).toBe(1) // compid

    // Check payload
    expect(serialized[10]).toBe(0xAA)
    expect(serialized[11]).toBe(0xBB)

    // Check checksum exists
    expect(serialized[12]).toBeDefined()
    expect(serialized[13]).toBeDefined()
  })

  test('round-trip: serialize → parse returns same packet', () => {
    const originalPayload = new Uint8Array([1, 2, 3, 4, 5])
    const originalPacket = createMAVLinkPacket(MAV_MSG_ID.HEARTBEAT, originalPayload, 2, 3, 15)

    const serialized = serializePacket(originalPacket)
    const parsed = parsePacket(serialized)

    expect(parsed).not.toBeNull()
    expect(parsed!.magic).toBe(originalPacket.magic)
    expect(parsed!.len).toBe(originalPacket.len)
    expect(parsed!.sysid).toBe(originalPacket.sysid)
    expect(parsed!.compid).toBe(originalPacket.compid)
    expect(parsed!.seq).toBe(originalPacket.seq)
    expect(parsed!.msgid).toBe(originalPacket.msgid)
    expect(parsed!.payload).toEqual(originalPacket.payload)
    expect(parsed!.checksum).toBe(originalPacket.checksum)
  })
})

describe('MAVLink Protocol - Packet Parsing', () => {
  test('parses valid packet successfully', () => {
    const payload = new Uint8Array([10, 20, 30])
    const packet = createMAVLinkPacket(MAV_MSG_ID.HEARTBEAT, payload, 5, 6, 100)
    const serialized = serializePacket(packet)

    const parsed = parsePacket(serialized)
    expect(parsed).not.toBeNull()
    expect(parsed!.msgid).toBe(MAV_MSG_ID.HEARTBEAT)
    expect(parsed!.sysid).toBe(5)
    expect(parsed!.compid).toBe(6)
  })

  test('throws error for buffer too short', () => {
    const shortBuffer = new Uint8Array([0xFD, 0x05])
    expect(() => parsePacket(shortBuffer)).toThrow(MAVLinkProtocolError)
    expect(() => parsePacket(shortBuffer)).toThrow('Buffer too short')
  })

  test('throws error for invalid magic byte', () => {
    const invalidBuffer = new Uint8Array(20)
    invalidBuffer[0] = 0xFF // Wrong magic
    expect(() => parsePacket(invalidBuffer)).toThrow(MAVLinkProtocolError)
    expect(() => parsePacket(invalidBuffer)).toThrow('Invalid MAVLink v2 magic byte')
  })

  test('throws error for incomplete packet', () => {
    const incompleteBuffer = new Uint8Array([
      MAVLINK_V2_MAGIC,
      10, // len = 10, but buffer is too short
      0, 0, 0, 0, 0, 0, 0, 0,
    ])
    expect(() => parsePacket(incompleteBuffer)).toThrow(MAVLinkProtocolError)
    expect(() => parsePacket(incompleteBuffer)).toThrow('Incomplete packet')
  })

  test('validates CRC by default', () => {
    const payload = new Uint8Array([1, 2, 3])
    const packet = createMAVLinkPacket(MAV_MSG_ID.HEARTBEAT, payload)
    const serialized = serializePacket(packet)

    // Corrupt the checksum
    serialized[serialized.length - 1] ^= 0xFF

    expect(() => parsePacket(serialized)).toThrow(MAVLinkCRCError)
  })

  test('skips CRC validation when disabled', () => {
    const payload = new Uint8Array([1, 2, 3])
    const packet = createMAVLinkPacket(MAV_MSG_ID.HEARTBEAT, payload)
    const serialized = serializePacket(packet)

    // Corrupt the checksum
    serialized[serialized.length - 1] ^= 0xFF

    const parsed = parsePacket(serialized, false) // validateCrc = false
    expect(parsed).not.toBeNull()
    expect(parsed!.msgid).toBe(MAV_MSG_ID.HEARTBEAT)
  })

  test('parsePacketSafe returns null on error', () => {
    const invalidBuffer = new Uint8Array([1, 2, 3])
    const result = parsePacketSafe(invalidBuffer)
    expect(result).toBeNull()
  })
})

describe('MAVLink Protocol - Message ID Constants', () => {
  test('common message IDs are defined', () => {
    expect(MAV_MSG_ID.HEARTBEAT).toBe(0)
    expect(MAV_MSG_ID.SYS_STATUS).toBe(1)
    expect(MAV_MSG_ID.GLOBAL_POSITION_INT).toBe(33)
    expect(MAV_MSG_ID.COMMAND_LONG).toBe(76)
    expect(MAV_MSG_ID.COMMAND_ACK).toBe(77)
  })

  test('navigation message IDs', () => {
    expect(MAV_MSG_ID.LOCAL_POSITION_NED).toBe(32)
    expect(MAV_MSG_ID.ATTITUDE).toBe(30)
    expect(MAV_MSG_ID.VFR_HUD).toBe(74)
  })
})

describe('MAVLink Protocol - Real-world Scenarios', () => {
  test('handles GLOBAL_POSITION_INT with negative velocity', () => {
    // Simulate drone descending at -5 m/s
    const payload = new Uint8Array(28)
    const vz = -5 // m/s
    const vzCms = Math.round(vz * 100) // -500 cm/s

    // Pack vz at offset 24 (int16)
    const packed = packInt16(vzCms)
    payload[24] = packed[0]
    payload[25] = packed[1]

    // Unpack and verify
    const unpacked = unpackInt16(payload, 24)
    expect(unpacked).toBe(-500)
    expect(unpacked / 100).toBe(-5)
  })

  test('handles GPS coordinates for San Francisco', () => {
    const lat = 37.7749
    const lon = -122.4194
    const alt = 100 // meters

    const latInt = Math.round(lat * 1e7)
    const lonInt = Math.round(lon * 1e7)
    const altMm = Math.round(alt * 1000)

    const latPacked = packInt32(latInt)
    const lonPacked = packInt32(lonInt)
    const altPacked = packInt32(altMm)

    expect(unpackInt32(latPacked, 0)).toBe(latInt)
    expect(unpackInt32(lonPacked, 0)).toBe(lonInt)
    expect(unpackInt32(altPacked, 0)).toBe(altMm)

    // Verify conversion back to degrees
    expect(unpackInt32(latPacked, 0) / 1e7).toBeCloseTo(lat, 6)
    expect(unpackInt32(lonPacked, 0) / 1e7).toBeCloseTo(lon, 6)
    expect(unpackInt32(altPacked, 0) / 1000).toBe(alt)
  })

  test('handles multiple packets with sequence numbers', () => {
    const packets = []
    for (let i = 0; i < 300; i++) {
      const payload = new Uint8Array([i & 0xFF])
      const packet = createMAVLinkPacket(MAV_MSG_ID.HEARTBEAT, payload, 1, 1, i)
      packets.push(packet)

      // Verify sequence wraps at 255
      if (i < 256) {
        expect(packet.seq).toBe(i)
      } else {
        expect(packet.seq).toBe(i & 0xFF)
      }
    }

    expect(packets.length).toBe(300)
    expect(packets[255].seq).toBe(255)
    expect(packets[256].seq).toBe(0)
    expect(packets[257].seq).toBe(1)
  })
})
