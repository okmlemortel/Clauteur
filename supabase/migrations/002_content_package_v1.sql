-- Migration: 002_content_package_v1.sql
-- Purpose: Add 10 case templates from Content Package v1
-- Note: The original seed cases "The Baker's Dilemma" and "The Missing Concert Tickets"
-- remain in 001_initial_schema.sql as reference seed data. These 10 cases represent
-- the full official case library.

-- ============================================================================
-- DIFFICULTY 2 CASES (6 cases)
-- ============================================================================

-- Case #001 — The DJ's Dilemma
INSERT INTO case_templates (
  title, narrative, target_skills, prerequisite_skills, difficulty,
  anchor_type, plan_prompt, solution_path, probe_questions, explain_language
) VALUES (
  'Case #001 — The DJ''s dilemma',
  'You''re helping your friend DJ a school dance. Each song is about 3 and a half minutes long. The dance lasts 2 hours. The principal says there MUST be a 30-second break between every song for the DJ to set up the next track. Your friend asks: ''How many songs do I need to prepare?'' But here''s the twist — she also wants to include two 5-minute slow dance sets where she plays 2 songs back-to-back with no break.',
  ARRAY['rate_conversion', 'estimation', 'sequencing'],
  ARRAY['operations_fluency'],
  2,
  'music',
  'Before you calculate anything — what information do you have, what do you need to find, and what''s your approach? Think about all the different time chunks.',
  '{"steps":["Total time: 2 hours = 120 minutes","Slow dance time: 2 sets × 5 minutes = 10 minutes. Each set has 2 songs = 4 slow songs total.","Remaining time for regular songs: 120 - 10 = 110 minutes","Each regular song cycle: 3.5 min song + 0.5 min break = 4 minutes per cycle","Number of regular song cycles: 110 ÷ 4 = 27.5, so 27 full cycles (can''t play half a song)","Time used by 27 regular songs: 27 × 4 = 108 minutes. Remaining: 110 - 108 = 2 minutes (not enough for another 3.5 min song)","Total songs needed: 27 regular + 4 slow = 31 songs","Smart DJ advice: prepare 35 songs in case some don''t work or the dance runs long"],"common_errors":["Forgetting the 30-second breaks between songs","Not subtracting the slow dance time first","Dividing 120 by 3.5 without accounting for breaks"]}'::jsonb,
  ARRAY['What if the dance got extended to 2.5 hours? How many extra songs?', 'What if the songs were 4 minutes instead of 3.5? Would that make a big difference?', 'Your friend says ''just divide 120 by 3.5 and that''s 34 songs.'' Is she right? What''s she missing?'],
  'fr'
);

-- Case #002 — The Mystery Ingredients
INSERT INTO case_templates (
  title, narrative, target_skills, prerequisite_skills, difficulty,
  anchor_type, plan_prompt, solution_path, probe_questions, explain_language
) VALUES (
  'Case #002 — The mystery ingredients',
  'You''re baking for a school fundraiser. You have a cookie recipe that makes 24 cookies using 2¼ cups of flour, ¾ cup of sugar, and ⅓ cup of butter. You need to make 60 cookies total. BUT — you check the cupboard and you only have 5 cups of flour, 2 cups of sugar, and 1 cup of butter. Can you make all 60 cookies? If not, what''s the maximum number you can make with what you have? Which ingredient runs out first?',
  ARRAY['fractions_as_reasoning', 'proportional_direct', 'justification_depth'],
  ARRAY['fractions_operations'],
  2,
  'cooking',
  'There are multiple things to figure out here. What''s your investigation plan? What do you need to check for EACH ingredient?',
  '{"steps":["Scale factor: 60 ÷ 24 = 2.5 (need 2.5× the recipe)","Flour needed: 2.25 × 2.5 = 5.625 cups. Have 5 cups. NOT ENOUGH.","Sugar needed: 0.75 × 2.5 = 1.875 cups. Have 2 cups. OK.","Butter needed: 0.333 × 2.5 = 0.833 cups. Have 1 cup. OK.","Flour is the bottleneck. How many cookies can 5 cups make?","5 ÷ 2.25 = 2.222... batches. So 2.222 × 24 ≈ 53 cookies.","Check sugar for 53 cookies: 0.75 × (53/24) = 1.656 cups. Still under 2. OK.","Check butter for 53 cookies: 0.333 × (53/24) = 0.736 cups. Still under 1. OK.","Maximum: 53 cookies. Flour runs out first."],"common_errors":["Forgetting to check ALL three ingredients","Rounding the scale factor and losing precision","Not identifying which ingredient is the constraint"]}'::jsonb,
  ARRAY['If your friend brings an extra cup of flour, does that change the answer?', 'Which ingredient do you have the most ''extra'' of compared to what you need?', 'Write a shopping list: how much more of each ingredient would you need to hit exactly 60?'],
  'fr'
);

-- Case #003 — The Commute Investigation
INSERT INTO case_templates (
  title, narrative, target_skills, prerequisite_skills, difficulty,
  anchor_type, plan_prompt, solution_path, probe_questions, explain_language
) VALUES (
  'Case #003 — The commute investigation',
  'A student named Alex claims he walks to school in 20 minutes. The school is 1.5 km away. His teacher says ''That''s impossible, you''d have to walk way too fast.'' Another student, Priya, says ''No, that''s totally reasonable.'' Who''s right? Figure out how fast Alex would need to walk, and decide if that speed is realistic for a teenager walking to school.',
  ARRAY['rate_conversion', 'metacognition', 'causal_chains'],
  ARRAY['operations_fluency', 'decimals'],
  2,
  'mystery',
  'What information do you have? What do you need to figure out? And what would help you decide if the answer is ''realistic'' or not?',
  '{"steps":["Distance: 1.5 km. Time: 20 minutes.","Speed = distance ÷ time = 1.5 km ÷ 20 min = 0.075 km/min","Convert to km/h: 0.075 × 60 = 4.5 km/h","Normal walking speed for a teenager: about 4-5 km/h","4.5 km/h is within normal range — Priya is right, it''s realistic","The teacher might be thinking of running speed or overestimating the distance"],"common_errors":["Confusing km/min with km/h","Not knowing how to convert minutes to hours for speed","Having the answer (4.5) but not knowing if it''s fast or slow"]}'::jsonb,
  ARRAY['What if Alex said he did it in 10 minutes? Would that change the answer?', 'What''s the fastest YOU could walk 1.5 km? How would you figure that out?', 'This is the first problem where you had to decide if a NUMBER was reasonable, not just calculate it. What made that harder or easier than a regular math problem?'],
  'en'
);

-- Case #004 — The Discount Detective
INSERT INTO case_templates (
  title, narrative, target_skills, prerequisite_skills, difficulty,
  anchor_type, plan_prompt, solution_path, probe_questions, explain_language
) VALUES (
  'Case #004 — The discount detective',
  'Two stores are selling the same headphones. Store A has them for $80 with a 25% discount. Store B has them for $70 with a 15% discount. Your friend says ''Obviously Store A is cheaper because 25% off is a bigger discount than 15%.'' Is your friend right? And here''s the real question: how much would you actually pay at each store?',
  ARRAY['percentages', 'proportional_direct', 'counterarguments'],
  ARRAY['proportional_direct', 'decimals'],
  2,
  'mystery',
  'Your friend is making an assumption. What do you need to calculate to check if she''s right? What''s the trap in her reasoning?',
  '{"steps":["Store A: $80 with 25% off. Discount = 80 × 0.25 = $20. Final price = $60.","Store B: $70 with 15% off. Discount = 70 × 0.15 = $10.50. Final price = $59.50.","Store B is actually cheaper by $0.50, even though the discount percentage is smaller.","The friend''s error: she compared percentages without considering the starting prices.","The lesson: you can''t compare discounts without comparing final prices."],"common_errors":["Agreeing with the friend because 25 > 15","Calculating the discount amount but not the final price","Percentage calculation errors (moving the decimal wrong)"]}'::jsonb,
  ARRAY['At what discount would Store A become cheaper than Store B?', 'Your friend says ''but 25 is bigger than 15, so Store A is obviously better.'' Write a 2-sentence counter-argument.', 'Can you think of another situation where a bigger percentage doesn''t mean a bigger amount?'],
  'fr'
);

-- Case #005 — The Party Planner Returns
INSERT INTO case_templates (
  title, narrative, target_skills, prerequisite_skills, difficulty,
  anchor_type, plan_prompt, solution_path, probe_questions, explain_language
) VALUES (
  'Case #005 — The party planner returns',
  'You''re planning snacks for a class trip. There are 28 students. You need to figure out: (A) If pizza comes in boxes of 8 slices and each student gets 3 slices, how many boxes do you need to order? (B) If juice boxes come in packs of 6, how many packs do you need so everyone gets one? (C) After buying all the pizza and juice, you have $50 left for cookies. Each cookie costs $1.75. How many cookies can you buy, and can every student get at least one?',
  ARRAY['division_remainders', 'fractions_as_reasoning', 'multi_constraint'],
  ARRAY['operations_fluency'],
  2,
  'planning',
  'There are three separate problems here. Can you identify what makes each one tricky? Hint: pay attention to what happens with leftovers.',
  '{"steps":["A: Total slices needed = 28 × 3 = 84. Boxes = 84 ÷ 8 = 10.5. MUST round UP = 11 boxes. Leftover: 4.","B: Packs = 28 ÷ 6 = 4.67. MUST round UP = 5 packs. Leftover: 2.","C: Cookies = 50 ÷ 1.75 = 28.57. MUST round DOWN = 28 cookies. Cost: $49. Change: $1.00.","Key insight: context tells you whether to round up or down."],"common_errors":["Rounding down for pizza","Rounding the same way for all three","Not checking if 28 cookies is enough for 28 students"]}'::jsonb,
  ARRAY['In which problems did you round UP and in which did you round DOWN? Why was it different?', 'If 2 more students join the trip, which of the three answers changes the most?', 'Explain to a younger kid WHY you can''t just round the normal way in these problems.'],
  'fr'
);

-- Case #009 — The Fairness Debate
INSERT INTO case_templates (
  title, narrative, target_skills, prerequisite_skills, difficulty,
  anchor_type, plan_prompt, solution_path, probe_questions, explain_language
) VALUES (
  'Case #009 — The fairness debate',
  'Three friends did a group project. Aisha did the research (took 4 hours), Ben made the presentation (took 2 hours), and Carlos presented it to the class (took 30 minutes). They got a $50 gift card as a prize. There are three proposals for splitting it:

Proposal A (Aisha''s): Split by hours worked.
Proposal B (Carlos''s): Split equally.
Proposal C (Ben''s): Aisha gets half, he gets a third, Carlos gets the rest.

Write a 3-sentence argument for the proposal you think is fairest. Then write 1 sentence for a different proposal to show you understand the other side.',
  ARRAY['fractions_as_reasoning', 'counterarguments', 'justification_depth', 'written_structure'],
  ARRAY['fractions_operations'],
  2,
  'planning',
  'Before you pick a side, calculate what each person would get under each proposal. Then decide.',
  '{"steps":["Total hours: 6.5","Proposal A: Aisha=$30.77, Ben=$15.38, Carlos=$3.85","Proposal B: Everyone gets $16.67","Proposal C: Aisha=$25, Ben=$16.67, Carlos=$8.33","No right answer — argument quality matters"],"common_errors":["Not calculating all three proposals","Picking without mathematical evidence","Saying equal is always fair"]}'::jsonb,
  ARRAY['Carlos says presenting is hardest. Does that change your argument?', 'What if Aisha''s research was bad? Should she still get the most?', 'Is fair the same as equal? Example from your life.'],
  'en'
);

-- ============================================================================
-- DIFFICULTY 3 CASES (3 cases)
-- ============================================================================

-- Case #006 — The Temperature Mystery
INSERT INTO case_templates (
  title, narrative, target_skills, prerequisite_skills, difficulty,
  anchor_type, plan_prompt, solution_path, probe_questions, explain_language
) VALUES (
  'Case #006 — The temperature mystery',
  'A science class is tracking temperatures for a week. Monday: 5°C. Tuesday: 2°C. Wednesday: -1°C. Thursday: -4°C. Friday: -2°C. The teacher asks three questions: (1) What''s the difference between Monday and Thursday''s temperatures? (2) On which day did the temperature drop the most compared to the day before? (3) If the pattern from Monday to Thursday continued, what would Saturday''s temperature be?',
  ARRAY['negative_numbers', 'causal_chains', 'connectors_en'],
  ARRAY['number_sense', 'operations_fluency'],
  2,
  'mystery',
  'Before calculating, draw yourself a mental picture of these temperatures. Which direction is ''colder''? How would you find the ''difference'' between a positive and negative number?',
  '{"steps":["1. Difference: 5 - (-4) = 5 + 4 = 9°C","2. Daily drops: Mon→Tue: -3°C. Tue→Wed: -3°C. Wed→Thu: -3°C. Thu→Fri: +2°C. Same drop for Mon-Thu. Friday went UP.","3. Pattern: drops 3°C/day. Saturday would be -10°C. But Friday broke the pattern."],"common_errors":["Saying difference is 5-4=1","Confusing ''dropped'' with ''is negative''","Not noticing Friday broke the pattern"]}'::jsonb,
  ARRAY['Why does subtracting a negative number mean adding?', 'Friday went UP from Thursday. What does that tell us?', 'What grade would you give a student who said the difference between 5 and -4 is 1?'],
  'en'
);

-- Case #007 — The Secret Code
INSERT INTO case_templates (
  title, narrative, target_skills, prerequisite_skills, difficulty,
  anchor_type, plan_prompt, solution_path, probe_questions, explain_language
) VALUES (
  'Case #007 — The secret code',
  'Nancy Drew found a coded message. The code works like this: each letter is worth a number (A=1, B=2, C=3... Z=26). A word''s ''value'' is the sum of all its letter values. She found three clues: (1) The code word has a value of 52. (2) The word has exactly 4 letters. (3) The first letter has double the value of the last letter. If we call the first letter''s value F and the last letter''s value L, we know F = 2L. Can you figure out possible combinations? What if the middle two letters have the same value?',
  ARRAY['variables_unknowns', 'causal_chains', 'written_structure'],
  ARRAY['operations_fluency', 'proportional_direct'],
  3,
  'mystery',
  'This is an algebra puzzle disguised as a code. What do you know? What are the unknowns? Can you write an equation?',
  '{"steps":["Let F = first, M = middle (same for both), L = last","F + 2M + L = 52","F = 2L → 3L + 2M = 52","L must be 1-13 (since F=2L ≤ 26)","Try L=4: M=20=T, F=8=H → H-T-T-D","Try L=6: M=17=Q, F=12=L → L-Q-Q-F","Multiple solutions exist — process matters more than answer"],"common_errors":["Not knowing how to set up the equation","Forgetting letter values max at 26","Guessing instead of using algebra"]}'::jsonb,
  ARRAY['What if the middle letters don''t have to be the same?', 'You used variables. Did the G/P/S approach help?', 'Write a similar puzzle for a friend with exactly one solution.'],
  'fr'
);

-- Case #008 — The Playlist Sequel
INSERT INTO case_templates (
  title, narrative, target_skills, prerequisite_skills, difficulty,
  anchor_type, plan_prompt, solution_path, probe_questions, explain_language
) VALUES (
  'Case #008 — The playlist sequel',
  'Your friend from Case #001 is back. She''s now streaming music on two platforms. Platform A charges $0.004 per stream. Platform B charges $0.006 per stream but gives a $10 bonus if you hit 5,000 streams in a month. She averaged 180 streams per day last month. (1) How much did she earn from each platform? (2) Which platform pays more? (3) How many streams per day would she need to make Platform B always better than Platform A?',
  ARRAY['rate_conversion', 'proportional_direct', 'estimation'],
  ARRAY['rate_conversion', 'decimals'],
  3,
  'music',
  'There are multiple calculations here AND a comparison. What order should you tackle them?',
  '{"steps":["Monthly streams: 180 × 30 = 5,400","Platform A: 5,400 × $0.004 = $21.60","Platform B: 5,400 × $0.006 = $32.40 + $10 bonus = $42.40","B pays almost double.","For B to always beat A: need 5,000 streams = 167/day minimum.","B rate > A rate always, so B always pays more per stream."],"common_errors":["Not checking bonus qualification","Decimal placement errors","Forgetting daily to monthly conversion"]}'::jsonb,
  ARRAY['What if Platform A raised to $0.007?', 'Should she stay on both platforms?', 'Explain in French which platform to focus on and why.'],
  'fr'
);

-- Case #010 — The Pattern Breaker
INSERT INTO case_templates (
  title, narrative, target_skills, prerequisite_skills, difficulty,
  anchor_type, plan_prompt, solution_path, probe_questions, explain_language
) VALUES (
  'Case #010 — The pattern breaker',
  'Detective Olivia has found a series of numbers at a crime scene: 2, 6, 12, 20, 30, ?

The detective before you said the next number is 42. Your job: (1) Is the detective right? (2) What''s the RULE behind this pattern? (3) What would the 10th number be?

Bonus mystery: there''s a SECOND pattern hidden inside. The differences between consecutive numbers are: 4, 6, 8, 10... What do you notice about THOSE numbers?',
  ARRAY['patterns_functions', 'transfer_unfamiliar', 'metacognition'],
  ARRAY['operations_fluency', 'sequencing'],
  3,
  'mystery',
  'When you see a number pattern, what''s the first thing a detective should do? What are different ways to find a hidden rule?',
  '{"steps":["Differences: 4,6,8,10 → +2 each time","Next difference: 12 → 30+12=42. Detective is RIGHT.","Rule: n×(n+1). 10th = 10×11 = 110","Hidden pattern: differences are even numbers starting at 4."],"common_errors":["Looking for single multiply/add rule","Finding next number but not the rule","Can''t jump to 10th without listing all"]}'::jsonb,
  ARRAY['Find the pattern another way (hint: multiply two numbers for each term).', 'If someone says ''50th number is 2550,'' how to check without listing all 50?', 'New problem type. What strategy did you use? Same as cooking/music or different?'],
  'fr'
);
