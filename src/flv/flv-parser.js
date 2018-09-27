import FlvPacket from './flv-packet';
import AmfParser from './flv-amfParser';
import FlvDemuxer from './flv-demux';

class FlvParser {
  constructor() {
    this.tempUint8 = [];  // 接收传入的Uint8Array数据 (按byte)
    this.arrPackets = []; // parse后生成的packets

    this.index = 0;       // 记录读到的位置
    this.tempArr = [];    // 读取时暂存当前byte

    this._hasAudio = false;
    this._hasVideo = false;

    this.setFlv = this.setFlv.bind(this);
    this.probe = this.probe.bind(this);
    this.parseFlv = this.parseFlv.bind(this);
    
  }

  /**
   * @params uint8: Uint8
   */
  setFlv(uint8) {
    this.tempUint8 = uint8;
    const probeResult = this.probe(uint8);
    console.log(probeResult);
    if (!probeResult.match) {
      console.log('Flv Header is not valid')
      return;
    }

    this.read(9); // flv header, 9B, 略过
    this.read(4); // prev packet size, 第一个#0始终0, 略过

    // 解析flv body
    this.parseFlv();

    console.log(this);
    
    const meta = this.arrPackets[0];
    const uint8Arr = new Uint8Array(meta.payload);
    const buffer = uint8Arr.buffer;
    const dm = new FlvDemuxer();
    // parse onMetaData
    dm.parseMetaData(buffer, 0, meta.payloadSize);
    // AmfParser.parseMetaData(buffer, 0, meta.payloadSize);
  }

  probe(buffer) {
    const data = new Uint8Array(buffer);

    // 头部:
    //    => signature 3B, 0x46 | 0x4c | 0x56
    //    => version 1B, 0x01
    if (data[0] !== 0x46 || data[1] !== 0x4C || data[2] !== 0x56 || data[3] !== 0x01) {
      return {
        match: false,
        msg: 'signature or flv version is wrong'
      };
    }

    // flags: 0000 0音0视
    const hasAudio = ((data[4] & 4) >>> 2) !== 0;
    const hasVideo = (data[4] & 1) !== 0;

    if (!hasAudio && !hasVideo) {
      return {
        match: false,
        msg: 'No audio and video'
      };;
    }

    this._hasAudio = hasAudio;
    this._hasVideo = hasVideo;

    return {
      match: true,
      hasAudio,
      hasVideo
    };
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
    // 按packet读取body
    let offset = 0;

    while (this.index < this.tempUint8.length && !this.stop) {
      offset = this.index;
      
      const p = new FlvPacket();

      if (this.tempUint8.length - this.index >= 11) {
        // 一个header的大小
        p.packetType = this.read(1).slice(0)[0];
        p.payloadSize = this._getPayloadSize(this.read(3).slice(0));
        p.timestamp = this.read(4).slice(0);
        p.streamID = this.read(3).slice(0);
        p.time = FlvPacket.getTime(p.timestamp);
      } else {
        this.stop = true;
        continue;
      }

      if (this.tempUint8.length - this.index >= p.payloadSize) {
        // 获得tag data
        p.payload = this.read(p.payloadSize).slice(0);

        // audio packet
        if (p.packetType === 8 && this._hasAudio) {
          this.arrPackets.push(p);
        }

        // video packet
        if (p.packetType === 9 && this._hasVideo) {
          this.arrPackets.push(p);
        }

        // metadata
        if (p.packetType === 18) {
          if (this.arrPackets.length === 0) {
            this.arrPackets.push(p);
          } else {
            console.log('自定义数据', p);
          }
        }
        p.packetSize = this.read(4).slice(0); // 下一个"prev packet size"
      }
    }
    offset = this.index;

    return offset;
  }
}

export default FlvParser;
