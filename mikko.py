#!/usr/bin/env python2

from __future__ import unicode_literals

import argparse
import hashlib
import os
import requests
import tempfile

from urllib import urlencode


voices = {
    "mikko": {
        "engine": 4,
        "language": 23,
        "voice": 1,
    },
    "milla": {
        "engine": 2,
        "language": 23,
        "voice": 1,
    },
    "marko": {
        "engine": 2,
        "language": 23,
        "voice": 2,
    },
    "alan": {
        "engine": 2,
        "language": 1,
        "voice": 9,
    },
}
current_voice = "mikko"


def build_hash(text, engine, voice, language, fx=None, fx_level=None):
    fragments = [
        "<engineID>%s</engineID>" % engine,
        "<voiceID>%s</voiceID>" % voice,
        "<langID>%s</langID>" % language,
        ("<FX>%s%s</FX>" % (fx, fx_level)) if fx else '',
        "<ext>mp3</ext>",
        text,
    ]

    return hashlib.md5(''.join(fragments).encode('utf-8', "ignore")).hexdigest()


def get_tts_url(text, engine, voice, language, fx=None, fx_level=None):
    hash = build_hash(**locals())
    params = [
        ('engine', engine),
        ('language', language),
        ('voice', voice),
        ('text', text.encode("utf-8", "ignore")),
        ('useUTF8', 1),
        ('fx_type', fx),
        ('fx_level', fx_level),
    ]
    params = [(key, value) for (key, value) in params if (key and value)]

    return 'http://cache-a.oddcast.com/c_fs/%s.mp3?%s' % (
        hash,
        urlencode(params),
    )


def download(text, engine, language, voice, fx=None, fx_level=None):
    url = get_tts_url(**locals())
    temp_name = os.path.join(tempfile.gettempdir(), 'tts-%s.mp3' % hashlib.md5(url).hexdigest())
    if not os.path.exists(temp_name):
        with open(temp_name, 'wb') as outf:
            resp = requests.get(url)
            resp.raise_for_status()
            outf.write(resp.content)
    return temp_name


def speak(text):
    voice = voices[current_voice]
    tmp = download(
        text=text,
        engine=voice["engine"],
        language=voice["language"],
        voice=voice["voice"],
    )
    os.system("play -q %s" % (tmp,))


def parse_command_line_arguments():
    parser = argparse.ArgumentParser(
        description="Oddcast text-tos-speech API command line client."
    )
    parser.add_argument(
        "--milla",
        action="store_true",
        default=False,
    )
    parser.add_argument(
        "--marko",
        action="store_true",
        default=False,
    )
    parser.add_argument(
        "--alan",
        action="store_true",
        default=False,
    )
    parser.add_argument(
        "--mikko",
        action="store_true",
        default=False,
    )
    parser.add_argument(
        "text",
        metavar="T",
        type=str,
        nargs="*",
        help="text to speak",
    )
    return parser.parse_args()

if __name__ == "__main__":
    args = parse_command_line_arguments()
    if args.milla:
        current_voice = "milla"
    elif args.marko:
        current_voice = "marko"
    elif args.alan:
        current_voice = "alan"
    speak(b" ".join(args.text).decode("utf-8", "ignore"))
