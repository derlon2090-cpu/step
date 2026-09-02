const makeQuestion = (modelId, passageId, number, question, answer, decoys) => ({
  id: `${modelId}-${passageId}-q${String(number).padStart(2, '0')}`,
  number,
  question,
  correctAnswer: answer,
  options: [answer, ...decoys].map((text, index) => ({
    id: `${modelId}-${passageId}-q${String(number).padStart(2, '0')}-o${index + 1}`,
    text,
    isCorrect: index === 0,
  })),
});

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
          makeQuestion('reading-01', 'ktunaxa-language', 1, 'Why is it too late to record the language?', 'It is mainly spoken by elders.', ['Anyone who wishes to use them.', 'The material.', 'To create interest.']),
          makeQuestion('reading-01', 'ktunaxa-language', 2, 'Who will the published materials and recordings be available for?', 'Anyone who wishes to use them.', ['It is mainly spoken by elders.', 'As recordings, games for children, and written language.', 'Supportive.']),
          makeQuestion('reading-01', 'ktunaxa-language', 3, "What is the author's opinion of the Ktunaxa language?", 'Supportive.', ['Protect.', 'The material.', 'To use technology that the younger generation is familiar with.']),
          makeQuestion('reading-01', 'ktunaxa-language', 4, 'What does the word “preserve” mean?', 'Protect.', ['Supportive.', 'Italy.', 'To create interest.']),
          makeQuestion('reading-01', 'ktunaxa-language', 5, 'What is the purpose of using the word “can” in the first sentence?', 'To create interest.', ['To meet the increased demand.', 'The Popularity of Pizza.', 'The material.']),
          makeQuestion('reading-01', 'ktunaxa-language', 6, 'Why did Marina choose the internet?', 'To use technology that the younger generation is familiar with.', ['Because it is high in calories.', 'In California in 1954.', 'Protect.']),
          makeQuestion('reading-01', 'ktunaxa-language', 7, 'What does the pronoun “it” refer to?', 'The material.', ['Italy.', 'It adapts to different cultures.', 'Supportive.']),
          makeQuestion('reading-01', 'ktunaxa-language', 8, 'How is it available online?', 'As recordings, games for children, and written language.', ['It is mainly spoken by elders.', 'To create interest.', 'The material.']),
        ],
      },
      {
        id: 'pizza',
        order: 2,
        title: 'القطعة الثانية',
        englishTitle: 'Pizza',
        externalTitle: 'ثانياً / البيتزا',
        questions: [
          makeQuestion('reading-01', 'pizza', 9, 'Why is pizza popular?', 'It adapts to different cultures.', ['To meet the increased demand.', 'Because it is high in calories.', 'In California in 1954.']),
          makeQuestion('reading-01', 'pizza', 10, 'Why was pizza sold in supermarkets?', 'To meet the increased demand.', ['It adapts to different cultures.', 'The Popularity of Pizza.', 'Because it contains a variety of ingredients.']),
          makeQuestion('reading-01', 'pizza', 11, 'What does the pronoun “there” refer to?', 'Italy.', ['The material.', 'California.', 'Different cultures.']),
          makeQuestion('reading-01', 'pizza', 12, 'What is the best title for the passage?', 'The Popularity of Pizza.', ['Ktunaxa Language.', 'The material.', 'Different cultures.']),
          makeQuestion('reading-01', 'pizza', 13, 'Why is pizza not healthy?', 'Because it is high in calories.', ['Because it contains a variety of ingredients.', 'To meet the increased demand.', 'It adapts to different cultures.']),
          makeQuestion('reading-01', 'pizza', 14, 'Where and when did Shakey’s Pizza open?', 'In California in 1954.', ['Italy.', 'To meet the increased demand.', 'The Popularity of Pizza.']),
          makeQuestion('reading-01', 'pizza', 15, 'Why does pizza contain vitamins?', 'Because it contains a variety of ingredients.', ['Because it is high in calories.', 'It adapts to different cultures.', 'In California in 1954.']),
        ],
      },
    ],
  },
];

export const manualQuizModelsById = new Map(manualQuizModels.map((model) => [model.id, model]));
