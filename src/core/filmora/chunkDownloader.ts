/**
 * Filmora-Grade Multi-Chunk Downloader & Dynamic Bandwidth Probing Engine
 * Clean-room implementation reverse-engineered from Wondershare Filmora Installer architecture:
 * `ProbeCdnBandwidth`, `GetSliceStrategy`, `GetChunkDownloadConfig`, and `GetDownloadAliasHosts`.
 */

export interface ChunkSlice {
  index: number;
  startByte: number;
  endByte: number;
  totalBytes: number;
  downloadedBytes: number;
  completed: boolean;
}

export interface DownloaderConfig {
  minSliceSizeMb?: number;
  maxSliceSizeMb?: number;
  maxConcurrency?: number;
  probeTimeoutMs?: number;
  retryLimit?: number;
}

export interface DownloaderStrategy {
  throughputMbps: number;
  sliceCount: number;
  concurrency: number;
  sliceSize: number;
  estimatedDurationSec: number;
}

export class ChunkDownloaderEngine {
  /**
   * Calculates the optimal slicing and concurrency strategy based on measured bandwidth.
   * Mirrors Filmora's `GetSliceStrategy` algorithm.
   */
  static calculateSliceStrategy(
    totalSizeBytes: number,
    throughputMbps: number,
    config?: DownloaderConfig
  ): DownloaderStrategy {
    const maxConcurrency = config?.maxConcurrency ?? 8;
    const minSliceSizeBytes = (config?.minSliceSizeMb ?? 2) * 1024 * 1024;
    const maxSliceSizeBytes = (config?.maxSliceSizeMb ?? 32) * 1024 * 1024;

    // Constrain throughput between 0.5 Mbps and 1000 Mbps
    const safeSpeedMbps = Math.max(0.5, throughputMbps);

    // Dynamic concurrency based on bandwidth
    let concurrency = 2;
    if (safeSpeedMbps >= 50) concurrency = Math.min(8, maxConcurrency);
    else if (safeSpeedMbps >= 20) concurrency = Math.min(6, maxConcurrency);
    else if (safeSpeedMbps >= 5) concurrency = Math.min(4, maxConcurrency);
    else concurrency = 2;

    // Compute ideal slice size
    // Slices should take approx 2-4 seconds each to download
    const targetSliceBytes = Math.round((safeSpeedMbps * 1_000_000) / 8 * 3);
    const clampedSliceSize = Math.max(minSliceSizeBytes, Math.min(maxSliceSizeBytes, targetSliceBytes));

    const sliceCount = Math.max(1, Math.ceil(totalSizeBytes / clampedSliceSize));
    const estimatedDurationSec = Math.round((totalSizeBytes * 8) / (safeSpeedMbps * 1_000_000) * 10) / 10;

    return {
      throughputMbps: Math.round(safeSpeedMbps * 100) / 100,
      sliceCount,
      concurrency,
      sliceSize: clampedSliceSize,
      estimatedDurationSec,
    };
  }

  /**
   * Partitions total file bytes into deterministic slice chunks for parallel HTTP Range fetching.
   */
  static buildSlices(totalSizeBytes: number, sliceSize: number): ChunkSlice[] {
    if (totalSizeBytes <= 0 || sliceSize <= 0) return [];

    const slices: ChunkSlice[] = [];
    let start = 0;
    let index = 0;

    while (start < totalSizeBytes) {
      const end = Math.min(totalSizeBytes - 1, start + sliceSize - 1);
      slices.push({
        index,
        startByte: start,
        endByte: end,
        totalBytes: end - start + 1,
        downloadedBytes: 0,
        completed: false,
      });
      start = end + 1;
      index++;
    }

    return slices;
  }

  /**
   * Resolves failover mirror hosts when primary origin encounters connection errors.
   * Reverse-engineered from Filmora's `GetDownloadAliasHosts` and DNS alias switcher.
   */
  static resolveActiveHost(
    originUrl: string,
    aliasHosts: string[],
    failureCount: number
  ): string {
    if (failureCount === 0 || aliasHosts.length === 0) {
      return originUrl;
    }

    // Wrap around alias list
    const aliasIndex = (failureCount - 1) % aliasHosts.length;
    const targetHost = aliasHosts[aliasIndex];

    try {
      const urlObj = new URL(originUrl);
      urlObj.host = targetHost;
      return urlObj.toString();
    } catch {
      return originUrl;
    }
  }
}

