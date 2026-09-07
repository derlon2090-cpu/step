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

const reviewOnly = (number, prompt, note, answerStatus = 'needs_review') => ({
  ...q(number, prompt, [], null, note),
  answerStatus,
});

const reviewQuestion = (number, prompt, options, note, answerStatus = 'needs_review') => ({
  ...q(number, prompt, options, null, note),
  answerStatus,
});

const uncertainAnswer = (number, prompt, answer, note, answerStatus = 'needs_review') => ({
  ...answerOnly(number, prompt, answer, note),
  answerStatus,
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
  {
    id: 'listening-16', order: 16, title: 'نموذج الاستماع السادس عشر', subtitle: 'حوارات سفر وعمل ومواقف يومية موثقة',
    recordings: [
      recording(1, [
        q(19, 'The two people talking in the conversation are probably …', ['a receptionist and a university applicant', 'a secretary and a job applicant', 'a banker and a loan applicant', 'a boss and a new employee'], 1, 'رقما السؤالين 19 و20 محفوظان كما ظهرا في بداية المصدر.'),
        q(20, 'This conversation probably takes place in a …', ['university office', 'conference room', 'business office', 'cafeteria'], 2, 'رقما السؤالين 19 و20 محفوظان كما ظهرا في بداية المصدر.'),
      ], 'Job Applicant'),
      recording(2, [
        answerOnly(1, 'كيف أتقن اللغة الإنجليزية؟', 'Talking to many people — التحدث مع كثير من الناس', 'محادثة مع شخص متقن للغة الإنجليزية؛ المصدر لا يعرض خيارات كاملة.'),
        answerOnly(2, 'ما الطريقة الأفضل التي اقترحها لتعلم اللغة؟', 'We enjoy learning English — الاستمتاع في التعلم', 'الإجابة موثقة نصيًا دون خيارات.'),
      ], 'Learning English'),
      recording(3, [
        reviewOnly(1, 'أين تدور المحادثة؟', 'المصدر كتب “Sport shirt”، لكن الصياغة لا تحسم هل المقصود محل ملابس رياضية أم قميص رياضي؛ يحتاج مراجعة الصوت.'),
        answerOnly(2, 'ما لون القميص؟', 'White — أبيض', 'محادثة في محل ملابس رياضية؛ الإجابة موثقة دون خيارات.'),
        answerOnly(3, 'ما مقاس القميص؟', 'XL', 'الإجابة موثقة دون خيارات.'),
      ], 'Sportswear Shop'),
      recording(4, [
        answerOnly(1, 'متى انتظر الشخص الأول صديقه؟', 'Yesterday — بالأمس', 'محادثة بين صديقين؛ أحدهما انشغل بعمل استمر معه طوال الليل.'),
        answerOnly(2, 'لماذا لم يذهب إلى صديقه؟', 'he has hard working — كان لديه عمل كثير أو شاق', 'العبارة الإنجليزية محفوظة كما وردت في المصدر، مع توضيح معناها بالعربية.'),
      ], 'Busy Friend'),
      recording(5, [
        answerOnly(1, 'ما المخالفة التي ارتكبها؟', 'Speeding — السرعة', 'محادثة بين شرطي ومخالف.'),
        answerOnly(2, 'أين تدور المحادثة؟', 'On the side of the road', 'الإجابة موثقة دون خيارات.'),
      ], 'Speeding Stop'),
      recording(6, [
        answerOnly(1, 'لماذا تأخر المعلم عن الدوام؟', 'Accident — لأن أخاه تعرض لحادث', 'محادثة عن معلم تأخر بسبب حادث حصل لأخيه.'),
        reviewOnly(2, 'ماذا طلب من المعلم الثاني؟', 'المصدر يذكر أنه طلب أن يقول أو يشرح شيئًا لتلاميذه، لكن الصياغة والإجابة غير مؤكدتين.'),
        answerOnly(3, 'ماذا سيفعل صديقه إذا سأله المدير عن سبب تأخر زميله؟', 'سيقدم عذرًا أو اعتذارًا أمام المدير.', 'السؤال مكتوب كملاحظة عربية وليس بصياغة اختبار إنجليزية كاملة.'),
      ], "Brother's Accident"),
      recording(7, [
        answerOnly(1, 'أين تدور المحادثة؟', 'In or at the university — في الجامعة', 'شخص يسأل عن كلية معينة داخل الجامعة.'),
        answerOnly(2, 'أين انتقلت الكلية؟', 'The building is moved — انتقلت إلى مكان آخر', 'العبارة محفوظة كما وردت في المصدر.'),
        reviewOnly(3, 'هل السائل طالب جديد أم زائر؟', 'الإجابة غير ظاهرة في المصدر.'),
      ], 'University Directions'),
      recording(8, [
        answerOnly(1, 'ما جنسية المسافرة؟', 'كويتية', 'محادثة مع مسافرة كويتية ستسافر إلى لبنان.'),
        answerOnly(2, 'إلى أين كانت ذاهبة؟', 'لبنان', 'الإجابة موثقة دون خيارات.'),
      ], 'Kuwaiti Traveler'),
      recording(9, [
        answerOnly(1, 'ماذا كان يريد أن يشتري؟', 'Ticket — تذكرة', 'محادثة لشخص في مطار أو محطة قطار.'),
        answerOnly(2, 'ماذا سيفعل عندما تأتي الرحلة؟', 'يأكل شطيرة.', 'الإجابة موثقة دون خيارات.'),
      ], 'Ticket & Sandwich'),
    ],
  },
  {
    id: 'listening-17', order: 17, title: 'نموذج الاستماع السابع عشر', subtitle: 'حوارات تعلم وسفر وصحة ومراجعات',
    recordings: [
      recording(1, [
        answerOnly(1, 'أين ظهر الإعلان؟', 'على YouTube', 'محادثة عن امرأة أعدت إعلانًا.'),
        answerOnly(2, 'ما أول شيء شرحته أو عرضته؟', 'Samsung 6s edge', 'الإجابة موثقة دون خيارات.'),
      ], 'YouTube Advertisement'),
      recording(2, [
        answerOnly(1, 'لماذا استعارت أسماء الكتاب؟', 'لأن كتابها غير مكتمل.', 'أسماء تريد استعارة كتاب صاحبتها لأنها فاتها درس.'),
        answerOnly(2, 'لماذا تقطعت الورقة؟', 'لأن أخاها الصغير أتلفها.', 'الإجابة موثقة في وصف المصدر دون خيارات.'),
      ], 'Borrowed Book'),
      recording(3, [
        answerOnly(1, 'ماذا تسمي أروى الشيء الذي تعمل عليه؟', 'A memory books', 'العبارة محفوظة كما وردت في المصدر.'),
        answerOnly(2, 'ما نوع التعديل الذي أجرته على الصورة؟', 'Notes', 'الإجابة موثقة دون خيارات.'),
      ], 'Memory Book'),
      recording(4, [
        reviewOnly(1, 'لماذا تحدث سعود مع نواف؟', 'المصدر يذكر أن الإجابة هي الخيار الأخير، لكن الخيارات غير موجودة؛ يحتاج مراجعة الصوت.'),
        answerOnly(2, 'من سيقوم بتدريب سعود على القيادة؟', "Nawaf's brother — أخو نواف", 'نواف طلب منه الحضور غدًا وأخبره أن أخاه سيعلمه القيادة.'),
      ], 'Driving Practice'),
      recording(5, [answerOnly(1, 'أي مقعد اختار الرجل؟', 'The aisle seat — المقعد بجانب الممر', 'الموظفة سألته هل يريد مقعد النافذة أم الممر.')], 'Aisle Seat'),
      recording(6, [
        reviewOnly(1, 'من المتحدث في المقطع؟', 'المصدر يرجح قائد رحلة أو سائق حافلة، لكن هذه ملاحظة تذكّر غير مؤكدة.'),
        answerOnly(2, 'ما وقت الموعد؟', '6:00 تمامًا', 'المقطع وقع بعد الظهر وفيه موعد؛ تفاصيل المغادرة والوصول غير مكتملة.'),
      ], "Six O'Clock Appointment"),
      recording(7, [reviewOnly(1, 'كيف استجاب الشخص لطلب استخدام هاتفه؟', 'لا توجد إجابة مؤكدة؛ الملاحظات المحتملة تذكر نفاد الشحن أو أن الهاتف في البيت أو أنه غاضب.')], 'Phone Request'),
      recording(8, [
        q(1, 'Bone strength depends on …', ['old', 'Life style'], 1),
        reviewOnly(2, 'متى أو كيف تكون العظام قوية؟', 'المصدر يذكر معنى أنها أقوى في مرحلة مبكرة أو حول الولادة، لكن الصياغة غير واضحة بما يكفي لاعتماد إجابة.'),
        answerOnly(3, 'متى تقل قوة العظم؟', 'Age — عندما يكبر الإنسان في العمر', 'الإجابة موثقة دون خيارات.'),
      ], 'Bone Strength'),
      recording(9, [
        answerOnly(1, 'أين تدور المحادثة؟', 'إذاعة الراديو', 'ثلاثة أشخاص يناقشون كتابًا في برنامج إذاعي.'),
        reviewOnly(2, 'ما اسم الكتاب أو مؤلفه؟', 'المصدر كتب “By…” فقط، واسم الكتاب أو المؤلف غير ظاهر.'),
        answerOnly(3, 'ما رأي الدكتورة في الكتاب؟', 'غير مناسب للأطفال لأنه ليس عن الحياة الواقعية — Real life', 'الإجابة موثقة بحسب ملاحظة المصدر.'),
      ], 'Radio Book Review'),
      recording(10, [
        answerOnly(1, 'ماذا نفهم من المحادثة عن الطالب؟', 'يحب الكتابة ويكتب مقالة — writes and loves writing', 'طالب كتب مقالة عن أهمية لعب كرة القدم وناقشها مع أستاذه.'),
        answerOnly(2, 'ما الصفة التي ليست من صفات معلمه؟', 'It does not accept the opinion of students.', 'العبارة غير الصحيحة؛ المصدر يوضح أن المعلم تقبل رأي الطالب بصدر رحب.'),
      ], 'Student Article'),
    ],
  },
  {
    id: 'listening-18', order: 18, title: 'نموذج الاستماع الثامن عشر', subtitle: 'عادات يومية وخدمات وإعلانات قصيرة',
    recordings: [
      recording(1, [
        answerOnly(1, 'أي شعب يشاهد التلفاز أكثر؟', 'Egyptian people — الشعب المصري', 'حديث عن عدة أشخاص وشعوب ومقدار مشاهدة التلفاز.'),
        answerOnly(2, 'كم ساعة يشاهدون التلفاز؟', 'Six hours', 'الإجابة موثقة دون خيارات.'),
        answerOnly(3, 'من الشخص الذي يشاهد مثل المصريين؟', 'نورة', 'الإجابة موثقة دون خيارات.'),
      ], 'TV Viewing Habits'),
      recording(2, [answerOnly(1, 'ما الأداة التي طُعن بها الشخص؟', 'Knife — السكين', 'المصدر يصف حادثة طعن ويحدد الأداة.')], 'Knife Incident'),
      recording(3, [
        reviewOnly(1, 'ما لعبته المفضلة؟', 'لا توجد الإجابة في الصورة.'),
        reviewOnly(2, 'ما هوايته؟', 'لا توجد الإجابة في الصورة.'),
      ], 'Hobbies'),
      recording(4, [
        answerOnly(1, 'في أي يوم وقعت المحادثة؟', 'Friday — يوم الجمعة', 'نص السؤال الأصلي غير مكتمل؛ المعلومة الظاهرة موثقة في المصدر.'),
        answerOnly(2, 'في أي وقت من اليوم وقعت المحادثة؟', 'Afternoon — بعد الظهر', 'نص السؤال الأصلي غير مكتمل؛ المعلومة الظاهرة موثقة في المصدر.'),
      ], 'Friday Afternoon'),
      recording(5, [
        answerOnly(1, 'لماذا لم يجد الكتاب؟', 'Outsold — نفدت النسخ', 'شخص اتصل بالمكتبة يسأل عن كتاب ولم يجده.'),
        answerOnly(2, 'أين يمكن أن يجد الكتاب؟', 'In another branch — في فرع آخر', 'الإجابة موثقة دون خيارات.'),
        answerOnly(3, 'لماذا لم يدله البائع على الطريق؟', 'لأنه كان يعرف الطريق أو يستطيع معرفته بنفسه.', 'الإجابة موثقة بحسب وصف المصدر.'),
      ], 'Library Book'),
      recording(6, [
        reviewOnly(1, 'أين يضع العميل أمتعته؟', 'المصدر يتوقع وضعها في خزانة عند الاستقبال، لكن الإجابة غير مؤكدة.'),
        reviewOnly(2, 'ما المعلومة المطلوبة عن الإفطار؟', 'السؤال ناقص في المصدر ويحتاج إجابة مؤكدة من الصوت.'),
      ], 'Hotel Luggage'),
      recording(7, [answerOnly(1, 'من الذي لم يعجبه الفيلم؟', 'واحد من المجموعة.', 'لا يوجد نص إنجليزي أو خيارات كاملة، لكن الإجابة موثقة في الوصف.')], 'Movie Opinion'),
      recording(8, [reviewOnly(1, 'ماذا تقصد المرأة بقولها إنها أخذت حافلة مبكرًا ومع ذلك تأخرت؟', 'المصدر يرجح أن الحافلة تأخرت، لكنه يصرح بأن الإجابة تخمين؛ تحتاج مراجعة الصوت.')], 'Late Bus'),
      recording(9, [reviewOnly(1, 'ما المقصود من إعلان الموظفة قبل إغلاق المتجر؟', 'المصدر يذكر أن المتجر سيغلق بعد دقائق، لكن السؤال والإجابة ناقصان ويحتاجان مراجعة الصوت.')], 'Store Closing'),
      recording(10, [
        answerOnly(1, 'ما وظيفة الرجل؟', 'Customer Service — خدمة العملاء', 'حوار بين موظف خدمة عملاء وزبون.'),
        reviewOnly(2, 'ماذا كان يريد الزبون؟', 'الإجابة غير موجودة في الصورة.'),
      ], 'Customer Service'),
      recording(11, [
        answerOnly(1, 'أين تدور المحادثة؟', 'المكتب', 'امرأة تتحدث عن نقل المكتب وتعطل بعض الخدمات بسبب ظرف عائلي.'),
        answerOnly(2, 'لماذا ينتقل المكتب أو تتعطل خدماته؟', 'Family emergency — ظرف عائلي طارئ', 'الإجابة موثقة دون خيارات.'),
        answerOnly(3, 'متى يفتح المكتب؟', 'Next Saturday — السبت القادم', 'الإجابة موثقة دون خيارات.'),
      ], 'Office Relocation'),
      recording(12, [
        q(19, 'The two people talking in the conversation are probably …', ['a receptionist and a university applicant', 'a secretary and a job applicant', 'a banker and a loan applicant', 'a boss and a new employee'], 1),
        q(20, 'This conversation probably takes place in a …', ['university office', 'conference room', 'business office', 'cafeteria'], 2),
      ], 'Job Applicant'),
    ],
  },
  {
    id: 'listening-19', order: 19, title: 'نموذج الاستماع التاسع عشر', subtitle: 'موضوعات كأس العالم والصحة والنقاش الصفي',
    recordings: [
      recording(1, [
        answerOnly(1, 'When was the first international football tournament held under the name of the World Cup?', '1930', 'موضوع عن تتويج ألمانيا وكأس العالم 2014؛ الإجابة موثقة دون خيارات.'),
        answerOnly(2, 'How many people attended the 2014 tournament?', '3.2 million', 'الإجابة موثقة دون خيارات.'),
        q(3, 'How many groups of teams were there?', ['3', '4', '6', '8'], null, 'لا يوجد خط واضح تحت إجابة في المصدر.'),
        answerOnly(4, 'What was the host country for the 2014 World Cup?', 'Brazil', 'الإجابة موثقة دون خيارات.'),
      ], 'World Cup History'),
      recording(2, [reviewOnly(1, 'What is the idea that the lecturer talked about?', 'الملاحظة ترجح أن الفكرة هي توضيح كمية الملح على ملصقات الأغذية، واستخدام الأحمر للكمية المرتفعة، لكن لا توجد إجابة صريحة.')], 'Salt Labels'),
      recording(3, [reviewOnly(1, 'أسئلة فوائد الرياضة للعقل وللمسنين', 'المصدر يذكر موضوع المقطع فقط، ولا يحتوي أسئلة أو اختيارات كاملة؛ ينتظر مراجعة الصوت.')], 'Exercise Benefits'),
      recording(4, [
        answerOnly(1, 'The exam day?', 'On Thursday', 'المحاضر حدد اختبار المادة يوم الخميس.'),
        q(2, 'Next lesson class day?', ['Thursday and Monday', 'Thursday only', 'Tuesday only', 'Monday only'], 3),
        reviewOnly(3, 'ما الرأيان اللذان وافق عليهما المعلم حول الموضوع؟', 'المصدر يذكر جانبًا سلبيًا وآخر إيجابيًا، لكن صياغة السؤال وإجابته الكاملة غير موجودتين.'),
      ], 'Exam Schedule'),
      recording(5, [reviewOnly(1, 'أسئلة تقبل آراء الطلاب', 'المصدر يذكر أن المحاضر يناقش رأيه وكيفية تقبل رأي الطلاب، ويشير إلى نحو سؤالين دون صياغة أو إجابات واضحة.')], 'Student Opinions'),
      recording(6, [reviewOnly(1, 'أسئلة موضوع الخجل', 'المصدر يذكر موضوعًا عن كيف يصبح الشخص خجولًا وتفاعل الناس معه، ويشير إلى سؤالين دون نص كامل أو إجابات.')], 'Shyness'),
      recording(7, [reviewOnly(1, 'أسئلة الفكرة الرئيسية', 'المصدر يذكر موضوعين للفكرة الرئيسية وأن أحدهما معه سؤال ثانٍ، لكن التفاصيل لا تكفي لبناء مفتاح إجابة.')], 'Main Idea Topics'),
    ],
  },
  {
    id: 'listening-20', order: 20, title: 'نموذج الاستماع العشرون', subtitle: 'علوم وصحة واقتصاد ومحاضرات متنوعة',
    recordings: [
      recording(1, [
        answerOnly(1, 'When was Fahrenheit invented?', '1724 — seventeen twenty-four', 'يظهر أيضًا الرقم 1742 في المصدر، لكنه غير مربوط بسؤال محدد لذلك لم يُعتمد.'),
        q(2, 'The Celsius inventor was …', ['German', 'Swedish'], 1),
        q(3, 'What is the main idea of the thermometer?', ['Measuring temperature', 'It contains liquid'], null, 'لا توجد إجابة مسطّرة بوضوح في المصدر.'),
      ], 'Record about scales'),
      recording(2, [q(1, 'Adding or making jokes in the presentation?', ['We can use jokes anytime', 'We can use some jokes'], 1, 'المصدر يوضح أن humor تعني joke في سياق المقطع.')], 'Presentation Jokes'),
      recording(3, [reviewOnly(1, 'أسئلة استخدام ألعاب الفيديو في العلاج الطبيعي', 'المصدر يتذكر موضوع المقطع المتعلق بالمرضى والعلاج الطبيعي فقط، ولا يتذكر الأسئلة أو الإجابات.')], 'Video Games & Physical Therapy'),
      recording(4, [
        q(1, 'Which vitamin is important for fighting diseases or illnesses?', ['Vitamin C', 'Vitamin D', 'Vitamin K'], 0),
        q(2, 'What is the main idea of vitamins?', ['They are found in vegetables', "They're important for our bodies"], 1),
      ], 'Record about Vitamins'),
      recording(5, [
        answerOnly(1, 'What is the main idea about stress?', 'It can damage our bodies.', 'الإجابة موثقة في المصدر دون خيارات كاملة.'),
        q(2, 'What is the solution for stress, or what can we do?', ['Avoid stressful situations', 'Learn how to deal with stress'], 1),
      ], 'Record about stress'),
      recording(6, [
        q(1, 'What is the main idea about thallus?', ['Why it is stuck', 'Thallus and weather conditions'], null, 'لا يوجد خط واضح تحت الإجابة.'),
        q(2, 'What does the lecturer believe about thallus?', ['They separate from each other', 'The weather affects thallus'], null, 'الإجابة غير محددة في المصدر.'),
      ], 'Record about thallus'),
      recording(7, [
        answerOnly(1, 'What is the name of the aircraft manufacturer?', 'General Electric', 'الإجابة موثقة دون خيارات.'),
        answerOnly(2, 'How many planes did General Electric buy from Boeing?', '60 planes', "المصدر: General Electric's aircraft leasing unit buys 60 Boeing planes."),
        answerOnly(3, 'What is the name of the first company to sell light aircraft?', 'Dynamic Aviation', 'الإجابة موثقة دون خيارات.'),
        reviewOnly(4, 'كم تقطع الطائرات مسافة بالكيلومترات؟', 'يظهر الرقم 1070 مع ملاحظة عدم التأكد؛ لا يُعتمد حتى مراجعة الصوت.'),
      ], 'Aircraft Leasing'),
      recording(8, [reviewOnly(1, 'ما الذي فهمه الطلاب عن السيارات الهجينة؟', 'المصدر يرجح مقارنة السيارات الهجينة بسيارات البنزين، لكنه غير واثق ولا توجد صياغة كاملة أو مفتاح إجابة.')], 'Hybrid Cars'),
      recording(9, [reviewOnly(1, 'أسئلة المشاركة الصفية', 'المصدر يتذكر موضوع الدرس وطلب رفع الأيدي وإعطاء أمثلة، لكنها ملاحظات تذكّر وليست أسئلة موثقة.')], 'Classroom Participation'),
      recording(10, [
        answerOnly(1, 'How much did the German economy grow in 2018?', '1.5%', 'المعلومة الأساسية موثقة في المصدر.'),
        reviewOnly(2, 'ما نسبة الزيادة في قطاع السيارات؟', 'المصدر يذكر زيادة تقارب 40%، لكن الصياغة والربط بالسؤال غير مؤكدين.'),
        reviewOnly(3, 'ما سبب النقص أو التراجع؟', 'من الخيارات المتذكرة أن الناس أصبحت أكثر وعيًا، لكن الخيارات الأخرى والإجابة النهائية غير واضحة.'),
      ], 'German Economy'),
      recording(11, [reviewOnly(1, 'أسئلة Queen Elizabeth', 'المصدر يذكر معلومات محتملة عن أبريل، وصغر سنها، وسباق الطيور، وكونها شخصية مشهورة؛ تفاصيل السؤال والإجابة غير موثقة.')], 'Queen Elizabeth'),
      recording(12, [
        answerOnly(1, 'When is the report due?', 'Thursday', 'شخصان يتحدثان عن تقرير سيقدمانه إلى Dr. Jackson.'),
        reviewOnly(2, 'لماذا اتصل بصديقته؟', 'الخيارات المتذكرة تشمل الانشغال أو الاستمرار في التقرير، لكن الإجابة غير مؤكدة.'),
        reviewOnly(3, 'ما طبيعة العلاقة بين المتحدثين؟', 'قد يكونان طالبين أو مساعدين للدكتور أو شخصين يخططان لزيارته؛ يحتاج الصوت للحسم.'),
      ], 'Dr. Jackson Report'),
      recording(13, [
        answerOnly(1, 'What is the main idea about debt?', 'Debt is necessary sometimes — الديون قد تكون ضرورية أحيانًا', 'الإجابة موثقة بحسب ملاحظة المصدر، دون خيارات كاملة.'),
        reviewOnly(2, 'ماذا يحدث إذا أخذ الشخص دينًا أكثر من قدرته؟', 'الخيارات المتذكرة تشمل خسارة الأصدقاء أو عدم القدرة على شراء الاحتياجات، لكن لا توجد إجابة مؤكدة.'),
      ], 'Finance & Debt'),
    ],
  },
  {
    id: 'listening-23', order: 23, title: 'نموذج الاستماع الثالث والعشرون', subtitle: 'بداية المصدر ناقصة وتبدأ من السؤال الثاني',
    recordings: [
      recording(1, [
        q(2, 'What type of tickets did the customer buy?', ['An economy ticket', 'A couple of tickets', 'A one-way ticket', 'A round-trip ticket'], 3, 'السؤال الأول غير موجود في الصور؛ حُفظ الترقيم الأصلي دون اختراع بديل.'),
        q(3, 'The customer actually booked a seat for …', ['Wednesday', 'Thursday', 'Saturday', 'Sunday'], 0),
      ], 'Travel Booking'),
      recording(2, [
        q(1, 'What important point does the lecturer mention about car companies?', ['They will produce electric cars', 'They will gain more profits', 'They will sell regular cars', 'They are becoming bigger'], 0),
        q(2, 'What do the students need to read?', ['A story', 'An article', 'A letter', 'An email'], 1),
        q(3, 'Where do students need to put their homework?', ['On the shelf', 'In the office', 'On the desk', 'In the drawer'], 2),
      ], 'Electric Cars & Homework'),
      recording(3, [
        q(1, 'What is the main idea of the lecture?', ['Because cyberbullying is new, laws are weak.', 'Cyberbullying is common on Twitter.', 'We need to protect young people.', 'Cyberbullying is slowly decreasing.'], 0),
        q(2, 'How does the lecturer feel about government taking action against cyberbullying in the future?', ['Doubtful', 'Slightly confident', 'Completely sure', 'Very negative'], 2),
      ], 'Cyberbullying'),
      recording(4, [
        q(1, 'The cost of the special offer was …', ['55 Riyals', '60 Riyals', '65 Riyals', '75 Riyals'], 2),
        q(2, 'The pizzas and soda are most likely to be …', ["Shared with friends at Ahmad’s Pizza Place.", "Eaten by the customer at Ahmad’s Pizza Place.", "Delivered in one hour from Ahmad’s Pizza Place.", "Ready to pick up in one hour from Ahmad’s Pizza Place."], 2),
      ], 'Pizza Special Offer'),
      recording(5, [q(1, 'What does the professor think about sports law?', ['It needs a clear system', 'It is special and balanced', 'It has to be clearly explained', 'It should be stopped'], 1)], 'Sports Law'),
      recording(6, [
        q(1, 'What does the professor think about giving people free money?', ['It allows finding a good job', 'It makes them lazy', 'It saves families', 'It will increase unemployment'], 0),
        reviewQuestion(2, 'What does the professor think about the experiment?', ['It will make job search more difficult.', 'It will allow skill development.', 'It will improve public health.', 'It will cost the country too much money.'], 'لا توجد إجابة مسطّرة بوضوح في المصدر.', 'incomplete_source'),
      ], 'Free Money Experiment'),
      recording(7, [
        q(1, 'Why does the lecturer mention flooding?', ['To give an example', 'To explain', 'To argue', 'To compare'], 0),
        q(2, 'What information about categories of migration does the lecturer think is more important?', ['Social migration', 'Environmental migration', 'Political migration', 'Economic migration'], 3),
      ], 'Migration'),
      recording(8, [q(1, 'What information about hexagons does the lecturer think is more important?', ['It protects the colony', 'It contains six sides', 'It is space efficient', 'It’s the strongest shape'], 2)], 'Hexagons'),
      recording(9, [q(1, 'How does the lecturer feel about everyone having fears?', ['Doubtful', 'Certain', 'Surprised', 'Worried'], 1)], 'Fear'),
      recording(10, [reviewQuestion(1, 'What is the main idea of the lecture?', ['A taiga plant eating animals', 'How predators survive the winter', 'The climate of the Arctic', 'Characteristics of Arctic predators'], 'الحل حسب الصوت في الاختبار؛ لا تعتمد إجابة من الصورة.', 'needs_audio_review')], 'Arctic Predators'),
    ],
  },
  {
    id: 'listening-24', order: 24, title: 'نموذج الاستماع الرابع والعشرون', subtitle: 'النوم والنباتات والأبحاث والتقنية',
    recordings: [
      recording(1, [q(1, 'What is the most important idea about non-REM sleep?', ['Muscles relax', 'Breathing slows down', 'Our bodies organize and restore functions'], 2)], 'NON-REM SLEEP'),
      recording(2, [q(1, 'What did the professor add about plant defense?', ['Caffeine kills insects completely', 'Insects remember the plant and avoid it'], 1)], 'CAFFEINE AND PLANTS'),
      recording(3, [answerOnly(1, 'Where does the lecturer tell the students to search first?', 'Google', 'الإجابة موثقة دون خيارات.')], 'RESEARCH TASK'),
      recording(4, [
        answerOnly(1, 'What is the conversation mainly about?', 'The history of the Eiffel Tower', 'الإجابة موثقة دون خيارات.'),
        answerOnly(2, 'What did the students ask about?', 'Why the tower is still standing', 'الإجابة موثقة دون خيارات.'),
      ], 'EIFFEL TOWER'),
      recording(5, [
        answerOnly(1, 'What does the professor suggest?', 'That it is difficult work', 'الإجابة موثقة دون خيارات.'),
        answerOnly(2, 'What does the student think is easy?', 'Finding enough people', 'الإجابة موثقة دون خيارات.'),
      ], 'SURVEY'),
      recording(6, [
        answerOnly(1, 'What is the name of the company?', 'Alies Airlines', 'الاسم محفوظ كما كُتب في المصدر دون تصحيح.'),
        answerOnly(2, 'What is the flight distance?', '1500 km', 'الإجابة موثقة دون خيارات.'),
      ], 'AIRLINES'),
      recording(7, [answerOnly(1, 'What is the main idea of the talk?', 'A new car technology that could increase sales', 'الإجابة موثقة دون خيارات.')], 'NEW CAR TECHNOLOGY'),
      recording(8, [q(1, 'What does the speaker say about ADHD?', ['It affects sleeping only.', 'It cannot be treated.', 'It only affects adults.', 'It is more serious or critical in children.'], 3)], 'ADHD TOPIC'),
      recording(9, [q(1, 'What is the main point of this announcement?', ['Hiring a worker', 'Fired', 'Manager', 'Death'], 3, 'الإعلان يتحدث عن وفاة المدير.')], 'MANAGER ANNOUNCEMENT'),
      recording(10, [
        answerOnly(1, 'According to the passage, which is correct?', 'Some companies use overbooking.', 'رقم المقطع غير ظاهر في المصدر.'),
        answerOnly(2, 'How many people lose seats every year?', '50,000', 'الإجابة موثقة دون خيارات.'),
      ], 'OVERBOOKING'),
      recording(11, [
        answerOnly(1, 'How many examples did the professor mention about algorithms in the last lecture?', '4', 'رقم المقطع غير ظاهر في المصدر.'),
        answerOnly(2, 'What is the main idea of the listening?', 'Algorithms are used in daily life.', 'الإجابة موثقة دون خيارات.'),
      ], 'ALGORITHMS (COUNT)'),
      recording(12, [q(1, 'What is the most important idea from the listening?', ['It is complicated', 'It has four steps', 'It is important in Software Engineering'], 2)], 'SOFTWARE ENGINEERING'),
    ],
  },
  {
    id: 'listening-25', order: 25, title: 'نموذج الاستماع الخامس والعشرون', subtitle: 'الحاسوب والطاقة والتجارة والبيئة',
    recordings: [
      recording(1, [
        q(1, 'Why was the first computer invented?', ['For schools.', 'For the U.S. Army.', 'For scientists.'], 1),
        q(2, 'What was the most important feature?', ['It was very fast.', 'It was very heavy.', 'It was very small.'], 1),
      ], 'First Computer'),
      recording(2, [q(1, 'What does the speaker say about solar or renewable energy?', ['It is cheap and easy to use.', 'It is expensive but important for the future.', 'It is useless and not reliable.', 'It causes more pollution.'], 1)], 'Solar / Renewable Energy'),
      recording(3, [
        uncertainAnswer(1, 'Brazil said 200 million pollution reached in which year?', 'For 135 years', 'صياغة السؤال والإجابة غريبة في المصدر؛ حُفظت المعلومة دون اعتمادها مفتاحًا نهائيًا.'),
        answerOnly(2, 'What is the main idea of the text?', 'Brazil does not get tourists.', 'الإجابة موثقة دون خيارات.'),
        answerOnly(3, 'When was the speaker supposed to visit it?', 'In summer.', 'الإجابة موثقة دون خيارات.'),
      ], 'Brazil'),
      recording(4, [q(1, "What's the example the student gave the lecturer about the algorithm?", ['Solving a math problem', 'Writing a computer program', 'Making a cup of tea', 'Walking for a certain distance'], 2)], 'Algorithm'),
      recording(5, [q(1, 'What was the main message of the speaker?', ['Milk is expensive.', 'Many people do not drink enough milk.', 'Milk tastes bad.', 'Children should avoid milk.'], 1)], 'Importance of Milk'),
      recording(6, [
        answerOnly(1, 'What is the speaker mainly talking about?', 'The rise in candy prices.', 'الإجابة موثقة دون خيارات.'),
        answerOnly(2, "What is the adults' attitude toward the rise?", 'They support the rise in prices.', 'الإجابة موثقة دون خيارات.'),
      ], 'Rise in Candy Prices'),
      recording(7, [
        answerOnly(1, 'When will he actually book the train?', 'He will book it on Sunday.', 'الإجابة موثقة دون خيارات.'),
        answerOnly(2, 'Which package does he actually choose?', 'Economy package.', 'الإجابة موثقة دون خيارات.'),
      ], 'Train / Package'),
      recording(8, [
        answerOnly(1, 'What is the test about?', 'It is about Chapter 7.', 'الإجابة موثقة دون خيارات.'),
        answerOnly(2, 'What happened on Tuesday?', 'Something happened at the library — a problem or closure.', 'التفصيل بين المشكلة والإغلاق غير محسوم؛ العبارة محفوظة كما وردت.'),
        answerOnly(3, 'What is the conversation mainly about?', 'It is about the test.', 'الإجابة موثقة دون خيارات.'),
      ], 'Test Conversation'),
      recording(9, [
        q(1, 'Why is Eyad good at English?', ['Because he studies grammar a lot.', 'Because he watches English movies.', 'Because he speaks English a lot with people.', 'Because he lives abroad.'], 2),
        q(2, 'Why should a person learn English?', ['Because it is easy.', 'Because everyone speaks it.', 'Because the person wants to learn it and is interested.', 'Because it is required at school.'], 2),
      ], 'Eyad & English'),
      recording(10, [answerOnly(1, 'What units does the lecturer ask students to study?', 'Units 6 to 10, except Unit 9.', 'الإجابة موثقة دون خيارات.')], 'Trade and business'),
      recording(11, [uncertainAnswer(1, 'What does underemployed mean?', 'Unemployed.', 'الإجابة مشكوك فيها من ناحية المعنى، ويخالفها تعريف لاحق في النموذج 26؛ تحتاج مراجعة الصوت.')], 'EMPLOYMENT'),
      recording(12, [
        answerOnly(1, 'How can countries reduce overfishing?', 'If they cooperate with each other.', 'الإجابة موثقة دون خيارات.'),
        answerOnly(2, 'What does the speaker warn about?', 'Overfishing.', 'الإجابة موثقة دون خيارات.'),
        answerOnly(3, 'What is one result of overfishing?', 'Damage to the sea.', 'الإجابة موثقة دون خيارات.'),
        answerOnly(4, 'What activity is mentioned as a cause of the problem?', 'Illegal fishing.', 'الإجابة موثقة دون خيارات.'),
      ], 'OVERFISHING'),
      recording(13, [answerOnly(1, 'What is the main idea?', 'Housing crisis.', 'الإجابة موثقة دون خيارات.')], 'NEW ZEALAND HOUSING CRISIS'),
      recording(14, [answerOnly(1, 'What is the most important fact mentioned by the lecturer?', 'It was the largest mosque in Europe.', 'الإجابة موثقة دون خيارات.')], 'GREAT MOSQUE OF CÓRDOBA'),
    ],
  },
  {
    id: 'listening-26', order: 26, title: 'نموذج الاستماع السادس والعشرون', subtitle: 'علوم وتقنية ومهارات صفية مع ملحق المصدر',
    recordings: [
      recording(1, [
        answerOnly(1, 'How many types of bear are there?', 'Eight types of bears.', 'الإجابة موثقة دون خيارات.'),
        answerOnly(2, 'What is the speed mentioned?', '40 km.', 'الإجابة موثقة دون خيارات.'),
      ], 'Bear and Speed'),
      recording(2, [answerOnly(1, 'Who lives longer, women or men?', 'Women live longer than men. The average age is 74 years.', 'الإجابة موثقة دون خيارات.')], 'Life Expectancy'),
      recording(3, [
        answerOnly(1, 'What does Arwa make?', 'She makes a memory book.', 'الإجابة موثقة دون خيارات.'),
        uncertainAnswer(2, 'What is the answer to the second question?', 'Notes. Starlite', 'يبدو أن المصدر دمج موضوع Starlite مع Memory Book؛ تحتاج الإجابة مراجعة الصوت.'),
        uncertainAnswer(3, 'What is the benefit of Starlite?', 'It reduces fire.', 'السؤال يبدو تابعًا لموضوع آخر داخل المصدر؛ لا يُعتمد حتى مراجعة الصوت.'),
      ], 'Memory Book'),
      recording(4, [
        answerOnly(1, "How does music affect people's food choices?", 'Loud music leads to fast-food choices; soft music leads to healthier food choices.', 'الإجابة موثقة بالمعنى الوارد في المصدر.'),
        answerOnly(2, 'Why does this happen?', 'Because soft music makes people feel relaxed.', 'الإجابة موثقة دون خيارات.'),
        answerOnly(3, 'What does the teacher think the research needs?', 'More study.', 'الإجابة موثقة دون خيارات.'),
        answerOnly(4, 'What does the teacher think music can affect?', "People's feelings.", 'الإجابة موثقة دون خيارات.'),
      ], 'Music & Shopping Choices'),
      recording(5, [answerOnly(1, 'How much is the pizza?', '65 SR.', 'الإجابة موثقة دون خيارات.')], 'Pizza Order'),
      recording(6, [
        answerOnly(1, 'How many types of tigers are there?', 'There are eight types.', 'الإجابة موثقة دون خيارات.'),
        answerOnly(2, 'What is the speed of the black tiger?', '65 kilometers per hour.', 'الإجابة موثقة دون خيارات.'),
        answerOnly(3, 'What is the most important thing mentioned about the tiger?', 'It is afraid of water and eats different kinds of meat.', 'الإجابة موثقة دون خيارات.'),
        answerOnly(4, 'What does the tiger eat?', 'Horse.', 'الإجابة موثقة دون خيارات.'),
        answerOnly(5, 'What is the main idea of the passage?', 'Saving tigers from extinction.', 'الإجابة موثقة دون خيارات.'),
        answerOnly(6, 'What is one reason tigers are endangered?', 'Illegal hunting.', 'الإجابة موثقة دون خيارات.'),
        answerOnly(7, 'What can help protect tigers?', 'Creating wildlife reserves.', 'الإجابة موثقة دون خيارات.'),
      ], 'Tigers (Detailed Core)'),
      recording(7, [
        answerOnly(1, 'What year was mentioned about the first computer?', '1962.', 'الإجابة موثقة دون خيارات.'),
        answerOnly(2, 'What was the size of the first computer?', 'It was huge and filled an entire room.', 'الإجابة موثقة دون خيارات.'),
      ], 'Computer (History)'),
      recording(8, [answerOnly(1, 'When will the order arrive?', 'After one hour.', 'الإجابة موثقة دون خيارات.')], 'Pizza Delivery'),
      recording(9, [answerOnly(1, 'Why can eating wild mushrooms be dangerous?', 'They can contain toxins that cause poisoning.', 'الإجابة موثقة دون خيارات.')], 'Mushrooms'),
      recording(10, [
        uncertainAnswer(1, 'What is the passage mainly about?', 'Geography.', 'المقطع موسوم Expected في المصدر؛ الإجابة متوقعة وليست مفتاحًا نهائيًا.', 'expected'),
        uncertainAnswer(2, 'Which is the second largest river by area?', 'Amazon River.', 'المقطع موسوم Expected في المصدر؛ يحتاج مراجعة الصوت.', 'expected'),
      ], 'Geography (Expected)'),
      recording(11, [
        uncertainAnswer(1, 'When was the first electronic computer created?', '1940.', 'المقطع موسوم Expected في المصدر؛ الإجابة متوقعة وليست مفتاحًا نهائيًا.', 'expected'),
        uncertainAnswer(2, 'When was the first personal computer created?', '1970.', 'المقطع موسوم Expected في المصدر؛ يحتاج مراجعة الصوت.', 'expected'),
        uncertainAnswer(3, 'What is one disadvantage of old computers?', 'Their size was very large.', 'المقطع موسوم Expected في المصدر؛ يحتاج مراجعة الصوت.', 'expected'),
      ], 'Computer (Expected)'),
      recording(12, [
        answerOnly(1, 'What is the main idea of the listening?', 'The history of Pepsi.', 'الإجابة موثقة دون خيارات.'),
        answerOnly(2, 'What extra information does the speaker give?', 'Soft drinks like Pepsi are unhealthy.', 'الإجابة موثقة بالمعنى الوارد في المصدر.'),
      ], 'Pepsi'),
      recording(13, [
        answerOnly(1, 'What is the new idea in IKEA?', 'Custom furniture.', 'الإجابة موثقة دون خيارات.'),
        answerOnly(2, 'Where is the first branch of IKEA located?', 'Sweden.', 'الإجابة موثقة دون خيارات.'),
        answerOnly(3, 'When did IKEA launch its first branch in Norway?', 'In 1963.', 'الإجابة موثقة دون خيارات.'),
      ], 'IKEA'),
      recording(14, [
        answerOnly(1, 'What is an important fact about Queen Elizabeth II?', 'She raced birds.', 'الإجابة موثقة دون خيارات.'),
        uncertainAnswer(2, 'When will the students present their presentation?', 'On Sunday.', 'السؤال لا يبدو مرتبطًا مباشرة بموضوع Queen Elizabeth II؛ يوجد احتمال دمج مقطعين.'),
        uncertainAnswer(3, 'Which chapters will be included in the quiz?', 'Chapters 1–2.', 'السؤال لا يبدو مرتبطًا مباشرة بموضوع Queen Elizabeth II؛ يحتاج مراجعة الصوت.'),
      ], 'Queen Elizabeth II'),
      recording(15, [
        answerOnly(1, 'What is the main idea of the telescope?', 'To make objects look bigger.', 'الإجابة موثقة دون خيارات.'),
        answerOnly(2, 'When was the telescope invented?', 'In 1608.', 'الإجابة محفوظة كما وردت في المصدر.'),
        answerOnly(3, 'Who invented it?', 'Galileo.', 'الإجابة محفوظة كما وردت في المصدر.'),
        answerOnly(4, 'What nationality is Galileo?', 'Italian.', 'الإجابة موثقة دون خيارات.'),
      ], 'The Telescope'),
      recording(16, [answerOnly(1, 'What is the main idea of the talk?', 'A new car technology that could increase sales.', 'الإجابة موثقة دون خيارات.')], 'New Car Technology'),
      recording(17, [
        answerOnly(1, 'What does “underemployed” mean?', 'A person whose job does not match their qualifications.', 'الإجابة موثقة وتوضح سبب تعليق إجابة Employment في النموذج 25.'),
        answerOnly(2, 'What problem may underemployed workers face?', 'They do not use their skills effectively.', 'الإجابة موثقة دون خيارات.'),
        answerOnly(3, 'What is the main difference between unemployed and underemployed people?', 'Underemployed people have a job, while unemployed people do not.', 'الإجابة موثقة دون خيارات.'),
      ], 'Underemployed'),
      recording(18, [
        answerOnly(1, 'What information was mentioned about people who write with their right hand?', 'They see it as something positive.', 'الإجابة موثقة دون خيارات.'),
        answerOnly(2, 'What was the first thing the teacher asked the students to do?', 'Raise their hands.', 'الإجابة موثقة دون خيارات.'),
        answerOnly(3, 'What did the teacher ask the students to do?', 'Give an example.', 'الإجابة موثقة دون خيارات.'),
      ], 'Right-Handed People'),
      recording(19, [
        q(1, 'Why did people start using treadmills while working?', ['To find a healthier way to stay active while working.', 'Because everyone started using them.', 'To improve their work performance.', 'Because it was a new method of working.'], 0),
        q(2, 'What are people now looking for after using treadmills while working?', ['A new way to improve their health.', 'A way to become less active.', 'A way to work longer hours.', 'A way to improve their performance.'], 0),
      ], 'Treadmills'),
      recording(20, [answerOnly(1, 'What was the main idea of the listening?', 'Probability is part of everyday life.', 'الإجابة موثقة دون خيارات.')], 'Probability'),
      recording(21, [reviewQuestion(2, 'What did the students not understand?', ['The test questions.', 'The math problems.', 'The teacher’s explanation.'], 'الحل حسب الصوت في الاختبار؛ السؤال الأول والعنوان غير ظاهرين.', 'needs_audio_review')], 'Unnamed Classroom Question'),
      recording(22, [q(1, 'What was the main idea of the listening?', ['The cost of cancer treatment in the U.S. reached $94 billion.', 'Cancer research and ways to improve cancer treatment and prevention.'], 1)], 'Cancer'),
      recording(23, [answerOnly(1, 'How do stores use map locations?', 'They use them to send advertisements to people.', 'الإجابة موثقة دون خيارات.')], 'Advertisements'),
      recording(24, [
        answerOnly(1, 'What does the professor think is needed to memorize vocabulary?', 'Effort.', 'الإجابة موثقة دون خيارات.'),
        answerOnly(2, 'What homework did the professor give the students?', 'Write 10 sentences.', 'الإجابة موثقة دون خيارات.'),
        answerOnly(3, 'What test did the professor remind the students about?', 'A test on Units 7, 8, and 10.', 'الإجابة موثقة دون خيارات.'),
      ], 'Vocabulary'),
    ],
  },
];

listeningModels.forEach((model) => model.recordings.forEach((item) => {
  item.questions = item.questions.map((question) => ({ ...question, id: `${model.id}-${item.id}-${question.id}` }));
}));
