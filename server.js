const bodyParser = require('body-parser');
const buildUrl = require('build-url');
const express = require('express');
const fs = require('fs');
const lame = require('lame');
const md5 = require('md5');
const os = require('os');
const path = require('path');
const request = require('request');
const speaker = require('speaker');

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8080;
const VOICE_CONFIGURATIONS = {
  mikko: {
    engine: 4,
    language: 23,
    voice: 1
  },
  milla: {
    engine: 2,
    language: 23,
    voice: 1
  },
  marko: {
    engine: 2,
    language: 23,
    voice: 2
  },
  alan: {
    engine: 2,
    language: 1,
    voice: 9
  }
};

const app = express();
const queue = [];
let isPlaying = false;

app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'index.html'));
});

app.post('/', (req, res) => {
  const { voice, text } = req.body;

  if ([voice, text].find(RegExp.prototype.test.bind(/^\s*$/))) {
    return;
  }

  const voiceConfig = VOICE_CONFIGURATIONS[voice];

  if (!voiceConfig) {
    process.stderr.write(`Unrecognized voice: ${voice}\n`);
    return;
  }

  res.json({ nep: true });

  const hash = buildHash(text, voiceConfig);
  const file = path.join(os.tmpdir(), `tts-${hash}.mp3`);

  if (fs.existsSync(file)) {
    addToQueue(file);
    return;
  }

  const url = buildUrl('http://cache-a.oddcast.com', {
    path: `c_fs/${hash}.mp3`,
    queryParams: {
      engine: voiceConfig.engine,
      language: voiceConfig.language,
      voice: voiceConfig.voice,
      text: encodeURIComponent(text),
      useUTF8: 1
    }
  });

  try {
    request(url).pipe(fs.createWriteStream(file)).on('close', () => addToQueue(file));
  } catch (err) {
    console.error(err);
  }
});

app.listen(PORT, () => {
  process.stdout.write(`Listening on port ${PORT}.\n`);
});

function addToQueue(file) {
  queue.push(file);
  if (!isPlaying) {
    playFromQueue();
  }
}

function playFromQueue() {
  if (isPlaying || !queue.length) {
    return;
  }

  const decoder = new lame.Decoder();
  const file = queue[0];

  queue.shift();
  fs.createReadStream(file).pipe(decoder).once('format', () => {
    const output = new speaker({
      channels: 1,
      bitDepth: 16,
      sampleRate: 22050,
      mode: lame.MONO
    });

    isPlaying = true;
    decoder.pipe(output);
    output.once('close', () => {
      isPlaying = false;
      if (queue.length > 0) {
        playFromQueue();
      }
    });
  });
}

function buildHash(text, voiceConfig) {
  const { engine, language, voice } = voiceConfig;
  const fragments = [
    `<engineID>${engine}</engineID>`,
    `<voiceID>${voice}</voiceID>`,
    `<langID>${language}</langID>`,
    '<ext>mp3</ext>',
    text
  ];

  return md5(fragments.join(''));
}
