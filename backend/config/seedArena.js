import { Challenge } from '../models/Arena.js';

const seedArena = async () => {
  try {
    // 1. Run in-place migrations to replace pre-solved boilerplates with skeleton stubs
    const migratedTech = await Challenge.updateMany(
      { category: 'Technical', boilerplate: { $regex: /split|return/ } },
      { $set: { boilerplate: `function solution(val) {\n  // Write your code here\n  \n}` } }
    );
    if (migratedTech.modifiedCount > 0) {
      console.log(`⚡ Migrated ${migratedTech.modifiedCount} Technical challenges to use skeleton boilerplates.`);
    }

    const migratedDomain = await Challenge.updateMany(
      { category: 'Domain', boilerplate: { $regex: /service-v/ } },
      { $set: { boilerplate: `function solution(path) {\n  // Write your code here\n  \n}` } }
    );
    if (migratedDomain.modifiedCount > 0) {
      console.log(`⚡ Migrated ${migratedDomain.modifiedCount} Domain challenges to use skeleton boilerplates.`);
    }

    const totalCount = await Challenge.countDocuments();
    console.log(`📊 Current Arena challenge count: ${totalCount}`);

    const categories = ['Technical', 'Domain', 'Aptitude', 'HR'];
    const targetCount = 100;

    for (const category of categories) {
      const catCount = await Challenge.countDocuments({ category });
      console.log(`👉 Category ${category} has ${catCount} challenges.`);

      if (catCount < targetCount) {
        const needed = targetCount - catCount;
        console.log(`🌱 Seeding ${needed} new challenges for category ${category}...`);

        const seededChallenges = [];

        for (let i = 1; i <= needed; i++) {
          const index = catCount + i;

          if (category === 'Technical') {
            const difficulties = ['Novice', 'Adept', 'Elite', 'Apex'];
            const difficulty = difficulties[index % 4];
            const xpValue = 100 + (index % 6) * 100;

            seededChallenges.push({
              title: `Algorithmic Challenge #${index}`,
              category: 'Technical',
              difficulty,
              xpValue,
              problemStatement: `Develop a high-performance JavaScript function solution(val) that evaluates case index ${index}.\n\nSpecifically, if the input is a string, return the string reversed. If the input is a number, return the square of that number. Otherwise, return null.`,
              boilerplate: `function solution(val) {\n  // Write your code here\n  \n}`,
              constraints: [`Input val must be non-null`, `Execution time limit < 1000ms`, `Version parameter: v${index}`],
              testCases: [
                { input: '"hello"', output: '"olleh"' },
                { input: '5', output: '25' },
                { input: 'null', output: 'null' }
              ]
            });
          } else if (category === 'Domain') {
            const difficulties = ['Novice', 'Adept', 'Elite', 'Apex'];
            const difficulty = difficulties[index % 4];
            const xpValue = 150 + (index % 5) * 100;

            seededChallenges.push({
              title: `Infrastructure Design #${index}`,
              category: 'Domain',
              difficulty,
              xpValue,
              problemStatement: `Determine the correct configuration for service router v${index}.\n\nThe gateway must route /api/v${index}/services directly to service-v${index}. Write a function to check if the route matches.`,
              boilerplate: `function solution(path) {\n  // Write your code here\n  \n}`,
              constraints: [`Gateway configuration version: ${index}`, `Standard YAML API rules apply.`],
              testCases: [
                { input: `"/api/v${index}/services"`, output: `"service-v${index}"` },
                { input: `"/other"`, output: `"default"` }
              ]
            });
          } else if (category === 'Aptitude') {
            const difficulties = ['Novice', 'Adept', 'Elite', 'Apex'];
            const difficulty = difficulties[index % 4];
            const xpValue = 100 + (index % 4) * 80;

            const answers = [
              `Value calculated is ${index * 10}`,
              `Value calculated is ${index * 20}`,
              `Value calculated is ${index * 30}`,
              `Value calculated is ${index * 40}`
            ];
            const correctIndex = index % 4;

            seededChallenges.push({
              title: `Quantitative Analysis #${index}`,
              category: 'Aptitude',
              difficulty,
              xpValue,
              problemStatement: `Solve the following logic problem for iteration #${index}: An arithmetic progression is created where the common difference is ${index}. If the first term is ${index}, what is the value of the 10th term (n=10)?`,
              mcqOptions: answers,
              correctAnswerIndex: correctIndex
            });
          } else if (category === 'HR') {
            const difficulties = ['Novice', 'Adept', 'Elite', 'Apex'];
            const difficulty = difficulties[index % 4];
            const xpValue = 120 + (index % 3) * 90;

            seededChallenges.push({
              title: `Scenario Evaluation #${index}`,
              category: 'HR',
              difficulty,
              xpValue,
              problemStatement: `Describe a situation evaluating task management under pressure version v${index}.\n\nHow would you manage a situation where a critical cross-team dependency for milestone v${index} falls behind right before deployment?`,
              behavioralPrompt: `Outline your Situation, Task, Action, and Result (STAR method). Highlight mitigation and communications.`
            });
          }
        }

        await Challenge.insertMany(seededChallenges);
        console.log(`✅ Seeded ${seededChallenges.length} challenges for ${category}.`);
      }
    }

    console.log(`🏁 seedArena script completed successfully.`);
  } catch (error) {
    console.error(`❌ seedArena failed: ${error.message}`);
  }
};

export default seedArena;
