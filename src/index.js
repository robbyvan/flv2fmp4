import DropBox from './components/dropbox/dropbox';
import './player.js';

const body = document.querySelector('body');
const boxContainer = document.createElement('div');
const dropbox = new DropBox();
boxContainer.appendChild(dropbox.render());
boxContainer.classList.add('box-container');
body.appendChild(boxContainer);
