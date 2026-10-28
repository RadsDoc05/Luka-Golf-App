#!/usr/bin/env python3
"""
generate_voices.py
Offline & Studio Batch TTS Voice Generator for "Luka's 18-Hole Golf Adventure".

Generates pre-rendered voice clips into `assets/audio/voice/<clip_key>.mp3` so the
game's Level-1 AudioEngine (`src/core/AudioEngine.js`) can play studio-quality voice
prompts 100% offline with zero latency.

Supported Engines:
  1. `pyttsx3` (100% offline system TTS — zero internet required)
  2. `edge-tts` (Free Microsoft Neural TTS — natural kid-friendly voices like `en-US-AnaNeural`)
  3. `elevenlabs` (Studio AI voice synthesis via ELEVENLABS_API_KEY environment variable)

Usage Examples:
  # Generate core game phrases + golf yardages using free neural Edge-TTS:
  pip install edge-tts
  python scripts/generate_voices.py --engine edge

  # Generate using 100% offline local system TTS (pyttsx3):
  pip install pyttsx3
  python scripts/generate_voices.py --engine local

  # Generate using ElevenLabs API:
  export ELEVENLABS_API_KEY="your_api_key_here"
  python scripts/generate_voices.py --engine elevenlabs

  # Include all numbers 0-999:
  python scripts/generate_voices.py --engine edge --all-numbers
"""

import argparse
import asyncio
import os
import sys
from pathlib import Path
from urllib import request as urlrequest
import json

ROOT_DIR = Path(__file__).resolve().parent.parent
VOICE_OUT_DIR = ROOT_DIR / "assets" / "audio" / "voice"

# Core game voice clips matching keys requested by `src/core/AudioEngine.js` & `src/game/MathEngine.js`
GAME_PHRASES = {
    "welcome_luka": "Hi Luka! Welcome to your eighteen hole golf adventure! Let us hit a super drive!",
    "great_shot": "Great shot, Luka! Right down the middle of the fairway!",
    "dino_nest": "Squawk! The ball landed right inside a sleeping pterodactyl nest! Time for a rescue shot!",
    "lava_vent": "Sssss! The ball splashed into a bubbling volcano lava vent! Time for a cool rescue shot!",
    "mishap_kiddie_pool": "Bonk! Splash! The ball bounced off a coconut tree right into the kiddie pool! Time for a rescue shot!",
    "mishap_hovercar": "Beep beep! The ball bounced off a flying hovercar windshield! Time for a rescue shot!",
    "mishap_canyon": "Twang! The ball danced across the rickety canyon rope bridge! Time for a rescue shot!",
    "cel_hole_in_one": "Hole in one! Unbelievable shot, Luka!",
    "cel_eagle": "Golden Eagle! Two under par! Watch the golden eagle soar!",
    "cel_birdie": "Sweet Birdie! One under par! Look at the bluebird on the flagstick!",
    "cel_par": "Super Par! Right on target! High five, Luka!",
    "cel_bogey": "Great effort, Luka! Awesome persistence! Onto the next hole!",
}

# Active golf yardages used across the 18 holes (Drives & Stepping Stone Approaches)
GOLF_YARDAGES = [
    10, 20, 30, 40, 50, 60, 70, 80, 90,
    100, 120, 150, 160, 170, 180, 190,
    200, 240, 250, 260, 280, 290,
    300, 310, 320, 330, 340, 350, 360, 380, 390,
    400, 410, 420, 440, 450, 460, 470, 480
]


def build_clip_manifest(include_all_numbers: bool = False) -> dict[str, str]:
    manifest = dict(GAME_PHRASES)

    # Single-digit counting & putting sums (0 - 10)
    for n in range(0, 11):
        manifest[f"num_{n}"] = f"{n}"

    # Golf yardage prompts
    for yds in GOLF_YARDAGES:
        manifest[f"num_{yds}"] = f"{yds} yards!"
        manifest[f"build_{yds}"] = f"Luka, build {yds} yards! Tap the hundreds card and the tens card!"
        if yds <= 60:
            manifest[f"approach_{yds}"] = (
                f"Approach shot! {yds} yards to the green. Tap the plus ten blocks to count up to {yds}!"
            )

    # Putting concrete addition prompts
    putt_pairs = [
        (2, 1), (2, 2), (3, 1), (3, 2), (4, 1), (4, 2), (3, 3),
        (4, 3), (5, 2), (5, 1), (5, 3), (4, 4), (6, 2), (5, 4), (6, 3)
    ]
    for left, right in putt_pairs:
        total = left + right
        manifest[f"putt_{left}_plus_{right}"] = f"Putting time! Count the golf balls: what is {left} plus {right} feet?"
        manifest[f"putt_eq_{left}_{right}_{total}"] = f"{left} plus {right} equals {total} feet!"

    if include_all_numbers:
        for num in range(0, 1000):
            key = f"num_{num}"
            if key not in manifest:
                manifest[key] = f"{num}"

    return manifest


def generate_with_pyttsx3(manifest: dict[str, str], out_dir: Path) -> None:
    try:
        import pyttsx3
    except ImportError:
        print("Error: pyttsx3 is not installed. Run: pip install pyttsx3", file=sys.stderr)
        sys.exit(1)

    engine = pyttsx3.init()
    engine.setProperty("rate", 165)
    for key, text in manifest.items():
        target = out_dir / f"{key}.mp3"
        if target.exists():
            continue
        print(f"[local pyttsx3] Generating {target.name} -> {text!r}")
        engine.save_to_file(text, str(target))
    engine.runAndWait()


async def generate_with_edge_tts(manifest: dict[str, str], out_dir: Path, voice: str) -> None:
    try:
        import edge_tts
    except ImportError:
        print("Error: edge-tts is not installed. Run: pip install edge-tts", file=sys.stderr)
        sys.exit(1)

    for key, text in manifest.items():
        target = out_dir / f"{key}.mp3"
        if target.exists():
            continue
        print(f"[edge-tts {voice}] Generating {target.name} -> {text!r}")
        communicate = edge_tts.Communicate(text, voice=voice, rate="-5%", pitch="+5Hz")
        await communicate.save(str(target))


def generate_with_elevenlabs(manifest: dict[str, str], out_dir: Path, voice_id: str) -> None:
    api_key = os.environ.get("ELEVENLABS_API_KEY", "").strip()
    if not api_key:
        print("Error: ELEVENLABS_API_KEY environment variable is required for --engine elevenlabs", file=sys.stderr)
        sys.exit(1)

    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    for key, text in manifest.items():
        target = out_dir / f"{key}.mp3"
        if target.exists():
            continue
        print(f"[ElevenLabs] Generating {target.name} -> {text!r}")
        payload = json.dumps({
            "text": text,
            "model_id": "eleven_monolingual_v1",
            "voice_settings": {"stability": 0.65, "similarity_boost": 0.8}
        }).encode("utf-8")
        req = urlrequest.Request(
            url,
            data=payload,
            headers={
                "xi-api-key": api_key,
                "Content-Type": "application/json",
                "Accept": "audio/mpeg"
            },
            method="POST"
        )
        with urlrequest.urlopen(req) as resp:
            target.write_bytes(resp.read())


def main() -> None:
    parser = argparse.ArgumentParser(description="Batch TTS Voice Generator for Luka's 18-Hole Golf Adventure")
    parser.add_argument(
        "--engine",
        choices=["edge", "local", "elevenlabs"],
        default="edge",
        help="TTS backend to use (default: edge)"
    )
    parser.add_argument(
        "--voice",
        default="en-US-AnaNeural",
        help="Voice name for edge-tts (default: en-US-AnaNeural) or Voice ID for ElevenLabs"
    )
    parser.add_argument(
        "--all-numbers",
        action="store_true",
        help="Also generate every integer from 0 to 999 into assets/audio/voice/"
    )
    args = parser.parse_args()

    VOICE_OUT_DIR.mkdir(parents=True, exist_ok=True)
    manifest = build_clip_manifest(include_all_numbers=args.all_numbers)
    print(f"Prepared {len(manifest)} voice clips in {VOICE_OUT_DIR}")

    if args.engine == "local":
        generate_with_pyttsx3(manifest, VOICE_OUT_DIR)
    elif args.engine == "edge":
        asyncio.run(generate_with_edge_tts(manifest, VOICE_OUT_DIR, args.voice))
    elif args.engine == "elevenlabs":
        voice_id = args.voice if args.voice != "en-US-AnaNeural" else "21m00Tcm4TlvDq8ikWAM"
        generate_with_elevenlabs(manifest, VOICE_OUT_DIR, voice_id)

    print("Done! All generated voice clips are saved in assets/audio/voice/")


if __name__ == "__main__":
    main()
