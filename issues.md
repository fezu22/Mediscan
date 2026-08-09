Fix only these 2 things in MedScan:

1) src/screens/Home/HomeScreen.jsx
Replace the 4 hardcoded button texts with:
{t.home?.medicineBtn || 'Medicine'}
{t.home?.medicineSub || 'Pack / strip'}
{t.home?.reportBtn || 'Report'}
{t.home?.reportSub || 'Lab / X-Ray'}

2) Add these keys in home object of every language file (en.js, ur.js, ar.js, hi.js, ps.js):

en:
medicineBtn: 'Medicine',
medicineSub: 'Pack / strip',
reportBtn: 'Report',
reportSub: 'Lab / X-Ray',

ur:
medicineBtn: 'دوائی',
medicineSub: 'پیک / سٹرپ',
reportBtn: 'رپورٹ',
reportSub: 'لیب / ایکس رے',

ar:
medicineBtn: 'دواء',
medicineSub: 'عبوة / شريط',
reportBtn: 'تقرير',
reportSub: 'معمل / أشعة',

hi:
medicineBtn: 'दवा',
medicineSub: 'पैक / स्ट्रिप',
reportBtn: 'रिपोर्ट',
reportSub: 'लैब / एक्स-रे',

ps:
medicineBtn: 'درمل',
medicineSub: 'پیک / سټریپ',
reportBtn: 'راپور',
reportSub: 'لاب / ایکس رے',
