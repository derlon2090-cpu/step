const q = (number, prompt, options, correctIndex = null, note = '') => ({
  id: `q-${number}`,
  number,
  prompt,
  options,
  correctIndex,
  note,
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
];

listeningModels.forEach((model) => model.recordings.forEach((item) => {
  item.questions = item.questions.map((question) => ({ ...question, id: `${model.id}-${item.id}-${question.id}` }));
}));
