const categoryLabels = {
  general: 'القواعد العامة',
  incorrect: 'اكتشاف الخطأ',
  'word-order': 'ترتيب الكلمات',
  capitalization: 'Capitalization',
  punctuation: 'Punctuation',
  special: 'أسئلة خاصة'
};

const categoryOrder = ['general', 'incorrect', 'word-order', 'capitalization', 'punctuation', 'special'];

const buildModel = (order, rows, subtitle) => ({
  id: `grammar-${String(order).padStart(2, '0')}`,
  order,
  title: `النموذج ${order}`,
  subtitle,
  status: 'available',
  questions: [...rows]
    .sort((a, b) => categoryOrder.indexOf(a[1]) - categoryOrder.indexOf(b[1]))
    .map(([sourceNumber, category, prompt, options, correctIndex, sourceNote], index) => ({
      id: `grammar-${String(order).padStart(2, '0')}-q${sourceNumber}`,
      sourceNumber,
      category,
      categoryLabel: categoryLabels[category],
      prompt,
      options,
      correctIndex,
      sourceNote,
      displayOrder: index + 1
    }))
});

const model4Rows = [
  [61, 'general', 'Choose the best way to join these sentences.\n(She likes drinking tea. She doesn\'t like drinking coffee.)', ['She likes drinking tea, but she doesn\'t like drinking coffee.', 'She likes drinking tea, so she doesn\'t like drinking coffee.', 'She likes drinking tea because she doesn\'t like drinking coffee.', 'She likes drinking tea or she doesn\'t like drinking coffee.'], 0, 'نستخدم but لربط فكرتين بينهما تضاد (contrast).'],
  [62, 'general', 'If I ...... this year, I will celebrate with a big cake.', ['am graduating', 'am graduate', 'graduate', 'will graduate'], 2, 'في الشرط الأول نستخدم: If + present simple, will + base verb.'],
  [63, 'general', 'When I was in college ...... a very good student.', ['I am using to be', 'I used to be', "I'm used to", 'I use to be'], 1, 'تُستخدم used to للعادات أو الحالات الماضية.'],
  [64, 'general', "I'm so busy with my term paper. I haven't slept much ...... last Thursday.", ['for', 'since', 'from', 'until'], 1, 'تأتي since مع نقطة بداية زمنية محددة.'],
  [65, 'general', 'When I logged on to the course website, I was happy to find that my paper ...... two days ago.', ['had been scored', 'being scored', 'is scored', 'scored'], 0, 'حدث التصحيح قبل حدث ماضٍ آخر، لذا نستخدم past perfect passive.'],
  [66, 'general', "I need to go to the bookstore. I don't have ..... books for the Engineering course.", ['any', 'a lot', 'much', 'some'], 0, 'نستخدم any عادةً مع النفي.'],
  [67, 'general', 'It has been really nice teaching this course. I hope you have enjoyed ..... as much as I have.', ['yours', 'yourself', 'ourselves', 'yourselves'], 1, 'التعبير الصحيح هو enjoy yourself.'],
  [68, 'general', "I met ...... teachers at the conference last week, but I didn't meet any students.", ['few', 'a little', 'some', 'much'], 2, 'teachers اسم معدود جمع، والأنسب معه some.'],
  [69, 'general', 'If the teacher asks you a question, you ..... immediately.', ['must answering', 'must answer', 'must', 'must to answer'], 1, 'بعد must يأتي الفعل بصيغته الأساسية.'],
  [70, 'general', 'Jane: Do you eat a lot of fast food at university?\nJenny: Yes, I eat ...... two or three times a week.', ['these', 'him', 'it', 'those'], 2, 'الضمير it يعود على fast food.'],
  [71, 'general', 'When the students ..... hard, they pass their exams.', ['study', 'studied', 'will study', 'would study'], 0, 'هذه حقيقة عامة، لذا نستخدم present simple.'],
  [72, 'general', 'Dave is .......... in English of all the students.', ['stronger', 'strongly', 'most strong', 'the strongest'], 3, 'عند المقارنة بين فرد ومجموعة كاملة نستخدم صيغة التفضيل superlative.'],
  [73, 'general', 'Judy: I saw Mrs. Nora yesterday.\nJulia: Really? ...... she still teach Computer Science?', ['Has', 'Had', 'Does', 'Would'], 2, 'نستخدم Does للسؤال في المضارع البسيط مع she.'],
  [74, 'general', 'Our professor told us ..... about the exam. He said it would be easy.', ['no worrying', 'not to worry', "don't worry", 'not worry'], 1, 'بعد told us نستخدم not to + verb.'],
  [75, 'general', 'Mike was in class when his brother ..... him.', ['calls', 'called', 'has called', 'had called'], 1, 'الأنسب للحدث الذي وقع أثناء حالة ماضية هو past simple.'],
  [76, 'general', 'This book ..... by Mr. Johnston, the Marketing teacher, three years ago.', ['is written', 'has been written', 'was written', 'had been written'], 2, 'الجملة مبنية للمجهول في الماضي البسيط.'],
  [77, 'general', 'Students ..... expected to write very long papers in their first year.', ['not', 'do not', 'are not', 'will not'], 2, 'التركيب الصحيح هو are not expected to.'],
  [78, 'general', 'Mr. Harris has been a teacher ..... ten years.', ['for', 'from', 'since', 'during'], 0, 'نستخدم for مع مدة زمنية.'],
  [79, 'general', 'If Mrs. Smith had had more time, she ..... have planned her lessons better.', ['would', 'must', 'can', 'will'], 0, 'في الشرط الثالث نستخدم: If + had + past participle، ثم would have + past participle.'],
  [80, 'general', 'Fatima failed her final exam, so she ..... take the course again.', ['would to', 'should to', 'can to', 'had to'], 3, 'للتعبير عن الاضطرار في الماضي نستخدم had to.'],
  [82, 'general', 'The professor ..... teaches us English is very good.', ['who', 'which', 'that he', 'who he'], 0, 'نستخدم who اسمًا موصولًا للعاقل.'],
  [83, 'general', "I ..... become an engineer if I could, but I don't have good grades.", ['can', 'will', 'shall', 'would'], 3, 'في الشرط الثاني نستخدم would + base verb.'],
  [84, 'general', 'When you submit your essays, ..... you leave the room quietly, please?', ['shall', 'would', 'should', 'must'], 1, 'Would you ... please? صيغة طلب مهذبة.'],
  [85, 'general', "I don't know how ..... to answer that question. It was very easy.", ['did the student fail', 'the student failed', 'did fail the student', 'failed the student'], 1, 'في السؤال غير المباشر نستخدم ترتيب الجملة الخبرية.'],
  [86, 'general', 'My uncle told me ..... mathematics because it is very difficult.', ['no studying', 'not to study', "don't study", 'not study'], 1, 'بعد told me نستخدم not to + verb.'],
  [87, 'general', 'Bob wrote a very nice and well-organized essay, just like his teacher ..... him.', ['he taught', 'he teaches', 'has taught', 'had taught'], 3, 'التعليم حدث قبل الكتابة في الماضي، لذا نستخدم past perfect.'],
  [88, 'general', 'Mrs. Davis, ..... we saw at the lecture last week, is in London for a conference.', ['she', 'her', 'whom', 'which'], 2, 'نستخدم whom مفعولًا به للعاقل.'],
  [89, 'general', 'Did you know that neither Ted ..... Tom graduated this year?', ['nor', 'also', 'either', 'neither'], 0, 'التركيب الصحيح هو neither ... nor.'],
  [90, 'general', 'He is a teacher, ..... so is his brother.', ['if', 'or', 'and', 'that'], 2, 'الربط الصحيح هو: and so is his brother.'],
  [93, 'general', "Would you mind .....? I can't see the TV.", ['your head moving', 'to moving your head', 'moving your head', 'to move your head'], 2, 'بعد Would you mind يأتي verb + ing.'],
  [95, 'incorrect', "Which one of the underlined words or phrases is INCORRECT?\nIbn Firas is well known in the Arab World for he's early airplane.", ['is', 'in', 'Arab', "he's"], 3, "الصحيح his وليس he's."],
  [97, 'incorrect', 'Which one of the underlined words or phrases is INCORRECT?\nI usually drink tea without milk, but since I had a stomachache, I drunk it with milk.', ['without', 'but', 'since', 'drunk'], 3, 'الصحيح drank لأنه ماضٍ بسيط.'],
  [100, 'incorrect', 'Which of the underlined words or phrases is INCORRECT?\nThis is lecture important, so you really must try your best to attend it and to pay attention to what is being said.', ['is lecture important', 'really must', 'best', 'to'], 0, 'التركيب الصحيح هو: This is an important lecture.'],
  [92, 'word-order', 'Choose the sentence with the RIGHT WORD ORDER.', ['I wonder what time he usually comes back from work.', 'I wonder what time comes he usually back from work.', 'I wonder what time usually comes he back from work.', 'I wonder what time he comes usually back from work.'], 0, 'في indirect questions نستخدم ترتيب الجملة الخبرية.'],
  [94, 'word-order', 'Choose the sentence with the RIGHT WORD ORDER.', ['A four-year course in Business Studies is taking Noura.', 'Noura is taking a four-year course in Business Studies.', 'Noura is taking in Business Studies a four-year course.', 'In Business Studies is Noura taking a four-year course.'], 1, 'الترتيب الطبيعي هو: subject + be + verb-ing + object.'],
  [91, 'punctuation', 'Which sentence has the CORRECT PUNCTUATION?', ['After, school ended we traveled to London.', 'After school, ended we traveled to London.', 'After school ended we, traveled to London.', 'After school ended, we traveled to London.'], 3, 'عندما تبدأ الجملة بعبارة زمنية تابعة، توضع فاصلة قبل الجملة الرئيسية.'],
  [96, 'special', "To which sentence from the paragraph below can we add the following phrase?\n..., who had just had an operation.\n(1) Ahmad was going to the hospital to see his uncle.\n(2) On the way, he met his friend, Dr. Khaled.\n(3) They walked together until they reached the hospital.\n(4) After sending greetings and wishes for a speedy recovery to Ahmad's uncle, Khaled said goodbye.", ['(1)', '(2)', '(3)', '(4)'], 0, 'العبارة تصف his uncle في الجملة الأولى.']
];

const model5Rows = [
  [61, 'general', "Sara: Help! I lost my key and can't get into my house!\nMona: Don't worry, I ........ send my son to help you.", ['have', 'will', 'should', 'would'], 1, 'نستخدم will للقرار أو الوعد اللحظي.'],
  [62, 'general', 'If you want to become a doctor, you ...... go to the college of medicine.', ['should', 'might', 'ought', 'would'], 0, 'نستخدم should لإعطاء النصيحة.'],
  [63, 'general', 'Many students from different parts of the world attend my classes at the university; ........', ['some of them are Arabs but the rest are from the Far East', 'all of them are from Bahrain', 'some of them are Arabs but the rest are from Bahrain', 'all of them are from the Far East'], 0, 'هذا الخيار هو الأكثر اتساقًا مع عبارة different parts of the world.'],
  [64, 'general', "Eric: Is this .............. car?\nMatt: No, it's not. My car is over there.", ['my', 'mine', 'your', 'yours'], 2, 'قبل الاسم car نستخدم صفة الملكية your.'],
  [65, 'general', "Don't stop, Dave. Keep ..............", ['to run', 'running', 'run', 'ran'], 1, 'بعد keep نستخدم verb + ing.'],
  [66, 'general', 'The weather .............. warm these days.', ['gets', 'is getting', 'was getting', 'gotten'], 1, 'للتعبير عن تغير يحدث الآن نستخدم present continuous.'],
  [67, 'general', 'I think I ........... take an English course next summer.', ['will', 'have', 'going to', 'might to'], 0, 'يشيع استخدام will بعد I think للتوقع أو القرار المستقبلي.'],
  [69, 'general', 'By this time next week, I ........... on a beach in Malaysia.', ['relax', 'will relax', 'am relaxing', 'will be relaxing'], 3, 'حدث مستمر في وقت محدد بالمستقبل يتطلب future continuous.'],
  [70, 'general', 'The weather .......... September was very warm this year.', ['in', 'with', 'at', 'to'], 0, 'تسبق أسماء الأشهر بحرف الجر in.'],
  [71, 'general', 'Nouf is having trouble with math at school, so she .......... to find a tutor.', ['is try', 'trying', 'is trying', 'tries'], 2, 'نستخدم present continuous لحدث جارٍ الآن.'],
  [73, 'general', 'My friend was sick, so I had to go to the party ..............', ['with myself', 'by myself', 'for myself', 'to myself'], 1, 'التعبير by myself يعني وحدي.'],
  [74, 'general', 'The doctor introduced ............... to us.', ['ourselves', 'yourself', 'himself', 'itself'], 2, 'الضمير الانعكاسي المناسب للفاعل doctor هو himself.'],
  [80, 'general', 'Jack was preparing the hamburgers ....... John was lighting the barbecue fire.', ['while', 'until', 'so that', 'even if'], 0, 'نستخدم while لحدثين مستمرين وقعا في الوقت نفسه.'],
  [81, 'general', 'The soldiers returned from the war ...... they had fought bravely for many months.', ['before', 'after', 'until', 'unless'], 1, 'حدثت العودة بعد القتال، لذا نستخدم after.'],
  [82, 'general', 'I think I took your book yesterday, and you took ................', ['me', 'myself', 'my', 'mine'], 3, 'نستخدم mine ضمير ملكية بدل تكرار my book.'],
  [83, 'general', 'Please do not touch .......... that I put on the table as I want to take it to my class party.', ['cake', 'a cake', 'all cake', 'the cake'], 3, 'نستخدم the لأن المقصود كعكة محددة.'],
  [85, 'general', 'I want ..................... to the store because I need some food.', ['to go', 'going', 'to going', 'that I go'], 0, 'بعد want نستخدم to + verb.'],
  [87, 'general', 'Go to the shop .............. is next to the pharmacy.', ['which', 'where', 'who', 'what'], 0, 'نستخدم which مع غير العاقل.'],
  [88, 'general', 'I have known Alex ............ ten years.', ['since', 'from', 'in', 'for'], 3, 'نستخدم for مع مدة زمنية.'],
  [89, 'general', 'An earthquake happened while I ......... in my office.', ['work', 'worked', 'am working', 'was working'], 3, 'تأتي while هنا مع past continuous للحدث المستمر.'],
  [90, 'general', 'I usually ....... before bedtime.', ['reading', 'am reading', 'read', 'to read'], 2, 'العادة المتكررة تُصاغ بالمضارع البسيط.'],
  [91, 'general', 'My doctor told me that I should ......... more vegetables.', ['eating', 'to eat', 'eat'], 2, 'بعد should نستخدم الفعل بصيغته الأساسية.'],
  [92, 'general', 'Mona and I .......... up at my house tomorrow.', ['will to meet', 'are going to meet', 'be meeting', 'meeting'], 1, 'نستخدم be going to للتعبير عن خطة مستقبلية.'],
  [93, 'general', "I'm so ............ I'm going to Australia next week.", ['excite', 'excited', 'exciting', 'excitement'], 1, 'نستخدم excited لوصف شعور الشخص.'],
  [94, 'general', 'Bob enjoys .......... games on his PC.', ['play', 'to play', 'playing', 'will play'], 2, 'بعد enjoy نستخدم verb + ing.'],
  [95, 'general', 'Anna watched TV and then ......... to a friend on Skype.', ['speak', 'speaking', 'spoken', 'spoke'], 3, 'لتسلسل أحداث ماضية نستخدم watched وspoke.'],
  [96, 'general', 'Paul is a bad roommate. While I clean the apartment on the weekends, he just ........ videogames.', ['is playing', 'playing', 'is plays', 'plays'], 3, 'لوصف عادة متكررة نستخدم present simple.'],
  [97, 'general', 'His breathing problems ............ by smoking.', ['caused', 'were caused', 'are causing', 'causing'], 1, 'الجملة مبنية للمجهول في الماضي.'],
  [98, 'general', 'Alex ......... in the face by his little brother.', ['kicked', 'had kicked', 'was kicking', 'was kicked'], 3, 'الجملة مبنية للمجهول؛ Alex وقع عليه الفعل.'],
  [99, 'general', 'My friend got a good job after ........ from university last year.', ['graduates', 'graduating', 'to graduate', 'has graduated'], 1, 'يمكن أن يأتي verb + ing بعد after.'],
  [100, 'general', 'If I ...... a bird, I would fly far away from this cold weather.', ['be', 'am', 'been', 'were'], 3, 'في الشرط الثاني نستخدم were مع I في الصياغة القياسية.'],
  [68, 'incorrect', 'Which of the underlined words or phrases is INCORRECT?\nMy father he gave that watch to me when I graduated from high school.', ['he', 'to me', 'graduated', 'high school'], 0, 'وجود My father يكفي، لذلك نحذف الضمير المكرر he.'],
  [76, 'incorrect', 'Which one of the underlined words or phrases is INCORRECT?\nToday we are going to review some of the chapters we discuss in our last lecture.', ['Today', 'to review', 'discuss', 'last'], 2, 'الصحيح discussed لأن last lecture تشير إلى الماضي.'],
  [84, 'incorrect', "Which of the underlined words or phrases is INCORRECT?\nI often help my mother. When she's busy, I look after my younger brother and make sure he doesn't get into trouble. I think all childs should help their parents.", ['look after', "doesn't", 'childs', 'their'], 2, 'جمع child الصحيح هو children.'],
  [72, 'word-order', 'Essam flew to Riyadh from Jeddah and then he ...............', ['a taxi to my house took to surprise me', 'to surprise me to my house took a taxi', 'took a taxi to surprise me to my house', 'took a taxi to my house to surprise me'], 3, 'الترتيب الطبيعي هو: took a taxi + destination + purpose.'],
  [75, 'word-order', 'The football game started at 8 o\'clock, ..........', ['and we arrived just in time for the second half', 'and we for the second half just arrived in time', 'and just in time we arrived for the second half', 'and just for the second half in time we arrived'], 0, 'هذا هو ترتيب الكلمات الطبيعي في الجملة.'],
  [77, 'capitalization', 'In which sentence is all CAPITALIZATION correct?', ['he arrived on Monday, September 3.', 'He arrived on Monday, september 3.', 'He arrived on monday, September 3.', 'He arrived on Monday, September 3.'], 3, 'تبدأ الجملة بحرف كبير، وتُكتب أسماء الأيام والأشهر بحرف كبير.'],
  [86, 'capitalization', 'In which sentence is all CAPITALIZATION correct?', ['Although Chinese, Korean, Japanese and other east asians are very distinct, many people seem unable to tell them apart.', 'Although Chinese, Korean, Japanese and other east Asians are very distinct, many people seem unable to tell them apart.', 'Although Chinese, Korean, Japanese and other East Asians are very distinct, many people seem unable to tell them apart.', 'Although chinese, korean, japanese and other east asians are very distinct, many people seem unable to tell them apart.'], 2, 'تُكتب أسماء الجنسيات والشعوب والمناطق بحروف كبيرة.'],
  [78, 'special', 'Which phrase correctly replaces the INCORRECT underlined phrase?\nWalk along the road. I saw something strange in the nearby forest.', ['Walking along the road', 'Walks along the road', 'Along the road walk', 'The road along'], 0, 'نحتاج إلى participial phrase تربط الفعل بفاعل الجملة.'],
  [79, 'special', 'To which sentence can we add the following clause?\n........................ until it boils.\n(1) Making a cup of tea is easy.\n(2) First, you heat the water.\n(3) Then, pour it into a cup with a teabag and wait a couple of minutes.\n(4) Now, you can remove the teabag and drink it.', ['(1)', '(2)', '(3)', '(4)'], 1, 'تكتمل الجملة الثانية طبيعيًا: heat the water until it boils.']
];

export const grammarModels45 = [
  buildModel(4, model4Rows, '37 سؤالًا معتمدًا · 3 أسئلة غير ظاهرة في المصدر'),
  buildModel(5, model5Rows, '40 سؤالًا معتمدًا · ترتيب ومراجعة حسب نوع السؤال')
];
