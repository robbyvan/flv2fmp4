class FlvPacket {
  constructor() {
    this.packetType = -1;     // 1B
    this.payloadSize = -1;    // 3B
    this.timestamp = -1;      // 4B = 3B + 1B
    this.stremID = -1;        // 3B

    this.packetSize = -1;     // 4B

    this.payload = -1;

    this.time = -1;
  }

  static getTime(ts) {
    let arr = ts.map(item => {
      const str = item.toString(16);
      return str.length === 1
        ? `0${item}`
        : str;
    });
    // pop ext
    arr.pop();
    const time = parseInt(arr.join(''), 16);
    return time;
  }
}

export default FlvPacket;
