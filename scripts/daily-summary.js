#!/usr/bin/env node
/**
 * AI Habit Tracker - Daily Summary Generator
 * 
 * Generates a summary of habit progress for the day.
 * Designed to run at end of day (e.g., 9 PM via cron).
 * 
 * Usage: node daily-summary.js [--markdown]
 */

const fs = require('fs');
const path = require('path');

const HABITS_FILE = path.join(__dirname, '..', 'habits.json');

function loadHabits() {
  const data = fs.readFileSync(HABITS_FILE, 'utf-8');
  return JSON.parse(data);
}

function generateSummary(habitsData, asMarkdown = false) {
  const today = new Date().toISOString().slice(0, 10);
  const habits = habitsData.habits;
  
  // Calculate stats
  const completed = habits.filter(h => h.history && h.history.includes(today));
  const dailyHabits = habits.filter(h => h.frequency === 'daily');
  const completedDaily = completed.filter(h => h.frequency === 'daily');
  
  const completionRate = dailyHabits.length > 0 
    ? Math.round((completedDaily.length / dailyHabits.length) * 100) 
    : 0;
  
  const totalWeight = habits.reduce((sum, h) => sum + (h.weight || 1), 0);
  const avgWeight = habits.length > 0 ? (totalWeight / habits.length).toFixed(2) : 0;
  
  const longestStreak = Math.max(...habits.map(h => h.streak || 0), 0);
  const streakLeader = habits.find(h => h.streak === longestStreak);
  
  // Build output
  if (asMarkdown) {
    let md = `## 📊 Habit Summary — ${today}\n\n`;
    md += `**Completion Rate:** ${completedDaily.length}/${dailyHabits.length} daily habits (${completionRate}%)\n\n`;
    md += `**Average Weight:** ${avgWeight}\n\n`;
    
    if (streakLeader && longestStreak > 0) {
      md += `**Streak Leader:** ${streakLeader.name} (${longestStreak} days)\n\n`;
    }
    
    md += `### Completed Today\n`;
    if (completed.length > 0) {
      completed.forEach(h => {
        md += `- ✅ ${h.name} (streak: ${h.streak})\n`;
      });
    } else {
      md += `- *(none)*\n`;
    }
    
    md += `\n### Pending\n`;
    const pending = dailyHabits.filter(h => !completed.includes(h));
    if (pending.length > 0) {
      pending.forEach(h => {
        md += `- ⚪ ${h.name}\n`;
      });
    } else {
      md += `- *(all daily habits complete!)*\n`;
    }
    
    return md;
  }
  
  // Plain text output
  let output = `\n📊 HABIT SUMMARY — ${today}\n`;
  output += '═'.repeat(40) + '\n\n';
  
  output += `Completion: ${completedDaily.length}/${dailyHabits.length} daily habits (${completionRate}%)\n`;
  output += `Avg Weight: ${avgWeight}\n`;
  
  if (streakLeader && longestStreak > 0) {
    output += `Streak Leader: ${streakLeader.name} (${longestStreak} days)\n`;
  }
  
  output += '\n✅ COMPLETED TODAY:\n';
  if (completed.length > 0) {
    completed.forEach(h => {
      output += `   • ${h.name} (streak: ${h.streak})\n`;
    });
  } else {
    output += '   (none)\n';
  }
  
  output += '\n⚪ PENDING:\n';
  const pending = dailyHabits.filter(h => !completed.includes(h));
  if (pending.length > 0) {
    pending.forEach(h => {
      output += `   • ${h.name}\n`;
    });
  } else {
    output += '   (all daily habits complete!)\n';
  }
  
  output += '\n' + '═'.repeat(40) + '\n';
  
  return output;
}

// Main
const args = process.argv.slice(2);
const asMarkdown = args.includes('--markdown');

const habitsData = loadHabits();
const summary = generateSummary(habitsData, asMarkdown);

console.log(summary);
