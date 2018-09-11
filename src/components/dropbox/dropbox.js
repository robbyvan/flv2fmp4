import './style.scss';

class DropBox {
  constructor() {
    this._processFlv = this._processFlv.bind(this);
    this._handleFileDrop = this._handleFileDrop.bind(this);
    this.render = this.render.bind(this);
  }

  _processFlv(e) {
    const buffer = e.target.result;
    const uint8 = new Uint8Array(buffer);
    console.log(uint8);
  }

  _handleFileDrop(e) {
    e.stopPropagation();
    e.preventDefault();
    console.log('drop!', e.dataTransfer.files[0]);
    const reader = new FileReader();
    reader.addEventListener('load', this._processFlv);
    reader.readAsArrayBuffer(e.dataTransfer.files[0]);
  }

  render() {
    const dropbox = document.createElement('div');
    dropbox.classList.add('drop-box');

    dropbox.innerHTML = '拖拽文件到这里';

    dropbox.addEventListener('dragover', e => {
      e.stopPropagation();
      e.preventDefault();
    });

    dropbox.addEventListener('drop', e => this._handleFileDrop(e));
    return dropbox;
  }
}

export default DropBox;
