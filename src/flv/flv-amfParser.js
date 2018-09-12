/* eslint-disable */
import decodeUTF8 from '../utf8/decode-utf8';

// check if is little-endian
let le = (function() {
    let buf = new ArrayBuffer(2);
    (new DataView(buf)).setInt16(0, 256, true); // little-endian write
    return (new Int16Array(buf))[0] === 256; // platform-spec read, if equal then LE
})();

class AmfParser {
  static parseString(arrayBuffer, dataOffset, dataSize) {
    if (dataSize < 2) {
      // 至少一个length + payload
      throw new IllegalStateException('Data not enough when parse String');
    }

    const v = new DataView(arrayBuffer, dataOffset, dataSize);
    const length = v.getUint16(0, !le);   // 第2-3字节为UI16类型(2B), 字符串长度

    let str;
    if (length > 0) {
      str = decodeUTF8(new Uint8Array(arrayBuffer, dataOffset + 2, length));
    } else {
      str = '';
    }
    return {
      data: str,
      size: 2 + length // length长 + payload长
    };
  }

  static parseObject(arrayBuffer, dataOffset, dataSize) {
    if (dataSize < 3) {
      // 至少一个UI24(end)
      throw new IllegalStateException('Data not enough when parse ScriptDataObject');
    }
    const name = AmfParser.parseString(arrayBuffer, dataOffset, dataSize);
    // console.log('key?', name);
    const value = AmfParser.parseScript(arrayBuffer, dataOffset + name.size, dataSize - name.size);
    // console.log('value?', value);
    const isObjectEnd = value.objectEnd;

    return {
      data: {
        name: name.data,
        value: value.data,
      },
      size: name.size + value.size,
      objectEnd: isObjectEnd
    };
  }

  static parseVariable(arrayBuffer, dataOffset, dataSize) {
    return AmfParser.parseObject(arrayBuffer, dataOffset, dataSize);
  }

  static parseDate(arrayBuffer, dataOffset, dataSize) {
    if (dataSize < 10) {
      throw new IllegalStateException('Data size invalid when parse Date');
    }

    const v = new DataView(arrayBuffer, dataOffset, dataSize);
    let timestamp = v.getFloat64(0, !le); // DateTime: DOUBLE
    const localDateTimeOffset = v.getInt16(8, !le); // LocalDateTimeOffset: SI16
    
    // get UTC time
    timestamp += localDateTimeOffset * 60 * 1000; 

    return {
      data: new Date(timestamp),
      size: 8 + 2
    };
  }


  // parse MetaData
  static parseMetaData(arrayBuffer, dataOffset, dataSize) {
    let data = {};
    try {
      const name = AmfParser.parseScript(arrayBuffer, dataOffset, dataSize);
      // console.log('parse name', name);
      const value = AmfParser.parseScript(arrayBuffer, dataOffset + name.size, dataSize - name.size);
      // console.log('parse value', value);
      
      data[name.data] = value.data;
      // 最终parse出来的metaData
      console.log(data);
    } catch(e) {
      console.log('AmfParser Error: ', e);
    }
  }

  static parseScript(arrayBuffer, dataOffset, dataSize) {
    if (dataSize < 1) {
      throw new IllegalStateException('Data not enough when parse Value');
    }

    const dv = new DataView(arrayBuffer, dataOffset, dataSize);   // 对底层的 arrayBuffer 进行读取

    let value;
    let objectEnd = false;

    const type = dv.getUint8(0); // 第一个byte表示AMFpacket的类型, (8位没有LE/BE概念)

    // console.log('type is :', type, "dataOffset is ", dataOffset);

    let offset = 1; // 读取了类型:UI8, 一个byte

    /** AMF(action message format) packet 类型
    * 0 = Number 
    * 1 = Boolean 
    * 2 = String 
    * 3 = Object 
    * 4 = MovieClip (reserved, not supported) 
    * 5 = Null 
    * 6 = Undefined 
    * 7 = Reference 
    * 8 = ECMA array 
    * 9 = Object end marker 
    * 10 = Strict array 
    * 11 = Date 
    * 12 = Long string
    */
    try {
      switch (type) {
        case 0: {
          // 0 - Number: DOUBLE
          value = dv.getFloat64(offset, !le);
          offset += 8;
          break;
        }

        case 1: {
          // 1 - Boolean: UI8, 1B
          const b = dv.getUint8(1);
          value = b ? true : false;
          offset += 1;
          break;
        }

        case 2: {
          // 2 - String: SCRIPTDATASTRING: { UI16 + STRING }
          const amfStr = AmfParser.parseString(arrayBuffer, dataOffset + offset, dataSize - 1);
          value = amfStr.data;
          offset += amfStr.size;
          break;
        }

        case 3: {
          // 3 - Object: SCRIPTDATAOBJECT[N]
          // SCRIPTDATAOBJECT = { ObjectName: SCRIPTDATASTRING + ObjectData: SCRIPTDATAVALUE(UI8 + payload) }
          //    => SCRIPTDATASTRING : { UI16 + payload }
          //    => SCRIPTDATAVALUE
          // SCRIPTDATAOBJECTEND: UI24, 值永为9, SCRIPTDATAOBJECT records are terminated by using the SCRIPTDATAOBJECTEND tag.
          value = {};

          let terminal = 0; // workaround for malformed Objects which has missing ScriptDataObjectEnd
          // 检查最后的 SCRIPTDATAOBJECTEND, ScriptDataObjectEnd(UI24)
          if ((dv.getUint32(dataSize - 4, !le) & 0x00FFFFFF) === 9) {
            terminal = 3;
          }

          while (offset < dataSize - 4) {
            // why 4? 4 === type(UI8) + ScriptDataObjectEnd(UI24)
            const amfObj = AmfParser.parseObject(arrayBuffer, dataOffset + offset, dataSize - offset - terminal);

            if (amfObj.objectEnd) {
              break;
            }

            value[amfObj.data.name] = amfObj.data.value;
            dataOffset += amfObj.size;
          }

          if (offset <= dataSize - 3) {
            // why not dataSize - 4?
            const marker = dv.getUint32(offset - 1, !le) & 0x00FFFFFF;
            if (marker === 9) {
              offset += 3;
              objectEnd = true;
            }
          }
          break;
        }

        case 8: {
          // ECMA array type: SCRIPTDATAVARIABLE[EC] { VariableName: SCRIPTDATASTRING, VariableData: SCRIPTDATAVALUE }
          //  => SCRIPTDATASTRING : { UI16 + payload }
          //  => SCRIPTDATAVALUE
          // SCRIPTDATAVARIABLEEND: UI24, 值永为9, SCRIPTDATAVARIABLE records are terminated by using the SCRIPTDATAVARIABLEEND tag.
          value = {}

          offset += 4; // If Type = 8, ECMAArrayLength: UI32
          let terminal = 0;
          if ((dv.getUint32(dataSize - 4, !le) & 0x00FFFFFF) === 9) {
            terminal = 3;
          }

          while (offset < dataSize - 8) {
            // why 8? 8 === type(UI8) + ECMAArrayLength(UI32) + ScriptDataVariableEnd(UI24)
            const amfVar = AmfParser.parseVariable(arrayBuffer, dataOffset + offset, dataSize - offset - terminal);
            
            if (amfVar.objectEnd) {
              break;
            }
            value[amfVar.data.name] = amfVar.data.value;
            offset += amfVar.size;
          }

          if (offset <= dataSize - 3) {
              // why not dataSize - 4?
              const marker = dv.getUint32(offset - 1, !le) & 0x00FFFFFF;
              if (marker === 9) {
                offset += 3;
                objectEnd = true;
              }
            }

          break;
        }

        case 9: {
          // 9 - ScriptDataObjectEnd
          value = undefined;
          offset = 1;
          objectEnd = true;
          break;
        }

        case 10: {
          /** 
           * 10 - Strict array type: SCRIPTDATAVARIABLE[n]
           * If Type = 10 (strict array type),
           * the array begins with a UI32 type and contains that exact number of items
           */
          value = [];
          const stricArrayLength = dv.getUint32(1, !le);
          offset += 4; // UI32, number of items in array
          for (let i = 0; i < stricArrayLength; ++i) {
            let val = AmfParser.parseScript(arrayBuffer, dataOffset + offset, dataSize - offset);
            value.push(val.data);
            offset += val.size;
          }

          break;
        }

        case 11: {
          // 11 - Date type: SCRIPTDATADATE = { DateTime: DOUBLE +  LocalDateTimeOffset: SI16 }
          const date = AmfParser.parseDate(parseString, dataOffset + 1, dataSize - 1);
          value = date.data;
          dataOffset += date.size;

          break;
        }

        case 12: {
          // 12 -  Long string type: SCRIPTDATALONGSTRING = { StringLength: UI32, StringData: STRING }
          const amfLongStr = AmfParser.parseString(arrayBuffer, dataOffset + 1, dataSize - 1);
          value = amfLongStr.data;
          offset += amfLongStr.size;

          break;
        }

        default:
          // 不存在的类型, ignore and skip
          dataOffset = dataSize;
          console.log('AMF', 'Unsupported AMF value type: ', type);
      }
    } catch(e) {
       console.log('AmfParser Error:', e.toString());
    }
    return {
      data: value,
      size: offset,
      objectEnd: objectEnd
    };
  }

}

export default AmfParser;