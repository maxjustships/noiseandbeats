export class MockAudioParam {
  value = 0;
  events = [];

  setValueAtTime(value, time) {
    this.value = value;
    this.events.push(['set', value, time]);
  }

  setTargetAtTime(value, time, constant) {
    this.value = value;
    this.events.push(['target', value, time, constant]);
  }

  linearRampToValueAtTime(value, time) {
    this.value = value;
    this.events.push(['linear', value, time]);
  }

  exponentialRampToValueAtTime(value, time) {
    this.value = value;
    this.events.push(['exponential', value, time]);
  }
}

class MockAudioNode {
  connections = [];
  disconnected = false;

  connect(node) {
    this.connections.push(node);
    return node;
  }

  disconnect() {
    this.disconnected = true;
  }
}

export class MockOscillator extends MockAudioNode {
  frequency = new MockAudioParam();
  type = 'sine';
  starts = [];
  stops = [];

  start(time) {
    this.starts.push(time);
  }

  stop(time) {
    this.stops.push(time);
  }
}

class MockGain extends MockAudioNode {
  gain = new MockAudioParam();
}

class MockPanner extends MockAudioNode {
  pan = new MockAudioParam();
}

class MockFilter extends MockAudioNode {
  frequency = new MockAudioParam();
  Q = new MockAudioParam();
  type = 'lowpass';
}

class MockCompressor extends MockAudioNode {
  threshold = new MockAudioParam();
  knee = new MockAudioParam();
  ratio = new MockAudioParam();
  attack = new MockAudioParam();
  release = new MockAudioParam();
}

class MockBufferSource extends MockAudioNode {
  buffer = null;
  loop = false;
  starts = [];
  stops = [];

  start(time) {
    this.starts.push(time);
  }

  stop(time) {
    this.stops.push(time);
  }
}

export class MockAudioContext {
  currentTime = 4;
  sampleRate = 16;
  state = 'running';
  destination = new MockAudioNode();
  oscillators = [];
  gains = [];
  panners = [];
  compressors = [];

  createOscillator() {
    const node = new MockOscillator();
    this.oscillators.push(node);
    return node;
  }

  createGain() {
    const node = new MockGain();
    this.gains.push(node);
    return node;
  }

  createStereoPanner() {
    const node = new MockPanner();
    this.panners.push(node);
    return node;
  }

  createBiquadFilter() {
    return new MockFilter();
  }

  createDynamicsCompressor() {
    const node = new MockCompressor();
    this.compressors.push(node);
    return node;
  }

  createBufferSource() {
    return new MockBufferSource();
  }

  createBuffer(channels, size) {
    const data = new Float32Array(size);
    return { getChannelData: () => data, numberOfChannels: channels };
  }

  async resume() {
    this.state = 'running';
  }

  async suspend() {
    this.state = 'suspended';
  }
}

export function atom(initial) {
  let value = initial;
  return {
    get: () => value,
    set: (next) => { value = next; },
    subscribe: (callback) => {
      callback(value);
      return () => {};
    },
  };
}
