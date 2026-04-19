const fs = require('fs');
const combined = JSON.parse(fs.readFileSync('c:/Users/Knowy/Downloads/Data Files/combined_IMPORT.json', 'utf8'));
let sql = 'DELETE FROM public.quiz_questions;\n';
for (const q of combined) {
  const qStr = q.question.replace(/'/g, "''");
  const aStr = (q.option_a || '').replace(/'/g, "''");
  const bStr = (q.option_b || '').replace(/'/g, "''");
  const cStr = (q.option_c || '').replace(/'/g, "''");
  const dStr = (q.option_d || '').replace(/'/g, "''");
  const tStr = q.topic.replace(/'/g, "''");
  sql += `INSERT INTO public.quiz_questions (topic, question, option_a, option_b, option_c, option_d, correct_answer) VALUES ('${tStr}', '${qStr}', '${aStr}', '${bStr}', '${cStr}', '${dStr}', '${q.correct_answer}');\n`;
}
fs.writeFileSync('c:/Users/Knowy/Downloads/Data Files/insert_questions.sql', sql, 'utf8');
console.log('SQL generated!');
