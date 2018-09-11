import FlvPacket from './flv-packet';
import AmfParser from './flv-amfParser';

class FlvParser {
  constructor() {
    this.tempUint8 = [];  // 接收传入的Uint8Array数据 (按byte)
    this.arrPackets = []; // parse后生成的packets

    this.index = 0;       // 记录读到的位置
    this.tempArr = [];    // 读取时暂存当前byte

    this.setFlv = this.setFlv.bind(this);
    this.parseFlv = this.parseFlv.bind(this);
  }

  /**
   * @params uint8: Uint8
   */
  setFlv(uint8) {
    this.tempUint8 = uint8;
    this.parseFlv();
    console.log(this);
    const meta = this.arrPackets[0];
    const uint8Arr = new Uint8Array(meta.payload);
    const buffer = uint8Arr.buffer;
    console.log('===');
    console.log('buffer is', buffer);
    console.log('===');
    AmfParser.parseMetaData(buffer, 0, meta.payloadSize);
  }

  /**
   * 读取length长度的byte
   */
  read(length) {
    this.tempArr.length = 0;
    for (let i = 0; i < length; ++i) {
      this.tempArr.push(this.tempUint8[this.index]);
      this.index += 1;
    }
    return this.tempArr;
  }

  /**
   * 计算packet大小
   */
  _getPayloadSize(arr) {
    const str = arr.map(num => {
      const b = num.toString(16);
      if (b.length === 1) {
        return `0${b}`;
      }
      return b;
    });
    return parseInt(str.join(''), 16);
  }

  /**
   * 解析flv
   */
  parseFlv() {
    this.read(9); // flv header, 9B, 略过
    this.read(4); // prev packet size, 第一个#0始终0, 略过
    // 按packet读取body
    while (this.index < this.tempUint8.length) {
      const p = new FlvPacket();
      p.packetType = this.read(1).slice(0)[0];
      p.payloadSize = this._getPayloadSize(this.read(3).slice(0));
      p.timestamp = this.read(4).slice(0);
      p.streamID = this.read(3).slice(0);
      p.payload = this.read(p.payloadSize).slice(0);

      this.arrPackets.push(p);
      this.read(4); // 下一个"prev packet size"
    }
  }
}

export default FlvParser;
