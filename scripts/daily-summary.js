#!/usr/bin/env node

/**
 * AI Habit Tracker - Daily Summary Script
 * 
 * Usage:
 *   node daily-summary.js              Generate summary for today
 *   node daily-summary.js --markdown   Output in markdown format
 *   node daily-summary.js --json       Output in JSON format
 * 
 * Created by Lane (https://github.com/Lane-Copilot)
 */

const fs = require('fs');
const path = require('path');

// Configuration
const HABITS_FILE = path.join(__dirname, '..', 'habits.json');

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

// Check if habit was completed today
function isCompletedToday(habit) {
  if (!habit.lastCompleted) return false;
  const last = new Date(habit.lastCompleted);
  const now = new Date();
  return last.toDateString() === now.toDateString();
}

// Generate summary
function generateSummary(format = 'text') {
  const data = loadHabits();
  const habits = Object.entries(data.habits);
  const today = new Date().toISOString().split('T')[0];
  
  // Calculate stats
  const dailyHabits = habits.filter(([_, h]) => h.frequency === 'daily');
  const completed = dailyHabits.filter(([_, h]) => isCompletedToday(h));
  const pending = dailyHabits.filter(([_, h]) => !isCompletedToday(h));
  
  const completionRate = dailyHabits.length > 0 
    ? Math.round((completed.length / dailyHabits.length) * 100) 
    : 0;
  
  const avgWeight = habits.length > 0
    ? habits.reduce((sum, [_, h]) => sum + h.weight, 0) / habits.length
    : 0;
  
  const topStreak = habits.reduce((max, [_, h]) => 
    h.streak > max.streak ? h : max, { streak: 0, name: 'None' }
  );
  
  if (format === 'json') {
    return JSON.stringify({
      date: today,
      stats: {
        total: dailyHabits.length,
        completed: completed.length,
        pending: pending.length,
        completionRate,
        avgWeight: avgWeight.toFixed(2),
        topStreak: topStreak.name
      },
      completed: completed.map(([id, h]) => ({ id, name: h.name, streak: h.streak })),
      pending: pending.map(([id, h]) => ({ id, name: h.name }))
    }, null, 2);
  }
  
  if (format === 'markdown') {
    let output = `## 📊 Habit Summary — ${today}\n\n`;
    output += `| Metric | Value |\n`;
    output += `|--------|-------|\n`;
    output += `| Completion | ${completed.length}/${dailyHabits.length} (${completionRate}%) |\n`;
    output += `| Avg Weight | ${avgWeight.toFixed(2)} |\n`;
    output += `| Top Streak | ${topStreak.name} (${topStreak.streak} days) |\n\n`;
    
    if (completed.length > 0) {
      output += `### ✅ Completed\n`;
      completed.forEach(([_, h]) => {
        output += `- ${h.name} (streak: ${h.streak})\n`;
      });
      output += '\n';
    }
    
    if (pending.length > 0) {
      output += `### ⬜ Pending\n`;
      pending.forEach(([_, h]) => {
        output += `- ${h.name}\n`;
      });
    }
    
    return output;
  }
  
  // Default: text format
  let output = '\n';
  output += `📊 HABIT SUMMARY — ${today}\n`;
  output += '═'.repeat(50) + '\n';
  output += `Completion: ${completed.length}/${dailyHabits.length} daily habits (${completionRate}%)\n`;
  output += `Avg Weight: ${avgWeight.toFixed(2)}\n`;
  output += `Streak Leader: ${topStreak.name} (${topStreak.streak} days)\n\n`;
  
  if (completed.length > 0) {
    output += '✅ COMPLETED TODAY:\n';
    completed.forEach(([_, h]) => {
      output += `   • ${h.name} (streak: ${h.streak})\n`;
    });
    output += '\n';
  }
  
  if (pending.length > 0) {
    output += '⬜ PENDING:\n';
    pending.forEach(([_, h]) => {
      output += `   • ${h.name}\n`;
    });
  }
  
  output += '═'.repeat(50) + '\n';
  
  return output;
}

// Parse arguments
const args = process.argv.slice(2);

if (args.includes('--json')) {
  console.log(generateSummary('json'));
} else if (args.includes('--markdown')) {
  console.log(generateSummary('markdown'));
} else if (args.includes('--help')) {
  console.log(`
AI Habit Tracker - Daily Summary

Usage:
  node daily-summary.js              Generate summary (text format)
  node daily-summary.js --markdown   Output in markdown format
  node daily-summary.js --json       Output in JSON format
  `);
} else {
  console.log(generateSummary('text'));
}
