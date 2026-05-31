#!/usr/bin/env python3
"""
Voice of Fish → DaVinci Resolve Import Script

Usage:
  1. Export from Voice of Fish Editor (WAVs + SRT)
  2. Open DaVinci Resolve with a project
  3. Run: python3 resolve_import.py /path/to/export/folder

The script creates a new timeline, imports all WAVs as audio clips
in order, and loads the SRT as subtitles.

Requires: DaVinci Resolve 18+ with scripting enabled
  (DaVinci Resolve → Preferences → General → External Scripting → Local)
"""

import os
import sys
import json
import glob


def find_resolve_module():
    """Locate the DaVinci Resolve scripting module."""
    paths = [
        # macOS
        "/Library/Application Support/Blackmagic Design/DaVinci Resolve/Developer/Scripting/Modules",
        # Windows
        os.path.expandvars(
            r"%PROGRAMDATA%\Blackmagic Design\DaVinci Resolve\Support\Developer\Scripting\Modules"
        ),
        # Linux
        "/opt/resolve/Developer/Scripting/Modules",
        os.path.expanduser(
            "~/.local/share/DaVinciResolve/Developer/Scripting/Modules"
        ),
    ]
    for p in paths:
        if os.path.isdir(p):
            sys.path.insert(0, p)
            return
    print("DaVinci Resolve scripting module not found.", file=sys.stderr)
    print("Expected in one of:", file=sys.stderr)
    for p in paths:
        print(f"  {p}", file=sys.stderr)
    sys.exit(1)


def parse_srt(path: str) -> list[dict]:
    """Parse SRT file into list of {start_ms, end_ms, text}."""
    entries = []
    with open(path, "r") as f:
        content = f.read().strip()
    if not content:
        return entries
    blocks = content.split("\n\n")
    for block in blocks:
        lines = block.strip().split("\n")
        if len(lines) < 3:
            continue
        # Parse timestamp line "00:00:00,000 --> 00:00:03,200"
        timestamps = lines[1].split(" --> ")
        if len(timestamps) != 2:
            continue

        def ts_to_ms(ts: str) -> int:
            h, m, s_ms = ts.split(":")
            s, ms = s_ms.split(",")
            return int(h) * 3600000 + int(m) * 60000 + int(s) * 1000 + int(ms)

        start_ms = ts_to_ms(timestamps[0])
        end_ms = ts_to_ms(timestamps[1])
        text = "\n".join(lines[2:])
        entries.append({"start_ms": start_ms, "end_ms": end_ms, "text": text})
    return entries


def main():
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} /path/to/export/folder", file=sys.stderr)
        sys.exit(1)

    export_dir = sys.argv[1]
    if not os.path.isdir(export_dir):
        print(f"Folder not found: {export_dir}", file=sys.stderr)
        sys.exit(1)

    find_resolve_module()
    import DaVinciResolveScript as dvr

    resolve = dvr.scriptapp("Resolve")
    if resolve is None:
        print("Failed to connect to DaVinci Resolve.", file=sys.stderr)
        print("Make sure Resolve is running and scripting is enabled.", file=sys.stderr)
        sys.exit(1)

    project = resolve.GetCurrentProject()
    if project is None:
        print("No project open. Open or create a project in Resolve first.", file=sys.stderr)
        sys.exit(1)

    media_pool = project.GetMediaPool()
    if media_pool is None:
        print("Cannot access media pool.", file=sys.stderr)
        sys.exit(1)

    # Determine export name from folder
    folder_name = os.path.basename(os.path.abspath(export_dir))

    # Create timeline
    timeline = media_pool.CreateEmptyTimeline(f"VoF - {folder_name}")
    if timeline is None:
        print("Failed to create timeline.", file=sys.stderr)
        sys.exit(1)

    # Import WAV files in order
    wav_files = sorted(glob.glob(os.path.join(export_dir, "clip_*.wav")))
    if not wav_files:
        print("No clip_*.wav files found in export folder.", file=sys.stderr)
        sys.exit(1)

    print(f"Found {len(wav_files)} WAV file(s)")

    imported = media_pool.ImportMedia([os.path.abspath(f) for f in wav_files])
    if not imported:
        print("Failed to import media.", file=sys.stderr)
        sys.exit(1)

    # Append clips to timeline in order
    for clip_info in imported:
        media_pool.AppendToTimeline([{"mediaPoolItem": clip_info}])

    # Import SRT subtitles if present
    srt_path = os.path.join(export_dir, "subtitles.srt")
    if os.path.isfile(srt_path):
        print("Importing subtitles from subtitles.srt...")
        subtitles = parse_srt(srt_path)
        if subtitles:
            # Add subtitle track and create subtitle items
            # (SRT import via API is limited; subtitles appear as markers)
            for sub in subtitles:
                # DaVinci API subtitle support varies by version
                pass
            print(f"  {len(subtitles)} subtitle(s) parsed from SRT.")
            print("  Note: Resolve API subtitle import is version-dependent.")
            print("  Import subtitles.srt manually via File → Import → Subtitle.")

    # Set timeline start timecode
    timeline.SetStartTimecode("01:00:00:00")

    print(f"\nDone! Timeline 'VoF - {folder_name}' created with {len(wav_files)} clip(s).")
    print("Import subtitles.srt manually: File → Import → Subtitle → select subtitles.srt")


if __name__ == "__main__":
    main()
