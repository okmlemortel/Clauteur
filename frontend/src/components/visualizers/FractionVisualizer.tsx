'use client';

import React, { useState, useEffect, useMemo } from 'react';

interface FractionVisualizerProps {
  mode?: 'circle' | 'bar';
  defaultFraction1?: { numerator: number; denominator: number };
  defaultFraction2?: { numerator: number; denominator: number };
  showCommonDenominator?: boolean;
  showDifference?: boolean;
  onFractionChange?: (data: {
    fraction1: { n: number; d: number };
    fraction2: { n: number; d: number };
  }) => void;
}

// Helper function: calculate GCD using Euclidean algorithm
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

// Helper function: calculate LCM using GCD
function lcm(a: number, b: number): number {
  return (a * b) / gcd(a, b);
}

// Helper function: reduce fraction to lowest terms
function reduceFraction(n: number, d: number): { n: number; d: number } {
  const g = gcd(n, d);
  return { n: n / g, d: d / g };
}

// Circle/Pizza visualization component
interface CircleVisualizerProps {
  numerator: number;
  denominator: number;
  color: string;
  size: number;
  showDifference?: boolean;
  differenceHighlight?: boolean;
}

function CircleVisualizer({
  numerator,
  denominator,
  color,
  size,
  showDifference,
  differenceHighlight,
}: CircleVisualizerProps) {
  const radius = size / 2;
  const center = size / 2;

  // Generate SVG paths for slices
  const slices = [];
  const anglePerSlice = 360 / denominator;

  for (let i = 0; i < denominator; i++) {
    const startAngle = (i * anglePerSlice - 90) * (Math.PI / 180);
    const endAngle = ((i + 1) * anglePerSlice - 90) * (Math.PI / 180);

    const x1 = center + radius * Math.cos(startAngle);
    const y1 = center + radius * Math.sin(startAngle);
    const x2 = center + radius * Math.cos(endAngle);
    const y2 = center + radius * Math.sin(endAngle);

    const largeArc = anglePerSlice > 180 ? 1 : 0;
    const pathData = [
      `M ${center} ${center}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
      'Z',
    ].join(' ');

    const isFilled = i < numerator;
    const sliceColor = isFilled ? color : '#F1F5F9';

    slices.push(
      <path
        key={i}
        d={pathData}
        fill={sliceColor}
        stroke="white"
        strokeWidth="2"
        className={isFilled && differenceHighlight ? 'fill-amber-600' : ''}
      />
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="transition-colors duration-500"
    >
      {slices}
    </svg>
  );
}

// Bar visualization component
interface BarVisualizerProps {
  numerator: number;
  denominator: number;
  color: string;
  width: number;
  height: number;
  showDifference?: boolean;
  differenceHighlight?: boolean;
}

function BarVisualizer({
  numerator,
  denominator,
  color,
  width,
  height,
  differenceHighlight,
}: BarVisualizerProps) {
  const filledWidth = (numerator / denominator) * width;
  const segmentWidth = width / denominator;

  return (
    <div className="relative" style={{ width, height }}>
      {/* Background bar */}
      <div
        className="absolute top-0 left-0 h-full bg-gray-100 border border-gray-300"
        style={{ width }}
      />

      {/* Division lines */}
      {Array.from({ length: denominator - 1 }).map((_, i) => (
        <div
          key={`line-${i}`}
          className="absolute top-0 h-full border-l border-gray-300"
          style={{ left: `${((i + 1) / denominator) * 100}%` }}
        />
      ))}

      {/* Filled portion */}
      <div
        className={`absolute top-0 left-0 h-full transition-all duration-500 ${
          differenceHighlight ? 'bg-amber-600' : color
        }`}
        style={{ width: filledWidth }}
      />
    </div>
  );
}

// Main component
export default function FractionVisualizer({
  mode = 'circle',
  defaultFraction1 = { numerator: 1, denominator: 4 },
  defaultFraction2 = { numerator: 1, denominator: 3 },
  showCommonDenominator = true,
  showDifference = true,
  onFractionChange,
}: FractionVisualizerProps) {
  const [fraction1, setFraction1] = useState(defaultFraction1);
  const [fraction2, setFraction2] = useState(defaultFraction2);
  const [currentMode, setCurrentMode] = useState(mode);
  const [showCommonDenomVisually, setShowCommonDenomVisually] = useState(false);
  const [showDifferenceVisually, setShowDifferenceVisually] = useState(false);

  useEffect(() => {
    onFractionChange?.({
      fraction1: { n: fraction1.numerator, d: fraction1.denominator },
      fraction2: { n: fraction2.numerator, d: fraction2.denominator },
    });
  }, [fraction1, fraction2, onFractionChange]);

  // Calculate common denominator
  const commonDenominator = useMemo(() => {
    return lcm(fraction1.denominator, fraction2.denominator);
  }, [fraction1.denominator, fraction2.denominator]);

  // Convert fractions to common denominator
  const fraction1WithCommon = useMemo(() => {
    const multiplier = commonDenominator / fraction1.denominator;
    return {
      numerator: fraction1.numerator * multiplier,
      denominator: commonDenominator,
    };
  }, [fraction1, commonDenominator]);

  const fraction2WithCommon = useMemo(() => {
    const multiplier = commonDenominator / fraction2.denominator;
    return {
      numerator: fraction2.numerator * multiplier,
      denominator: commonDenominator,
    };
  }, [fraction2, commonDenominator]);

  // Calculate difference
  const differenceData = useMemo(() => {
    const val1 = fraction1.numerator / fraction1.denominator;
    const val2 = fraction2.numerator / fraction2.denominator;
    const diff = Math.abs(val1 - val2);
    const larger = val1 >= val2 ? fraction1 : fraction2;
    return { diff, larger };
  }, [fraction1, fraction2]);

  // Display fractions (with or without common denominator)
  const displayFraction1 = showCommonDenomVisually ? fraction1WithCommon : fraction1;
  const displayFraction2 = showCommonDenomVisually ? fraction2WithCommon : fraction2;

  // Determine which fraction is larger for difference highlighting
  const fraction1IsLarger =
    fraction1.numerator / fraction1.denominator >=
    fraction2.numerator / fraction2.denominator;

  // Update numerator for fraction 1
  const updateFraction1Numerator = (delta: number) => {
    const newNumerator = Math.max(
      0,
      Math.min(fraction1.denominator, fraction1.numerator + delta)
    );
    setFraction1({ ...fraction1, numerator: newNumerator });
  };

  // Update denominator for fraction 1
  const updateFraction1Denominator = (delta: number) => {
    const newDenominator = Math.max(1, Math.min(12, fraction1.denominator + delta));
    const newNumerator = Math.min(fraction1.numerator, newDenominator);
    setFraction1({ numerator: newNumerator, denominator: newDenominator });
  };

  // Update numerator for fraction 2
  const updateFraction2Numerator = (delta: number) => {
    const newNumerator = Math.max(
      0,
      Math.min(fraction2.denominator, fraction2.numerator + delta)
    );
    setFraction2({ ...fraction2, numerator: newNumerator });
  };

  // Update denominator for fraction 2
  const updateFraction2Denominator = (delta: number) => {
    const newDenominator = Math.max(1, Math.min(12, fraction2.denominator + delta));
    const newNumerator = Math.min(fraction2.numerator, newDenominator);
    setFraction2({ numerator: newNumerator, denominator: newDenominator });
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-medium text-gray-900">Fraction Explorer</h2>

          {/* Mode toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentMode('circle')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                currentMode === 'circle'
                  ? 'bg-teal-100 text-teal-700 border border-teal-300'
                  : 'bg-gray-100 text-gray-700 border border-gray-300'
              }`}
            >
              Circle
            </button>
            <button
              onClick={() => setCurrentMode('bar')}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                currentMode === 'bar'
                  ? 'bg-teal-100 text-teal-700 border border-teal-300'
                  : 'bg-gray-100 text-gray-700 border border-gray-300'
              }`}
            >
              Bar
            </button>
          </div>
        </div>

        {/* Main visualization area */}
        <div className="flex gap-8 mb-6">
          {/* Fraction 1 */}
          <div className="flex-1">
            <div className="flex items-center justify-center gap-6 mb-4">
              {currentMode === 'circle' ? (
                <CircleVisualizer
                  numerator={displayFraction1.numerator}
                  denominator={displayFraction1.denominator}
                  color="#1D9E75"
                  size={160}
                  differenceHighlight={showDifferenceVisually && fraction1IsLarger}
                />
              ) : (
                <div className="w-full">
                  <BarVisualizer
                    numerator={displayFraction1.numerator}
                    denominator={displayFraction1.denominator}
                    color="bg-teal-500"
                    width={160}
                    height={40}
                    differenceHighlight={showDifferenceVisually && fraction1IsLarger}
                  />
                </div>
              )}

              {/* Fraction label */}
              <div className="text-xl font-bold text-gray-900">
                {displayFraction1.numerator}/{displayFraction1.denominator}
              </div>
            </div>

            {/* Controls for fraction 1 */}
            <div className="space-y-3">
              {/* Numerator stepper */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600 w-20">Numerator</span>
                <button
                  onClick={() => updateFraction1Numerator(-1)}
                  className="w-6 h-6 rounded-full border border-teal-500 text-teal-500 text-sm flex items-center justify-center hover:bg-teal-50 transition-colors"
                >
                  −
                </button>
                <span className="text-sm font-medium w-8 text-center">
                  {fraction1.numerator}
                </span>
                <button
                  onClick={() => updateFraction1Numerator(1)}
                  className="w-6 h-6 rounded-full border border-teal-500 text-teal-500 text-sm flex items-center justify-center hover:bg-teal-50 transition-colors"
                >
                  +
                </button>
              </div>

              {/* Denominator stepper */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600 w-20">Denominator</span>
                <button
                  onClick={() => updateFraction1Denominator(-1)}
                  className="w-6 h-6 rounded-full border border-teal-500 text-teal-500 text-sm flex items-center justify-center hover:bg-teal-50 transition-colors"
                >
                  −
                </button>
                <span className="text-sm font-medium w-8 text-center">
                  {fraction1.denominator}
                </span>
                <button
                  onClick={() => updateFraction1Denominator(1)}
                  className="w-6 h-6 rounded-full border border-teal-500 text-teal-500 text-sm flex items-center justify-center hover:bg-teal-50 transition-colors"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="w-px bg-gray-200" />

          {/* Fraction 2 */}
          <div className="flex-1">
            <div className="flex items-center justify-center gap-6 mb-4">
              {currentMode === 'circle' ? (
                <CircleVisualizer
                  numerator={displayFraction2.numerator}
                  denominator={displayFraction2.denominator}
                  color="#7F77DD"
                  size={160}
                  differenceHighlight={showDifferenceVisually && !fraction1IsLarger}
                />
              ) : (
                <div className="w-full">
                  <BarVisualizer
                    numerator={displayFraction2.numerator}
                    denominator={displayFraction2.denominator}
                    color="bg-purple-500"
                    width={160}
                    height={40}
                    differenceHighlight={showDifferenceVisually && !fraction1IsLarger}
                  />
                </div>
              )}

              {/* Fraction label */}
              <div className="text-xl font-bold text-gray-900">
                {displayFraction2.numerator}/{displayFraction2.denominator}
              </div>
            </div>

            {/* Controls for fraction 2 */}
            <div className="space-y-3">
              {/* Numerator stepper */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600 w-20">Numerator</span>
                <button
                  onClick={() => updateFraction2Numerator(-1)}
                  className="w-6 h-6 rounded-full border border-teal-500 text-teal-500 text-sm flex items-center justify-center hover:bg-teal-50 transition-colors"
                >
                  −
                </button>
                <span className="text-sm font-medium w-8 text-center">
                  {fraction2.numerator}
                </span>
                <button
                  onClick={() => updateFraction2Numerator(1)}
                  className="w-6 h-6 rounded-full border border-teal-500 text-teal-500 text-sm flex items-center justify-center hover:bg-teal-50 transition-colors"
                >
                  +
                </button>
              </div>

              {/* Denominator stepper */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600 w-20">Denominator</span>
                <button
                  onClick={() => updateFraction2Denominator(-1)}
                  className="w-6 h-6 rounded-full border border-teal-500 text-teal-500 text-sm flex items-center justify-center hover:bg-teal-50 transition-colors"
                >
                  −
                </button>
                <span className="text-sm font-medium w-8 text-center">
                  {fraction2.denominator}
                </span>
                <button
                  onClick={() => updateFraction2Denominator(1)}
                  className="w-6 h-6 rounded-full border border-teal-500 text-teal-500 text-sm flex items-center justify-center hover:bg-teal-50 transition-colors"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 justify-center pt-4 border-t border-gray-200">
          {showCommonDenominator && (
            <button
              onClick={() => setShowCommonDenomVisually(!showCommonDenomVisually)}
              className={`px-4 py-2 text-sm font-medium rounded border transition-colors ${
                showCommonDenomVisually
                  ? 'bg-teal-50 border-teal-500 text-teal-700'
                  : 'border-teal-500 text-teal-600 hover:bg-teal-50'
              }`}
            >
              {showCommonDenomVisually ? '✓ Common Denominator' : 'Find Common Denominator'}
            </button>
          )}

          {showDifference && (
            <button
              onClick={() => setShowDifferenceVisually(!showDifferenceVisually)}
              className={`px-4 py-2 text-sm font-medium rounded border transition-colors ${
                showDifferenceVisually
                  ? 'bg-amber-50 border-amber-600 text-amber-700'
                  : 'border-amber-600 text-amber-600 hover:bg-amber-50'
              }`}
            >
              {showDifferenceVisually ? '✓ Show Difference' : 'Show Difference'}
            </button>
          )}
        </div>

        {/* Info section */}
        {showCommonDenomVisually && (
          <div className="mt-4 p-3 bg-blue-50 rounded text-xs text-blue-800 border border-blue-200">
            Common denominator: <span className="font-bold">{commonDenominator}</span> •
            Fraction 1: {fraction1WithCommon.numerator}/{fraction1WithCommon.denominator} •
            Fraction 2: {fraction2WithCommon.numerator}/{fraction2WithCommon.denominator}
          </div>
        )}

        {showDifferenceVisually && (
          <div className="mt-4 p-3 bg-amber-50 rounded text-xs text-amber-800 border border-amber-200">
            Difference: <span className="font-bold">{differenceData.diff.toFixed(3)}</span> (shown in amber on the larger fraction)
          </div>
        )}
      </div>
    </div>
  );
}

// Named export
export { FractionVisualizer };
