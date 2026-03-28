'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

interface RateTimelineProps {
  mode?: 'single' | 'comparison';
  label1?: string;
  label2?: string;
  defaultRate1?: number;
  defaultRate2?: number;
  maxTimeRange?: number;
  onDataChange?: (data: { count1: number; count2: number; alignments: number }) => void;
}

interface TimelineEvent {
  time: number;
  timeline: 1 | 2;
}

export const RateTimeline: React.FC<RateTimelineProps> = ({
  mode = 'single',
  label1 = 'Timeline 1',
  label2 = 'Timeline 2',
  defaultRate1 = 3.5,
  defaultRate2 = 2,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  maxTimeRange = 60,
  onDataChange,
}) => {
  // State management
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [timeRange, setTimeRange] = useState(30);
  const [rate1, setRate1] = useState(defaultRate1);
  const [rate2, setRate2] = useState(defaultRate2);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [alignments, setAlignments] = useState<number[]>([]);

  // Refs for animation
  const animationFrameRef = useRef<number | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const lastTimeRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  // Generate events based on rates
  const generateEvents = useCallback(
    (maxTime: number, r1: number, r2: number) => {
      const newEvents: TimelineEvent[] = [];
      const alignmentTimes: number[] = [];

      // Generate events for timeline 1
      for (let time = r1; time <= maxTime; time += r1) {
        newEvents.push({ time: parseFloat(time.toFixed(2)), timeline: 1 });
      }

      // Generate events for timeline 2 (in comparison mode)
      if (mode === 'comparison') {
        for (let time = r2; time <= maxTime; time += r2) {
          newEvents.push({ time: parseFloat(time.toFixed(2)), timeline: 2 });
        }

        // Find alignments (events within 0.1s tolerance)
        const tolerance = 0.1;
        const timeline1Events = newEvents
          .filter((e) => e.timeline === 1)
          .map((e) => e.time);
        const timeline2Events = newEvents
          .filter((e) => e.timeline === 2)
          .map((e) => e.time);

        timeline1Events.forEach((t1) => {
          timeline2Events.forEach((t2) => {
            if (Math.abs(t1 - t2) <= tolerance) {
              const alignmentTime = (t1 + t2) / 2;
              if (!alignmentTimes.some((t) => Math.abs(t - alignmentTime) <= tolerance)) {
                alignmentTimes.push(alignmentTime);
              }
            }
          });
        });

        setAlignments(alignmentTimes.sort((a, b) => a - b));
      }

      setEvents(newEvents.sort((a, b) => a.time - b.time));
    },
    [mode]
  );

  // Initialize events on mount and when rates/range change
  useEffect(() => {
    generateEvents(timeRange, rate1, rate2);
  }, [timeRange, rate1, rate2, generateEvents]);

  // Call onDataChange callback when data changes
  useEffect(() => {
    if (onDataChange) {
      const count1 = events.filter((e) => e.timeline === 1).length;
      const count2 = events.filter((e) => e.timeline === 2).length;
      onDataChange({
        count1,
        count2,
        alignments: alignments.length,
      });
    }
  }, [events, alignments, onDataChange]);

  // Animation loop
  const animate = useCallback((timestamp: number) => {
    if (startTimeRef.current === 0) {
      startTimeRef.current = timestamp;
    }

    const elapsed = (timestamp - startTimeRef.current) / 1000; // Convert to seconds
    setCurrentTime(elapsed);

    if (elapsed >= timeRange) {
      setIsPlaying(false);
      startTimeRef.current = 0;
    } else if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(animate);
    }
  }, [timeRange, isPlaying]);

  // Handle play/pause
  useEffect(() => {
    if (isPlaying) {
      if (currentTime >= timeRange) {
        startTimeRef.current = 0;
        setCurrentTime(0);
      }
      animationFrameRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, animate, timeRange, currentTime]);

  // Handle play button click
  const handlePlayPause = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      if (currentTime >= timeRange) {
        setCurrentTime(0);
        startTimeRef.current = 0;
      }
      setIsPlaying(true);
    }
  };

  // Handle reset
  const handleReset = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    startTimeRef.current = 0;
  };

  // Handle time range change
  const handleTimeRangeChange = (range: number) => {
    setTimeRange(range);
    if (currentTime >= range) {
      handleReset();
    }
  };

  // Get events visible in current time
  const visibleEvents = events.filter((e) => e.time <= currentTime);
  const timeline1Count = visibleEvents.filter((e) => e.timeline === 1).length;
  const timeline2Count = visibleEvents.filter((e) => e.timeline === 2).length;

  // Calculate playhead position
  const playheadPercent = (currentTime / timeRange) * 100;

  return (
    <div className="w-full max-w-4xl rounded-lg bg-white p-4 shadow-md">
      {/* Title */}
      <h3 className="mb-4 text-lg font-semibold text-gray-800">
        {mode === 'comparison' ? 'Rhythm Comparison Timeline' : 'Rate Timeline Visualizer'}
      </h3>

      {/* Timelines Container */}
      <div className="space-y-6">
        {/* Timeline 1 */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">{label1}</label>
            <span className="text-lg font-bold text-teal-600">{timeline1Count}</span>
          </div>
          <div className="relative h-12 overflow-hidden rounded-lg bg-gray-100">
            {/* Timeline bar */}
            <div className="relative h-full w-full">
              {/* Event dots */}
              {events
                .filter((e) => e.timeline === 1 && e.time <= timeRange)
                .map((event) => {
                  const position = (event.time / timeRange) * 100;
                  const isAlignment = mode === 'comparison' && alignments.some((a) => Math.abs(a - event.time) <= 0.1);
                  return (
                    <div
                      key={`event-1-${event.time}`}
                      className={`absolute top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 transform rounded-full transition-opacity duration-300 ${
                        isAlignment ? 'border-2 border-yellow-500 bg-yellow-400 shadow-lg' : 'border-2 border-teal-600 bg-teal-400'
                      }`}
                      style={{ left: `${position}%`, opacity: event.time <= currentTime ? 1 : 0.3 }}
                      title={`${event.time.toFixed(2)}s`}
                    />
                  );
                })}

              {/* Playhead */}
              <div
                className="absolute top-0 h-full w-1 bg-gray-800 shadow-lg transition-all"
                style={{ left: `${playheadPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Timeline 2 (comparison mode) */}
        {mode === 'comparison' && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">{label2}</label>
              <span className="text-lg font-bold text-purple-600">{timeline2Count}</span>
            </div>
            <div className="relative h-12 overflow-hidden rounded-lg bg-gray-100">
              {/* Timeline bar */}
              <div className="relative h-full w-full">
                {/* Event dots */}
                {events
                  .filter((e) => e.timeline === 2 && e.time <= timeRange)
                  .map((event) => {
                    const position = (event.time / timeRange) * 100;
                    const isAlignment = alignments.some((a) => Math.abs(a - event.time) <= 0.1);
                    return (
                      <div
                        key={`event-2-${event.time}`}
                        className={`absolute top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 transform rounded-full transition-opacity duration-300 ${
                          isAlignment ? 'border-2 border-yellow-500 bg-yellow-400 shadow-lg' : 'border-2 border-purple-600 bg-purple-400'
                        }`}
                        style={{ left: `${position}%`, opacity: event.time <= currentTime ? 1 : 0.3 }}
                        title={`${event.time.toFixed(2)}s`}
                      />
                    );
                  })}

                {/* Playhead */}
                <div
                  className="absolute top-0 h-full w-1 bg-gray-800 shadow-lg transition-all"
                  style={{ left: `${playheadPercent}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Alignment Counter (comparison mode) */}
        {mode === 'comparison' && (
          <div className="rounded-lg bg-yellow-50 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Alignments Found:</span>
              <span className="text-2xl font-bold text-yellow-600">{alignments.filter((a) => a <= currentTime).length}</span>
            </div>
          </div>
        )}
      </div>

      {/* Time Display */}
      <div className="my-4 flex items-center justify-center rounded-lg bg-gray-50 p-3">
        <span className="text-sm font-medium text-gray-700">
          {currentTime.toFixed(2)}s / {timeRange}s
        </span>
      </div>

      {/* Controls Section */}
      <div className="space-y-4 border-t border-gray-200 pt-4">
        {/* Play/Pause and Reset Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handlePlayPause}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-600 text-white shadow-md transition-all hover:bg-teal-700 active:scale-95"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <rect x="5" y="4" width="2" height="12" />
                <rect x="13" y="4" width="2" height="12" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <polygon points="6,4 14,10 6,16" />
              </svg>
            )}
          </button>

          <button
            onClick={handleReset}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-400 text-white shadow-md transition-all hover:bg-gray-500 active:scale-95"
            title="Reset"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 10c0-3.866 3.134-7 7-7 1.93 0 3.742.822 4.98 2.13M17 10c0 3.866-3.134 7-7 7-1.93 0-3.742-.822-4.98-2.13M16 6h-4v4" />
            </svg>
          </button>
        </div>

        {/* Rate 1 Slider */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              {label1} Interval:
            </label>
            <span className="text-sm font-semibold text-teal-600">{rate1.toFixed(1)}s</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="10"
            step="0.1"
            value={rate1}
            onChange={(e) => setRate1(parseFloat(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-300 accent-teal-600"
          />
        </div>

        {/* Rate 2 Slider (comparison mode) */}
        {mode === 'comparison' && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                {label2} Interval:
              </label>
              <span className="text-sm font-semibold text-purple-600">{rate2.toFixed(1)}s</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="10"
              step="0.1"
              value={rate2}
              onChange={(e) => setRate2(parseFloat(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-300 accent-purple-600"
            />
          </div>
        )}

        {/* Time Range Selector */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Time Range:
          </label>
          <div className="flex gap-2">
            {[10, 30, 60].map((range) => (
              <button
                key={range}
                onClick={() => handleTimeRangeChange(range)}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
                  timeRange === range
                    ? 'bg-teal-600 text-white shadow-md'
                    : 'border border-gray-300 bg-white text-gray-700 hover:border-teal-600'
                }`}
              >
                {range}s
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RateTimeline;
