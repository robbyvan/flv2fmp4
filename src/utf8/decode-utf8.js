function checkContinuation(uint8Array, start, checkLength) {
  let array = uint8Array;
  // 长度要求
  if (start + checkLength < array.length) {
    while (checkLength > 0) {
      start += 1; // 从开始的下一个byte开始check
      if ((array[start] & 0xC0) !== 0x80) {
        // 连续的后续byte必须是10开头: mask之后等于0x80, 否则是新的data
        return false;
      }
      checkLength -= 1;
    }
    return true;
  }
  // 不符合长度要求
  return false;
}

function decodeUTF8(uint8Array) {
  const out = [];
  const input = uint8Array;
  let i = 0;
  const length = uint8Array.length;

  while (i < length) {
    if (input[i] < 0x80) {
      // 单字节: 0x80 ~ 0x7F
      out.push(String.fromCharCode(input[i]));
      i += 1;
      continue;
    } else if (input[i] < 0xC0) {
      // 0x80 ~ 0xBF, 首字节"10xxxxxx", fallthrough
    } else if (input[i] < 0xE0) {
      // 0xC0 ~ 0xDF, 首字节"110xxxxx"
      // 2字节utf-8, 110mmmmm 10nnnnnn => mmnnnnnn:acii
      if (checkContinuation(input, i, 1)) {
        const ucs4 = (input[i] & 0x1F) << 6 | (input[i + 1] & 0x3F);
        if (ucs4 >= 0x80) {
          out.push(String.fromCharCode(ucs4 && 0xFFFF));
          i += 2;
          continue;
        }
      }
    } else if (input[i] < 0xF0) {
      // 0xE0 ~ 0xEF, 首字节"1110xxxx"
      // 三字节utf-8
      if (checkContinuation(input, i, 2)) {
        const ucs4 = (input[i] & 0x0F) << 12 | (input[i + 1] & 0x3F) << 6 | input[i + 2] & 0x3F;
        console.log('3字节!', ucs4);
        // 基本定义范围：0~FFFF
        if (ucs4 >= 0x800 && (ucs4 & 0xF800) !== 0xD800) {
          out.push(String.fromCharCode(ucs4 & 0xFFFF));
          i += 3;
          continue;
        }
      }
    } else if (input[i] < 0xF8) {
      // 0xF0 ~ 0xF7, 首字节"111110xxx"
      if (checkContinuation(input, i, 3)) {
        let ucs4 = (input[i] & 0x7) << 18 | (input[i + 1] & 0x3F) << 12 | (input[i + 2] & 0x3F) << 6 | (input[i + 3] & 0x3F);

        // Unicode6.1定义范围：0 ~ 10 FFFF
        // 四字节时, 1 0000 ~ 10 FFFF
        if (ucs4 > 0x10000 && ucs4 < 0x110000) {
          ucs4 -= 0x10000;
          out.push(String.fromCharCode((ucs4 >>> 10) | 0xD800));
          out.push(String.fromCharCode((ucs4 & 0x3FF) | 0xDC00));
          i += 4;
          continue;
        }
      }
    }
    out.push(String.fromCharCode(0xFFFD));
    i += 1;
  }
  return out.join('');
}

export default decodeUTF8;
