#!/usr/bin/env node
/**
 * AI Habit Tracker - Feedback Logger
 * 
 * Logs positive/negative feedback for habits to adjust weights adaptively.
 * Inspired by Fish0uttaWater0's suggestion for feedback-driven learning.
 * 
 * Usage:
 *   node log-feedback.js --habit <id> --positive [--note "reason"]
 *   node log-feedback.js --habit <id> --negative [--note "reason"]
 *   node log-feedback.js --report
 */

const fs = require('fs');
const path = require('path');

const HABITS_FILE = path.join(__dirname, '..', 'habits.json');

// Feedback weight adjustments
const POSITIVE_BOOST = 0.15;      // Positive feedback boosts weight
const NEGATIVE_PENALTY = 0.1;     // Negative feedback reduces weight
const FEEDBACK_DECAY = 0.02;      // Old feedback decays over time
const MAX_WEIGHT = 3.0;
const MIN_WEIGHT = 0.5;           // Can go lower than 1.0 with negative feedback

function loadHabits() {
  const data = fs.readFileSync(HABITS_FILE, 'utf-8');
  return JSON.parse(data);
}

function saveHabits(habitsData) {
  habitsData.lastUpdated = new Date().toISOString();
  fs.writeFileSync(HABITS_FILE, JSON.stringify(habitsData, null, 2));
}

function logFeedback(habitsData, habitId, isPositive, note = '') {
  const habit = habitsData.habits.find(h => h.id === habitId);
  if (!habit) {
    console.error(`❌ Habit not found: ${habitId}`);
    return false;
  }

  // Initialize feedback tracking if not present
  if (!habit.feedback) {
    habit.feedback = {
      positive: 0,
      negative: 0,
      history: []
    };
  }

  const feedbackEntry = {
    type: isPositive ? 'positive' : 'negative',
    timestamp: new Date().toISOString(),
    note: note
  };

  // Update counts
  if (isPositive) {
    habit.feedback.positive++;
    habit.weight = Math.min((habit.weight || 1) + POSITIVE_BOOST, MAX_WEIGHT);
    console.log(`👍 Positive feedback logged for: ${habit.name}`);
  } else {
    habit.feedback.negative++;
    habit.weight = Math.max((habit.weight || 1) - NEGATIVE_PENALTY, MIN_WEIGHT);
    console.log(`👎 Negative feedback logged for: ${habit.name}`);
  }

  // Add to history (keep last 20)
  habit.feedback.history.push(feedbackEntry);
  if (habit.feedback.history.length > 20) {
    habit.feedback.history = habit.feedback.history.slice(-20);
  }

  // Calculate feedback score (positive - negative, normalized)
  const total = habit.feedback.positive + habit.feedback.negative;
  const score = total > 0 
    ? ((habit.feedback.positive - habit.feedback.negative) / total).toFixed(2)
    : 0;

  console.log(`   Weight: ${habit.weight.toFixed(2)} | Feedback Score: ${score} (${habit.feedback.positive}+ / ${habit.feedback.negative}-)`);
  
  if (note) {
    console.log(`   Note: "${note}"`);
  }

  return true;
}

function generateReport(habitsData) {
  console.log('\n📊 Feedback Report\n');
  console.log('─'.repeat(60));

  const habitsWithFeedback = habitsData.habits.filter(h => h.feedback);
  
  if (habitsWithFeedback.length === 0) {
    console.log('No feedback logged yet.');
    return;
  }

  // Sort by feedback score
  habitsWithFeedback.sort((a, b) => {
    const scoreA = a.feedback.positive - a.feedback.negative;
    const scoreB = b.feedback.positive - b.feedback.negative;
    return scoreB - scoreA;
  });

  habitsWithFeedback.forEach(habit => {
    const fb = habit.feedback;
    const total = fb.positive + fb.negative;
    const score = total > 0 
      ? ((fb.positive - fb.negative) / total * 100).toFixed(0)
      : 0;
    
    const indicator = score > 50 ? '🟢' : score < -50 ? '🔴' : '🟡';
    
    console.log(`${indicator} ${habit.name}`);
    console.log(`   Score: ${score}% | ${fb.positive}👍 ${fb.negative}👎 | Weight: ${(habit.weight || 1).toFixed(2)}`);
    
    // Show recent feedback
    if (fb.history.length > 0) {
      const recent = fb.history.slice(-3);
      recent.forEach(entry => {
        const emoji = entry.type === 'positive' ? '  ✓' : '  ✗';
        const noteStr = entry.note ? `: ${entry.note}` : '';
        console.log(`   ${emoji} ${entry.timestamp.slice(0, 10)}${noteStr}`);
      });
    }
    console.log('');
  });

  console.log('─'.repeat(60));
  
  // Summary stats
  const totalPositive = habitsWithFeedback.reduce((sum, h) => sum + h.feedback.positive, 0);
  const totalNegative = habitsWithFeedback.reduce((sum, h) => sum + h.feedback.negative, 0);
  console.log(`Total Feedback: ${totalPositive}👍 ${totalNegative}👎`);
}

// Parse arguments
const args = process.argv.slice(2);
const habitsData = loadHabits();

if (args.includes('--report')) {
  generateReport(habitsData);
} else if (args.includes('--habit')) {
  const habitIndex = args.indexOf('--habit');
  const habitId = args[habitIndex + 1];
  
  if (!habitId) {
    console.error('Usage: log-feedback.js --habit <id> --positive|--negative [--note "reason"]');
    process.exit(1);
  }

  const isPositive = args.includes('--positive');
  const isNegative = args.includes('--negative');

  if (!isPositive && !isNegative) {
    console.error('Specify --positive or --negative');
    process.exit(1);
  }

  let note = '';
  if (args.includes('--note')) {
    const noteIndex = args.indexOf('--note');
    note = args[noteIndex + 1] || '';
  }

  if (logFeedback(habitsData, habitId, isPositive, note)) {
    saveHabits(habitsData);
  }
} else {
  console.log('AI Habit Tracker - Feedback Logger');
  console.log('');
  console.log('Usage:');
  console.log('  node log-feedback.js --habit <id> --positive [--note "reason"]');
  console.log('  node log-feedback.js --habit <id> --negative [--note "reason"]');
  console.log('  node log-feedback.js --report');
  console.log('');
  console.log('Examples:');
  console.log('  node log-feedback.js --habit diary --positive --note "Sam appreciated the reflection"');
  console.log('  node log-feedback.js --habit memory-check --negative --note "Forgot to check yesterday"');
}
