const q = (number, prompt, options, correctIndex = null, note = '') => ({
  id: `q-${number}`,
  number,
  prompt,
  options,
  correctIndex,
  answerStatus: Number.isInteger(correctIndex) ? 'verified' : 'needs_review',
  note,
});

const answerOnly = (number, prompt, answer, note = '') => ({
  ...q(number, prompt, [answer], null, note),
  answerOnly: true,
  answerStatus: 'source_reference',
});

const recording = (order, questions, title = '') => ({
  id: `recording-${order}`,
  order,
  title: title || `المقطع الصوتي ${order}`,
  audioUrl: null,
  questions,
});

export const listeningModels = [
  {
    id: 'listening-01', order: 1, title: 'نموذج الاستماع الأول', subtitle: 'محاضرات قصيرة وحوارات أكاديمية',
    recordings: [
      recording(1, [
        q(1, 'What important point does the lecturer make about Coca Cola company?', ['It sells bottles and cans.', 'It makes other products.', 'It has excellent advertising.'], 2),
        q(2, 'How many years has Coca Cola been the Olympic sponsor?', ['70', '80', '90'], 2),
        q(3, 'In what year did Coca Cola company start making its drink in cans?', ['1894', '1928', '1955'], 2),
      ]),
      recording(2, [
        q(4, 'What does the lecturer think about the retirement age?', ["It's suitable.", "It's too low.", "It's too high."], 1),
        q(5, 'What does the lecturer think is the reason that older people work?', ['to support their families.', 'to train new employees.', 'to travel around the world.'], 0),
        q(6, 'What does the lecturer think is the reason that businesses hire older workers?', ['to train younger employees.', 'to make their lives easier.', 'to save money.'], 0),
      ]),
      recording(3, [
        q(7, 'When will the students have a test?', ['on Wednesday', 'next Monday', 'next week'], 1),
        q(8, 'How should the students answer the questions?', ['alone', 'in pairs', 'in groups'], null, 'الإجابة غير معلّمة في المصدر.'),
        q(9, 'Which page should the students read for questions?', ['Page 5', 'Page 10', 'Page 100'], null, 'الإجابة غير معلّمة في المصدر.'),
      ]),
      recording(4, [
        q(10, 'What information proves SAD is seasonal?', ["It's common in the spring.", 'It happens in dark months.', "It's worse in winter."], 1),
        q(11, 'What part of the lecture did the student NOT understand?', ['Why objects in motion cannot stop.', 'The meaning of motion.', 'The Law of Inertia.'], 2),
      ]),
      recording(5, [
        q(12, 'What is the main idea of the lecture?', ['Different reasons for being vegetarian.', 'Importance of rice and lentils in diet.', 'Health benefits of being vegetarian.'], 0),
        q(13, 'What is the main reason people have a vegetarian lifestyle in India?', ['They want good health.', 'They are very poor.', 'Because of their religion.'], 1),
      ]),
      recording(6, [
        q(14, "What information supports the lecturer's opinion?", ['The moon is younger than Earth.', 'The moon is smaller than Earth.', 'The moon goes round Earth.'], 0),
        q(15, "What information supports the lecturer's opinion?", ['The moon is heavier than Earth.', 'A very large object struck Earth.', 'Moon rock and Earth rock are similar.'], 2),
        q(16, 'What information about the crash between Earth and the object is most important?', ['Earth was very young.', 'The object was large.', 'It was in space.'], 1),
      ]),
      recording(7, [
        q(17, 'What is the main idea of the lecture?', ['the shell method of product portfolio analysis.', 'the BCG method.', 'the importance of product portfolio analysis.'], 2),
        q(18, 'What information about the investment portfolio does the professor think is important?', ['making more money.', 'a balanced group of stocks.', 'products that show promise.'], 2),
      ]),
      recording(8, [
        q(19, 'What is the main idea of the lecture?', ['People eat fewer hamburgers.', 'People still eat too much fast food.', 'People eat less food these days.'], 1),
        q(20, "What information about the professor's son's fast food eating habit is important?", ['It is typical.', 'It is above average.', 'It is acceptable.'], 1),
      ]),
    ],
  },
  {
    id: 'listening-02', order: 2, title: 'نموذج الاستماع الثاني', subtitle: 'مواقف دراسية ومحاضرات متنوعة',
    recordings: [
      recording(1, [
        q(1, 'What important point does the lecturer make about the food athletes eat?', ['It consists of meat.', 'It gives them power.', 'It can be harmful.'], 1),
        q(2, 'Who employs the chefs to cook the meals for the athletes?', ['The sports clubs.', 'The diet experts.', 'The athletes themselves.'], 0),
        q(3, 'How many kinds of sports does the lecturer mention?', ['1', '2', '3'], 1),
      ]),
      recording(2, [
        q(4, 'What pages should the students read for next class?', ['33–45', '46–49', '55–68'], 2),
        q(5, 'When will the students have their test?', ['Monday', 'Tuesday', 'Thursday'], 2),
        q(6, 'When must the students hand in their projects?', ['Monday', 'Tuesday', 'Thursday'], 0),
      ]),
      recording(3, [
        q(7, 'What important point do the speakers mention about experts?', ['They find it difficult simplifying topics.', 'They know a lot of technical language.', 'They learn new topics fast.'], 0),
        q(8, 'How many units must the students study for the test?', ['2', '5', '6'], 0),
      ]),
      recording(4, [q(9, 'What does the lecturer think about presentations?', ['They are easy to do.', 'They can be very boring.', 'They can make people anxious.'], 2)]),
      recording(5, [
        q(10, 'What does the professor give as an example of legal issues?', ['The timing must be ideal.', 'The need for a distributor.', 'Foreign employees require work visas.'], 2),
        q(11, 'Why does the professor mention difficulties with foreign partners?', ['to give an example of financial difficulties.', 'to suggest the need for risk management.', 'to show misunderstandings.'], null, 'الإجابة غير معلّمة في المصدر.'),
        q(12, 'According to the professor, what is the most important thing about the risk assessment?', ['learning about risks.', 'the final decision.', 'when it happens.'], 1),
      ]),
      recording(6, [
        q(13, 'What does the lecturer think is most important in the spread of invasive species?', ["people's actions.", 'the species itself.', 'number of predators.'], 0),
        q(14, 'What is the main idea in the lecture?', ['Invasive species can spread quickly.', 'Invasive species harm the environment.', 'Invasive species are plants and animals.'], 0),
        q(15, 'What does the lecturer think is most important about invasive species?', ['its effect on its new habitat.', 'where it comes from.', 'how it spreads.'], 2),
      ]),
      recording(7, [
        q(16, "What is the lecturer's attitude towards the amount of beef Americans eat now?", ['They should stop.', 'They should increase it.', 'They eat a small amount.'], 2),
        q(17, 'What is the main idea in the lecture?', ['health in America', 'changes in eating habits', 'the American beef industry'], 1),
      ]),
      recording(8, [
        q(18, 'What is the main idea of the lecture?', ['different reasons for being vegetarian.', 'importance of rice and lentils in diet.', 'health benefits of being vegetarian.'], 0),
        q(19, 'What is the main reason people have a vegetarian lifestyle in India?', ['They want good health.', 'They are very poor.', 'Because of their religion.'], 1),
      ]),
      recording(9, [q(20, 'What is the topic of the lecture?', ['hunting sharks', 'protecting sharks', 'facts about sharks'], 2)]),
    ],
  },
  {
    id: 'listening-03', order: 3, title: 'نموذج الاستماع الثالث', subtitle: 'أفكار رئيسة وتفاصيل من المحاضرة',
    recordings: [
      recording(1, [
        q(1, 'What important point does one of the students mention?', ['Computers are effective.', 'Schedules are important.', "Humans AREN'T happy."], 1),
        q(2, 'What should the students start writing?', ['an essay about time management', 'a story about time management', 'a time management schedule'], 0),
      ]),
      recording(2, [
        q(3, 'What important point does the teacher mention about the internet?', ['It was invented in 1983.', 'It uses wireless technology.', 'It connects computers worldwide.'], 2),
        q(4, 'What pages should the students read in chapter 8?', ['129–133', '120–130', '133–138'], 1),
        q(5, 'When will the students meet for their next class?', ['Monday', 'Tuesday', 'Thursday'], null, 'الإجابة غير معلّمة في المصدر.'),
      ]),
      recording(3, [
        q(6, 'What does the professor think about airline businesses?', ['They should be monopolies.', 'They should fly to many countries.', 'A country should have more than one.'], 2),
        q(7, 'What does the professor think about the topic of the lecture?', ['It is difficult.', 'It is different.', 'It is interesting.'], 2),
        q(8, 'What does the lecturer think is the most important part of the marketing mix?', ['customers', 'product', 'price'], 1),
        q(9, 'What does the lecturer think about advertising?', ['Advertising is NOT important.', 'Advertising is the same as marketing.', 'Advertising is one part of marketing.'], 2),
      ]),
      recording(4, [
        q(10, 'What is the main idea of the lecture?', ["The Earth's magnetic fields", 'A Swedish scientific study', 'How birds find their way'], 2),
        q(11, 'What part of the lecture did the student NOT understand?', ['how the protein helps the birds', 'the name of the protein', 'how birds fly'], 2),
      ]),
      recording(5, [
        q(12, 'What will the lecture be about?', ['five Ps of leadership', 'personal attributes', 'finding good leaders'], null, 'الإجابة غير معلّمة في المصدر.'),
        q(13, 'What is the main idea in the lecture?', ['Technology helps improve service.', 'Tracking customers raises privacy issues.', 'Some phone applications are less reliable.'], 2),
        q(14, 'What part of the lecture did the student NOT understand?', ['Phone applications', 'Improved service', 'Privacy issues'], 2),
      ]),
      recording(6, [
        q(15, 'What is the most important idea from the lecture?', ['We are harming the environment.', 'Solar panels are expensive.', 'We should start using renewable energy.'], 2),
        q(16, 'How does the lecturer feel about solar panel use?', ['It is far from certain.', 'It is the best solution.', 'It provides quick benefits.'], 1),
        q(17, 'What is the lecturer sure of?', ['The government grants are effective.', 'More people need to know about the issue.', 'Some solar panels have been installed.'], 1),
      ]),
      recording(7, [q(18, 'What is the main idea of the lecture?', ['Water often increases in price.', 'Higher costs often mean higher prices.', 'Fewer goods often mean higher prices.'], null, 'الحل يعتمد على الصوت في الاختبار؛ لا يوجد مفتاح ثابت ظاهر في المصدر.')]),
      recording(8, [
        q(19, 'What information about the coffee and donut is most important?', ['Their price went up.', 'They only cost 22 Riyals.', 'They are favorite products.'], null, 'الإجابة غير معلّمة في المصدر.'),
        q(20, 'What will the lecture be about?', ['spending more on public transport', 'the number of cars on the road', 'growing environmental awareness'], 2),
      ]),
    ],
  },
  {
    id: 'listening-04', order: 4, title: 'نموذج الاستماع الرابع', subtitle: 'حوارات يومية ومواقف جامعية',
    recordings: [
      recording(1, [
        q(1, 'When does the customer want to travel?', ['next month', 'next week', 'Thursday', 'Tuesday'], 2),
        q(2, 'What type of tickets did the customer buy?', ['an economy ticket', 'a couple of tickets', 'a one-way ticket', 'a round-trip ticket'], 3),
        q(3, 'The customer actually booked a seat for ……', ['Wednesday', 'Thursday', 'Tuesday', 'Monday'], 0),
      ]),
      recording(2, [
        q(4, 'Which type of book did Asmaa want to borrow from Hannah?', ['Economics', 'Chemistry', 'Sociology', 'Biology'], 3),
        q(5, 'The chapter they had covered in class was ……', ['2', '3', '25', '26'], 1),
      ]),
      recording(3, [
        q(6, 'السؤال غير متوفر في المصدر', [], null, 'المصدر ناقص؛ يحتاج هذا السؤال إلى مراجعة قبل النشر.'),
        q(7, 'The cost of the special offer was ……', ['55 Riyals', '60 Riyals', '65 Riyals', '75 Riyals'], 2),
        q(8, "The pizzas and soda are most likely to be ……", ["shared with friends at Jack's Pizza Place.", "eaten by the customer at Jack's Pizza Place.", "delivered in one hour from Jack's Pizza Place.", "ready to pick up in one hour from Jack's Pizza Place."], null, 'الإجابة غير معلّمة في المصدر.'),
      ]),
      recording(4, [
        q(9, 'Where might you hear this?', ['a school', 'an office', 'a hospital', 'a barbershop'], 0),
        q(10, 'We can understand that ……', ['Mrs. Mona will be back eventually', 'Mrs. Mona will NOT be coming back', 'Miss. Khadiga will be back eventually', 'Miss. Khadiga will NOT be coming back'], 2),
        q(11, 'What does Mrs. Mona ask the listeners to do first?', ['to read the first paragraph', 'to be able to come back', '—', 'to open their books'], 3, 'الخيار C فارغ كما ظهر في المصدر.'),
        q(12, 'Mona says: “I just got some wonderful news that blew me away”. She means that she felt ……', ['nervous', 'excited', 'worried', 'sad'], 1),
      ]),
      recording(5, [q(13, "Abdullah said: “Don't hold out on me”. What does he mean?", ['Tell me the story later.', 'Hold my books for me.', "Don't hold your breath.", 'Tell me the news now.'], null, 'الإجابة غير معلّمة في المصدر.')]),
      recording(6, [q(14, "What is Mona's new problem?", ['She has to make a choice.', "She DOESN'T like her choices.", 'She likes her choices.', "She DOESN'T have a choice."], 0)]),
      recording(7, [
        q(15, 'When was Ammar waiting for Faisal?', ['last year', 'last month', 'last week', 'last night'], 3),
        q(16, 'Faisal probably fainted because ……', ['he had eaten and drunk too much.', 'he had NOT eaten or drunk enough.', 'he was working too hard.', "he WASN'T working hard enough."], 1),
      ]),
      recording(8, [
        q(17, 'Mohammad believes that the new system should do all of the following EXCEPT ……', ['drive students crazy', 'save time for students', 'show which classes are available', 'free students from standing in line'], 0),
        q(18, 'What advice does Mohammad give to Ahmed?', ['Try the computer system one more time.', 'Go to his next class and try again.', 'Try to get help from the tech support office.', 'Go to the registration office and stand in line.'], 3),
      ]),
      recording(9, [
        q(19, 'Why does Khalid go to speak with Mr. Abdullah?', ['He thinks the topics of the class are boring.', 'He is having difficulty choosing a topic.', 'He wants to change to a different class.', 'He has finished his research paper.'], 1),
        q(20, 'The topic must be ……', ["related to the student's major", 'discussed in class', 'interesting', 'excellent'], 0),
      ]),
    ],
  },
  {
    id: 'listening-05', order: 5, title: 'نموذج الاستماع الخامس', subtitle: 'مواقف يومية ووصف علمي وسكن جامعي',
    recordings: [
      recording(1, [q(1, 'In what subject does Salah have an examination?', ['geology', 'psychology', 'biology', 'chemistry'], 2)]),
      recording(2, [
        q(2, 'The man wants to …………………', ['to buy something', 'to find a place', 'to have a rest'], 1),
        q(3, 'How should the man travel?', ['by bus', 'by taxi', 'by train', 'on foot'], 0),
        q(4, 'What is TRUE about the woman?', ['She works in the Museum.', 'She helps the man.', 'She is angry.', 'She is lost.'], 1),
      ]),
      recording(3, [q(5, 'The term sandwich gets its name from the fourth Earl of Sandwich, Lord Montague because he …', ['invented burgers', 'was a skilled cook', 'liked to eat meat between bread', 'loved to eat cheese and vegetables'], 2)]),
      recording(4, [
        q(6, 'What does Ben do now?', ["He's a sales manager.", "He's a hotel manager.", "He's a high school teacher.", "He's a middle school teacher."], 2),
        q(7, 'How does Tom feel about his job?', ['It is easy and routine.', 'It is demanding but boring.', 'It is demanding but interesting.', 'It is challenging and low paying.'], 2),
      ]),
      recording(5, [q(8, 'Ali ………… go to Jeddah.', ['should NOT', 'can NOT', 'must', 'might'], 3)]),
      recording(6, [
        q(9, 'What can we understand about the clinic?', ['It is very expensive.', 'It is very busy in the evening.', 'It is very busy in the morning.', 'It is not accepting new patients.'], 2),
        q(10, 'How does the caller feel about the time of his appointment?', ['excited', 'nervous', 'surprised', 'disappointed'], 3),
      ]),
      recording(7, [q(11, 'What does the woman want to do?', ['go out', 'watch TV', 'make dinner', 'stay at home'], 0)]),
      recording(8, [q(12, 'Which sentence is closest in meaning to the statement you heard?', ['Mona will arrive on time.', 'Mona is not going to work.', 'Mona expects to arrive at 8:50.', 'Mona expects to arrive at 8:15.'], 3)]),
      recording(9, [
        q(13, 'The octopus can squeeze into tight spaces because it …', ['uses its beak to pry open tight spaces', 'has a flexible internal skeleton', 'is behaviorally flexible', 'has NO internal or external skeleton'], 3),
        q(14, 'All octopuses are venomous but …', ['Only the blue-ringed octopus has been known to kill humans.', 'There have been NO known deaths in recent years.', 'There have only been 300 reported deaths.', 'NONE are deadly to human beings.'], 0),
      ]),
      recording(10, [
        q(15, 'Why does Mr. Taylor want to rent a place to live?', ['Because he will NOT be staying there for more than two years.', 'Because his wife doesn’t want to talk to the agent.', 'Because he doesn’t want to live with his family.', 'Because he can’t afford to buy a house.'], 0),
        q(16, 'Mr. Taylor wants a house because an apartment …', ['is too far from the university.', 'is NOT available in the area.', 'does NOT have a garden.', 'offers less privacy.'], 2),
        q(17, 'What is Mr. Taylor’s job?', ['a university teacher', 'a school teacher', 'a gardener', 'an estate agent'], 0),
      ]),
      recording(11, [
        q(18, 'السؤال 18 غير متوفر في المصدر', [], null, 'الصور المرفقة للنموذج الخامس تتوقف عند السؤال 17؛ لا توجد بيانات للسؤال 18.'),
        q(19, 'السؤال 19 غير متوفر في المصدر', [], null, 'الصور المرفقة للنموذج الخامس تتوقف عند السؤال 17؛ لا توجد بيانات للسؤال 19.'),
        q(20, 'السؤال 20 غير متوفر في المصدر', [], null, 'الصور المرفقة للنموذج الخامس تتوقف عند السؤال 17؛ لا توجد بيانات للسؤال 20.'),
      ], 'أسئلة المصدر غير المتوفرة'),
    ],
  },
  {
    id: 'listening-06', order: 6, title: 'نموذج الاستماع السادس', subtitle: 'محاضرات لغوية وعلمية وقضايا مصرفية',
    recordings: [
      recording(1, [
        q(1, 'What does the lecturer think about sugar?', ['That it is unhealthy for children.', 'That it causes cancer directly.', 'That it is bad in large amounts.'], 2),
        q(2, 'What does the lecturer say about diseases of modern life?', ['They affect men and women equally.', 'They have various causes.', 'They are difficult to treat.'], 1),
      ]),
      recording(2, [q(3, 'What important point do the speakers mention about the housing situation in New Zealand?', ['People fill out applications.', 'Most people rent homes.', 'People are unhappy.'], 1)]),
      recording(3, [q(4, 'When are the projects due?', ['in two weeks.', 'next Tuesday.', 'after the exam.'], 1, 'محادثة بين طالبين عن مهمة أعطاهم إياها الدكتور.')]),
      recording(4, [
        q(5, 'What main point does the lecturer make about national identity?', ['People like to celebrate it.', 'It can depend on location.', 'It is slowly changing.'], 2),
        q(6, 'Where does the “Up Helly Aa” festival take place?', ['in Norway.', 'on the Shetland Islands.', 'around the capital of Scotland.'], 1),
        q(7, 'What does the “Up Helly Aa” festival celebrate?', ['Scottish history.', 'Viking history.', 'World history.'], 1),
        q(8, 'In which century did the Shetland islands become Scottish?', ['The 8th century.', 'The 9th century.', 'The 15th century.'], 2),
      ]),
      recording(5, [
        q(9, 'What important point does the lecturer make about new words in English?', ['They describe food.', 'They leave gaps in English.', 'They come from other languages.'], 2),
        q(10, 'How many English words are borrowed from other languages?', ['only a few.', 'nearly half.', 'more than half.'], 1),
        q(11, 'What information did the student want to know about adding words to the English Language?', ['why they are added.', 'how they are added.', 'who adds them.'], null, 'الإجابة غير ظاهرة في المصدر.'),
      ]),
      recording(6, [
        q(12, 'What does the professor think about newspapers?', ['He likes printed newspapers.', 'Most people read newspapers online.', 'Reading newspapers is a waste of time.'], 1),
        q(13, 'What does the professor think about printed newspapers?', ['The Internet is destroying them.', 'Some have existed for centuries.', "They're popular in Sweden."], 0),
      ]),
      recording(7, [
        q(14, 'What will the lecture be about?', ['how to calculate mass.', 'answers to scientific mystery.', 'possible explanations for gravity.'], null, 'الإجابة غير ظاهرة في المصدر.'),
        q(15, 'What is the main idea in the lecture?', ['Our understanding of the Universe changed.', 'Going faster than light seems impossible.', 'Measuring high speeds is difficult.'], 0),
      ]),
      recording(8, [
        q(16, 'What information about the project does the student think is the most important?', ['the challenges', 'the result', 'the team'], null, 'الإجابة غير ظاهرة في المصدر.'),
        q(17, "Why does the lecturer mention 'cars, homes, and other objects'?", ['To show Starlite is popular.', 'To show Starlite is safe.', 'To show Starlite is useful.'], 2),
        q(18, 'What information about Starlite does the lecturer find the most important?', ['It becomes hard.', 'It can resist fire.', 'It is amazing.'], 1),
      ]),
      recording(9, [
        q(19, 'What is the topic of the lecture?', ['illegal practices.', 'offshore banking.', 'banking practices.'], null, 'الإجابة غير ظاهرة في المصدر.'),
        q(20, 'What is the topic of the lecture?', ['stopping Americans hiding money abroad.', 'changes in the American system of law.', 'the way American banks pay taxes.'], null, 'الإجابة غير ظاهرة في المصدر؛ السؤال ظاهر منفصلًا في صورة مستقلة.'),
      ]),
    ],
  },
  {
    id: 'listening-07', order: 7, title: 'نموذج الاستماع السابع', subtitle: 'التقنية والصحة والعلوم والسلوك',
    recordings: [
      recording(1, [q(1, 'What important point do the speakers mention about software?', ['Software is part of I.T.', "It's changing business models.", "It's used on personal computers."], 1)]),
      recording(2, [
        q(2, 'What does the teacher ask the students to do?', ['Write notes about theatres and cinemas.', 'Contact various companies.', 'Make groups.'], 2),
        q(3, 'How many minutes does the teacher give them?', ['4', '5', '15'], null, 'الإجابة غير ظاهرة في المصدر.'),
      ]),
      recording(3, [
        q(4, 'What important point does the lecturer make about the food athletes eat?', ['It consists of meat.', 'It gives them power.', 'It can be harmful.'], 1),
        q(5, 'Who employs the chefs to cook the meals for the athletes?', ['The sports clubs.', 'The diet experts.', 'The athletes themselves.'], 0),
        q(6, 'How many kinds of sports does the speaker mention?', ['1', '2', '3'], 1),
        q(7, 'What do the diet experts encourage their athletes to do?', ['To eat well.', 'To try new foods.', 'To eat less food.'], null, 'الإجابة غير ظاهرة في المصدر.'),
      ]),
      recording(4, [
        q(8, 'What does the professor think is the reason for differences in SAD symptoms?', ['Different seasons.', 'Less light.', 'Unknown.'], 2, 'خيار “Unknown” محفوظ كما ظهر في المصدر.'),
        q(9, 'What information proves SAD is seasonal?', ["It's common in the spring.", 'It happens in dark months.', "It's worse in winter."], 1),
        q(10, 'What does the professor say about the light box treatment?', ["It's being tested.", "It's reliable.", "It's the only treatment."], 0),
      ]),
      recording(5, [
        q(11, 'What is the main idea in the lecture?', ['Technology helps improve service.', 'Tracking customers raises privacy issues.', 'Some phone applications are less reliable.'], 2),
        q(12, 'What part of the lecture did the student NOT understand?', ['Phone applications.', 'Improved service.', 'Privacy issues.'], 2),
      ]),
      recording(6, [
        q(13, 'What is the main idea in the lecture?', ['That objects only move in response to a force.', "Newton's three laws of motion.", 'How bicycles accelerate.'], 1),
        q(14, 'What part of the lecture did the student NOT understand?', ['Why objects in motion cannot stop.', 'The meaning of motion.', 'The Law of Inertia.'], 2),
      ]),
      recording(7, [
        q(15, 'What is the main idea of the lecture?', ['Different reasons for being vegetarian.', 'Importance of rice and lentils in diet.', 'Health benefits of being vegetarian.'], 0),
        q(16, 'What is the main reason people have a vegetarian lifestyle in India?', ['They want good health.', 'They are very poor.', 'Because of their religion.'], 1),
        q(17, 'What does the speaker think is the most important health benefit of being a vegetarian?', ['Looking younger.', 'Feeling happier.', 'Being thinner.'], 0),
      ]),
      recording(8, [
        q(18, 'What is the main idea of the lecture?', ['The effects of TV violence.', 'Violent TV shows in the 1970s.', 'A famous 1970s research study.'], 0),
        q(19, 'What is the speaker certain about?', ['Violence on TV is a problem.', 'Violent TV produces violent people.', 'Violent TV has an effect on behavior.'], 1),
        q(20, 'How does the speaker feel about violent media?', ['It definitely produces violent people.', 'It might produce violent people.', 'It has NO effect on people.'], 1),
      ]),
    ],
  },
  {
    id: 'listening-08', order: 8, title: 'نموذج الاستماع الثامن', subtitle: 'سفر وإعلانات ومهارات لغوية ومواقف عمل',
    recordings: [
      recording(1, [q(1, 'This conversation most likely takes place …………………', ['in a grocery store.', 'in a restaurant.', 'in a house.', 'on a train.'], null, 'الإجابة غير ظاهرة في المصدر.')]),
      recording(2, [q(2, 'What kind of project is Osama working on?', ['A current events project.', 'A business project.', 'A family project.', 'A history project.'], 3)]),
      recording(3, [q(3, 'Most of the participants at a picnic are …………………', ['drivers', 'students', 'friends', 'families'], 3)]),
      recording(4, [
        q(4, 'Who is the caller talking to?', ['a tourism guide', 'a sales manager', 'a travel attendant', 'a travel agent'], 3),
        q(5, 'When will the caller fly?', ['September 13', 'September 30', 'November 13', 'November 30'], 0),
        q(6, "What is the traveler's reservation number?", ['1066', '1606', '6601', '6610'], 0),
      ]),
      recording(5, [
        q(7, 'The octopus can squeeze into tight spaces because it …………………', ['uses its beak to pry open tight spaces.', 'has NO internal or external skeleton.', 'has a flexible internal skeleton.', 'is behaviorally flexible.'], 1),
        q(8, 'All octopuses are venomous but …………', ['only the blue-ringed octopus has been known to kill humans.', 'there have been NO known deaths in recent years.', 'there have only been 300 reported deaths.', 'NONE are deadly to human beings.'], 0),
      ]),
      recording(6, [
        q(9, 'This lecture is most likely to occur in …………………', ['a history class.', 'a biology class.', 'a chemistry class.', 'a geography class.'], 3),
        q(10, 'What is the second longest river in the world?', ['the Mississippi', 'the Yangtze', 'the Amazon', 'the Nile'], 2),
      ]),
      recording(7, [
        q(11, 'He is a good language learner because he …………………', ['travelled to many foreign countries.', 'lived abroad for many years.', 'studies almost all the time.', 'likes to talk to people.'], 3),
        q(12, 'What does he say is the most important thing when learning a language?', ['Studying abroad.', 'Travelling to foreign countries.', 'Having an interest in learning English.', 'Having a host family that only speaks English.'], 2),
      ]),
      recording(8, [
        q(13, 'This announcement would probably be heard in an airport in …………………', ['Doha', 'Bahrain', 'Riyadh', 'Frankfurt'], null, 'الإجابة غير ظاهرة في المصدر.'),
        q(14, 'What has caused the delay?', ['a mechanical problem', 'a scheduling problem', 'a medical problem', 'a security problem'], 2),
        q(15, 'Passengers are asked to board the flight at …………………', ['Gate A6', 'Gate B2', 'the main terminal', 'the security checkpoints'], 0),
      ]),
      recording(9, [
        q(16, "The woman's problem is that she …………………", ["DOESN'T have much time.", "DOESN'T have much money.", "CAN'T decide where to go.", "CAN'T decide how to travel."], 3),
        q(17, 'We can conclude that the woman …………………', ['likes Europe a lot.', 'wants to stay at home.', 'thinks Europe is costly.', 'has NOT travelled often.'], 2),
        q(18, 'We conclude that the woman and her husband …………………', ['have different tastes.', 'are unhappy together.', "DON'T like foreign places.", 'spend lots of money on travel.'], 0),
      ]),
      recording(10, [
        q(19, 'The two people talking in the conversation are probably …………………', ['a receptionist and a university applicant.', 'a secretary and a job applicant.', 'a banker and a loan applicant.', 'a boss and a new employee.'], 1),
        q(20, 'This conversation probably takes place in a …………………', ['university office.', 'conference room.', 'business office.', 'cafeteria.'], 2),
      ]),
    ],
  },
  {
    id: 'listening-09', order: 9, title: 'نموذج الاستماع التاسع', subtitle: 'حوارات قصيرة وإعلانات وبرامج إذاعية',
    recordings: [
      recording(1, [q(1, 'Where is Adam going soon?', ['UK', 'Tokyo', 'America', 'Shanghai.'], 3)]),
      recording(2, [q(2, 'Bob was born in …………………', ['1980', '1981', '1984', '1985'], null, 'الإجابة غير ظاهرة في المصدر.')]),
      recording(3, [q(3, 'The man is looking for a place to …………………', ['get married', 'visit Ramadan', 'stay close to him', 'spend honeymoon'], 3)]),
      recording(4, [q(4, 'Where does this conversation take place?', ['restaurant'], 0, 'بقية الخيارات غير ظاهرة في المصدر.')]),
      recording(5, [q(5, 'What can we understand about Lisa?', ['She is not busy.', 'She is single.', 'She is married.', 'She is worried.'], 2)]),
      recording(6, [q(6, 'Where is the library?', ['King Abdelaziz Street'], 0, 'لا تظهر خيارات السؤال في المصدر؛ الظاهر فقط: King Abdelaziz Street.')]),
      recording(7, [q(7, 'Eat meat', ['eat meat'], 0, 'نص السؤال وخياراته غير مكتملة؛ الظاهر في المصدر: eat meat.')]),
      recording(8, [
        q(8, 'What time does Radio Story Time usually begin?', ['8:30 a.m.', '9:00 a.m.', '9:30 a.m.', '10:00 a.m.'], 1),
        q(9, 'What kind of story will begin on Radio Story Time tomorrow?', ['A Turkish mystery.', 'An action adventure.', 'A historical adventure.', 'A Turkish traditional fairytale.'], 0),
        q(10, 'What is the name of the radio station?', ['KBMV.', 'KPMP.', 'KBCB.', 'KMBK.'], 0),
      ]),
      recording(9, [q(11, 'Later the speaker will …', ['go home', 'have a nap', 'have a walk', 'go to a meeting'], 3)]),
      recording(10, [q(12, 'How did the woman learn to use the laptop?', ['Mark taught her.', 'Dave taught her.', 'The Internet.', 'The …'], 0, 'نص الخيار D غير مكتمل في المصدر.')]),
      recording(11, [q(13, 'What should passengers do?', ['travel to Oxford', 'travel to London', 'go to platform 2', 'go to platform 3'], 3)]),
      recording(12, [q(14, 'What does the speaker mean?', ['Eric did NOT accept the offer.', 'Eric did NOT make an offer.', 'Mr. Carter did NOT make any offer.', 'Mr. Carter did NOT accept the offer.'], 0)]),
      recording(13, [q(15, 'What is Tan embarrassed about?', ['He went to the wrong place to meet Steve.', 'He DOESN’T know how to swim.', 'He is taking a swimming class.', 'He has been taking it easy.'], 1)]),
      recording(14, [q(16, 'Why will they skip Unit 4?', ['The teacher DOESN’T find it …………', 'They will return to it later.', 'They have completed it already.', 'It is NOT related to the course.'], 3, 'نص الخيار A غير مكتمل في المصدر.')]),
      recording(15, [q(17, 'Why does Professor Daniels think fairy tales are taught to children?', ['They teach lessons about right and wrong.', 'They are about magic and adventure.', 'The language is useful.', 'All children like them.'], 0)]),
      recording(16, [q(18, 'When is this program presented?', ['every day at 10:00 a.m.', 'every day at 9:00 p.m.', 'every Tuesday at 9:00 a.m.', 'every Tuesday at 9:00 p.m.'], 1)]),
      recording(17, [
        q(19, 'السؤال 19 غير متوفر في المصدر', [], null, 'الصور المرفقة للنموذج التاسع تتوقف عند السؤال 18؛ لا توجد بيانات للسؤال 19.'),
        q(20, 'السؤال 20 غير متوفر في المصدر', [], null, 'الصور المرفقة للنموذج التاسع تتوقف عند السؤال 18؛ لا توجد بيانات للسؤال 20.'),
      ], 'أسئلة المصدر غير المتوفرة'),
    ],
  },
  {
    id: 'listening-10', order: 10, title: 'نموذج الاستماع العاشر', subtitle: 'صحة وسفر وتقنية وإدارة وقت',
    recordings: [
      recording(1, [
        q(1, "What kind of operation did Ahmad's mother have?", ['a kidney operation', 'a knee operation', 'a heart operation', 'a minor operation'], 0),
        q(2, "Ahmad's mother had the operation in a hospital in …", ['the capital', 'the same town', 'the nearby town', 'the military compound'], 0),
      ]),
      recording(2, [q(3, "Why hasn't Khalid traveled anywhere this summer?", ['because he has been very busy.', 'because he doesn’t want to travel.', 'because his father hasn’t been free.', 'because his father doesn’t like traveling.'], 2)]),
      recording(3, [
        q(4, 'What part of the project is Osama looking for?', ['research information everyone knows.', 'pictures from books everyone has seen.', 'videos from archives everyone uses.', 'pictures and videos NOT everyone has seen.'], 3),
        q(5, 'What source does Omar suggest?', ['local historians', 'newspapers', 'textbooks', 'YouTube'], 3),
      ]),
      recording(4, [
        q(6, 'Why does Mr. Salem want to rent a place to live?', ['because he will NOT be staying there for more than two years.', 'because his wife does NOT want to talk to the agent.', 'because he does NOT want to live with his family.', 'because he CANNOT afford to buy a house.'], 0),
        q(7, 'Why DOESN’T Mr. Salem want a flat?', ['A flat is not reasonable.', 'The university has NO flats.', 'A flat is too small for his family.', 'There are NO flats in the Highland area.'], 2),
        q(8, 'What is Mr. Salem’s job?', ['a university teacher', 'a school teacher', 'a gardener', 'an estate agent'], 0),
      ]),
      recording(5, [
        q(9, "The caller's problem is that …………………", ['he has a software problem.', 'he transferred to a new company.', 'he has only had the Internet for a week.', 'his Internet is NOT working properly.'], 3),
        q(10, 'Which of the following statements is TRUE?', ['Mr. Khalili uses the Internet for pleasure only.', 'Mr. Khalili needs the Internet for his work.', 'Mr. Khalili is a satisfied customer.', 'Mr. Khalili is a new customer.'], 1),
      ]),
      recording(6, [
        q(11, 'Who is Mishari going to visit this weekend?', ["his mother's grandparents", "his father's grandparents", 'his grandmother', 'his grandfather'], 3),
        q(12, 'Why hasn’t Leila seen her grandparents for a long time?', ["She DOESN'T have a car.", "She DOESN'T have time.", 'They live in another town.', 'They live in another country.'], 2),
        q(13, 'Who suggests that grandparents should be respected?', ['Mishari', "Mishai's teacher", 'Leila', 'Leila’s teacher'], 1),
      ]),
      recording(7, [
        q(14, 'In the conversation, the word “focus” is closest in meaning to …', ['separate', 'concentrate', 'participate', 'delegate'], 1),
        q(15, "Ahmad's example of screening calls was used to explain how to …", ['be polite', 'manage time', 'speak on the phone', 'use an answering machine'], 1),
      ]),
      recording(8, [
        q(16, 'This conversation is most likely to take place in …', ['a restaurant', 'an airport', 'a mall', 'a café'], 2),
        q(17, 'Which of the following is TRUE?', ['The salesperson is NOT familiar with American shoe sizes.', 'The customer does NOT like blue.', 'The salesperson is NOT helpful.', 'The customer is now in the U.S.'], 0),
      ]),
      recording(9, [
        q(18, 'The number of people diagnosed with diabetes …', ['may double in 2025.', 'may be 20 in 2025.', 'may decrease by 2025.', 'may be the same in 2025.'], 0),
        q(19, 'Raising teacher awareness can …', ['save money.', 'prevent diabetes.', 'target school staff.', "save students' lives."], 3),
      ]),
      recording(10, [q(20, 'Why does Ali call Mohammed?', ['to set up a meeting.', 'to set the time for a meeting.', 'to find out the time of a meeting.', 'to ask Mohammed to come to a meeting.'], 2)]),
    ],
  },
  {
    id: 'listening-11', order: 11, title: 'نموذج الاستماع الحادي عشر', subtitle: 'مدفوعات وصحة وعمل وخدمات يومية',
    recordings: [
      recording(1, [q(1, 'The man paid by …', ['Debit card', 'Credit card', 'Check', 'Cash'], 1)], 'Payment Method'),
      recording(2, [q(2, 'Why did Mrs. Noura go to the dentist?', ['She has made an appointment.', 'Her tooth was hurting very badly.', 'Mr. Ahmed did NOT keep his appointment.', 'Dr. Rashid had no other patients that day.'], 1)], 'Dentist Visit'),
      recording(3, [
        q(3, 'Last weekend, Mike was …', ['At home', 'At work', 'In the desert', 'At school'], 2),
        q(4, 'Mike spent last weekend with …', ['People from work', 'A racing team', 'His family', 'His friends'], 3),
        q(5, 'Roger was surprised when he saw Mike because he …', ['Had a new four-wheeler', 'Had a broken arm.'], 1),
      ], 'Desert Weekend'),
      recording(4, [
        q(6, 'How did the man know about the job?', ['He heard about it on the radio.', 'He found the advertisement.', 'He saw it in a shop window.', 'He read about E.F.T. in a newspaper.'], 1),
        q(7, 'What is the last date to submit the application?', ['This Friday', 'Next Friday', 'In one week', 'In two weeks'], 1),
      ], 'Job Application'),
      recording(5, [
        q(8, 'Which is true about the Moon in French?', ["It's male.", "It's female.", "It's two words.", "It's difficult to pronounce."], 1),
        q(9, 'What do we understand about the student?', ['He disagrees with the teacher.', 'He was late for class.', 'He translates books.', 'He knows Arabic and English.'], 3),
      ], 'French Moon'),
      recording(6, [
        q(10, 'They will look at figures for …', ['The next year', 'The next months', 'The last four months', 'The last two months'], 3),
        q(11, 'The agenda is part of a …', ['Sports meeting', 'School meeting', 'Business meeting', 'Government meeting'], 2),
      ], 'Business Figures'),
      recording(7, [
        q(12, 'The conversation takes place in the …', ['morning', 'evening', 'afternoon', 'night'], 2),
        q(13, "The customer's choice for the method of …", ['Cheapest', 'Slowest', 'Latest', 'Quickest'], 3, 'نص السؤال غير مكتمل في المصدر؛ الخيارات والإجابة محفوظة كما وردت.'),
        q(14, 'The conversation takes place at …', ['Home', 'a post office', 'a supermarket', 'hospital'], 1),
      ], 'Shipment Office'),
      recording(8, [
        q(15, 'What is the main problem discussed in the conversation?', ["Will's work", "Will's supervisor", "Will's family", "Will's health"], 3),
        q(16, "Why hasn't Will seen a doctor?", ["He doesn't have time.", 'He is afraid of something.', "He doesn't want to.", "His family doesn't want to."], 0),
      ], "Will's Health"),
      recording(9, [
        q(17, 'What was the problem the people were talking about?', ['The air conditioning is working and the repairman is there.', 'The air conditioning is NOT working and the repairman is not there.', 'The air conditioning is NOT working and the repairman is there.', 'The air conditioning is working and the repairman is NOT there.'], 1),
        q(18, 'The phrase “it’s anyone’s guess” is closest in meaning to …', ['Everyone can be sure when the repairman will come.', 'Only the office can be sure when the repairman will come.', 'No one can be sure when the repairman will come.', 'Anyone can be sure when the repairman will come.'], 2),
      ], 'Air Conditioner'),
      recording(10, [
        q(19, 'We can understand that Virginia …', ['Has a job', 'Has children', 'Goes to the mall often', 'Is far from Makah Road'], 1),
        q(20, 'Virginia wants to go to Mega to …', ['get some furniture', 'eat at a restaurant', 'buy a stroller', 'pick up her husband'], 0),
      ], 'Mega Shopping'),
    ],
  },
  {
    id: 'listening-12', order: 12, title: 'نموذج الاستماع الثاني عشر', subtitle: '18 سؤالًا موثقًا من صور المصدر',
    recordings: [
      recording(1, [q(1, 'In what subject does Salah have an examination?', ['geology', 'psychology', 'biology', 'chemistry'], 2)], 'Biology Exam'),
      recording(2, [
        q(2, 'What did the man order?', ['salad', 'burger', 'chicken and soup', 'chicken and potatoes'], 3),
        q(3, 'This conversation mostly takes place in …', ['a restaurant', 'a house', 'a hospital', 'a school'], 0),
      ], 'Restaurant Order'),
      recording(3, [
        q(4, 'How much did travelers spend in 1990?', ['4.2 trillion dollars', '3.2 trillion dollars', '41.3 million dollars', '46.3 million dollars'], 1),
        q(5, 'What is the most popular country people go to?', ['France', 'U.S.A.', 'Spain', 'China'], 0),
        q(6, 'How many people visited the USA in 1996?', ['43.3 million people', '14.6 million people', '16.4 million people', '46.3 million people'], 3),
      ], 'Travel Statistics'),
      recording(4, [q(7, 'Who was at home when the house burned down?', ['Hassan', 'the whole family', 'Nobody', 'many people'], 2)], 'House Fire'),
      recording(5, [
        q(8, 'Why did Ali call the Sales Employment Office?', ['to have his computer fixed', 'to travel abroad', 'looking for a hotel', 'looking for a job as a sales manager'], 3),
        q(9, 'In what area does Ali have a degree?', ['Computer programming', 'sales management', 'public relations', 'computer maintenance'], 0),
      ], 'Sales Job'),
      recording(6, [
        q(10, 'The conversation takes place in the …', ['morning', 'afternoon', 'evening', 'night'], 1),
        q(11, "The customer's choice of delivery is the …", ['regular delivery', 'urgent delivery', 'long-term delivery', 'next-day delivery'], 3),
        q(12, 'The conversation takes place at …', ['a shipment office', 'a hotel', 'a house', 'Abu Dhabi'], 0),
      ], 'Delivery Service'),
      recording(7, [q(13, 'What does Bader mean?', ["He doesn't have many hands.", 'He can help.', "He can't take the suitcase.", "He doesn't like his colleague."], 2)], "Bader's Suitcase"),
      recording(8, [q(14, 'The lecture started at …', ['10:30', '10:00', '9:30', '12:30'], 3)], 'Lecture Time'),
      recording(9, [q(15, 'What does this teacher imply about Abdullah?', ['Abdullah has free time.', 'Abdullah will be very busy.', 'Abdullah finished his research.', "Abdullah's hands hurt."], 1)], "Abdullah's Schedule"),
      recording(10, [q(16, 'What information does the customer know about the book?', ['The publishing year 2008.', 'The price of the book.', 'The names of the authors.', 'The title of the book.'], 0)], 'Book Inquiry'),
      recording(11, [
        q(17, 'Where does this announcement take place?', ['in an airport', 'in a train station', 'in a school', 'on a street'], 1),
        q(18, 'What should the people do?', ['They should change from Platform 2 to Platform 3.', 'They should change from Platform 3 to Platform 2.', 'They should change from Platform 1 to Platform 2.', 'They should change from Platform 2 to Platform 1.'], 0),
      ], 'Train Station'),
    ],
  },
  {
    id: 'listening-13', order: 13, title: 'نموذج الاستماع الثالث عشر', subtitle: 'محاضرات صفية في التاريخ والعلوم والأعمال',
    recordings: [
      recording(1, [
        q(1, 'What does the lecturer think about the invention of the powder?', ['It is amazing.', 'It was improved in Japan.', 'It is used to hurt people.'], 2),
        q(2, 'Why did the Chinese scientists first invent the powder?', ['as a weapon', 'for the army', 'as a medicine'], 2),
      ], 'a lecture on History'),
      recording(2, [
        q(3, 'What important point does the teacher mention about the Internet?', ['It was invented in 1983.', 'It uses wireless technology.', 'It connects computers worldwide.'], null, 'الحل حسب الصوت في الاختبار؛ لا توجد إجابة مسطّرة في المصدر.'),
        q(4, 'What pages should the students read in chapter 8?', ['129–133', '120–130', '133–138'], null, 'الحل حسب الصوت في الاختبار.'),
        q(5, 'When will the students meet for their next class?', ['Monday', 'Tuesday', 'Thursday'], null, 'الحل حسب الصوت في الاختبار.'),
      ], 'classroom discussion about Computer Science'),
      recording(3, [
        q(6, 'What important point does the lecturer mention about tea?', ['It is a vegetable.', 'It was cultivated in China.', 'It became a drink later in history.'], null, 'الحل حسب الصوت في الاختبار.'),
        q(7, 'When was tea first used as a drink?', ['500 years ago', '1,500 years ago', '6,000 years ago'], null, 'الحل حسب الصوت في الاختبار.'),
        q(8, 'What developed in China after tea became a drink?', ['A popular tea culture', 'A lot of new book clubs', 'Many new tea businesses'], null, 'الحل حسب الصوت في الاختبار.'),
        q(9, 'What is the most popular drink in the world today?', ['Tea', 'Water', 'Coffee'], null, 'الحل حسب الصوت في الاختبار.'),
      ], 'Tea'),
      recording(4, [
        q(10, 'What important point does the lecturer mention about the center of mass?', ['It involves a stick.', "It's important in math.", "It's in the middle of objects."], 2),
        q(11, 'Where is the center of mass of a stick?', ["It's in the middle.", 'It moves around.', "It's in different positions."], 0),
        q(12, 'Where is the center of mass of a standing human?', ['Where the hands meet.', 'Around the heart.', 'Around the stomach.'], 2),
      ], 'center of mass'),
      recording(5, [
        q(13, 'What does the teacher think about presentations?', ['They are easy to do.', 'They can be very boring.', 'They can make people anxious.'], null, 'الحل حسب الصوت في الاختبار.'),
        q(14, 'What does the teacher think about telling jokes in presentations?', ['Jokes are okay anytime.', 'Telling jokes is a way bad.', 'Few jokes can be useful.'], null, 'الحل حسب الصوت في الاختبار.'),
      ], 'a class discussion about psychology'),
      recording(6, [q(15, 'What will the lecture be about?', ['How birds find family members.', 'How birds dance.', 'The meaning of bird behaviors.'], null, 'لا توجد إجابة مسطّرة في المصدر؛ الحل يعتمد على الصوت.')], 'a classroom lecture'),
      recording(7, [
        q(16, 'What is the main idea of the lecture?', ['The shell method of product portfolio analysis.', 'The BCG method.', 'The importance of product portfolio analysis.'], null, 'لا توجد إجابة مسطّرة في المصدر.'),
        q(17, 'What information about the investment portfolio does the professor think is important?', ['making more money', 'a balanced group of stocks', 'products that show promise'], null, 'لا توجد إجابة مسطّرة في المصدر.'),
      ], 'Business Administration'),
      recording(8, [
        q(18, 'How does the lecturer support the claim that people are bad at judging themselves?', ['Over 100 studies', '30% of engineers', 'Engineers at two companies'], null, 'الإجابة غير محددة في المصدر.'),
        q(19, 'Why does the lecturer mention that engineers put themselves in the top 5%?', ['Companies need them.', "Most engineers AREN'T the best.", "People CAN'T assess themselves well."], null, 'الإجابة غير محددة في المصدر.'),
      ], 'Psychology'),
      recording(9, [q(20, 'What will the lecture be about?', ['The special talent of Humpback Whales.', 'The largest member of the whale family.', 'The difference between two kinds of whales.'], null, 'الإجابة غير محددة في المصدر.')], 'a classroom lecture'),
    ],
  },
  {
    id: 'listening-14', order: 14, title: 'نموذج الاستماع الرابع عشر', subtitle: '17 سؤالًا موثقًا من صور المصدر',
    recordings: [
      recording(1, [
        q(1, 'What did the man order?', ['chicken wings', 'chicken and bread', 'potatoes and drink', 'potatoes and chicken'], 3),
        q(2, 'What can be inferred from this conversation?', ['The two speakers are hungry.', 'The first speaker is NOT hungry.', 'The two speakers are NOT hungry.', 'The second speaker is NOT hungry.'], 0),
      ], 'Food Order'),
      recording(2, [
        q(3, "What does Hind's father do?", ['general practitioner', 'businessman', 'surgeon', 'lawyer'], null, 'لا توجد إجابة مسطّرة بوضوح في المصدر.'),
        q(4, "What was Ahmad's father's previous specialty?", ['surgeon', 'sergeant', 'businessman', 'general practitioner'], 3),
      ], 'Medical Careers'),
      recording(3, [
        q(5, 'Which of the following is TRUE?', ['He is paying for the trip.', 'He has been to Los Angeles.', 'He is going to Los Angeles next month.', 'He is going to Los Angeles for one month.'], 3),
        q(6, 'Which factor is most important for choosing a hotel?', ['location', 'services', 'rating', 'price'], 0),
      ], 'Travel Plans'),
      recording(4, [q(7, 'What will most likely happen next?', ['A phone call will be made.', 'A fax will be transmitted.', 'A letter will be mailed.', 'An email will be sent.'], 3)], 'Email Follow-up'),
      recording(5, [
        q(8, 'When did the conversation take place?', ['in the morning', 'at noon', 'in the afternoon', 'in the evening'], 2),
        q(9, 'How does the first speaker feel?', ['angry', 'tired', 'hungry', 'worried'], 1),
      ], 'Afternoon Talk'),
      recording(6, [
        answerOnly(10, 'لماذا ذهبوا إلى City Center؟', 'Hotel and food.', 'رجل وزوجته يتشاوران في الذهاب إلى City Center، ويسألها عن القطار أو التاكسي، وتذكر أن الطرق مزدحمة.'),
        answerOnly(11, 'لماذا لا يفضل الذهاب بالتاكسي؟', 'Heavy traffic.', 'الإجابة موثقة نصيًا في المصدر دون خيارات.'),
        answerOnly(12, 'في النهاية، كيف سيذهبون؟', 'By Metro.', 'الإجابة موثقة نصيًا في المصدر دون خيارات.'),
      ], 'City Center Trip'),
      recording(7, [
        q(13, 'What does the lecturer think about students standing up at school?', ['It is stupid.', 'It is good.', 'It is common.'], null, 'لا توجد إجابة مسطّرة في المصدر.'),
        q(14, 'What does the lecturer say about sitting down for short periods?', ['It is acceptable.', 'It is what we want.', 'It is very unhealthy.'], null, 'الإجابة غير محددة في المصدر.'),
      ], 'Standing at School'),
      recording(8, [
        q(15, 'What pages should the students read for next class?', ['33–45', '46–49', '55–68'], 2),
        q(16, 'When will the students have their test?', ['Monday', 'Tuesday', 'Thursday'], 2),
        q(17, 'When must the students hand in their projects?', ['Monday', 'Tuesday', 'Thursday'], 0),
      ], 'Class Schedule'),
    ],
  },
  {
    id: 'listening-15', order: 15, title: 'نموذج الاستماع الخامس عشر', subtitle: 'أسئلة وإجابات موثقة من وصف المصدر',
    recordings: [
      recording(1, [
        answerOnly(1, 'أين حدثت المحادثة؟', 'Pharmacy — الصيدلية', 'امرأة لديها ألم شديد في أسنانها ولا تستطيع النوم، وتتحدث مع الصيدلي.'),
        answerOnly(2, 'ماذا يطلب أو يسأل الصيدلي عنها؟', 'Prescription — وصفة', 'المصدر يقدم وصف المحادثة والسؤال والإجابة دون خيارات.'),
        answerOnly(3, 'ما نوع الألم؟', 'Toothache — ألم أسنان', 'المصدر يقدم وصف المحادثة والسؤال والإجابة دون خيارات.'),
      ], 'الصيدلية'),
      recording(2, [
        answerOnly(4, 'المحادثة بين من ومن؟', 'Director or manager and secretary — المدير والسكرتير', 'محادثة بين مدير وسكرتير حول غرفة الاجتماع.'),
        answerOnly(5, 'لماذا اختار الغرفة B؟', 'The biggest — لأنها الأكبر', 'المصدر يقدم السؤال والإجابة دون خيارات.'),
        answerOnly(6, 'لماذا طلب حجز غرفة أو لماذا سيقيم الاجتماع؟', 'To discuss makes report', 'العبارة الإنجليزية محفوظة كما كُتبت في المصدر، مع توضيح عربي متعلق بمناقشة العمل أو التقرير؛ تحتاج مراجعة الصوت قبل تصحيح الصياغة.'),
      ], 'محادثة المدير والسكرتير حول غرفة الاجتماع'),
      recording(3, [
        answerOnly(7, 'لماذا لم يصف له الرجل الأول الموقع؟', 'لأنه من خارج المدينة.', 'شخص ضائع يريد معرفة مكان المخبز؛ سأل رجلًا ليس من المنطقة ثم أعطته امرأة الاتجاه.'),
        answerOnly(8, 'أين يقع المبنى أو المخبز؟', 'On the left.', 'المصدر يقدم السؤال والإجابة دون خيارات.'),
      ], 'Bakery'),
      recording(4, [
        answerOnly(9, 'ما وظيفة الرجل المتعلقة بمشكلة الجهاز؟', 'Responsible for solving customer problems.', 'زبون اشترى تلفازًا وتعطّل خلال أقل من 24 ساعة، وطلب من المحل استرجاع المبلغ.'),
        answerOnly(10, 'ماذا حدث في النهاية أو ماذا فعل الرجل بالمنتج؟', 'استرجع المبلغ.', 'الإجابة المكتوبة في المصدر: أخذ فلوسه.'),
      ], 'TV Refund'),
      recording(5, [
        answerOnly(11, 'ما الذي طلبه الزبون للشرب؟', 'Lemon and soda.', 'زبون في فندق يطلب وجبة، والطلب سيجهز خلال نصف ساعة.'),
        answerOnly(12, 'ما رقم الغرفة؟', '60 — sixty', 'المصدر يقدم السؤال والإجابة دون خيارات.'),
        answerOnly(13, 'متى يجهز الطلب؟', 'Thirty minutes — 30 دقيقة', 'المصدر يقدم السؤال والإجابة دون خيارات.'),
      ], 'Room Service'),
      recording(6, [
        answerOnly(14, 'ماذا يعمل عم خالد؟', 'Lecturer — محاضر', 'خالد يتحدث مع صديقه عن زيارته لدبي وعن عمه الذي يعيش ويعمل فيها.'),
        answerOnly(15, 'هل عم خالد سعيد في دبي؟', 'He is happy, but he still thinks of Saudi Arabia and misses it.', 'الإجابة محفوظة بالمعنى الوارد في المصدر.'),
        answerOnly(16, 'أين يسكن عم خالد؟', 'In Dubai.', 'المصدر يقدم السؤال والإجابة دون خيارات.'),
      ], 'Khaled in Dubai'),
      recording(7, [
        answerOnly(17, 'أين توجد التذاكر؟', 'In the pocket of the jacket.', 'زوجان مسافران في زيارة عائلية ومشتاقان للعائلة، وهما في السيارة.'),
        answerOnly(18, 'ما نوع الرحلة؟', 'Family visit.', 'المصدر يقدم السؤال والإجابة دون خيارات.'),
      ], 'Family Visit'),
      recording(8, [
        answerOnly(19, 'أين سيلتقي الطالب بالمعلم؟', 'المكتب.', 'الطالب يحتاج شرحًا للدرس، والمعلم طلب منه أن يأتي إلى مكتبه.'),
        answerOnly(20, 'ما الذي لم يفهمه الطالب؟', 'كل شيء.', 'المصدر يقدم السؤال والإجابة دون خيارات.'),
        answerOnly(21, 'الساعة كم سيلتقي به؟', '3 p.m.', 'المصدر يقدم السؤال والإجابة دون خيارات.'),
        answerOnly(22, 'أين يعمل البروفيسور أو ما عمله؟', 'دكتور في الجامعة.', 'المصدر يقدم السؤال والإجابة دون خيارات.'),
      ], 'Student Office Meeting'),
      recording(9, [
        answerOnly(23, 'ما اللغة التي يدرس بها؟', 'Japanese — اليابانية', 'شخص يدرس في اليابان وواجه في البداية صعوبة في فهم اللغة اليابانية.'),
        answerOnly(24, 'ماذا كان يدرس في الجامعة؟', 'Mathematics', 'المصدر يقدم السؤال والإجابة دون خيارات.'),
        answerOnly(25, 'ما وظيفته؟', 'Lecturer of Mathematics', 'المصدر يقدم السؤال والإجابة دون خيارات.'),
      ], 'Studying in Japan'),
      recording(10, [answerOnly(26, 'متى تصل الرحلة؟', 'Thirty minutes — 30 دقيقة', 'الإجابة موثقة في وصف المصدر دون خيارات.')], 'محادثة رحلة الدمام'),
    ],
  },
];

listeningModels.forEach((model) => model.recordings.forEach((item) => {
  item.questions = item.questions.map((question) => ({ ...question, id: `${model.id}-${item.id}-${question.id}` }));
}));
