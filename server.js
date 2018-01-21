const bodyParser = require('body-parser');
const buildUrl = require('build-url');
const express = require('express');
const md5 = require('md5');
const path = require('path');

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
const player = require('play-sound')();

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

  player.play(getTTSUrl(text, voiceConfig.engine, voiceConfig.voice, voiceConfig.language));

  res.json({ nep: true });
});

app.listen(PORT, () => {
  process.stdout.write(`Listening on port ${PORT}.\n`);
});

function buildHash(text, engine, voice, language) {
  const fragments = [
    `<engineID>${engine}</engineID>`,
    `<voiceID>${voice}</voiceID>`,
    `<langID>${language}</langID>`,
    '<ext>mp3</ext>',
    text
  ];

  return md5(fragments.join(''));
}

function getTTSUrl(text, engine, voice, language) {
  const hash = buildHash(text, engine, voice, language);

  return buildUrl('http://cache-a.oddcast.com', {
    path: `c_fs/${hash}.mp3`,
    queryParams: {
      engine,
      language,
      voice,
      text: encodeURIComponent(text),
      useUTF8: 1
    }
  });
}
