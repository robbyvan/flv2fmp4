class FlvPacket {
  constructor() {
    this.packetType = -1;     // 1B
    this.payloadSize = -1;    // 3B
    this.timestamp = -1;      // 4B = 3B + 1B
    this.stremID = -1;        // 3B

    this.tempArr = [];

    this.payload = -1;
    this.time = -1;
    this.size = -1;
  }
}

export default FlvPacket;
