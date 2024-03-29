let draggingIx;
let draggingOffset;
let noteImgs = [];
let playButton;
let randomButton;
let helpButton;
let saveButton;

let backgroundImg;

let slider;

let lastEvent;
let tapNote;

function preload() {
  if (typeof config.backgroundImage !== "undefined") { 
    backgroundImg = loadImage('img/' + config.backgroundImage)
  }

  imgRefs = config.voices.map( (voice) => { return loadImage('img/' + voice.image) } );

  prevImg = loadImage('img/previous_sound.png');
  nextImg = loadImage('img/next_sound.png');

  // prevGroupImg = loadImage('img/previous_group.png');
  // nextGroupImg = loadImage('img/next_group.png');

  playImg = loadImage('img/play.png');
  stopImg = loadImage('img/stop.png');
  randomImg = loadImage('img/random.png');
  helpImg = loadImage('img/help.png');
  saveImg = loadImage('img/save.png');

  // fasterImg = loadImage('img/faster.png');
  // slowerImg = loadImage('img/slower.png');

  indicatorImg = loadImage('img/play_bar_indicator.png');
}

function setup() {
    createCanvas(1920, 1080);
    
    menuWidth = 570;
    sequenceWidth = 1920 - menuWidth - 16;

    sequenceHeight = 869 - 229 - 16;

    partDuration = 2 * 4 * 4;

    url = new URL(window.location.href);
    shouldLoadURL = url.searchParams.has('v0')

    let notes;
    if (shouldLoadURL) {
      playbackRate = decodePlaybackRate() ?? config.defaultPlaybackRate;
      nextPlaybackRate = playbackRate;
      notes = decodeURL();
    } else {
      nextPlaybackRate = playbackRate;
      notes = randomNotes();
    }

    createNoteImgs(notes);
    createPart(notes);

    let top = 904;
    randomButton = new Button(randomImg, 40, 9 + top);
    playButton = new Button(playImg, 188, top, stopImg);
    saveButton = new Button(saveImg, 354, 9 + top);

    // prevGroupButton = new Button(prevGroupImg, 893, 948);
    // nextGroupButton = new Button(nextGroupImg, 1447, 948);

    // slider = new HScrollbar(100, 1029-8, 294, 16, 16, 0.1, 4.0, playbackRate);

    helpButton = new Button(helpImg, 1772, 913);
}

function createNoteImgs(notes) {
  noteImgs = []
  notes.forEach(function (note) {
    let left = sequenceWidth * note.time / config.duration + menuWidth + 8;
    let top;
    if (Object.hasOwn(config.voices[note.voiceIndex], 'y')) {
      top = config.voices[note.voiceIndex].y;
    } else {
      top = (1 - note.velocity) * sequenceHeight + 8;
    }
    
    let img = imgRefs[note.voiceIndex];
    let newNote = new Note(img,left,top,note);
    note.noteImg = newNote;
    noteImgs.push(newNote)
  });
}

function draw() {
  background(backgroundImg ?? config.backgroundColor ?? 'gray');

  noStroke();

  playButton.selected = Tone.Transport.seconds > 0.001;
  playButton.display();

  randomButton.display();
  helpButton.display();
  saveButton.display();

  // prevGroupButton.display();
  // nextGroupButton.display();

  // image(slowerImg, 11, 966);
  // image(fasterImg, 397, 971);

  noteImgs.forEach( (note) => { note.display(); })

  let progressX = sequenceWidth * progress() - indicatorImg.width / 2;
  image(indicatorImg, menuWidth + 8 + progressX, 0);

  // slider.update();
  // slider.display();
}



function mousePressed() {
  lastEvent = millis();
  if ( playButton.inBounds(mouseX, mouseY) ) {
    updatePart();
    play();
    return;
  }

  if ( randomButton.inBounds(mouseX, mouseY) ) {
    let notes = randomNotes();
    createPart(notes);
    createNoteImgs(notes);
    forcePlay();
    return;
  }

  if ( helpButton.inBounds(mouseX, mouseY) ) {
    modalTinyNoFooter.setContent('<img id="help" src="img/help_modal.png">');
    modalTinyNoFooter.open();
    return;
  }

  if ( saveButton.inBounds(mouseX, mouseY) ) {
    let url = encodeURL();
    document.getElementById('link').innerHTML = url;
    modalTinyNoFooter.setContent(document.querySelector('.modal-content').innerHTML);
    // modalTinyNoFooter.setContent(`<h2>Copy this link to share your creation:</h2><p>${url}</p>`);
    modalTinyNoFooter.open();
    return;
  }

  // if ( nextGroupButton.inBounds(mouseX, mouseY) ) {
  //   for (let i = 0; i < 3; i++) {
  //     noteImgs[i].noteValue.nextNoteIndex();
  //   }
  //   return;
  // }

  // if ( prevGroupButton.inBounds(mouseX, mouseY) ) {
  //   for (let i = 0; i < 3; i++) {
  //     noteImgs[i].noteValue.previousNoteIndex();
  //   }
  //   return;
  // }

  for (let i = noteImgs.length - 1; i >= 0; i--) {
    // if ( noteImgs[i].noteValue.fixed == true ) {
    //   if ( noteImgs[i].inBounds(mouseX, mouseY) ) {
    //     noteImgs[i].noteValue.muted = !noteImgs[i].noteValue.muted;
    //     break;
    //   }
    //   continue;
    // }
    if ( noteImgs[i].inPreviousHover(mouseX, mouseY) ) {
      noteImgs[i].noteValue.previousNoteIndex();
      break;
    }
    if ( noteImgs[i].inNextHover(mouseX, mouseY) ) {
      noteImgs[i].noteValue.nextNoteIndex();
      break;
    }
    if ( noteImgs[i].noteValue.fixed == true ) {
      if ( noteImgs[i].inBounds(mouseX, mouseY) ) {
        noteImgs[i].noteValue.muted = !noteImgs[i].noteValue.muted;
        break;
      }
      continue;
    }
    if ( noteImgs[i].inBounds(mouseX, mouseY) ) {
      tapNote = noteImgs[i].noteValue;
      let relativePos = createVector(mouseX - noteImgs[i].x, mouseY - noteImgs[i].y);
      draggingIx = i;
      draggingOffset = relativePos;
      break;
    }
  }
}

function updatePart() {
  let notes = noteImgs.map((note) => note.noteValue ) 
  createPart(notes);
}

function play() {
  if (playButton.selected) {
    stop();
    return;
  }
  
  forcePlay();
}

function forcePlay() {
  playbackRate = nextPlaybackRate;
  playPart();
}

function mouseMoved() {

  if (draggingIx >= 0) {
    noteImgs.forEach((noteImg, index) => noteImg.hover = false);
    return;
  }

  let hoverIndex = -1;
  for (let i = noteImgs.length - 1; i >= 0; i--) {
    if ( noteImgs[i].inBounds(mouseX, mouseY) ) {
      hoverIndex = i;
      break;
    }
  }
  noteImgs.forEach((element, index, arr) => arr[index].hover = index == hoverIndex);
}

function mouseReleased() {
  let elapsed = millis() - lastEvent;
  if (elapsed < config.tapDelay) {
    tapNote?.previewSound();
  }
  tapNote = undefined;
  updatePart();
  // nextPlaybackRate = slider.getValue();
  draggingIx = draggingOffset = undefined;
}

function mouseDragged() {
  if (draggingIx >= 0) {
    noteImgs[draggingIx].x = mouseX - draggingOffset.x;
    noteImgs[draggingIx].y = mouseY - draggingOffset.y;
    noteImgs[draggingIx].updateValue();
  }
}

class Note {
  constructor(img, x, y, noteValue) {
    this.x = x;
    this.y = y;
    this.img = img;
    this.noteValue = noteValue;
    this.hover = false;
  }

  display() {
    if ( this.noteValue.muted == true ){
      tint(255, 180);
    } else {
      noTint();
    }
    image(this.img, this.x, this.y);
    // if (this.noteValue.fixed == false && this.hover) {
    if (this.hover) {
      image(prevImg, this.x, this.y + this.img.height - prevImg.height);
      image(nextImg, this.x + this.img.width - prevImg.width, this.y + this.img.height - prevImg.height);
      //displayTextNote.bind(this)()
    }
  }

  displayTextNote() {
    fill('white');
    textSize(32);
    let noteIndex = 'Chunk!';
    let width = textWidth(noteIndex);
    let height = 32;
    text(noteIndex, this.x, this.y + this.img.height);
  }

  bounce() {
    let bounceTween = p5.tween.manager.addTween(this)
      .addMotion('y', this.y + 20, 50, 'easeInQuad')
      .addMotion('y', this.y - 10, 50, 'easeInQuad')
      .addMotion('y', this.y, 50, 'easeOutQuad');
    bounceTween.startTween();
  }

  updateValue() {
    if (this.noteValue.fixed == false) {
      this.noteValue.time = ( this.x - (menuWidth + 8) ) / sequenceWidth * config.duration;
      this.noteValue.velocity = (1 - (this.y - 8) / sequenceHeight);
    }
  }

  maxX() {
    return this.x + this.img.width;
  }

  maxY() {
    return this.y + this.img.height;
  }

  inPreviousHover(x, y) {
    // if (this.noteValue.fixed == true) {
    //   return false;
    // }
    return ( 
      between(x, this.x, this.x + prevImg.width) && 
      between(y, this.y + this.img.height - prevImg.height, this.y + this.img.height) 
    );
  }

  inNextHover(x, y) {
    // if (this.noteValue.fixed == true) {
    //   return false;
    // }
    return ( 
      between(x, this.x + this.img.width - nextImg.width, this.x + this.img.width) && 
      between(y, this.y + this.img.height - prevImg.height, this.y + this.img.height) 
    );
  }

  inBounds(x, y) {
    return ( between(x, this.x, this.maxX()) && between(y, this.y, this.maxY()) );
  }
}

class Button {
  constructor(img, x, y, selectedImg) {
    this.x = x;
    this.y = y;
    this.img = img;
    this.selectedImg = selectedImg ?? img;
    this.selected = false;
  }

  maxX() {
    return this.x + this.img.width;
  }

  maxY() {
    return this.y + this.img.height;
  }

  inBounds(x, y) {
    return ( between(x, this.x, this.maxX()) && between(y, this.y, this.maxY()) );
  }

  display() {
    let stateImage = this.selected ? this.selectedImg : this.img;
    image(stateImage, this.x, this.y);
  }
}

function between(x, min, max) {
  return x >= min && x <= max;
}

function decodePlaybackRate() {
  urlParams = new URLSearchParams(window.location.search);
  let newRate = parseFloat(urlParams.get("r"));
  return isNaN(newRate) ? null : newRate;
}

function decodeURL() {
  urlParams = new URLSearchParams(window.location.search);
  let notes = [];
  for (var i = 0; i < config.voiceCount; i++) {
    let v = parseInt(urlParams.get("v" + i))
    let n = parseInt(urlParams.get("n" + i))
    let a = parseFloat(urlParams.get("a" + i))
    let t = parseFloat(urlParams.get("t" + i))
    let m = !!parseInt(urlParams.get("m" + i));
    
    let f = i <= 2;

    let note = new NoteValue(t, a, v, n, f, m)
    notes.push(note);
  }

  return notes;
}

function encodeURL() {
  let params = {r: nextPlaybackRate};
  noteImgs.forEach( (noteImg, index) => {
    let noteValue = noteImg.noteValue;
    params['v' + index] = noteValue.voiceIndex;
    params['n' + index] = noteValue.noteIndex;
    params['a' + index] = noteValue.velocity.toFixed(2);;
    params['t' + index] = noteValue.time.toFixed(2);;
    params['m' + index] = noteValue.muted ? 1 : 0;
  });
  const searchParrams = new URLSearchParams(params);
  const new_url = new URL(`${document.location.origin}${document.location.pathname}?${searchParrams.toString()}`)
  return new_url;
}

//https://stackoverflow.com/questions/57279316/the-createslider-function-creates-the-slider-outside-of-the-canvas-how-to-pos
class HScrollbar {
  constructor(x, y, w, h, r, min, max, value) {
    this.width = w;
    this.height = h;
    this.radius = r;

    this.valueMin = min;
    this.valueMax = max;
    this.value = value;

    this.x = x;
    this.y = y - this.height / 2;

    this.posMin = this.x + this.radius;
    this.posMax = this.x + this.width - this.radius;
    this.pos = this.posMin + (this.posMax - this.posMin) * map(this.value, this.valueMin, this.valueMax, 0, 1);
    
    this.over = false;
    this.locked = false;
  }

  update() {
    if (this.overEvent()) {
      this.over = true;
    } else {
      this.over = false;
    }
    if (mouseIsPressed && this.over) {
      this.locked = true;
    }
    if (!mouseIsPressed) {
      this.locked = false;
    }
    if (this.locked) {
      this.pos = constrain(mouseX, this.posMin, this.posMax);
    }
  }

  overEvent() {
    if (mouseX > this.x && mouseX < this.x+this.width &&
       mouseY > this.y && mouseY < this.y+this.height) {
      return true;
    } else {
      return false;
    }
  }

  display() {
    noStroke();

    let f = color(config.sliderColor);
    fill(f);
    let dW = this.pos - this.x;
    rect(this.x, this.y - this.height/2, dW, this.height, this.radius / 2);

    f = color(config.sliderTrack);
    f.setAlpha(64);
    fill(f);
    rect(this.pos, this.y - this.height/2, this.width - dW, this.height, this.radius / 2);

    f = color(config.sliderColor);
    f.setAlpha(255);
    fill(f);
    circle(this.pos, this.y, this.radius * 2);
  }

  getValue() {
    let relative = (this.pos - this.posMin) / (this.posMax - this.posMin);
    return map(relative, 0, 1, this.valueMin, this.valueMax);
  }
}
