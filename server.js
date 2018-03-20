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
const winston = require('winston');

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

// Configure logging.
const log = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({
      colorize: !process.env.NO_COLOR,
      timestamp: true
    })
  ]
});

const app = express();
const queue = [];
let isPlaying = false;

app.use(bodyParser.json());
app.set('view engine', 'pug');

app.get('/', (req, res) => {
  res.render('index', { voices: Object.keys(VOICE_CONFIGURATIONS) });
});

app.post('/', (req, res) => {
  const { voice, text } = req.body;

  if ([voice, text].find(RegExp.prototype.test.bind(/^\s*$/)) != null) {
    log.error(`${req.ip}: Received empty request.`);
    res.status(400).send({ error: 'Empty request.' });
    return;
  }

  const voiceConfig = VOICE_CONFIGURATIONS[voice];

  if (!voiceConfig) {
    log.error(`${req.ip}: Unrecognized voice: ${voice}`);
    res.status(400).send({ error: 'Unrecognized voice.' });
    return;
  }

  res.json({ nep: true });
  log.info(`${req.ip}: <${voice}> ${text}`);

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
    log.error(err);
  }
});

app.listen(PORT, () => {
  log.info(`Listening on port ${PORT}.`);
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
