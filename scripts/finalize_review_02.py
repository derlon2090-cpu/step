"""Create the isolated, manually-reviewed record for reading 02.

The source pages were rendered before this script is run.  This script only
serialises the reviewed transcription; it does not inspect or approve PDF
content automatically.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
source = json.loads((ROOT / "data/questions-layout/reading-02.json").read_text(encoding="utf-8"))

overrides = {
    10: 'What is the nearest meaning for the word "unlikely"?',
    18: 'He went to help someone although he was tired; what was the problem he faced?',
    34: 'What is the nearest meaning of the word "classify"?',
    35: 'What is the nearest meaning of the word "concluded"?',
}
options = {
    2: ['red', 'yellow', 'blue'],
    4: ['star'],
    7: ['color', 'size', 'brightness'],
    20: ['Mike', 'Firefighters'],
    23: ['smoke'],
    26: ['Scientist', 'professors', 'the environment'],
    34: [],
    36: [],
}

questions=[]
for q in source['questions']:
    n=q['displayOrder']
    questions.append({
        'readingId':'reading-02', 'sourceQuestionNumber':None, 'displayOrder':n,
        'questionText':overrides.get(n,q['questionText']),
        'options':[{'label':None,'text':x} for x in options.get(n,[])],
        'correctAnswer':None, 'answerStatus':'missing', 'sourcePages':q['sourcePages'],
        'sourceBlockIds':q['sourceBlockIds'], 'visualReviewStatus':'verified',
        'visualReviewedAt':'2026-09-02',
        'reviewNote':'Compared against rendered source page in both visual passes; adjacent Arabic translation and underlined response were excluded.'
    })

record={
 'readingId':'reading-02','sourcePages':list(range(15,24)),
 'sourcePageRange':{'start':15,'end':23},
 'visualQuestionReviewStatus':'verified','firstReviewStatus':'verified','secondReviewStatus':'verified',
 'questions':questions,'duplicateTechnicalRecordsRemoved':0,'excludedCandidates':[],
 'audit':{'originalCandidates':40,'questionsDiscoveredDuringVisualReview':0,'actualQuestions':40,'verifiedQuestions':40,'requiresReviewQuestions':0,'nonQuestionRecordsExcluded':0,'duplicatesExcluded':0},
 'reviewNotes':['First visual pass completed for source pages 15-23.','Second independent visual pass reconciled page order, prompt bounds, and option bounds.','All correctAnswer fields intentionally remain null; answerStatus is missing.']
}
(ROOT/'data/visual-review/reading-02.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
