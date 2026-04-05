/**
 * Terminal dimensions hook -- subscribes to stdout resize events with 16ms
 * debounce and computes a width band (compact / standard / widescreen).
 */

import { useState, useEffect, useMemo } from 'react';
import { useStdout } from 'ink';

export type WidthBand = 'compact' | 'standard' | 'widescreen';

export interface TerminalDimensions {
  columns: number;
  rows: number;
  band: WidthBand;
  compact: boolean;
  standard: boolean;
  widescreen: boolean;
}

const DEFAULT_DIMENSIONS: TerminalDimensions = {
  columns: 120,
  rows: 30,
  band: 'widescreen',
  compact: false,
  standard: false,
  widescreen: true,
};

function computeBand(columns: number): WidthBand {
  if (columns < 80) return 'compact';
  if (columns <= 120) return 'standard';
  return 'widescreen';
}

export function useTerminalDimensions(): TerminalDimensions {
  const { stdout } = useStdout();
  const [dimensions, setDimensions] = useState<TerminalDimensions>(DEFAULT_DIMENSIONS);

  useEffect(() => {
    if (!stdout) {
      setDimensions(DEFAULT_DIMENSIONS);
      return;
    }

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const onResize = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const cols = stdout.columns ?? 120;
        const rows = stdout.rows ?? 30;
        const band = computeBand(cols);
        setDimensions({
          columns: cols,
          rows,
          band,
          compact: band === 'compact',
          standard: band === 'standard',
          widescreen: band === 'widescreen',
        });
      }, 16);
    };

    // Read initial dimensions
    const cols = stdout.columns ?? 120;
    const rows = stdout.rows ?? 30;
    const band = computeBand(cols);
    setDimensions({
      columns: cols,
      rows,
      band,
      compact: band === 'compact',
      standard: band === 'standard',
      widescreen: band === 'widescreen',
    });

    stdout.on('resize', onResize);

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      stdout.removeListener('resize', onResize);
    };
  }, [stdout]);

  return useMemo(() => dimensions, [dimensions]);
}
