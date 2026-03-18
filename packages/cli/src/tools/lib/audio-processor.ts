/**
 * Audio processing module for podcast generation.
 * Uses FFmpeg to concatenate audio segments and get audio metadata.
 *
 * @module podcast/audio-processor
 */

import ffmpeg, { FfprobeData } from "fluent-ffmpeg";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeFile, readFile, unlink, mkdir, rmdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import ffmpegStatic from "ffmpeg-static";

let cachedFfmpegPath: string | null = null;

async function getFFmpegPath(): Promise<string> {
  if (!cachedFfmpegPath) {
    const path = await Promise.resolve(ffmpegStatic);
    cachedFfmpegPath = (path as unknown as string) || "ffmpeg";
  }
  return cachedFfmpegPath;
}

async function createTempDir(): Promise<string> {
  const workDir = join(tmpdir(), `podcast-${randomUUID()}`);
  await mkdir(workDir, { recursive: true });
  return workDir;
}

/**
 * Clean up a temporary directory and its contents.
 * @param dirPath - Path to the directory to clean up
 */
async function cleanupTempDir(dirPath: string): Promise<void> {
  try {
    const files = await readFile(dirPath, "utf-8").catch(() => null);
    if (files === null) return;

    // Remove all files in the directory
    const entries = await import("node:fs/promises").then((fs) =>
      fs.readdir(dirPath)
    );
    for (const entry of entries) {
      try {
        await unlink(join(dirPath, entry));
      } catch {
        // Ignore errors when removing files
      }
    }

    // Remove the directory
    try {
      await rmdir(dirPath);
    } catch {
      // Ignore errors when removing directory
    }
  } catch {
    // Ignore all errors during cleanup
  }
}

/**
 * Concatenate multiple audio segments into a single audio file.
 *
 * @param segments - Array of audio data (Uint8Array, each should be MP3 format)
 * @param outputFormat - Output format (default: "mp3")
 * @returns Concatenated audio data
 * @throws Error if segments array is empty or ffmpeg processing fails
 *
 * @example
 * ```typescript
 * const segments = [
 *   await textToSpeech("Hello", { voice: "alloy" }),
 *   await textToSpeech("World", { voice: "alloy" }),
 * ];
 * const combined = await concatenateAudio(segments);
 * // combined is a single MP3 file
 * ```
 */
export async function concatenateAudio(
  segments: Uint8Array[],
  outputFormat: "mp3" = "mp3"
): Promise<Uint8Array> {
  // Validate input
  if (segments.length === 0) {
    throw new Error("No audio segments to concatenate");
  }

  // If only one segment, return it directly
  if (segments.length === 1) {
    return segments[0];
  }

  const workDir = await createTempDir();
  const inputFiles: string[] = [];
  const outputFile = join(workDir, `output.${outputFormat}`);

  try {
    // Write each segment to a temporary file
    for (let i = 0; i < segments.length; i++) {
      const inputFile = join(workDir, `segment-${i}.mp3`);
      await writeFile(inputFile, segments[i]);
      inputFiles.push(inputFile);
    }

    const ffmpegBin = await getFFmpegPath();

    // Use ffmpeg to concatenate audio files
    await new Promise<void>((resolve, reject) => {
      const command = ffmpeg();
      command.setFfmpegPath(ffmpegBin);

      // Add all input files
      for (const file of inputFiles) {
        command.input(file);
      }

      // Set up error and completion handlers
      command
        .on("error", (err: Error) => {
          reject(new Error(`FFmpeg error: ${err.message}`));
        })
        .on("end", () => {
          resolve();
        })
        // Use mergeToFile for concatenating inputs
        .mergeToFile(outputFile, workDir);
    });

    // Read the output file
    return await readFile(outputFile);
  } finally {
    // Clean up temporary files
    await cleanupTempDir(workDir);
  }
}

/**
 * Get the duration of an audio file in seconds.
 *
 * @param audio - Audio data (MP3 format)
 * @returns Duration in seconds
 * @throws Error if ffprobe fails to read the audio
 */
export async function getAudioDuration(audio: Uint8Array): Promise<number> {
  const workDir = await createTempDir();
  const inputFile = join(workDir, "input.mp3");

  try {
    await writeFile(inputFile, audio);
    const ffmpegBin = await getFFmpegPath();

    return await new Promise<number>((resolve, reject) => {
      ffmpeg(inputFile)
        .setFfmpegPath(ffmpegBin)
        .ffprobe((err: Error | null, data: FfprobeData) => {
          if (err) {
            reject(new Error(`FFprobe error: ${err.message}`));
          } else {
            resolve(data.format?.duration || 0);
          }
        });
    });
  } finally {
    await cleanupTempDir(workDir);
  }
}

/**
 * Get audio metadata including duration and format information.
 *
 * @param audio - Audio data (MP3 format)
 * @returns Audio metadata object
 */
export async function getAudioMetadata(audio: Uint8Array): Promise<{
  duration: number;
  format: string;
  bitrate: number;
  sampleRate: number;
}> {
  const workDir = await createTempDir();
  const inputFile = join(workDir, "input.mp3");

  try {
    await writeFile(inputFile, audio);
    const ffmpegBin = await getFFmpegPath();

    return await new Promise((resolve, reject) => {
      ffmpeg(inputFile)
        .setFfmpegPath(ffmpegBin)
        .ffprobe((err: Error | null, data: FfprobeData) => {
          if (err) {
            reject(new Error(`FFprobe error: ${err.message}`));
          } else {
            resolve({
              duration: data.format?.duration || 0,
              format: data.format?.format_name || "unknown",
              bitrate: data.format?.bit_rate
                ? parseInt(String(data.format.bit_rate), 10)
                : 0,
              sampleRate: data.streams?.[0]?.sample_rate || 0,
            });
          }
        });
    });
  } finally {
    await cleanupTempDir(workDir);
  }
}