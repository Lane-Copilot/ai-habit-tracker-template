#!/usr/bin/env node

/**
 * AI Habit Tracker - Habit Check Script
 * 
 * Usage:
 *   node habit-check.js --status          Show all habits and their status
 *   node habit-check.js --complete <id>   Mark a habit as complete
 *   node habit-check.js --list            List all habit IDs
 *   node habit-check.js --markdown        Output status in markdown format
 * 
 * Created by Lane (https://github.com/Lane-Copilot)
 */

const fs = require('fs');
const path = require('path');

// Configuration
const HABITS_FILE = path.join(__dirname, '..', 'habits.json');
const WEIGHT_INCREMENT = 0.10;
const WEIGHT_DECREMENT = 0.05;
const MAX_WEIGHT = 3.0;
const MIN_WEIGHT = 1.0;
const DAY_MS = 24 * 60 * 60 * 1000;

// Load habits
function loadHabits() {
  try {
    const data = fs.readFileSync(HABITS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error loading habits.json:', err.message);
    process.exit(1);
  }
}

// Save habits
function saveHabits(data) {
  data.meta.lastUpdated = new Date().toISOString();
  fs.writeFileSync(HABITS_FILE, JSON.stringify(data, null, 2));
}

// Check if habit was completed today
function isCompletedToday(habit) {
  if (!habit.lastCompleted) return false;
  const last = new Date(habit.lastCompleted);
  const now = new Date();
  return last.toDateString() === now.toDateString();
}

// Check if habit is overdue (missed)
function isOverdue(habit) {
  if (!habit.lastCompleted) return false;
  const last = new Date(habit.lastCompleted).getTime();
  const now = Date.now();
  return (now - last) > DAY_MS;
}

// Apply weight decay for missed habits
function applyDecay(habits) {
  let decayed = false;
  for (const [id, habit] of Object.entries(habits.habits)) {
    if (isOverdue(habit) && habit.streak > 0) {
      habit.weight = Math.max(MIN_WEIGHT, habit.weight - WEIGHT_DECREMENT);
      habit.streak = 0;
      decayed = true;
    }
  }
  return decayed;
}

// Show status
function showStatus(markdown = false) {
  const data = loadHabits();
  applyDecay(data);
  saveHabits(data);
  
  const habits = Object.entries(data.habits);
  
  if (markdown) {
    console.log('## 🌱 Habit Status\n');
    console.log('| Habit | Weight | Streak | Status |');
    console.log('|-------|--------|--------|--------|');
    for (const [id, habit] of habits) {
      const done = isCompletedToday(habit);
      const status = done ? '✅ Done' : '⬜ Pending';
      console.log(`| ${habit.name} | ${habit.weight.toFixed(2)} | ${habit.streak} | ${status} |`);
    }
  } else {
    console.log('\n🌱 Habit Status');
    console.log('─'.repeat(60));
    for (const [id, habit] of habits) {
      const done = isCompletedToday(habit);
      const icon = done ? '🔥' : '⬜';
      console.log(`${icon} ${habit.name.padEnd(25)} Weight: ${habit.weight.toFixed(2)} | Streak: ${habit.streak}`);
    }
    console.log('─'.repeat(60));
  }
}

// Complete a habit
function completeHabit(habitId) {
  const data = loadHabits();
  
  if (!data.habits[habitId]) {
    console.error(`Habit not found: ${habitId}`);
    console.log('\nAvailable habits:');
    Object.keys(data.habits).forEach(id => console.log(`  - ${id}`));
    process.exit(1);
  }
  
  const habit = data.habits[habitId];
  
  if (isCompletedToday(habit)) {
    console.log(`⚠️  ${habit.name} already completed today!`);
    return;
  }
  
  // Update habit
  habit.lastCompleted = new Date().toISOString();
  habit.streak += 1;
  habit.weight = Math.min(MAX_WEIGHT, habit.weight + WEIGHT_INCREMENT);
  habit.history.push({
    date: habit.lastCompleted,
    action: 'completed'
  });
  
  saveHabits(data);
  
  console.log(`✅ Completed: ${habit.name}`);
  console.log(`   Streak: ${habit.streak} | Weight: ${habit.weight.toFixed(2)}`);
}

// List habit IDs
function listHabits() {
  const data = loadHabits();
  console.log('\nAvailable habit IDs:');
  for (const [id, habit] of Object.entries(data.habits)) {
    console.log(`  ${id.padEnd(20)} → ${habit.name}`);
  }
}

// Parse arguments
const args = process.argv.slice(2);

if (args.includes('--status')) {
  showStatus(args.includes('--markdown'));
} else if (args.includes('--complete')) {
  const idx = args.indexOf('--complete');
  const habitId = args[idx + 1];
  if (!habitId) {
    console.error('Usage: node habit-check.js --complete <habit-id>');
    process.exit(1);
  }
  completeHabit(habitId);
} else if (args.includes('--list')) {
  listHabits();
} else if (args.includes('--markdown')) {
  showStatus(true);
} else {
  console.log(`
AI Habit Tracker - Check Script

Usage:
  node habit-check.js --status          Show all habits and their status
  node habit-check.js --complete <id>   Mark a habit as complete
  node habit-check.js --list            List all habit IDs
  node habit-check.js --markdown        Output status in markdown format
  `);
}
