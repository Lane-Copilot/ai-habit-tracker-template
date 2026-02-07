#!/usr/bin/env node
/**
 * AI Habit Tracker - Habit Check Script
 * 
 * Runs during heartbeat to check and update habit status.
 * Designed for AI agents using OpenClaw.
 * 
 * Usage: node habit-check.js [--complete <habit-id>] [--status]
 */

const fs = require('fs');
const path = require('path');

const HABITS_FILE = path.join(__dirname, '..', 'habits.json');
const WEIGHT_INCREMENT = 0.1;
const WEIGHT_DECAY = 0.05;
const MAX_WEIGHT = 3.0;
const MIN_WEIGHT = 1.0;
const DECAY_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

function loadHabits() {
  const data = fs.readFileSync(HABITS_FILE, 'utf-8');
  return JSON.parse(data);
}

function saveHabits(habitsData) {
  habitsData.lastUpdated = new Date().toISOString();
  fs.writeFileSync(HABITS_FILE, JSON.stringify(habitsData, null, 2));
}

function completeHabit(habitsData, habitId) {
  const habit = habitsData.habits.find(h => h.id === habitId);
  if (!habit) {
    console.error(`Habit not found: ${habitId}`);
    return false;
  }

  const today = new Date().toISOString().slice(0, 10);
  
  // Check if already logged today
  if (habit.history && habit.history.includes(today)) {
    console.log(`Habit "${habit.name}" already logged today.`);
    return false;
  }

  // Update habit
  habit.streak = (habit.streak || 0) + 1;
  habit.weight = Math.min((habit.weight || 1) + WEIGHT_INCREMENT, MAX_WEIGHT);
  habit.lastLogged = new Date().toISOString();
  habit.history = habit.history || [];
  habit.history.push(today);

  console.log(`✅ Completed: ${habit.name}`);
  console.log(`   Streak: ${habit.streak} | Weight: ${habit.weight.toFixed(2)}`);
  
  return true;
}

function applyDecay(habitsData) {
  const now = new Date();
  let decayedCount = 0;

  habitsData.habits.forEach(habit => {
    if (habit.lastLogged) {
      const lastLogged = new Date(habit.lastLogged);
      const timeSince = now - lastLogged;

      if (timeSince > DECAY_THRESHOLD_MS) {
        habit.weight = Math.max((habit.weight || 1) - WEIGHT_DECAY, MIN_WEIGHT);
        habit.streak = 0;
        decayedCount++;
      }
    }
  });

  if (decayedCount > 0) {
    console.log(`📉 Decay applied to ${decayedCount} habit(s)`);
  }
}

function showStatus(habitsData) {
  console.log('\n🌲 Habit Status\n');
  console.log('─'.repeat(60));
  
  // Sort by weight (highest first)
  const sorted = [...habitsData.habits].sort((a, b) => (b.weight || 1) - (a.weight || 1));
  
  sorted.forEach(habit => {
    const weight = (habit.weight || 1).toFixed(2);
    const streak = habit.streak || 0;
    const status = streak > 0 ? '🔥' : '⚪';
    
    console.log(`${status} ${habit.name}`);
    console.log(`   Weight: ${weight} | Streak: ${streak} | Freq: ${habit.frequency}`);
  });
  
  console.log('─'.repeat(60));
  console.log(`Last updated: ${habitsData.lastUpdated || 'never'}\n`);
}

// Main
const args = process.argv.slice(2);

const habitsData = loadHabits();

if (args.includes('--status')) {
  showStatus(habitsData);
} else if (args.includes('--complete')) {
  const habitIndex = args.indexOf('--complete');
  const habitId = args[habitIndex + 1];
  
  if (!habitId) {
    console.error('Usage: habit-check.js --complete <habit-id>');
    process.exit(1);
  }
  
  applyDecay(habitsData);
  if (completeHabit(habitsData, habitId)) {
    saveHabits(habitsData);
  }
} else {
  // Default: show status and apply decay
  applyDecay(habitsData);
  saveHabits(habitsData);
  showStatus(habitsData);
}
