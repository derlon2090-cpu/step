const makeQuestion = (modelId, passageId, number, question, answer, decoys, explanation = 'الإجابة موثقة ضمن بيانات القطعة.') => ({
  id: `${modelId}-${passageId}-q${String(number).padStart(2, '0')}`,
  number,
  question,
  correctAnswer: answer,
  explanation,
  options: [answer, ...decoys].map((text, index) => ({
    id: `${modelId}-${passageId}-q${String(number).padStart(2, '0')}-o${index + 1}`,
    text,
    isCorrect: index === 0,
  })),
});

const makeUnresolvedQuestion = (modelId, passageId, number, question, options, explanation) => ({
  id: `${modelId}-${passageId}-q${String(number).padStart(2, '0')}`,
  number,
  question,
  correctAnswer: null,
  explanation,
  options: options.map((text, index) => ({
    id: `${modelId}-${passageId}-q${String(number).padStart(2, '0')}-o${index + 1}`,
    text,
    isCorrect: false,
  })),
});

const buildQuestions = (modelId, passageId, entries) => entries.map(([question, answer], index) => makeQuestion(modelId, passageId, index + 1, question, answer, ['Not mentioned in the passage.', 'Another possibility.', 'None of these.']));
const makePassage = (modelId, id, order, title, englishTitle, externalTitle, entries) => ({ id, order, title, englishTitle, externalTitle, questions: buildQuestions(modelId, id, entries) });
const completeDecoys = (answer, sourceOptions = []) => [...sourceOptions.filter((option) => option !== answer), 'Not mentioned in the passage.', 'Another possibility.', 'None of these.'].filter((option, index, all) => all.indexOf(option) === index).slice(0, 3);
const makeMixedPassage = (modelId, id, order, title, englishTitle, externalTitle, entries) => ({
  id, order, title, englishTitle, externalTitle,
  questions: entries.map(([question, answer, sourceOptions], index) => answer === null
    ? makeUnresolvedQuestion(modelId, id, index + 1, question, sourceOptions ?? [], 'مفتاح الإجابة غير مؤكد في المصدر ويحتاج مراجعة.')
    : makeQuestion(modelId, id, index + 1, question, answer, completeDecoys(answer, sourceOptions))),
});

export const wordGlossary = {
  according: 'وفقًا لـ',
  adapt: 'يتكيف',
  adapts: 'يتكيف',
  answer: 'إجابة',
  anyone: 'أي شخص',
  and: 'و',
  author: 'الكاتب',
  available: 'متاح',
  be: 'يكون',
  because: 'لأن',
  best: 'أفضل',
  california: 'كاليفورنيا',
  can: 'يستطيع / يمكن',
  children: 'أطفال',
  choose: 'يختار',
  contain: 'يحتوي',
  contains: 'يحتوي',
  cultures: 'ثقافات',
  demand: 'طلب',
  did: 'فعل مساعد للسؤال',
  different: 'مختلفة',
  does: 'فعل مساعد للسؤال',
  elders: 'كبار السن',
  first: 'الأول',
  for: 'لـ / من أجل',
  games: 'ألعاب',
  generation: 'جيل',
  healthy: 'صحي',
  how: 'كيف',
  internet: 'الإنترنت',
  ingredients: 'مكونات',
  increased: 'متزايد',
  is: 'يكون',
  italy: 'إيطاليا',
  ktunaxa: 'كتوناكسا',
  language: 'لغة',
  late: 'متأخر',
  mainly: 'بشكل رئيسي',
  marina: 'مارينا',
  material: 'المادة',
  materials: 'المواد',
  mean: 'يعني',
  meet: 'يلبي',
  online: 'على الإنترنت',
  opinion: 'رأي',
  open: 'افتتح',
  pizza: 'بيتزا',
  popular: 'شائع / مشهور',
  preserve: 'يحافظ على',
  pronoun: 'ضمير',
  protect: 'يحمي',
  published: 'منشورة',
  purpose: 'الغرض',
  recordings: 'تسجيلات',
  record: 'يسجل',
  refer: 'يشير',
  sentence: 'جملة',
  shakey: 'شيكي',
  sold: 'بيعت',
  spoken: 'منطوقة',
  supermarkets: 'محلات السوبرماركت',
  supportive: 'داعم',
  technology: 'تقنية',
  that: 'أن / الذي',
  the: 'أداة تعريف',
  there: 'هناك',
  too: 'جدا',
  use: 'يستخدم',
  using: 'استخدام',
  vitamins: 'فيتامينات',
  was: 'كان / كانت',
  when: 'متى',
  where: 'أين',
  who: 'من',
  why: 'لماذا',
  will: 'سوف',
  wishes: 'يرغب',
  with: 'مع',
  word: 'كلمة',
  written: 'مكتوبة',
  not: 'ليس',
  of: 'من / لـ',
  passage: 'قطعة / نص',
  them: 'هم / بها',
  title: 'عنوان',
  to: 'إلى / أن',
  younger: 'الأصغر',
  familiar: 'مألوف',
  calories: 'سعرات حرارية',
  variety: 'تنوع',
};

export const manualQuizModels = [
  {
    id: 'reading-01',
    order: 1,
    title: 'النموذج الأول',
    subtitle: 'اختر قطعة داخل النموذج ثم ابدأ الاختبار',
    passages: [
      {
        id: 'ktunaxa-language',
        order: 1,
        title: 'القطعة الأولى',
        englishTitle: 'Ktunaxa Language',
        externalTitle: 'أولاً / اللغة ودور الإنترنت في تطويرها',
        questions: [
          makeQuestion('reading-01', 'ktunaxa-language', 1, 'Why is it too late to record the language?', 'It is mainly spoken by elders.', ['Anyone who wishes to use them.', 'The material.', 'To create interest.'], 'لأن سبب التأخر المذكور هو أن اللغة يتحدث بها كبار السن غالبًا.'),
          makeQuestion('reading-01', 'ktunaxa-language', 2, 'Who will the published materials and recordings be available for?', 'Anyone who wishes to use them.', ['It is mainly spoken by elders.', 'As recordings, games for children, and written language.', 'Supportive.'], 'السؤال يسأل عن الفئة التي تستطيع استخدام المواد المنشورة والتسجيلات.'),
          makeQuestion('reading-01', 'ktunaxa-language', 3, "What is the author's opinion of the Ktunaxa language?", 'Supportive.', ['Protect.', 'The material.', 'To use technology that the younger generation is familiar with.'], 'رأي الكاتب ظاهر كدعم لفكرة حفظ اللغة وإتاحتها.'),
          makeQuestion('reading-01', 'ktunaxa-language', 4, 'What does the word “preserve” mean?', 'Protect.', ['Supportive.', 'Italy.', 'To create interest.'], 'كلمة preserve في هذا السياق تعني حماية الشيء والمحافظة عليه.'),
          makeQuestion('reading-01', 'ktunaxa-language', 5, 'What is the purpose of using the word “can” in the first sentence?', 'To create interest.', ['To meet the increased demand.', 'The Popularity of Pizza.', 'The material.'], 'استخدام can يعطي القارئ إحساسًا بالإمكانية ويجذب اهتمامه.'),
          makeQuestion('reading-01', 'ktunaxa-language', 6, 'Why did Marina choose the internet?', 'To use technology that the younger generation is familiar with.', ['Because it is high in calories.', 'In California in 1954.', 'Protect.'], 'اختيار الإنترنت مرتبط بالوصول للجيل الأصغر عبر تقنية مألوفة لهم.'),
          makeQuestion('reading-01', 'ktunaxa-language', 7, 'What does the pronoun “it” refer to?', 'The material.', ['Italy.', 'It adapts to different cultures.', 'Supportive.'], 'الضمير it يعود على المادة المذكورة قبل الضمير في السياق.'),
          makeQuestion('reading-01', 'ktunaxa-language', 8, 'How is it available online?', 'As recordings, games for children, and written language.', ['It is mainly spoken by elders.', 'To create interest.', 'The material.'], 'طريقة الإتاحة كانت بصيغ متعددة: تسجيلات وألعاب للأطفال ولغة مكتوبة.'),
        ],
      },
      {
        id: 'pizza',
        order: 2,
        title: 'القطعة الثانية',
        englishTitle: 'Pizza',
        externalTitle: 'ثانياً / البيتزا',
        questions: [
          makeQuestion('reading-01', 'pizza', 1, 'Why is pizza popular?', 'It adapts to different cultures.', ['To meet the increased demand.', 'Because it is high in calories.', 'In California in 1954.'], 'شعبية البيتزا جاءت لأنها تناسب ثقافات مختلفة.'),
          makeQuestion('reading-01', 'pizza', 2, 'Why was pizza sold in supermarkets?', 'To meet the increased demand.', ['It adapts to different cultures.', 'The Popularity of Pizza.', 'Because it contains a variety of ingredients.'], 'بيعها في السوبرماركت كان بسبب زيادة الطلب عليها.'),
          makeQuestion('reading-01', 'pizza', 3, 'What does the pronoun “there” refer to?', 'Italy.', ['The material.', 'California.', 'Different cultures.'], 'الضمير there في السياق يعود إلى المكان المذكور وهو إيطاليا.'),
          makeQuestion('reading-01', 'pizza', 4, 'What is the best title for the passage?', 'The Popularity of Pizza.', ['Ktunaxa Language.', 'The material.', 'Different cultures.'], 'الفكرة العامة في الأسئلة تدور حول انتشار وشعبية البيتزا.'),
          makeQuestion('reading-01', 'pizza', 5, 'Why is pizza not healthy?', 'Because it is high in calories.', ['Because it contains a variety of ingredients.', 'To meet the increased demand.', 'It adapts to different cultures.'], 'سبب عدم كونها صحية هو ارتفاع السعرات الحرارية فيها.'),
          makeQuestion('reading-01', 'pizza', 6, 'Where and when did Shakey’s Pizza open?', 'In California in 1954.', ['Italy.', 'To meet the increased demand.', 'The Popularity of Pizza.'], 'السؤال يطلب المكان والزمن، والإجابة تجمعهما: كاليفورنيا عام 1954.'),
          makeQuestion('reading-01', 'pizza', 7, 'Why does pizza contain vitamins?', 'Because it contains a variety of ingredients.', ['Because it is high in calories.', 'It adapts to different cultures.', 'In California in 1954.'], 'وجود مكونات متنوعة هو سبب احتواء البيتزا على فيتامينات.'),
        ],
      },
      {
        id: 'oud',
        order: 3,
        title: 'القطعة الثالثة',
        englishTitle: 'Oud',
        externalTitle: 'ثالثاً / العود',
        questions: [
          makeQuestion('reading-01', 'oud', 1, 'What should we do to make oud into perfume?', 'Distilling.', ['Cleaning.', 'A fungal infection.', 'Chips.'], 'تحويل العود إلى عطر يتطلب عملية التقطير.'),
          makeQuestion('reading-01', 'oud', 2, 'What is oud not used for?', 'Cleaning.', ['Distilling.', 'Oil and bakhoor.', 'Rose and sandalwood.'], 'الاستخدام غير المذكور للعود هو التنظيف.'),
          makeQuestion('reading-01', 'oud', 3, 'What causes an oud tree to produce oud?', 'A fungal infection.', ['Distilling.', 'Collecting.', 'Oil and bakhoor.'], 'العدوى الفطرية هي السبب المذكور لإنتاج العود.'),
          makeQuestion('reading-01', 'oud', 4, 'What kind of perfume did Europeans use with oud?', 'Rose and sandalwood.', ['Cleaning.', 'Chips.', 'They evaporate it.'], 'استخدم الأوروبيون العود مع الورد وخشب الصندل في العطور.'),
          makeQuestion('reading-01', 'oud', 5, 'What does “harvesting” mean?', 'Collecting.', ['Distilling.', 'Cleaning.', 'Active at night.'], 'harvesting تعني الجمع أو الحصاد.'),
          makeUnresolvedQuestion('reading-01', 'oud', 6, 'Where does oud come from?', ['Ethiopia', 'Thailand', 'Yemen', 'India'], 'لم تُحدَّد الإجابة الصحيحة بوضوح في المصدر المرسل.'),
          makeQuestion('reading-01', 'oud', 7, 'What are the two main forms in which oud is used?', 'Oil and bakhoor.', ['Rose and sandalwood.', 'Chips.', 'Collecting.'], 'الشكلان الرئيسيان هما الزيت والبخور.'),
          makeQuestion('reading-01', 'oud', 8, 'In what form is oud used as incense?', 'Chips.', ['Oil and bakhoor.', 'Cleaning.', 'Distilling.'], 'يُستخدم العود كبخور على شكل رقائق أو قطع.'),
          makeQuestion('reading-01', 'oud', 9, 'Oud is taken from how many types of trees?', '4–5 types of trees.', ['One type of tree.', 'Two types of trees.', '10 types of trees.'], 'يؤخذ العود من أربعة إلى خمسة أنواع من الأشجار.'),
          makeQuestion('reading-01', 'oud', 10, 'What does Europe use oud with in perfumes?', 'Rose and sandalwood.', ['Oil and bakhoor.', 'Chips.', 'Cleaning.'], 'يستخدمه الأوروبيون مع الورد وخشب الصندل.'),
          makeQuestion('reading-01', 'oud', 11, 'How do they make the small bottles called “Talat” in Arabic?', 'They evaporate it.', ['They distill it.', 'They collect it.', 'They burn it.'], 'تُصنع هذه القوارير الصغيرة بتبخير العود.'),
        ],
      },
      {
        id: 'ants',
        order: 4,
        title: 'القطعة الرابعة',
        englishTitle: 'Ants',
        externalTitle: 'رابعاً / النمل',
        questions: [
          makeQuestion('reading-01', 'ants', 1, 'What does the word “parallel” mean?', 'Similar.', ['Different.', 'Active at night.', 'Complex.'], 'parallel تعني متشابه أو متوازٍ حسب السياق.'),
          makeQuestion('reading-01', 'ants', 2, 'What is the best title for the passage?', 'Ants: A Mirror of Human Activity.', ['The Body of Ants.', 'How Ants Find Food.', 'Ant Colonies.'], 'العنوان يربط سلوك النمل بنشاط الإنسان.'),
          makeQuestion('reading-01', 'ants', 3, 'Which statement is NOT mentioned in the third paragraph?', 'Ants have different organs.', ['Ants protect the nest.', 'Ants live in colonies.', 'Worker ants help the queen.'], 'هذه العبارة هي غير المذكورة وفق السؤال.'),
          makeQuestion('reading-01', 'ants', 4, 'What does this type of meat ant do?', 'It protects the nest.', ['It lays all the eggs.', 'It cleans houses.', 'It finds water.'], 'وظيفته المذكورة حماية العش.'),
          makeQuestion('reading-01', 'ants', 5, 'Where do ants live?', 'In colonies.', ['In bottles.', 'In flowers.', 'In isolation.'], 'يعيش النمل في مستعمرات.'),
          makeQuestion('reading-01', 'ants', 6, 'Why are ants useful?', 'They eat insects and clean houses.', ['They produce perfume.', 'They lay all the eggs.', 'They live for years.'], 'فائدتها أكل الحشرات وتنظيف المنازل.'),
          makeQuestion('reading-01', 'ants', 7, 'What does the word “exhibit” mean?', 'Display.', ['Hide.', 'Collect.', 'Protect.'], 'exhibit تعني عرض أو إظهار.'),
          makeQuestion('reading-01', 'ants', 8, 'Who helps the queen get food?', 'Worker ants.', ['The meat ant.', 'The eggs.', 'The colony walls.'], 'النمل العامل يساعد الملكة في الحصول على الطعام.'),
          makeQuestion('reading-01', 'ants', 9, 'Do all ants lay eggs?', 'No, only the queen.', ['Yes, all ants do.', 'No, only worker ants.', 'Only the meat ant.'], 'الملكة فقط تضع البيض.'),
          makeQuestion('reading-01', 'ants', 10, 'Do ants live long?', 'No, they may live for about 25–30 days.', ['Yes, for many years.', 'No, only one day.', 'Yes, for about 100 days.'], 'قد يعيش النمل نحو 25 إلى 30 يومًا.'),
          makeQuestion('reading-01', 'ants', 11, 'What is NOT discussed in the introduction?', 'The body.', ['Ant colonies.', 'Human activity.', 'Ant behavior.'], 'الجسم هو الجزء غير المناقش في المقدمة.'),
          makeQuestion('reading-01', 'ants', 12, 'What does the pronoun “it” refer to?', 'The meat ant.', ['The queen.', 'The nest.', 'The colony.'], 'الضمير it يعود إلى نملة اللحم.'),
          makeQuestion('reading-01', 'ants', 13, 'Which characteristic of ants is NOT discussed?', 'Body composition.', ['Their smell.', 'Their colonies.', 'Their activity.'], 'تركيب الجسم هو الخاصية غير المناقشة.'),
          makeQuestion('reading-01', 'ants', 14, 'What does the word “compound” mean?', 'Complex.', ['Simple.', 'Similar.', 'Nocturnal.'], 'compound تعني معقد.'),
          makeQuestion('reading-01', 'ants', 15, 'How do ants find food?', 'By smell.', ['By sound.', 'By color.', 'By touch.'], 'يعثر النمل على الطعام عن طريق الرائحة.'),
          makeQuestion('reading-01', 'ants', 16, 'What does the word “nocturnal” mean?', 'Active at night.', ['Active in the morning.', 'Living alone.', 'Working underground.'], 'nocturnal تعني نشط ليلًا.'),
          makeQuestion('reading-01', 'ants', 17, 'How do ants recognize each other?', 'By smell.', ['By color.', 'By sound.', 'By size.'], 'يتعرف النمل على بعضه عن طريق الرائحة.'),
        ],
      },
      {
        id: 'madain-saleh', order: 5, title: 'القطعة الخامسة', englishTitle: 'Madain Saleh', externalTitle: 'خامساً / مدائن صالح',
        questions: [
          makeQuestion('reading-01', 'madain-saleh', 1, 'What does the word “site” mean?', 'Place.', ['Time.', 'People.', 'Story.'], 'site تعني مكان.'),
          makeQuestion('reading-01', 'madain-saleh', 2, 'What does the pronoun “its” refer to?', 'Madain Saleh.', ['Petra.', 'Madinah.', 'Prophet Saleh.'], 'الضمير its يعود إلى مدائن صالح.'),
          makeQuestion('reading-01', 'madain-saleh', 3, 'Why is Madain Saleh important?', 'It is a great historical and cultural site.', ['It is a modern city.', 'It is the capital of Europe.', 'It is a shopping center.'], 'أهميتها تاريخية وثقافية.'),
          makeQuestion('reading-01', 'madain-saleh', 4, 'How did the author describe Petra?', 'As the capital of the Nabataean state.', ['As a small village.', 'As a modern capital.', 'As a religious school.'], 'وصف البتراء بأنها عاصمة الدولة النبطية.'),
          makeQuestion('reading-01', 'madain-saleh', 5, 'What did the Nabataeans NOT do?', 'Decorations in Madinah.', ['Build monuments.', 'Trade goods.', 'Carve stone.'], 'هذه هي الإجابة المذكورة للسؤال المنفي.'),
          makeQuestion('reading-01', 'madain-saleh', 6, 'Why did Prophet Saleh leave his people?', 'To prevent the believers from being destroyed.', ['To build a market.', 'To visit Petra.', 'To find a new language.'], 'غادر لمنع تدمير المؤمنين.'),
        ],
      },
      {
        id: 'family-responsibility', order: 6, title: 'القطعة السادسة', englishTitle: 'Family Responsibility', externalTitle: 'سادساً / مسؤولية الأسرة',
        questions: [
          makeQuestion('reading-01', 'family-responsibility', 1, 'Why did the father buy his son a car?', 'As a reward because he passed all his exams.', ['Because he needed a taxi.', 'As a birthday gift only.', 'Because the car was cheap.'], 'اشترى الأب السيارة مكافأة لنجاح ابنه في جميع الاختبارات.'),
          makeQuestion('reading-01', 'family-responsibility', 2, 'What does the word “smashed” mean?', 'Destroyed.', ['Repaired.', 'Collected.', 'Hidden.'], 'smashed تعني حُطّم أو دُمّر.'),
          makeQuestion('reading-01', 'family-responsibility', 3, 'What does the word “shatter” mean?', 'Destroy.', ['Build.', 'Protect.', 'Carry.'], 'shatter تعني يدمّر أو يحطّم.'),
          makeQuestion('reading-01', 'family-responsibility', 4, 'What did Khaled understand from the gift?', 'That the car was for family responsibilities.', ['That the car was for racing.', 'That the car was for travel abroad.', 'That the car was for display.'], 'فهم خالد أن السيارة لمسؤوليات الأسرة.'),
          makeQuestion('reading-01', 'family-responsibility', 5, 'What happened to Khaled’s plan?', 'It was destroyed.', ['It succeeded.', 'It changed location.', 'It was postponed.'], 'تحطمت خطة خالد.'),
          makeQuestion('reading-01', 'family-responsibility', 6, 'What is the best title for the passage?', 'The Shattered Dream.', ['The New School.', 'A Family Holiday.', 'The Fast Car.'], 'العنوان الأنسب هو الحلم المحطم.'),
        ],
      },
      {
        id: 'memories', order: 7, title: 'القطعة السابعة', englishTitle: 'Memories', externalTitle: 'سابعاً / الذكريات',
        questions: [makeQuestion('reading-01', 'memories', 1, 'What do you understand from the statement, “Memory is the power to gather roses in winter”?', 'Good memories help solve problems.', ['Winter is always warm.', 'Roses only grow in summer.', 'Memory is a type of flower.'], 'المعنى المقصود أن الذكريات الجيدة تساعد على مواجهة المشكلات.')],
      },
      {
        id: 'the-award', order: 8, title: 'القطعة الثامنة', englishTitle: 'The Award', externalTitle: 'ثامناً / الجائزة',
        questions: [makeQuestion('reading-01', 'the-award', 1, 'Who won the award?', 'A team of three students.', ['One teacher.', 'A family of four.', 'A single athlete.'], 'الفائز فريق مكوّن من ثلاثة طلاب.')],
      },
      {
        id: 'shopping', order: 9, title: 'القطعة التاسعة', englishTitle: 'Shopping', externalTitle: 'تاسعاً / التسوق',
        questions: [
          makeQuestion('reading-01', 'shopping', 1, 'What does the passage talk about?', 'Shopping.', ['Travel.', 'Sports.', 'Education.']),
          makeQuestion('reading-01', 'shopping', 2, 'What do the words “blue, red, and green” refer to?', 'Colors.', ['Sizes.', 'Prices.', 'Stores.']),
          makeQuestion('reading-01', 'shopping', 3, 'What do the words “small” and “medium” refer to?', 'Sizes.', ['Colors.', 'Materials.', 'Locations.']),
        ],
      },
    ],
  },
  {
    id: 'reading-02', order: 2, title: 'النموذج الثاني', subtitle: 'اختر قطعة داخل النموذج ثم ابدأ الاختبار',
    passages: [
      makePassage('reading-02', 'stars', 1, 'القطعة الأولى', 'Stars', 'أولاً / علم النجوم', [
        ['How large is the biggest star?', 'It is more than 17,000 times bigger than the Sun.'], ['Which color is NOT mentioned in the passage?', 'Green.'], ['What is the best title for the passage?', 'Classifying Stars According to Their Colors and Sizes.'], ['What does the pronoun “it” refer to?', 'The camera.'], ['Why are scientists photographing stars?', 'To study them.'], ['How long does it take to take a photo at night?', '30 seconds.'], ['Which characteristic did the author NOT use when comparing stars?', 'Shape.'], ['What does the word “sufficient” mean?', 'Enough.'], ['What does the word “brighter” mean?', 'More shiny.'], ['What is the nearest meaning of the word “unlikely”?', 'Improbable.'],
      ]),
      makePassage('reading-02', 'bees', 2, 'القطعة الثانية', 'Bees', 'ثانياً / النحل', [
        ['What does the pronoun “These amazing creatures” refer to?', 'Insects.'], ['What is the benefit of bees for other creatures?', 'They are necessary to produce food.'], ['In which paragraph does the passage discuss how scientists trained the bees?', 'Paragraph 3.'], ['What is the main idea of the paragraph?', 'Understanding similar feelings in humans and bees may help both.'], ['What does the word “optimist” mean?', 'They are not afraid.'],
      ]),
      makePassage('reading-02', 'fireman', 3, 'القطعة الثالثة', 'Fireman', 'ثالثاً / رجل الإطفاء Mike', [
        ['What did people discover about Mike?', 'He cared for others.'], ['Why was Mike tired or exhausted?', 'Because he did so much to fight the fire.'], ['What problem did Mike face when he went to help someone in need?', 'His arms were strained and painful.'], ['What did they do to help stop the fire?', 'They created a firebreak.'], ['What was Mike’s only thought as he tried to put out the fire?', 'To stop the blazing fire.'], ['What does the pronoun in “his courage” refer to?', 'A man.'], ['What does “flaming monster” refer to?', 'Fire.'], ['What does the word “greedy” mean?', 'More than.'], ['What does the pronoun “it” refer to?', 'Fire.'], ['What is Ben’s job?', 'He is a firefighter. He is the best one who can take care of his mates.'],
      ]),
      makePassage('reading-02', 'panda', 4, 'القطعة الرابعة', 'Panda', 'رابعاً / الباندا', [
        ['Why did the Chinese teach the pandas the language?', 'So that they would feel at home.'], ['Who taught them the language?', 'Scientists, professors, environmentalists, and teachers.'], ['What does the word “Tutor” mean?', 'Teacher.'], ['Where do they live?', 'In Georgia.'], ['Where did the panda live before being transported to China?', 'Atlanta, Georgia.'],
      ]),
      makePassage('reading-02', 'strange-jelly', 5, 'القطعة الخامسة', 'Strange Jelly / Egg Oil', 'خامساً / الكائن الغريب', [
        ['Which of the following is true?', 'Scientists do not know the species of animal that produced the strange gel.'], ['Why is the liquid material orange?', 'It contains oil.'], ['What does the pronoun “it” refer to?', 'The unknown substance.'], ['What does “far-fetched” mean?', 'Difficult to believe.'], ['Where did they find the strange substance?', 'Between Kotzebue and Point Hope.'], ['Where was this substance first found?', 'In Antarctica.'], ['What is the nearest meaning of the word “classify”?', 'Classify into groups.'], ['What is the nearest meaning of the word “concluded”?', 'Consummated / Completed.'],
      ]),
      makePassage('reading-02', 'leakage-water', 6, 'القطعة السادسة', 'Leakage Water', 'سادساً / تسرب المياه', [
        ['What type of text is the passage?', 'A reply to a complaint.'], ['According to Paragraph 2, what caused the problems with the wiring?', 'Leaking water.'], ['According to Paragraph 3, what caused the floor problems?', 'The employees working in that area.'], ['According to Paragraph 3, which of the following is true?', 'Staff need to be instructed about how to treat the floor.'], ['According to Paragraph 4, when will the damaged floor surface begin to be replaced?', 'When the customer notifies the contractor.'], ['What is the closest meaning of the word “inconvenience”?', 'Trouble.'],
      ]),
      makePassage('reading-02', 'volcanic-eruption', 7, 'القطعة السابعة', 'Volcanic Eruption', 'سابعاً / ثوران البركان', [
        ['According to Paragraph 1, which of the following is TRUE?', 'By measuring seismic activity, it is possible to predict a volcanic eruption.'], ['According to Paragraph 2, why was the eruption in 79 AD so severe?', 'There was a long period without seismic activity, and then it started again.'], ['What can we understand from the pronoun “we”?', 'The writer believes that his feelings will be shared by many.'], ['What do we understand about Pliny the Younger from the paragraph?', 'He gave details about the eruption and the effect it had on the population.'], ['What does the word “retrospect” mean?', 'Looking back.'],
      ]),
    ],
  },
  {
    id: 'reading-03', order: 3, title: 'النموذج الثالث', subtitle: 'اختر قطعة داخل النموذج ثم ابدأ الاختبار',
    passages: [
      { ...makeMixedPassage('reading-03','russian-doll',1,'القطعة الأولى','Russian Doll','أولاً / الدمية الروسية',[
        ['Who is the doll maker?','Vasily Zvyozdochkin'],['What is the title of the passage?','Russian Wood Figurine'],['What is the first passage talking about?','The origin of the Russian doll and its appearance.'],['What are the basic factors needed to make dolls?','Expert workmen'],['What are dolls made of?','Wood'],['What does the word “carved” mean?','Shaped'],['What is the origin of the doll?','Japan'],['Why were some presidents excluded from having dolls made for them?','Because they were not in power for long.'],['What does the pronoun “it” refer to?','Odd numbers'],['Which section talks about carving and industry?',null,[]],
      ]), passageText: `The first Russian nested doll set was carved in 1890 by Vasily Zvyozdochkin and designed by Sergey Malyutin, who was a folk crafts painter in the Abramtsevo estate of Savva Mamontov, a Russian industrialist and patron of arts.

The doll set was painted by Malyutin. Malyutin’s doll set consisted of eight dolls—the outermost was a girl in a traditional dress holding a rooster. The inner dolls were girls and a boy, and the innermost was a baby.

The origin of the inspiration for matryoshka dolls is not clear. It is believed that Zvyozdochkin and Malyutin were inspired by Eastern Asian culture, for example, the doll Honshu, named after the main island of Japan. However, the Honshu figures cannot be placed one inside another.

Sources differ in descriptions of the doll, describing it as either a round, hollow Daruma doll portraying a bald old Buddhist monk, or a Seven Lucky Gods nesting doll.

Savva Mamontov’s wife presented the dolls at the Exposition Universelle in Paris, where the toy earned a bronze medal. Soon after, matryoshka dolls were being made in several places in Russia and shipped around the world.` },
      makeMixedPassage('reading-03','missing-plane',2,'القطعة الثانية','The Missing Plane','ثانياً / الطائرة المفقودة',[
        ['What caused the plane to break down?','Technical problems'],['What was the destination of the plane?','New Delhi'],['What did they do when the plane stopped?',null,[]],['What does “not scheduled” mean?','Not planned'],['What was the reason for the delay?','Technical problems'],
      ]),
      makeMixedPassage('reading-03','piri-reis',3,'القطعة الثالثة','Piri Reis','ثالثاً / السلطان العثماني بيري ريس',[
        ['What is the nearest meaning of the word “chart”?','Maps'],['What field did this scientist contribute to?','Geography and navigation'],['What was the scientist’s job?','Map maker'],['When did he give Kitab Al-Bahriya to the Sultan?','In 1525'],['What does the word “cartographer” mean?','Map maker'],['Who is the author of the book?','Piri Reis'],['What does the book talk about?','Ships and sea travel'],['What is the best title for the passage?',null,[]],
      ]),
      makeMixedPassage('reading-03','pollution',4,'القطعة الرابعة','Internal and External Pollution','رابعاً / التلوث الداخلي والخارجي',[
        ['Why is internal pollution more dangerous than external pollution?','Because people stay most of their time inside.'],['Which is the correct choice to preserve the environment?','Using dishes and cups.'],['How much time do we spend inside our houses?','90%'],['What is one of the causes of this pollution?',null,['No fresh air','Construction']],['Why is internal pollution more serious than outside pollution?','Because people spend most of their time in buildings.'],['What is the name of the pollution from kerosene?','Carbon black'],['What is the best source of aerial pollution?','Diesel'],['What does the word “essential” mean?','Important'],['How many chemicals can cause pollution?','856'],['What does the air consist of?','Nitrogen, oxygen, and water vapor.'],['What is another name for diesel smoke?','Black carbon'],['Give an example of external pollution.','Diesel smoke'],['Which of the following is NOT true of contaminants?','Allergy'],['What is the most polluted country?','India'],['Which paragraph talks about the disease?','Paragraph 3'],['What is a source of VOCs?','Printers and computers'],['What is the opposite of “synthetic”?','Natural'],['What is the meaning of “synthetic materials”?','Toxic',['Toxic','Simple','Natural']],['What do you understand from the first paragraph?','Indoor pollution is more dangerous than outdoor pollution.'],['What gas is found in the clouds?','Acid rain'],['What disease can be caused by pollution?','Cancer'],['Which paragraph talks about indoor pollution?',null,[]],['What type of pollution is NOT mentioned in the paragraph?',null,[]],['Which paragraph talks about indoor pollution?',null,[]],['Which of the following is incorrect?','Gases',['Gases','Allergy','Bacteria','Virus']],['What is the best title for the passage?','Pollution'],['What is the effect of carbon?',null,[]],['Is it indoor or outdoor pollution?','Indoor pollution'],['How do we reduce pollution?','We use wood and natural furniture.'],['Which paragraph talks about air pollution?','Paragraph 2'],['In the fifth paragraph, what did the author advise us to stay away from?','Synthetic materials'],['What is the title of Paragraph 1?','Indoor pollution is more dangerous than external pollution.'],['Why does bad air stay inside?','Because people want to save energy.'],['Which paragraph discusses indoor pollution, and which material was not discussed in the passage?',null,[]],
      ]),
      makeMixedPassage('reading-03','dialects',5,'القطعة الخامسة','MSA, Arabic Dialects & Mutual Intelligibility','خامساً / العربية الفصحى واللهجات',[
        ['What is the most understandable Arab dialect?','Egyptian Arabic'],['What is the nearest meaning of “mutual intelligibility”?','Similarity',['Different','Similar','Match']],['Who speaks the most accurate language? / Who are the best speakers of the language?','The one who uses and learns it (Standard Modern Arabic)'],['What is the paragraph about?','The differences between languages'],['What does the pronoun “this” refer to?','Teaching MSA in school'],['Why did the writer mention two cities in the last paragraph, North German and West Slavic?','Similarity in different dialects'],['In Paragraph ___, what did the writer say?',null,[]],
      ]),
      makeMixedPassage('reading-03','travel-statistics',6,'القطعة السادسة','Travel Statistics & Travel Costs','سادساً / إحصائية السفر وتكاليفه',[
        ['Who are the people who travel the most?','Europeans and some Asians'],['Who insists on travelling?','The Americans'],['Who spends the most on travel?','The Americans'],['How much was spent in the year 2005?','3.4 trillion'],['Who travels the most and is the most wasteful?',null,[]],['Who is in the third level in travelling?','Spain'],['Where do the majority of Germans travel to?','Europe'],['Americans travel to ______?','Mexico'],
      ]),
      makeMixedPassage('reading-03','gardener',7,'القطعة السابعة','Gardener’s Announcement','سابعاً / إعلان وظيفة بستاني',[
        ['Where does the gardener prefer to work?','In a residence',['In a farm','In a residence']],['When can employers call Jack?','Weekday evenings',['At 10:00 in the morning','Weekend evenings','Weekday evenings']],['How much money does the gardener take?',null,[]],
      ]),
      makeMixedPassage('reading-03','traffic-accident',8,'القطعة الثامنة','Traffic Accident','ثامناً / حادث علي',[
        ['Ali was able to eat using his hands after ______ months.','18 months',['8','18','10','9']],['Why did Ali have this problem in his hands?','A traffic accident',['Physiotherapy sessions','A traffic accident','Hospital treatment','The university']],['What is the appropriate meaning of “Pioneer operation”?','A technique used for the first time'],['Which of the following is correct?','The operation improves the situation in similar injuries.'],
      ]),
      makeMixedPassage('reading-03','travel-agency',9,'القطعة التاسعة','Travel Agency','تاسعاً / وكالة سفر',[
        ['Travel agency for?','Air',['Air','Sea','Train']],['What kind of service does the agency provide?','Personalized services'],
      ]),
    ],
  },
  {
    id: 'reading-04', order: 4, title: 'النموذج الرابع', subtitle: 'اختر قطعة داخل النموذج ثم ابدأ الاختبار',
    passages: [
      { ...makeMixedPassage('reading-04','muhammad-ali',1,'القطعة الأولى','Muhammad Ali Clay','أولاً / محمد علي كلاي',[
        ['Where did he get the gold medal from?','Roma'],['When did he change his name?','In the same year he defeated Sonny Liston.'],['When he won the gold medal, he was?','An amateur boxer'],['How old was he when he converted to Islam?','22 years old'],['What is the meaning of the word “??????”?','Change'],['How many competitions did he take part in until he got the medal?','3 tournaments'],['What does “assumed” mean?','Took',['Took','Posited']],['Who supported his rejection of the Vietnam War?','The Supreme Court'],['How old was he when he won the championships?','22 years old'],['When did he win the third golden medal?','1978'],['Who did he beat before becoming famous after the third prize?','Leon'],['How old was he when he won the medal?','Thirty-six years old'],['When did he die?','June 3, 2016'],
      ]), passageText: `Mohammed Ali Clay, an American boxer born on behalf of Cassius Marcellus Clay Jr, was born on 17 January 1942 to a family After converting to Islam in 1964 and changing his name to Mohammed Ali without his last name - Clay - Clay won the World Heavyweight Championships three times over twenty years.

He converted to Islam in 1964 and changed his name to Mohammed Ali without his last name - Clay - Clay won the World Heavyweight Championship three times over twenty years in 1964, 1974 and 1978. He died on June 3, 2016 at the age of 74 after a long struggle with Parkinson's disease.` },
      makeMixedPassage('reading-04','cupping',2,'القطعة الثانية','Cupping','ثانياً / الحجامة',[
        ['What are the benefits of cupping?','Energize the body'],['When is it recommended to do cupping?','Once a year or more'],['What are the reasons for a headache?','Toxin'],['How is cupping done?','Wound’s injury'],['Is cupping recommended?','Yes, it is recommended by Prophet Muhammad'],['Cupping treats these except?','Cut of body'],['Which of these things is needed for cupping according to what was mentioned in the paragraph?','Clean instrument'],
      ]),
      makeMixedPassage('reading-04','pigeons',3,'القطعة الثالثة','Pigeons','ثالثاً / الحمام',[
        ['What does Paragraph 1 talk about?','Mixed feelings'],['What does “nocturnal” mean?','Active at night'],['Why did the writer say that pigeons are similar to mice and rats?','They feed on the fallen food.'],['Why did the writer not breathe?','The smell of pigeon waste'],['Where did the pigeons build nests?','They build nests in any place.'],['Urban pigeons are dirty because of?',null,[]],['What is NOT a use of pigeons?','They are pets'],['What is the paragraph about?','Pigeons can live in all circumstances or conditions.'],
      ]),
      makeMixedPassage('reading-04','ants',4,'القطعة الرابعة','Ants','رابعاً / النمل',[
        ['Do all the ants lay eggs?','No, only the queen'],['Which creatures have no skeleton?','All insects'],['In which paragraph do all workers protect?',null,[]],['How do ants know each other?','By smell'],['What does the pronoun “they” refer to?','Ants'],['Where do ants live?','Colonies'],['Which is true?','They cut food and eat'],['What food can ants eat?','Liquid'],['What is the meaning of the word “colony”?',null,['Habitation','Settlement']],['What does the word “compound” mean?','Complex'],['Do ants live long?','They live for a period of 20 to 30 days.'],['What are the holes in the ant’s eyes?','The ant has two eyes, and in every eye there are some eyes.'],['What is the best title for the passage?','The Fascinating Creatures'],
      ]),
      makeMixedPassage('reading-04','watching-tv',5,'القطعة الخامسة','Watching Television','خامساً / مشاهدة التلفاز',[
        ['Why do people watch TV?','To spend more enjoyable time for entertainment (have fun).'],['How does watching TV shorten your life?','Staying long hours without moving.'],['How does exercising make your life longer?','Giving you 3 years to your life, reducing the rate of death by 14%, and reducing other dangers by 4%.'],['According to Paragraph 4, exercising for 15 minutes a day can:','Add three years to the total time of your life.',['Add three years to the total time of your life.','Extend your life for 22 minutes.','Reduce the risk of death by 4%.','Reduce heart disease by 4%.']],['What does “premature” mean?','Early',['Early','Late','Final','Developing']],['According to Paragraph 2, people who watch a lot of television:','They cut off 11 minutes of their lives.',['Get the exciting of exercises','Eat plenty of food','Breathe cigarette smoke']],['According to the text, what activity can increase the health risks of diabetes and heart disease by 20%?','Watch TV for two hours a day.',['A lifestyle that is generally inactive','Over-eating unhealthy food','Smoking']],['كم يموتون الذين على التلفاز؟',null,[]],['كم المعدل اليومي للجلوس على التلفاز؟',null,[]],
      ]),
      makeMixedPassage('reading-04','bone-soup',6,'القطعة السادسة','Bone Soup','سادساً / مرق العظام',[
        ['What does the pronoun “that” refer to?','Minerals'],['What happened to the people who don’t drink bone soup?',null,[]],['What is the meaning of the word “lacking”?','Missing'],
      ]),
      { ...makeMixedPassage('reading-04','meeting-email',7,'القطعة السابعة','Meeting Email','سابعاً / البريد والاجتماع',[
        ['When was the previous meeting?','The day before the message',['The day before message','On the same day','Before sending','Only days before']],['When was the last meeting?','The day before the message'],['Why was the manager angry at the clerk?','Because he came later than him.'],['Why was he upset with him?','Because the secretary arrived late last time.',['He apologized','He did not bring the papers or files.']],
      ]), passageText: `An email from someone informing him about the preparations for the next meeting. And that it is necessary to come early and answer with him the paper he forgot on the desk the last day.` },
      makeMixedPassage('reading-04','job-offer',8,'القطعة الثامنة','Job Offer','ثامناً / العرض الوظيفي',[
        ['What are the skills required for the jobs?','Bachelor degree and fluent in English'],['What is NOT mentioned in the job offer?','Salary'],['Which company is asking for applicants for these jobs?','Travel and tourism company'],['What does the word “forceful” mean?','Powerful',['Powerful','Smart','Mindful']],['What does the word “express” mean?','Explain'],
      ]),
      makeMixedPassage('reading-04','dave-response',9,'القطعة التاسعة','Dave’s Response','تاسعاً / رد ديف',[
        ['What is Dave’s response?','Working',['Working','Fast']],
      ]),
      makeMixedPassage('reading-04','questionnaires',10,'القطعة العاشرة','Questionnaires','عاشراً / الاستبيان',[
        ['Who should respond to the questionnaires?','The students',['The students','The students and professors']],
      ]),
      makeMixedPassage('reading-04','health-chart',11,'القطعة الحادية عشرة','Health Chart','الحادي عشر / الرسم البياني الصحي',[
        ['When was the highest percentage of high health in cities?',null,[]],
      ]),
    ],
  },
  {
    id:'reading-05',order:5,title:'النموذج الخامس',subtitle:'اختر قطعة داخل النموذج ثم ابدأ الاختبار',passages:[
      makeMixedPassage('reading-05','crochet',1,'القطعة الأولى','Crochet & Knitting','أولاً / الحياكة والكروشيه',[
        ['What is the best title of the passage?','The history of hand-made fabric.'],['What is the main idea of the last paragraph?','Hand made is more expensive than machines because of the effort.'],['What is the meaning of the word “function”?','Process'],['What is not mentioned about knitting?','History of crochet'],['What is the difference between crochet and knitting?','They both use a different method.'],['What is not mentioned about knitting?','Knitting is the one used for making socks.'],['Why do people appreciate those who can sew?','Because they feel how much effort they put into making these things.'],['Why do people prefer handicrafts or handmade products?','Because they see the efforts being made in front of them.'],['Are all people good at sewing?','No, they aren’t, only some.'],['Comparison between crochet and knitting?','They use a different method.'],
      ]),
      makeMixedPassage('reading-05','dates',2,'القطعة الثانية','Dates & Palm Trees','ثانياً / التمور والنخيل',[
        ['The passage is mainly talking about:','The advantages of dates.'],['One of the following is NOT an advantage of dates:','Dates increase constipation.'],['The underlined word “thrive” in Paragraph 1 probably means:','Grow'],['Yellow dates and dark-colored dates ________.','Are preserved differently after harvested.'],['What is the meaning of the word “agriculture”?','Cultivated'],['What is the suitable title for the passage?','Versatility of Dates'],['What is the meaning of “Versatility”?','Useful'],['Uses of the palm parts include:','Reconstruction / Weaving / Makeup'],['Not from the uses of palm?','The inscription'],['What is the part of the palm tree that was not mentioned?',null,[]],['What is not true about the dates?',null,[]],
      ]),
      { ...makeMixedPassage('reading-05','avicenna',3,'القطعة الثالثة','Avicenna','ثالثاً / ابن سينا',[
        ['After studying for many years, what did he become?','A physician'],['The underlined word “physician” probably means:','A doctor'],['Why did they call him Avicenna?','Because his name differs according to languages.'],['How was he working?','He was a hard-work man with his patients.'],['What does the word “physicians” mean?','Doctor'],['What does the word “proficient” mean?','Skilled'],['How many folders / volumes did the law book have?','5 folders / 5 volumes'],['What happened after he studied medicine?','He became a doctor'],['What happened to Ibn Sina’s books?','It has been translated into many languages.'],['What happened to him after studied?','Skilled'],['What does he do?','Busy or hard working'],['How old did he live / how old was he when he died?','57 years'],
      ]), passageText:`Avicenna, commonly known as Ibn Sina or by his Latinized name Avicenna, was a Persian scientist. After he studied hard for years, he became a physician. His famous medical book is called “The Canon of Medicine”. It was in 5 volumes. He also had books in different fields, where they were translated into many languages.` },
      makeMixedPassage('reading-05','korean-immigrants',4,'القطعة الرابعة','Language & Immigrant Identity','رابعاً / اللغة وهوية المهاجرين',[
        ['What is the best title of the passage?','Language and its effect on the identity of immigrants.'],['What is not true according to the first paragraph?','Second generation immigrants are eager to learn parent native language.'],['Did the mother speak Korean with all girls or just one?','All the children'],['Is the first girl old or young?','The first girl is old; the old girl speaks English and Korean very well, but the second and third only speak English.'],['Why can’t the second girl speak Korean?','Because she is Americanized.'],['What is not true about the old girl?','Sympathetic'],['Why did the aunt try to teach the girls how to speak Korean?','To help them establish a Korean identity.'],['What is correct from these sentences?','The second sister is older than the son.'],['The oldest sister had a problem with:','She can’t understand some Korean jokes.'],['What is not a reason for the 14-year-old girl’s problems with her mother?','She does not love mother.'],['Which of the following is NOT in the passage?','American friends will not see them as Korean American.'],['What does the phrase “Americanized immigrants” mean?','People who imitate Americans.'],['What does the pronoun “they” refer to?',null,['mother and her young daughter','children']],['What is the meaning of the word “suffer”?','Problem'],['What language does the 14-year-old girl speak?','English'],['According to paragraphs 3–4, how did the aunt deal with the 14-year-old girl?','She helped her to speak Korean.'],['How many languages can the 18-year-old girl speak?','Two, English and Korean.'],['Which of the following is NOT true about the 18-year-old daughter?','She speaks only English very well; her Korean is poor.'],['Miscommunication between the parents and their children may lead to what?','Big problem'],['What is not mentioned about the 14-year-old girl?',null,[]],['What are the differences between immigration and ______ the influence on language?',null,[]],['Which of the following is close to the main idea?','The language in immigrant is mixture of two languages.'],
      ]),
      makeMixedPassage('reading-05','petra',5,'القطعة الخامسة','Petra','خامساً / البتراء',[
        ['Where is Petra located?','Southern Jordan'],['What is Petra capital of?','Nabatean kingdom'],
      ]),
      { ...makeMixedPassage('reading-05','weather',6,'القطعة السادسة','Kingdom Weather Forecast','سادساً / طقس مناطق المملكة',[
        ['Which parts of the Kingdom may receive rain?','The central and eastern parts.'],['The forecast for Makkah and Medina is ______.','Dusty and hot'],['Which city may expect to see storm clouds?',null,['Abha','Baha','Taif']],['Where will it probably be difficult to see clearly while driving?','Qassim'],
      ]), passageText:`Strong winds will raise dust and sand, reducing visibility over the northern and central Kingdom between Makkah and Madinah, with the possibility of increasing temperatures over these regions. Suspended haze will spread over Qassim, Hail and northern parts of the Riyadh region, limiting visibility and making driving hazardous. Parts of the central and eastern Kingdom will be partly cloudy, with chances of rain. Storm clouds may form over the southwestern and western highlands, including Abha, Baha and Taif.` },
      makeMixedPassage('reading-05','course-units',7,'القطعة السابعة','Course Units','سابعاً / وحدات المقرر',[
        ['Which unit shows the prayer?','Religion – Unit 3'],['Which unit talks about the changes of the society?','Unit 4'],
      ]),
      makeMixedPassage('reading-05','medical-doctor',8,'القطعة الثامنة','Medical Doctor','ثامناً / الطبيب',[
        ['The passage is about?','Medical doctor'],['The word “examine” in the passage is closest in meaning to?','Looking'],
      ]),
      makeMixedPassage('reading-05','height-comparison',9,'القطعة التاسعة','Height Comparison','تاسعاً / مقارنة الطول',[
        ['What do you understand from the sentence “Adam is not as tall as Erich”?','Erich is taller than Adam.'],
      ]),
      makeMixedPassage('reading-05','papyrus',10,'القطعة العاشرة','Papyrus & Paper','عاشراً / البردي والورق',[
        ['According to Paragraph 2, what did the early Egyptians use to make their writing material?','Papyrus'],['The word “them” in Paragraph 2 refers to ______.','Papyrus stems'],['What does the word “papyrus” mean?','Sedge'],['The first real paper was made in ______.','China'],['Who introduced the paper-making process to Europe?','The Arabs'],['Which component is necessary for making both paper and papyrus?','Fibrous material'],
      ]),
      makeMixedPassage('reading-05','berlin-wall',11,'القطعة الحادية عشرة','Berlin Wall','الحادي عشر / جدار برلين',[
        ['What is the best title of the passage?','The history of Berlin Wall'],['How many people could pass the wall?','5000 / five thousand people'],['What does paragraph 1 say about the actions of the East German border guards?','They closed most of the streets on the border.'],['What is the main idea of the second paragraph?','5000 crossed over the wall.'],['What does paragraph 4 say about the wall between East and West?',null,['It was 112km long','It was 155km long']],['When did Germany know?','11 months later'],['What is the last paragraph about?','The fall, when it came, was quick.'],['Why did they build the wall?','To separate East German from West German.'],
      ]),
      { ...makeMixedPassage('reading-05','wood',12,'القطعة الثانية عشرة','Wood & Lignin','الثاني عشر / الخشب واللجنين',[
        ['The word “they” in the passage refers to ______.','Vessels'],
      ]), passageText:`With lignin and appropriate architecture, we truly have wood. It is wood that makes trees. In practice, it is mainly the cells of the conducting vessels that become lignified, and they and their surrounding supporting cells are the main ingredient in timber.` },
    ]
  },
  {
    id:'reading-06',order:6,title:'النموذج السادس',subtitle:'اختر قطعة داخل النموذج ثم ابدأ الاختبار',passages:[
      { ...makeMixedPassage('reading-06','world-war-two',1,'القطعة الأولى','The Second World War','أولاً / الحرب العالمية الثانية',[
        ['When did the Second World War begin?','In 1939'],['How many militaries were killed in it?','More than 25 million'],['Why did the war end in the winter?',null,['Because it was too cold in Russia.','There were no means to warm.']],['What was the first reforms?','Providing food for people'],['World War (2) differs from other wars?','more destruction happened.'],['Why are modern weapons more destroyed or why equipment shatters a city easily?','Because weapons are advanced.'],['After the end of the war, which of the following increased:','Crime and breaking the law'],['The cost of World War 2?','More than three wars before'],['After the war:','People were busy with problems.',['People were busy with problems.','They were sad because of the number of dead.','They lost the desire to live.','Ready for an upcoming war.']],['What does occur mean?','Happen'],['The end of war:','disaster remained',['disaster remained','disaster stopped.']],['Strikes in 1947:','Lack of coal'],['What is the best title of the passage?','The Moscow Peace Treaty'],['How long did the world war last?','Six years'],
      ]),passageText:`The Second World War is an international war that started on the first of September of 1939 in Europe and ended on the second of September of 1945, in which the vast majority of the countries of the world participated, including the great countries in two conflicting military alliances: the Allied Forces, and the Axis countries, and it is also the broader war in History, in which more than 100 million people participated in the World War, more than 25,000,000 people were killed in the military and more than 30,000,000 citizens. The Second World War was more destructive than previous wars and that weapons can destroy cities because they developed even after the end of the World War.Among the effects that remained were the destruction, the rate of crimes, and the violation of the law.`},
      makeMixedPassage('reading-06','radio',2,'القطعة الثانية','Radio Listening','ثانياً / الاستماع إلى الراديو',[
        ['Which statement about radio development is correct?','development made radio cheaper'],['Where do a lot of people listen to the radio?','In cars'],['When does Urdu radio broadcast?','3 pm',['3 pm','9 am','7 am']],['What does the pronoun “them” refer to?','Majority',['Majority','minority','lions power','young']],['Are English radios few or many?','Few'],
      ]),
      { ...makeMixedPassage('reading-06','istanbul',3,'القطعة الثالثة','Istanbul','ثالثاً / إسطنبول',[
        ['What is the old name of Istanbul? or what’s called?','Constantinople'],['What does the word “happen” mean?','Occur'],['What does the word “reign” mean?','Rule'],['What is the best title of the passage?','The civilization of Turkey',['The civilization of Turkey','Ottoman Empire and Turkish Republic']],['interested in such passage?','Culture and tours'],['What is the goal of the speaker or It seems to be directed to?','Tourists',['Historians','Geographers','Tourists']],
      ]),passageText:`Istanbul, formerly known as Byzantium and Constantinople, is the most populous city in Turkey and the economic, cultural and historical center of the country Istanbul is an intercontinental city in Eurasia, stretching across the Bosporus (separating Europe and Asia) between the Sea of Marmara and the Black Sea. The commercial and historical center is located on the European side and about one third.`},
      makeMixedPassage('reading-06','global-diet',4,'القطعة الرابعة','The Changing Global Diet','رابعاً / النظام الغذائي العالمي',[
        ['What is the best title for the passage?','The changing global diet',['The changing global diet','Health problems','Healthy eating habits in Japan']],['Western food?','Making health worse in Japan'],['What does the word “nutritious” mean?','High food value',['High food value','more healthy']],['What does the pronoun “these” refer to?','Meat and dairy products'],['In the Czech Republic:','Most people live healthy lives'],
      ]),
      { ...makeMixedPassage('reading-06','personality-types',5,'القطعة الخامسة','Type A and B Personalities','خامساً / الشخصيتان A وB',[
        ['Reducing sleep?','causes sudden death'],['What does the word “individual” mean?','Separated'],['Where is most people between A and B?','in the middle'],['Type A is different from type B, they?','in a rush doing_'],['What is our goal?','Balance work and play'],
      ]),passageText:`some very prominent and that is the reason. Type A and B are tow type of personalities why they are so easily identified if you see someone freaking out because they are made time! even if the wait is for hurry and impatience seems to be their middle name, wait they walk fast and are, they speak fast. Urgency is seen clearly in their personality constantly aware of the running time.

Others are also curious as they are not tolerant of people who speak slowly and usually end up completing sentences to them!, The other characteristics of a personality are that they feel annoyed by small things easily as they ease their strength when they get angry, So it is better not to provoke them, they have high ambitions, they can overcome the competition to achieve their goal, as they tend to compete with others.`},
      makeMixedPassage('reading-06','meeting',6,'القطعة السادسة','Effective Meetings','سادساً / الاجتماعات الفعالة',[
        ['What does the “remark” mean?','Comment',['Comment','Suspension']],['What is the main idea?','Meeting is planned and organized.'],['Who should invite for a meeting?','People who are necessary',['More people','People who are necessary']],
      ]),
      makeMixedPassage('reading-06','device-driver',7,'القطعة السابعة','Device Driver','سابعاً / برنامج تشغيل الجهاز',[
        ['What does the passage talk about?','Device driver work'],['What does the word (current) mean?','The recent'],['Device driver is?','Piece of software',['Piece of software','printer','modem']],['The main function of device driver?','Connect hardware to computer',['Connect hardware to computer','connecting to internet']],
      ]),
      makeMixedPassage('reading-06','housework',8,'القطعة الثامنة','Daily Housework','ثامناً / الأعمال المنزلية',[
        ['How is the person?','busy.',['busy.','happy','sad','angry']],['An example of housework?','washing floor',['washing floor','studying for the children','going shopping','sit with her family.']],
      ]),
      makeMixedPassage('reading-06','resort',9,'القطعة التاسعة','All-Inclusive Resort','تاسعاً / المنتجع الشامل',[
        ['What does an all-inclusive resort mean?','It covers food lodging and activities.'],['Which of the following may cost more?','equipment rental'],
      ]),
    ]
  },
];

export const manualQuizModelsById = new Map(manualQuizModels.map((model) => [model.id, model]));
